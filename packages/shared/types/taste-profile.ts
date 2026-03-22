export interface GenreBreakdown {
  [genre: string]: number; // genre name -> confidence 0.0-1.0
}

export interface TasteProfile {
  id: string;
  spotifyUserId?: string;
  rawListeningData?: string;
  genreBreakdown: GenreBreakdown;
  bpmMin?: number;
  bpmMax?: number;
  preferredKeys: string[];
  energyPreference?: number;
  stemPreferences: string[];
  editPreferences: string[];
  aiSummary?: string;
  lastSyncedAt?: Date;
  updatedAt?: Date;
}

export interface RawListeningData {
  topTracks: SpotifyTrackItem[];
  topArtists: SpotifyArtistItem[];
  recentlyPlayed: SpotifyTrackItem[];
}

export interface SpotifyTrackItem {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { id: string; name: string };
  durationMs: number;
  popularity: number;
}

export interface SpotifyArtistItem {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
}
