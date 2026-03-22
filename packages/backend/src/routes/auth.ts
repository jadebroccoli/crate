import { FastifyPluginAsync } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import {
  getSpotifyClient,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from '../integrations/spotify.js';
import { BeatportClient, initBeatportClient, resetBeatportClient } from '../integrations/beatport.js';
import { getSoundCloudClient, getSoundCloudClientSync, resetSoundCloudClient } from '../integrations/soundcloud.js';
import { knownTracks } from '../services/known-tracks.service.js';

// In-memory PKCE state store (single-user local app, so this is fine)
const pendingAuth: Map<string, { codeVerifier: string; createdAt: number }> = new Map();

// Clean up stale entries older than 10 minutes
function cleanPendingAuth() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [state, data] of pendingAuth) {
    if (data.createdAt < cutoff) pendingAuth.delete(state);
  }
}

// --- Shared helpers ---

async function getProviderSession(providerId: string) {
  return db.query.authSessions.findFirst({
    where: eq(schema.authSessions.id, providerId),
  });
}

async function deleteProviderSession(providerId: string) {
  await db.delete(schema.authSessions).where(eq(schema.authSessions.id, providerId));
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  // ============================================================
  // SPOTIFY
  // ============================================================

  // GET /api/auth/spotify/login — Returns Spotify auth URL
  app.get('/spotify/login', async (_request, reply) => {
    try {
      const spotify = getSpotifyClient();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = generateState();

      cleanPendingAuth();
      pendingAuth.set(state, { codeVerifier, createdAt: Date.now() });

      const authUrl = spotify.buildAuthUrl(codeChallenge, state);
      return { authUrl, state };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/auth/spotify/callback — Handles OAuth callback
  app.get<{
    Querystring: { code?: string; state?: string; error?: string };
  }>('/spotify/callback', async (request, reply) => {
    const { code, state, error } = request.query;

    if (error) {
      return reply.status(400).send({ error: `Spotify auth denied: ${error}` });
    }

    if (!code || !state) {
      return reply.status(400).send({ error: 'Missing code or state parameter' });
    }

    const pending = pendingAuth.get(state);
    if (!pending) {
      return reply.status(400).send({ error: 'Invalid or expired state parameter' });
    }

    pendingAuth.delete(state);

    try {
      const spotify = getSpotifyClient();
      const tokens = await spotify.exchangeCode(code, pending.codeVerifier);

      // Save tokens to DB immediately (before any further API calls that might 429)
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
      await db.insert(schema.authSessions).values({
        id: 'spotify',
        provider: 'spotify',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: schema.authSessions.id,
        set: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt,
          updatedAt: new Date(),
        },
      });

      // Get user profile (has retry logic via apiFetch for 429s)
      let userId = 'unknown';
      let displayName = 'Spotify User';
      try {
        const user = await spotify.getCurrentUser(tokens.accessToken);
        userId = user.id;
        displayName = user.display_name;

        // Update session with user info
        await db.update(schema.authSessions).set({
          spotifyUserId: user.id,
          userId: user.id,
          displayName: user.display_name,
        }).where(eq(schema.authSessions.id, 'spotify'));
      } catch (profileErr: any) {
        console.warn(`[Spotify] Could not fetch user profile (tokens saved): ${profileErr.message}`);
      }

      // Trigger heavy sync of known tracks in background (don't block response)
      knownTracks.heavySync().catch((err: any) => {
        app.log.error(`[KnownTracks] Background heavy sync failed: ${err.message}`);
      });

      return {
        success: true,
        spotifyUserId: userId,
        displayName,
      };
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: `Token exchange failed: ${err.message}` });
    }
  });

  // GET /api/auth/spotify/callback-page — Self-contained OAuth callback for desktop mode
  // Returns HTML directly (no frontend needed)
  app.get<{
    Querystring: { code?: string; state?: string; error?: string };
  }>('/spotify/callback-page', async (request, reply) => {
    const { code, state, error } = request.query;

    const sendHtml = (status: 'success' | 'error', message: string) => {
      const icon = status === 'success' ? '&#10003;' : '&#10007;';
      const color = status === 'success' ? '#4ade80' : '#ef4444';
      reply.header('Content-Type', 'text/html').send(`<!DOCTYPE html>
<html><head><title>CRATE - Spotify</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0e0c08;color:#e8e0d4;font-family:system-ui">
<div style="text-align:center;max-width:400px">
<div style="font-size:48px;color:${color};margin-bottom:16px">${icon}</div>
<p style="font-size:15px;line-height:1.5">${message}</p>
<p style="font-size:13px;opacity:0.5;margin-top:24px">You can close this tab and return to CRATE.</p>
</div></body></html>`);
    };

    if (error) {
      return sendHtml('error', `Spotify denied access: ${error}`);
    }

    if (!code || !state) {
      return sendHtml('error', 'Missing authorization parameters.');
    }

    const pending = pendingAuth.get(state);
    if (!pending) {
      return sendHtml('error', 'Invalid or expired state. Please try connecting again from Settings.');
    }

    pendingAuth.delete(state);

    try {
      const spotify = getSpotifyClient();
      const tokens = await spotify.exchangeCode(code, pending.codeVerifier);

      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
      await db.insert(schema.authSessions).values({
        id: 'spotify',
        provider: 'spotify',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: schema.authSessions.id,
        set: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt,
          updatedAt: new Date(),
        },
      });

      let displayName = 'Spotify User';
      try {
        const user = await spotify.getCurrentUser(tokens.accessToken);
        displayName = user.display_name;
        await db.update(schema.authSessions).set({
          spotifyUserId: user.id,
          userId: user.id,
          displayName: user.display_name,
        }).where(eq(schema.authSessions.id, 'spotify'));
      } catch (profileErr: any) {
        console.warn(`[Spotify] Could not fetch user profile: ${profileErr.message}`);
      }

      knownTracks.heavySync().catch((err: any) => {
        app.log.error(`[KnownTracks] Background heavy sync failed: ${err.message}`);
      });

      return sendHtml('success', `Connected as ${displayName}!`);
    } catch (err: any) {
      app.log.error(err);
      return sendHtml('error', `Token exchange failed: ${err.message}`);
    }
  });

  // GET /api/auth/spotify/status — Check if Spotify is connected
  app.get('/spotify/status', async (_request, reply) => {
    try {
      const session = await getProviderSession('spotify');

      if (!session || !session.accessToken) {
        return { connected: false };
      }

      return {
        connected: true,
        spotifyUserId: session.spotifyUserId || session.userId,
        displayName: session.displayName,
        expiresAt: session.expiresAt?.toISOString(),
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // DELETE /api/auth/spotify — Disconnect Spotify
  app.delete('/spotify', async (_request, reply) => {
    try {
      await deleteProviderSession('spotify');
      await knownTracks.clearPlatform('spotify');
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ============================================================
  // BEATPORT
  // ============================================================

  // POST /api/auth/beatport/login — Authenticate with username/password
  app.post<{
    Body: { username: string; password: string };
  }>('/beatport/login', async (request, reply) => {
    const { username, password } = request.body;

    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password are required' });
    }

    try {
      // Validate credentials by running the full auth flow
      const client = new BeatportClient(username, password);
      await client.testConnection();

      // Store credentials in DB
      await db.insert(schema.authSessions).values({
        id: 'beatport',
        provider: 'beatport',
        username,
        encryptedPassword: password, // Local SQLite — acceptable for single-user desktop app
        userId: username,
        displayName: username,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: schema.authSessions.id,
        set: {
          username,
          encryptedPassword: password,
          userId: username,
          displayName: username,
          updatedAt: new Date(),
        },
      });

      // Update singleton so discovery uses these credentials
      initBeatportClient(username, password);

      return { success: true, username };
    } catch (err: any) {
      app.log.error(err);
      const message = err.message.includes('login failed')
        ? 'Incorrect username or password'
        : `Beatport connection failed: ${err.message}`;
      return reply.status(401).send({ error: message });
    }
  });

  // GET /api/auth/beatport/status
  app.get('/beatport/status', async (_request, reply) => {
    try {
      const session = await getProviderSession('beatport');

      if (!session || !session.username) {
        return { connected: false };
      }

      return {
        connected: true,
        username: session.username,
        displayName: session.displayName,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // DELETE /api/auth/beatport — Disconnect Beatport
  app.delete('/beatport', async (_request, reply) => {
    try {
      await deleteProviderSession('beatport');
      resetBeatportClient();
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ============================================================
  // SOUNDCLOUD
  // ============================================================

  // POST /api/auth/soundcloud/connect — Link profile URL
  app.post<{
    Body: { profileUrl: string };
  }>('/soundcloud/connect', async (request, reply) => {
    const { profileUrl } = request.body;

    if (!profileUrl) {
      return reply.status(400).send({ error: 'Profile URL is required' });
    }

    // Normalize URL
    let url = profileUrl.trim();
    if (!url.startsWith('http')) {
      url = `https://soundcloud.com/${url.replace(/^\/+/, '')}`;
    }

    try {
      // Auto-init SoundCloud client (scrapes client_id if needed)
      const client = await getSoundCloudClient();
      if (!client) {
        return reply.status(500).send({ error: 'SoundCloud service unavailable' });
      }

      // Resolve profile URL to get user info
      const user = await client.resolveUser(url);

      // Store in DB
      await db.insert(schema.authSessions).values({
        id: 'soundcloud',
        provider: 'soundcloud',
        userId: String(user.id),
        displayName: user.username,
        username: user.permalink,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: schema.authSessions.id,
        set: {
          userId: String(user.id),
          displayName: user.username,
          username: user.permalink,
          updatedAt: new Date(),
        },
      });

      // Trigger heavy sync of known tracks in background
      knownTracks.heavySync().catch((err: any) => {
        app.log.error(`[KnownTracks] Background heavy sync failed: ${err.message}`);
      });

      return { success: true, username: user.username, userId: user.id };
    } catch (err: any) {
      app.log.error(err);
      const message = err.message.includes('404')
        ? 'SoundCloud profile not found. Check the URL and try again.'
        : `SoundCloud connection failed: ${err.message}`;
      return reply.status(400).send({ error: message });
    }
  });

  // GET /api/auth/soundcloud/status
  app.get('/soundcloud/status', async (_request, reply) => {
    try {
      const session = await getProviderSession('soundcloud');
      const client = getSoundCloudClientSync();

      // SoundCloud search works even without a linked profile (auto-scraped client_id)
      return {
        connected: !!session?.userId,
        username: session?.displayName,
        profileLinked: !!session?.userId,
        searchAvailable: !!client,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // DELETE /api/auth/soundcloud — Unlink SoundCloud profile
  app.delete('/soundcloud', async (_request, reply) => {
    try {
      await deleteProviderSession('soundcloud');
      await knownTracks.clearPlatform('soundcloud');
      // Don't reset the client — search still works without a linked profile
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
};

// --- Boot-time initialization ---
// Called from index.ts after migrations to restore service connections from DB

export async function initServiceConnections() {
  try {
    // Restore Beatport connection
    const beatportSession = await getProviderSession('beatport');
    if (beatportSession?.username && beatportSession?.encryptedPassword) {
      initBeatportClient(beatportSession.username, beatportSession.encryptedPassword);
      console.log('[auth] Restored Beatport connection for', beatportSession.username);
    }

    // Initialize SoundCloud (auto-scrapes client_id if no env var set)
    const scClient = await getSoundCloudClient();
    if (scClient) {
      console.log('[auth] SoundCloud search initialized');
    } else {
      console.warn('[auth] SoundCloud unavailable — could not obtain client_id');
    }

    // If Spotify is connected but known_tracks table is empty, trigger heavy sync
    const spotifySession = await getProviderSession('spotify');
    if (spotifySession?.accessToken) {
      const { count } = await db.select({ count: sql<number>`count(*)` }).from(schema.knownTracks).then(r => r[0]);
      if (count === 0) {
        console.log('[auth] Spotify connected but known_tracks empty — triggering heavy sync');
        knownTracks.heavySync().catch((err: any) => {
          console.warn('[auth] Boot-time heavy sync failed:', err.message);
        });
      } else {
        console.log(`[auth] Known tracks loaded: ${count} tracks in DB`);
      }
    }
  } catch (err) {
    console.error('[auth] Failed to restore service connections:', err);
  }
}
