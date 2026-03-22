import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';
import type { QueueItem, QueueOptions, DownloadJob } from '@crate/shared';
import { db, schema } from '../db/index.js';
import { downloadQueue } from '../workers/queue-setup.js';

export class DownloadService {
  async addToQueue(trackId: string, options: QueueOptions): Promise<QueueItem> {
    const id = uuid();
    const now = new Date();

    await db.insert(schema.queueItems).values({
      id,
      trackId,
      status: 'pending',
      progressPct: 0,
      wantFullTrack: options.wantFullTrack,
      wantStemVocals: options.wantStemVocals,
      wantStemInstrumental: options.wantStemInstrumental,
      wantStemDrums: options.wantStemDrums,
      wantStemBass: options.wantStemBass,
      addedAt: now,
    });

    // Look up the track to build the download job
    const track = await db.query.tracks.findFirst({
      where: eq(schema.tracks.id, trackId),
    });

    if (track?.sourceUrl) {
      const targetPath = this.resolveTargetPath({
        genre: track.genre ?? undefined,
        artist: track.artist,
        title: track.title,
        bpm: track.bpm ?? undefined,
        key: track.key ?? undefined,
      });

      const downloadJob: DownloadJob = {
        queueItemId: id,
        trackId,
        sourceUrl: track.sourceUrl,
        targetPath,
        stemOptions: {
          wantFullTrack: options.wantFullTrack,
          wantStemVocals: options.wantStemVocals,
          wantStemInstrumental: options.wantStemInstrumental,
          wantStemDrums: options.wantStemDrums,
          wantStemBass: options.wantStemBass,
        },
      };

      await downloadQueue.add(`download-${id}`, downloadJob);
    }

    return {
      id,
      trackId,
      status: 'pending',
      progressPct: 0,
      wantFullTrack: options.wantFullTrack,
      wantStemVocals: options.wantStemVocals,
      wantStemInstrumental: options.wantStemInstrumental,
      wantStemDrums: options.wantStemDrums,
      wantStemBass: options.wantStemBass,
      addedAt: now,
    };
  }

  resolveTargetPath(track: { genre?: string; artist: string; title: string; bpm?: number; key?: string }): string {
    const libraryRoot = process.env.LIBRARY_ROOT_PATH || '~/Music/CRATE';
    const genre = track.genre || 'Uncategorized';
    const bpmStr = track.bpm ? `${track.bpm}bpm` : '';
    const keyStr = track.key || '';
    const suffix = [bpmStr, keyStr].filter(Boolean).join(' ');
    // Sanitize filename: remove characters invalid in file paths
    const safeName = `${track.artist} - ${track.title}${suffix ? ` (${suffix})` : ''}`
      .replace(/[<>:"/\\|?*]/g, '_');
    const filename = `${safeName}.mp3`;
    return `${libraryRoot}/${genre}/${filename}`;
  }

  async getQueue(): Promise<QueueItem[]> {
    const rows = await db.query.queueItems.findMany({
      orderBy: (items, { desc }) => [desc(items.addedAt)],
    });

    return rows.map((row) => ({
      id: row.id,
      trackId: row.trackId!,
      status: row.status as QueueItem['status'],
      progressPct: row.progressPct ?? 0,
      wantFullTrack: row.wantFullTrack ?? true,
      wantStemVocals: row.wantStemVocals ?? false,
      wantStemInstrumental: row.wantStemInstrumental ?? false,
      wantStemDrums: row.wantStemDrums ?? false,
      wantStemBass: row.wantStemBass ?? false,
      errorMessage: row.errorMessage ?? undefined,
      addedAt: row.addedAt,
      completedAt: row.completedAt ?? undefined,
    }));
  }

  async getQueueItem(id: string): Promise<QueueItem | null> {
    const row = await db.query.queueItems.findFirst({
      where: eq(schema.queueItems.id, id),
    });
    if (!row) return null;

    return {
      id: row.id,
      trackId: row.trackId!,
      status: row.status as QueueItem['status'],
      progressPct: row.progressPct ?? 0,
      wantFullTrack: row.wantFullTrack ?? true,
      wantStemVocals: row.wantStemVocals ?? false,
      wantStemInstrumental: row.wantStemInstrumental ?? false,
      wantStemDrums: row.wantStemDrums ?? false,
      wantStemBass: row.wantStemBass ?? false,
      errorMessage: row.errorMessage ?? undefined,
      addedAt: row.addedAt,
      completedAt: row.completedAt ?? undefined,
    };
  }

  async updateQueueItem(id: string, updates: Partial<{
    status: string;
    progressPct: number;
    errorMessage: string;
    completedAt: Date;
  }>): Promise<void> {
    await db.update(schema.queueItems).set(updates).where(eq(schema.queueItems.id, id));
  }

  async removeFromQueue(id: string): Promise<void> {
    await db.delete(schema.queueItems).where(eq(schema.queueItems.id, id));
  }

  async retryQueueItem(id: string): Promise<void> {
    await db.update(schema.queueItems).set({
      status: 'pending',
      progressPct: 0,
      errorMessage: null,
    }).where(eq(schema.queueItems.id, id));

    // Re-dispatch the download job
    const queueItem = await this.getQueueItem(id);
    if (queueItem) {
      const track = await db.query.tracks.findFirst({
        where: eq(schema.tracks.id, queueItem.trackId),
      });

      if (track?.sourceUrl) {
        const targetPath = this.resolveTargetPath({
          genre: track.genre ?? undefined,
          artist: track.artist,
          title: track.title,
          bpm: track.bpm ?? undefined,
          key: track.key ?? undefined,
        });

        const downloadJob: DownloadJob = {
          queueItemId: id,
          trackId: queueItem.trackId,
          sourceUrl: track.sourceUrl,
          targetPath,
          stemOptions: {
            wantFullTrack: queueItem.wantFullTrack,
            wantStemVocals: queueItem.wantStemVocals,
            wantStemInstrumental: queueItem.wantStemInstrumental,
            wantStemDrums: queueItem.wantStemDrums,
            wantStemBass: queueItem.wantStemBass,
          },
        };

        await downloadQueue.add(`download-retry-${id}`, downloadJob);
      }
    }
  }
}
