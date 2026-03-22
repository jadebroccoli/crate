import { FastifyPluginAsync } from 'fastify';
import type { LibraryFilters } from '@crate/shared';
import { LibraryService } from '../services/library.service.js';

const libraryService = new LibraryService();

export const libraryRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/library/tracks — Paginated track list with filters
  app.get<{
    Querystring: {
      genre?: string;
      bpmMin?: string;
      bpmMax?: string;
      key?: string;
      mood?: string;
      hasStems?: string;
      page?: string;
      limit?: string;
    };
  }>('/tracks', async (request, reply) => {
    try {
      const filters: LibraryFilters = {
        genre: request.query.genre,
        bpmMin: request.query.bpmMin ? Number(request.query.bpmMin) : undefined,
        bpmMax: request.query.bpmMax ? Number(request.query.bpmMax) : undefined,
        key: request.query.key,
        mood: request.query.mood,
        hasStems: request.query.hasStems === 'true',
        page: request.query.page ? Number(request.query.page) : 1,
        limit: request.query.limit ? Number(request.query.limit) : 50,
      };

      return await libraryService.getTracks(filters);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/library/tracks/:id — Single track detail
  app.get<{ Params: { id: string } }>('/tracks/:id', async (request, reply) => {
    try {
      const track = await libraryService.getTrackById(request.params.id);
      if (!track) {
        return reply.status(404).send({ error: 'Track not found' });
      }
      return track;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // DELETE /api/library/tracks/:id — Remove from library (does NOT delete file)
  app.delete<{ Params: { id: string } }>('/tracks/:id', async (request, reply) => {
    try {
      await libraryService.removeTrack(request.params.id);
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/library/stats
  app.get('/stats', async (_request, reply) => {
    try {
      return await libraryService.getStats();
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/library/playlists
  app.get('/playlists', async (_request, reply) => {
    try {
      const playlists = await libraryService.getPlaylists();
      return { playlists, total: playlists.length };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // POST /api/library/playlists
  app.post<{
    Body: { name: string; description?: string };
  }>('/playlists', async (request, reply) => {
    try {
      const { name, description } = request.body;
      if (!name) {
        return reply.status(400).send({ error: 'Playlist name is required' });
      }
      const playlist = await libraryService.createPlaylist(name, description);
      return reply.status(201).send(playlist);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // POST /api/library/playlists/:id/export/rekordbox
  app.post<{ Params: { id: string } }>('/playlists/:id/export/rekordbox', async (_request, reply) => {
    // TODO: generate Rekordbox XML from playlist tracks
    return reply.status(501).send({ error: 'Rekordbox export not yet implemented' });
  });

  // POST /api/library/playlists/:id/export/serato
  app.post<{ Params: { id: string } }>('/playlists/:id/export/serato', async (_request, reply) => {
    // TODO: generate Serato crate from playlist tracks
    return reply.status(501).send({ error: 'Serato export not yet implemented' });
  });
};
