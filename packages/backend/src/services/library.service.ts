import { v4 as uuid } from 'uuid';
import { eq, and, gte, lte, like, sql, isNotNull } from 'drizzle-orm';
import type { Track, LibraryStats, LibraryFilters, Playlist, MoodTag } from '@crate/shared';
import { db, schema } from '../db/index.js';

export class LibraryService {
  async getTracks(filters: LibraryFilters): Promise<{ tracks: Track[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];
    if (filters.genre) conditions.push(eq(schema.tracks.genre, filters.genre));
    if (filters.bpmMin) conditions.push(gte(schema.tracks.bpm, filters.bpmMin));
    if (filters.bpmMax) conditions.push(lte(schema.tracks.bpm, filters.bpmMax));
    if (filters.key) conditions.push(eq(schema.tracks.key, filters.key));
    if (filters.mood) conditions.push(eq(schema.tracks.mood, filters.mood));
    if (filters.hasStems) {
      conditions.push(
        sql`(${schema.tracks.hasStemVocals} = 1 OR ${schema.tracks.hasStemInstrumental} = 1 OR ${schema.tracks.hasStemDrums} = 1 OR ${schema.tracks.hasStemBass} = 1)`,
      );
    }
    // Only show tracks that have been downloaded (have a local path)
    conditions.push(isNotNull(schema.tracks.localPath));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db.query.tracks.findMany({
      where,
      limit,
      offset,
      orderBy: (tracks, { desc }) => [desc(tracks.downloadedAt)],
    });

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.tracks)
      .where(where);
    const total = countResult[0]?.count ?? 0;

    return {
      tracks: rows.map(rowToTrack),
      total,
    };
  }

  async getTrackById(id: string): Promise<Track | null> {
    const row = await db.query.tracks.findFirst({
      where: eq(schema.tracks.id, id),
    });
    if (!row) return null;
    return rowToTrack(row);
  }

  async removeTrack(id: string): Promise<void> {
    // Remove from DB only — does NOT delete the file from disk
    await db.delete(schema.tracks).where(eq(schema.tracks.id, id));
  }

  async getStats(): Promise<LibraryStats> {
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.tracks)
      .where(isNotNull(schema.tracks.localPath));

    const stemsResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.tracks)
      .where(
        sql`${schema.tracks.localPath} IS NOT NULL AND (${schema.tracks.hasStemVocals} = 1 OR ${schema.tracks.hasStemInstrumental} = 1 OR ${schema.tracks.hasStemDrums} = 1 OR ${schema.tracks.hasStemBass} = 1)`,
      );

    const playlistResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.playlists);

    const genreResult = await db
      .selectDistinct({ genre: schema.tracks.genre })
      .from(schema.tracks)
      .where(and(isNotNull(schema.tracks.localPath), isNotNull(schema.tracks.genre)));

    return {
      totalTracks: totalResult[0]?.count ?? 0,
      withStems: stemsResult[0]?.count ?? 0,
      playlists: playlistResult[0]?.count ?? 0,
      genres: genreResult.map((r) => r.genre!).filter(Boolean),
    };
  }

  async getPlaylists(): Promise<Playlist[]> {
    const rows = await db.query.playlists.findMany({
      orderBy: (playlists, { desc }) => [desc(playlists.createdAt)],
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      createdAt: row.createdAt!,
    }));
  }

  async createPlaylist(name: string, description?: string): Promise<Playlist> {
    const id = uuid();
    const now = new Date();

    await db.insert(schema.playlists).values({
      id,
      name,
      description,
      createdAt: now,
    });

    return { id, name, description, createdAt: now };
  }

  // Upsert a track record (used when adding from discover/queue)
  async upsertTrack(data: {
    id?: string;
    title: string;
    artist: string;
    remixer?: string;
    label?: string;
    bpm?: number;
    key?: string;
    genre?: string;
    subgenre?: string;
    sourceUrl?: string;
    sourcePlatform?: string;
    artworkUrl?: string;
    releaseDate?: string;
  }): Promise<string> {
    const id = data.id || uuid();

    await db.insert(schema.tracks).values({
      id,
      title: data.title,
      artist: data.artist,
      remixer: data.remixer,
      label: data.label,
      bpm: data.bpm,
      key: data.key,
      genre: data.genre,
      subgenre: data.subgenre,
      sourceUrl: data.sourceUrl,
      sourcePlatform: data.sourcePlatform,
      artworkUrl: data.artworkUrl,
      releaseDate: data.releaseDate,
      createdAt: new Date(),
    }).onConflictDoUpdate({
      target: schema.tracks.id,
      set: {
        bpm: data.bpm,
        key: data.key,
        genre: data.genre,
        subgenre: data.subgenre,
        artworkUrl: data.artworkUrl,
      },
    });

    return id;
  }
}

function rowToTrack(row: any): Track {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    remixer: row.remixer ?? undefined,
    label: row.label ?? undefined,
    bpm: row.bpm ?? undefined,
    key: row.key ?? undefined,
    energy: row.energy ?? undefined,
    durationMs: row.durationMs ?? undefined,
    genre: row.genre ?? undefined,
    subgenre: row.subgenre ?? undefined,
    mood: (row.mood as MoodTag) ?? undefined,
    sourceUrl: row.sourceUrl ?? undefined,
    sourcePlatform: row.sourcePlatform ?? undefined,
    localPath: row.localPath ?? undefined,
    hasStemVocals: row.hasStemVocals ?? false,
    hasStemInstrumental: row.hasStemInstrumental ?? false,
    hasStemDrums: row.hasStemDrums ?? false,
    hasStemBass: row.hasStemBass ?? false,
    artworkUrl: row.artworkUrl ?? undefined,
    releaseDate: row.releaseDate ?? undefined,
    downloadedAt: row.downloadedAt ?? undefined,
    createdAt: row.createdAt,
  };
}
