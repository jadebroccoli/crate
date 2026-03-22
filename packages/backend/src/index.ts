import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { runMigrations } from './db/index.js';
import { tasteRoutes } from './routes/taste.js';
import { discoverRoutes } from './routes/discover.js';
import { queueRoutes } from './routes/queue.js';
import { libraryRoutes } from './routes/library.js';
import { authRoutes, initServiceConnections } from './routes/auth.js';
import { eventsRoutes } from './routes/events.js';
import { streamRoutes } from './routes/stream.js';
import { startDownloadWorker, stopDownloadWorker } from './workers/download.worker.js';
import { startAnalysisWorker, stopAnalysisWorker } from './workers/analysis.worker.js';
import { closeQueues } from './workers/queue-setup.js';

const PORT = Number(process.env.PORT) || 4242;

// Run DB migrations before starting server
await runMigrations();

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// Register route modules
await app.register(tasteRoutes, { prefix: '/api/taste' });
await app.register(discoverRoutes, { prefix: '/api/discover' });
await app.register(queueRoutes, { prefix: '/api/queue' });
await app.register(libraryRoutes, { prefix: '/api/library' });
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(eventsRoutes, { prefix: '/api' });
await app.register(streamRoutes, { prefix: '/api/stream' });

// Health check
app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Restore service connections from DB (Beatport, SoundCloud)
await initServiceConnections();

// Start BullMQ workers
startDownloadWorker();
startAnalysisWorker();

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down...');
  await stopDownloadWorker();
  await stopAnalysisWorker();
  await closeQueues();
  await app.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`CRATE backend running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
