import { FastifyPluginAsync } from 'fastify';
import { getSoundCloudClientSync } from '../integrations/soundcloud.js';
import { getValidSpotifyToken } from '../services/auth.service.js';

export const streamRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/stream/spotify/token — Return a valid Spotify access token for Web Playback SDK
  app.get('/spotify/token', async (_request, reply) => {
    try {
      const accessToken = await getValidSpotifyToken();
      return { accessToken };
    } catch {
      return reply.status(401).send({ error: 'Spotify not connected' });
    }
  });

  // GET /api/stream/soundcloud/:trackId — Resolve SoundCloud stream URL
  app.get<{ Params: { trackId: string } }>('/soundcloud/:trackId', async (request, reply) => {
    const sc = getSoundCloudClientSync();
    if (!sc) return reply.status(503).send({ error: 'SoundCloud not available' });

    const trackId = Number(request.params.trackId);
    if (isNaN(trackId)) return reply.status(400).send({ error: 'Invalid track ID' });

    const url = await sc.getStreamUrl(trackId);
    if (!url) return reply.status(404).send({ error: 'Stream not found' });

    return { streamUrl: url };
  });
};
