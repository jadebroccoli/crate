import { FastifyPluginAsync } from 'fastify';
import { TasteService } from '../services/taste.service.js';

const tasteService = new TasteService();

export const tasteRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/taste/profile — Returns current taste profile
  app.get('/profile', async (_request, reply) => {
    try {
      const profile = await tasteService.getProfile();
      if (!profile) {
        return reply.status(404).send({ error: 'No taste profile found. Connect Spotify and sync.' });
      }
      // Don't send the raw listening data blob to the frontend
      const { rawListeningData, ...profileData } = profile;
      return profileData;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // POST /api/taste/sync — Triggers fresh Spotify sync + AI synthesis
  app.post('/sync', async (_request, reply) => {
    try {
      const profile = await tasteService.syncProfile();
      const { rawListeningData, ...profileData } = profile;
      return profileData;
    } catch (err: any) {
      app.log.error(err);
      if (err.message.includes('not connected')) {
        return reply.status(401).send({ error: err.message });
      }
      return reply.status(500).send({ error: err.message });
    }
  });

  // PUT /api/taste/preferences — Manual override of profile fields
  app.put<{
    Body: {
      bpmMin?: number;
      bpmMax?: number;
      preferredKeys?: string[];
      energyPreference?: number;
      stemPreferences?: string[];
      editPreferences?: string[];
    };
  }>('/preferences', async (request, reply) => {
    try {
      const profile = await tasteService.updatePreferences(request.body);
      if (!profile) {
        return reply.status(404).send({ error: 'No taste profile found' });
      }
      const { rawListeningData, ...profileData } = profile;
      return profileData;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
};
