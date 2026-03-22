import { FastifyPluginAsync } from 'fastify';
import type { DiscoveryFilters } from '@crate/shared';
import { DiscoveryService } from '../services/discovery.service.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';

const discoveryService = new DiscoveryService();

export const discoverRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/discover — Returns AI-ranked feed based on taste profile
  app.get<{
    Querystring: {
      source?: 'beatport' | 'soundcloud' | 'spotify' | 'all';
      bpmMin?: string;
      bpmMax?: string;
      genre?: string;
      stemsOnly?: string;
    };
  }>('/', async (request, reply) => {
    try {
      const filters: DiscoveryFilters = {
        source: request.query.source || 'all',
        bpmMin: request.query.bpmMin ? Number(request.query.bpmMin) : undefined,
        bpmMax: request.query.bpmMax ? Number(request.query.bpmMax) : undefined,
        genre: request.query.genre,
        stemsOnly: request.query.stemsOnly === 'true',
      };

      const feed = await discoveryService.getDiscoverFeed(filters);
      return { tracks: feed, total: feed.length };
    } catch (err: any) {
      app.log.error(err);
      if (err.message.includes('No taste profile')) {
        return reply.status(404).send({ error: err.message });
      }
      return reply.status(500).send({ error: err.message });
    }
  });

  // POST /api/discover/dismiss — Dismiss a track from the discover feed
  app.post<{
    Body: { externalId: string; sourcePlatform: string };
  }>('/dismiss', async (request, reply) => {
    const { externalId, sourcePlatform } = request.body || {};
    if (!externalId || !sourcePlatform) {
      return reply.status(400).send({ error: 'externalId and sourcePlatform required' });
    }

    try {
      await db.insert(schema.dismissedTracks).values({
        id: crypto.randomUUID(),
        externalId,
        sourcePlatform,
        dismissedAt: new Date(),
      }).onConflictDoNothing();
      return { success: true };
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to dismiss track' });
    }
  });

  // GET /api/discover/search — Free text search against catalogs (unranked)
  app.get<{
    Querystring: { q?: string };
  }>('/search', async (request, reply) => {
    const query = request.query.q;
    if (!query) {
      return reply.status(400).send({ error: 'Missing query parameter "q"' });
    }

    try {
      const results = await discoveryService.searchCatalogs(query);
      return { tracks: results, total: results.length };
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });
};
