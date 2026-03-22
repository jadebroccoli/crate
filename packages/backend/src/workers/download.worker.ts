import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { DownloadJob, AnalysisJob } from '@crate/shared';
import { analysisQueue, publishEvent, downloadQueue } from './queue-setup.js';
import { DownloadService } from '../services/download.service.js';
import { getSoundCloudClientSync as getSoundCloudClient } from '../integrations/soundcloud.js';

const downloadService = new DownloadService();

/**
 * Resolve the actual downloadable stream URL from a track's source URL.
 * For SoundCloud, resolves the permalink to a direct MP3 stream.
 * For other platforms, returns the sourceUrl as-is.
 */
async function resolveStreamUrl(
  sourceUrl: string,
  sourcePlatform?: string,
): Promise<string> {
  if (sourcePlatform === 'soundcloud') {
    const sc = getSoundCloudClient();
    if (sc) {
      // Use SC resolve endpoint to get track ID from permalink, then get stream
      const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
      if (clientId) {
        try {
          const resolveRes = await fetch(
            `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(sourceUrl)}&client_id=${clientId}`,
          );
          if (resolveRes.ok) {
            const trackData = (await resolveRes.json()) as { id: number };
            const streamUrl = await sc.getStreamUrl(trackData.id);
            if (streamUrl) return streamUrl;
          }
        } catch (err) {
          console.warn('SoundCloud resolve failed, falling back to sourceUrl:', err);
        }
      }
    }
  }

  // Fallback: use sourceUrl directly
  return sourceUrl;
}

async function processDownloadJob(job: { id: string; data: DownloadJob }): Promise<void> {
  const { queueItemId, trackId, sourceUrl, targetPath, stemOptions } = job.data;
  let lastReportedPct = 0;

  try {
    // 1. Update status to downloading
    await downloadService.updateQueueItem(queueItemId, { status: 'downloading', progressPct: 0 });
    await publishEvent({ type: 'download:progress', queueItemId, progressPct: 0, status: 'downloading' });

    // 2. Resolve the actual stream URL
    // Look up the track to get the sourcePlatform
    const queueItem = await downloadService.getQueueItem(queueItemId);
    const { db, schema } = await import('../db/index.js');
    const { eq } = await import('drizzle-orm');
    const track = await db.query.tracks.findFirst({
      where: eq(schema.tracks.id, trackId),
    });

    const streamUrl = await resolveStreamUrl(sourceUrl, track?.sourcePlatform ?? undefined);

    // 3. Ensure target directory exists
    await mkdir(dirname(targetPath), { recursive: true });

    // 4. Download the file with progress tracking
    const response = await fetch(streamUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = Number(response.headers.get('content-length')) || 0;
    const body = response.body;
    if (!body) throw new Error('Response body is null');

    const fileStream = createWriteStream(targetPath);
    let bytesReceived = 0;

    // Use a TransformStream to track progress
    const reader = body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fileStream.write(value);
        bytesReceived += value.byteLength;

        // Report progress every ~5%
        if (contentLength > 0) {
          const pct = Math.round((bytesReceived / contentLength) * 100);
          if (pct - lastReportedPct >= 5) {
            lastReportedPct = pct;
            await downloadService.updateQueueItem(queueItemId, { progressPct: pct });
            await publishEvent({ type: 'download:progress', queueItemId, progressPct: pct, status: 'downloading' });
          }
        }
      }
    } finally {
      fileStream.end();
    }

    // Wait for file stream to finish writing
    await new Promise<void>((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    // 5. Download complete — move to analysis phase
    await downloadService.updateQueueItem(queueItemId, { status: 'analyzing', progressPct: 100 });
    await publishEvent({ type: 'download:done', queueItemId, trackId });

    // 6. Add analysis job
    const analysisJob: AnalysisJob = { trackId, filePath: targetPath };
    await analysisQueue.add(`analyze-${trackId}`, analysisJob);

    console.log(`Download complete: ${targetPath}`);
  } catch (err: any) {
    const errorMessage = err.message || 'Unknown download error';
    console.error(`Download failed for queue item ${queueItemId}:`, errorMessage);

    await downloadService.updateQueueItem(queueItemId, {
      status: 'error',
      errorMessage,
    });

    await publishEvent({ type: 'download:error', queueItemId, errorMessage });
    throw err;
  }
}

export function startDownloadWorker(): void {
  downloadQueue.setProcessor(processDownloadJob, 2);
  console.log('Download worker started (concurrency: 2)');
}

export function stopDownloadWorker(): Promise<void> {
  return downloadQueue.close();
}
