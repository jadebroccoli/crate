import type { AnalysisJob } from '@crate/shared';
import { publishEvent, analysisQueue } from './queue-setup.js';
import { AnalysisService } from '../services/analysis.service.js';
import { DownloadService } from '../services/download.service.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const analysisService = new AnalysisService();
const downloadService = new DownloadService();

async function processAnalysisJob(job: { id: string; data: AnalysisJob }): Promise<void> {
  const { trackId, filePath } = job.data;

  try {
    // 1. Run the existing AnalysisService.tagTrack()
    //    - Extracts BPM, key, duration via music-metadata
    //    - Infers mood via Claude
    //    - Updates the track record in DB
    await analysisService.tagTrack(trackId, filePath);

    // 2. Find the queue item for this track and mark it done
    const queueItems = await db.query.queueItems.findMany({
      where: eq(schema.queueItems.trackId, trackId),
    });

    for (const item of queueItems) {
      if (item.status === 'analyzing') {
        await downloadService.updateQueueItem(item.id, {
          status: 'done',
          completedAt: new Date(),
        });

        await publishEvent({
          type: 'analysis:complete',
          queueItemId: item.id,
          trackId,
        });
      }
    }

    console.log(`Analysis complete for track ${trackId}`);
  } catch (err: any) {
    const errorMessage = err.message || 'Unknown analysis error';
    console.error(`Analysis failed for track ${trackId}:`, errorMessage);

    // Find associated queue items and mark as error
    const queueItems = await db.query.queueItems.findMany({
      where: eq(schema.queueItems.trackId, trackId),
    });

    for (const item of queueItems) {
      if (item.status === 'analyzing') {
        await downloadService.updateQueueItem(item.id, {
          status: 'error',
          errorMessage: `Analysis failed: ${errorMessage}`,
        });

        await publishEvent({
          type: 'download:error',
          queueItemId: item.id,
          errorMessage: `Analysis failed: ${errorMessage}`,
        });
      }
    }

    throw err;
  }
}

export function startAnalysisWorker(): void {
  analysisQueue.setProcessor(processAnalysisJob, 4);
  console.log('Analysis worker started (concurrency: 4)');
}

export function stopAnalysisWorker(): Promise<void> {
  return analysisQueue.close();
}
