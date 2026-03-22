export type QueueItemStatus = 'pending' | 'downloading' | 'analyzing' | 'done' | 'error';

export interface StemOptions {
  wantFullTrack: boolean;
  wantStemVocals: boolean;
  wantStemInstrumental: boolean;
  wantStemDrums: boolean;
  wantStemBass: boolean;
}

export interface QueueItem {
  id: string;
  trackId: string;
  status: QueueItemStatus;
  progressPct: number;
  wantFullTrack: boolean;
  wantStemVocals: boolean;
  wantStemInstrumental: boolean;
  wantStemDrums: boolean;
  wantStemBass: boolean;
  errorMessage?: string;
  addedAt: Date;
  completedAt?: Date;
}

export interface QueueOptions extends StemOptions {
  trackId: string;
}

export interface DownloadJob {
  queueItemId: string;
  trackId: string;
  sourceUrl: string;
  targetPath: string;
  stemOptions: StemOptions;
}

export interface AnalysisJob {
  trackId: string;
  filePath: string;
}
