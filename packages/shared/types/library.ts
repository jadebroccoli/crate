export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface PlaylistTrack {
  playlistId: string;
  trackId: string;
  position: number;
}

export interface LibraryStats {
  totalTracks: number;
  withStems: number;
  playlists: number;
  genres: string[];
}

export interface DiscoveryFilters {
  source?: 'beatport' | 'soundcloud' | 'spotify' | 'all';
  bpmMin?: number;
  bpmMax?: number;
  genre?: string;
  stemsOnly?: boolean;
}

export interface LibraryFilters {
  genre?: string;
  bpmMin?: number;
  bpmMax?: number;
  key?: string;
  mood?: string;
  hasStems?: boolean;
  page?: number;
  limit?: number;
}

export interface AudioMetadata {
  bpm?: number;
  key?: string;
  durationMs?: number;
  bitrate?: number;
  sampleRate?: number;
}
