import { EventEmitter } from 'node:events';

const USE_REDIS = process.env.QUEUE_BACKEND === 'redis';

/** Redis pub/sub channel for SSE events */
export const EVENTS_CHANNEL = 'crate:events';

// ---------- In-memory implementation ----------

const memoryBus = new EventEmitter();
memoryBus.setMaxListeners(50);

type JobProcessor<T> = (job: { id: string; data: T }) => Promise<void>;

class MemoryQueue<T = any> {
  private processor: JobProcessor<T> | null = null;
  private concurrency = 1;
  private running = 0;
  private queue: { id: string; data: T }[] = [];

  constructor(private name: string) {}

  /** Register a processor function (called by workers) */
  setProcessor(fn: JobProcessor<T>, concurrency = 1) {
    this.processor = fn;
    this.concurrency = concurrency;
    // Process any jobs that were queued before processor was set
    this._drain();
  }

  async add(id: string, data: T): Promise<void> {
    const job = { id, data };
    if (this.processor && this.running < this.concurrency) {
      this._process(job);
    } else {
      this.queue.push(job);
    }
  }

  private async _process(job: { id: string; data: T }) {
    if (!this.processor) return;
    this.running++;
    try {
      await this.processor(job);
      console.log(`[MemoryQueue:${this.name}] Job ${job.id} completed`);
    } catch (err: any) {
      console.error(`[MemoryQueue:${this.name}] Job ${job.id} failed:`, err.message);
    } finally {
      this.running--;
      this._drain();
    }
  }

  private _drain() {
    while (this.queue.length > 0 && this.running < this.concurrency && this.processor) {
      const job = this.queue.shift()!;
      this._process(job);
    }
  }

  async close(): Promise<void> {
    this.queue = [];
  }
}

// ---------- Redis implementation (lazy-loaded) ----------

let _redis: any = null;
let _downloadQueueRedis: any = null;
let _analysisQueueRedis: any = null;

async function initRedis() {
  if (_redis) return;
  const { default: IORedis } = await import('ioredis');
  const { Queue } = await import('bullmq');

  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  _redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
  _downloadQueueRedis = new Queue('download', { connection: _redis as any });
  _analysisQueueRedis = new Queue('analysis', { connection: _redis as any });
}

// ---------- Unified exports ----------

/** BullMQ queue for download jobs */
export const downloadQueue = new MemoryQueue('download');

/** BullMQ queue for post-download analysis jobs */
export const analysisQueue = new MemoryQueue('analysis');

/** Create a pub/sub subscriber (Redis mode) or EventEmitter listener (memory mode) */
export function createSubscriber(): { on: (event: string, cb: (...args: any[]) => void) => void; subscribe: (channel: string) => Promise<void>; unsubscribe: (channel: string) => Promise<void>; quit: () => Promise<void> } {
  if (USE_REDIS && _redis) {
    const IORedis = require('ioredis');
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    return new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
  }

  // Memory mode: wrap EventEmitter as a subscriber
  const handler = new Map<string, (...args: any[]) => void>();
  return {
    on(event: string, cb: (...args: any[]) => void) {
      if (event === 'message') {
        const wrapped = (message: string) => cb(EVENTS_CHANNEL, message);
        handler.set('message', wrapped);
        memoryBus.on(EVENTS_CHANNEL, wrapped);
      }
    },
    async subscribe(_channel: string) {},
    async unsubscribe(_channel: string) {
      const wrapped = handler.get('message');
      if (wrapped) memoryBus.removeListener(EVENTS_CHANNEL, wrapped);
    },
    async quit() {
      const wrapped = handler.get('message');
      if (wrapped) memoryBus.removeListener(EVENTS_CHANNEL, wrapped);
    },
  };
}

/** Publish an event to all SSE subscribers */
export async function publishEvent(event: Record<string, unknown>): Promise<void> {
  if (USE_REDIS && _redis) {
    await _redis.publish(EVENTS_CHANNEL, JSON.stringify(event));
    return;
  }
  memoryBus.emit(EVENTS_CHANNEL, JSON.stringify(event));
}

/** Graceful shutdown */
export async function closeQueues(): Promise<void> {
  await downloadQueue.close();
  await analysisQueue.close();
  if (_redis) {
    if (_downloadQueueRedis) await _downloadQueueRedis.close();
    if (_analysisQueueRedis) await _analysisQueueRedis.close();
    await _redis.quit();
  }
}

/** Initialize Redis if QUEUE_BACKEND=redis */
export async function initQueueBackend(): Promise<void> {
  if (USE_REDIS) {
    await initRedis();
    console.log('[Queue] Using Redis backend');
  } else {
    console.log('[Queue] Using in-memory backend');
  }
}
