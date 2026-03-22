import { FastifyPluginAsync } from 'fastify';
import { createSubscriber, EVENTS_CHANNEL } from '../workers/queue-setup.js';

export const eventsRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/events — SSE endpoint for real-time queue status updates
  app.get('/events', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Send initial connection event
    reply.raw.write('data: {"type":"connected"}\n\n');

    // Subscribe to Redis pub/sub for live events from workers
    const subscriber = createSubscriber();
    await subscriber.subscribe(EVENTS_CHANNEL);

    subscriber.on('message', (_channel: string, message: string) => {
      try {
        // Forward the event to the SSE client
        reply.raw.write(`data: ${message}\n\n`);
      } catch {
        // Client may have disconnected
      }
    });

    // Keep-alive heartbeat every 30s
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write('data: {"type":"heartbeat"}\n\n');
      } catch {
        // Client may have disconnected
      }
    }, 30000);

    // Clean up on client disconnect
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      subscriber.unsubscribe(EVENTS_CHANNEL).catch(() => {});
      subscriber.quit().catch(() => {});
    });
  });
};
