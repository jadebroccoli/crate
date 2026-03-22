import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { getSpotifyClient } from '../integrations/spotify.js';

/**
 * Returns a valid Spotify access token, refreshing automatically if expired.
 * Throws if no Spotify session exists.
 */
export async function getValidSpotifyToken(): Promise<string> {
  const session = await db.query.authSessions.findFirst({
    where: eq(schema.authSessions.id, 'spotify'),
  });

  if (!session || !session.accessToken || !session.refreshToken) {
    throw new Error('Spotify not connected. Please connect Spotify first.');
  }

  // Check if token is still valid (with 60s buffer)
  const now = new Date();
  const expiresAt = session.expiresAt;
  if (expiresAt && expiresAt.getTime() - 60_000 > now.getTime()) {
    return session.accessToken;
  }

  // Token expired or about to expire — refresh it
  const spotify = getSpotifyClient();
  const tokens = await spotify.refreshAccessToken(session.refreshToken);

  const newExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  await db.update(schema.authSessions)
    .set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.authSessions.id, 'spotify'));

  return tokens.accessToken;
}
