import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  remixer: text('remixer'),
  label: text('label'),
  bpm: integer('bpm'),
  key: text('key'),
  energy: real('energy'),
  durationMs: integer('duration_ms'),
  genre: text('genre'),
  subgenre: text('subgenre'),
  mood: text('mood'),
  sourceUrl: text('source_url'),
  sourcePlatform: text('source_platform'),
  localPath: text('local_path'),
  hasStemVocals: integer('has_stem_vocals', { mode: 'boolean' }).default(false),
  hasStemInstrumental: integer('has_stem_instrumental', { mode: 'boolean' }).default(false),
  hasStemDrums: integer('has_stem_drums', { mode: 'boolean' }).default(false),
  hasStemBass: integer('has_stem_bass', { mode: 'boolean' }).default(false),
  artworkUrl: text('artwork_url'),
  releaseDate: text('release_date'),
  downloadedAt: integer('downloaded_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tasteProfile = sqliteTable('taste_profile', {
  id: text('id').primaryKey().default('singleton'),
  spotifyUserId: text('spotify_user_id'),
  rawListeningData: text('raw_listening_data'),
  genreBreakdown: text('genre_breakdown'),
  bpmMin: integer('bpm_min'),
  bpmMax: integer('bpm_max'),
  preferredKeys: text('preferred_keys'),
  energyPreference: real('energy_preference'),
  stemPreferences: text('stem_preferences'),
  editPreferences: text('edit_preferences'),
  aiSummary: text('ai_summary'),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const queueItems = sqliteTable('queue_items', {
  id: text('id').primaryKey(),
  trackId: text('track_id').references(() => tracks.id),
  status: text('status').notNull().default('pending'),
  progressPct: integer('progress_pct').default(0),
  wantFullTrack: integer('want_full_track', { mode: 'boolean' }).default(true),
  wantStemVocals: integer('want_stem_vocals', { mode: 'boolean' }).default(false),
  wantStemInstrumental: integer('want_stem_instrumental', { mode: 'boolean' }).default(false),
  wantStemDrums: integer('want_stem_drums', { mode: 'boolean' }).default(false),
  wantStemBass: integer('want_stem_bass', { mode: 'boolean' }).default(false),
  errorMessage: text('error_message'),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const playlistTracks = sqliteTable('playlist_tracks', {
  playlistId: text('playlist_id').references(() => playlists.id),
  trackId: text('track_id').references(() => tracks.id),
  position: integer('position').notNull(),
});

export const dismissedTracks = sqliteTable('dismissed_tracks', {
  id: text('id').primaryKey(),
  externalId: text('external_id').notNull(),
  sourcePlatform: text('source_platform').notNull(),
  dismissedAt: integer('dismissed_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const knownTracks = sqliteTable('known_tracks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  externalId: text('external_id').notNull(),
  sourcePlatform: text('source_platform').notNull(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  fuzzyKey: text('fuzzy_key').notNull(),
  source: text('source').notNull(), // 'saved' | 'top' | 'recent' | 'playlist' | 'soundcloud_like'
  syncedAt: integer('synced_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const authSessions = sqliteTable('auth_sessions', {
  id: text('id').primaryKey(), // 'spotify', 'beatport', 'soundcloud'
  provider: text('provider').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  spotifyUserId: text('spotify_user_id'), // legacy — use userId instead
  userId: text('user_id'),
  displayName: text('display_name'),
  username: text('username'), // Beatport login username
  encryptedPassword: text('encrypted_password'), // Beatport login password
  clientId: text('client_id'), // SoundCloud client_id
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});
