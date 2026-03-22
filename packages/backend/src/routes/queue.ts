import { FastifyPluginAsync } from 'fastify';
import { DownloadService } from '../services/download.service.js';
import { LibraryService } from '../services/library.service.js';

const downloadService = new DownloadService();
const libraryService = new LibraryService();

export const queueRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/queue — All queue items with status
  app.get('/', async (_request, reply) => {
    try {
      const items = await downloadService.getQueue();
      return { items, total: items.length };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // POST /api/queue — Add track(s) to queue
  app.post<{
    Body: {
      trackId?: string;
      // If no trackId, create track from raw data
      title?: string;
      artist?: string;
      genre?: string;
      sourceUrl?: string;
      sourcePlatform?: string;
      bpm?: number;
      key?: string;
      artworkUrl?: string;
      // Queue options
      wantFullTrack?: boolean;
      wantStemVocals?: boolean;
      wantStemInstrumental?: boolean;
      wantStemDrums?: boolean;
      wantStemBass?: boolean;
    };
  }>('/', async (request, reply) => {
    try {
      const body = request.body;
      let trackId = body.trackId;

      // If no trackId, upsert a track record from the provided metadata
      if (!trackId && body.title && body.artist) {
        trackId = await libraryService.upsertTrack({
          title: body.title,
          artist: body.artist,
          genre: body.genre,
          sourceUrl: body.sourceUrl,
          sourcePlatform: body.sourcePlatform,
          bpm: body.bpm,
          key: body.key,
          artworkUrl: body.artworkUrl,
        });
      }

      if (!trackId) {
        return reply.status(400).send({ error: 'trackId or title+artist required' });
      }

      const item = await downloadService.addToQueue(trackId, {
        trackId,
        wantFullTrack: body.wantFullTrack ?? true,
        wantStemVocals: body.wantStemVocals ?? false,
        wantStemInstrumental: body.wantStemInstrumental ?? false,
        wantStemDrums: body.wantStemDrums ?? false,
        wantStemBass: body.wantStemBass ?? false,
      });

      return reply.status(201).send(item);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // DELETE /api/queue/:id — Remove item from queue
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      await downloadService.removeFromQueue(request.params.id);
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // POST /api/queue/:id/retry — Retry a failed download
  app.post<{ Params: { id: string } }>('/:id/retry', async (request, reply) => {
    try {
      await downloadService.retryQueueItem(request.params.id);
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
};
