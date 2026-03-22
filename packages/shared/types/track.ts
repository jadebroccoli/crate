export type SourcePlatform = 'beatport' | 'soundcloud' | 'djcity' | 'spotify';
export type MoodTag = 'hype' | 'vibes' | 'smooth' | 'dark' | 'chill' | 'groovy' | 'heavy' | 'melodic';

export interface Track {
  id: string;
  title: string;
  artist: string;
  remixer?: string;
  label?: string;
  bpm?: number;
  key?: string;
  energy?: number;
  durationMs?: number;
  genre?: string;
  subgenre?: string;
  mood?: MoodTag;
  sourceUrl?: string;
  sourcePlatform?: SourcePlatform;
  localPath?: string;
  hasStemVocals: boolean;
  hasStemInstrumental: boolean;
  hasStemDrums: boolean;
  hasStemBass: boolean;
  artworkUrl?: string;
  releaseDate?: string;
  downloadedAt?: Date;
  createdAt: Date;
}

export interface RawTrack {
  externalId: string;
  title: string;
  artist: string;
  remixer?: string;
  label?: string;
  bpm?: number;
  key?: string;
  genre?: string;
  subgenre?: string;
  sourceUrl: string;
  sourcePlatform: SourcePlatform;
  artworkUrl?: string;
  releaseDate?: string;
  previewUrl?: string;
  mixName?: string;
}

export interface RankedTrack extends RawTrack {
  score: number;
  mood: MoodTag;
  isTopPick: boolean;
  aiReason?: string;
}
