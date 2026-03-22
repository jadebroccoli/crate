// @ts-expect-error music-metadata types lag behind ESM exports
import { parseFile } from 'music-metadata';
import Anthropic from '@anthropic-ai/sdk';
import { eq } from 'drizzle-orm';
import type { AudioMetadata, Track, MoodTag } from '@crate/shared';
import { db, schema } from '../db/index.js';

const VALID_MOODS: MoodTag[] = ['hype', 'vibes', 'smooth', 'dark', 'chill', 'groovy', 'heavy', 'melodic'];

export class AnalysisService {
  private claude: Anthropic;

  constructor() {
    this.claude = new Anthropic();
  }

  async analyzeFile(filePath: string): Promise<AudioMetadata> {
    try {
      const metadata = await parseFile(filePath);
      return {
        bpm: metadata.common.bpm,
        key: metadata.common.key,
        durationMs: metadata.format.duration
          ? Math.round(metadata.format.duration * 1000)
          : undefined,
        bitrate: metadata.format.bitrate,
        sampleRate: metadata.format.sampleRate,
      };
    } catch (err: any) {
      console.error(`Failed to analyze file ${filePath}:`, err.message);
      return {};
    }
  }

  async inferMoodTag(track: { title?: string; artist?: string; genre?: string }): Promise<MoodTag> {
    try {
      const message = await this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: `Classify this DJ track's mood as exactly one word from: hype, vibes, smooth, dark, chill, groovy, heavy, melodic.\n\nTrack: "${track.title}" by ${track.artist} (${track.genre || 'unknown genre'})\n\nRespond with only the mood word, nothing else.`,
          },
        ],
      });

      const text = (message.content[0].type === 'text' ? message.content[0].text : '').trim().toLowerCase() as MoodTag;
      return VALID_MOODS.includes(text) ? text : 'vibes';
    } catch {
      return 'vibes';
    }
  }

  async tagTrack(trackId: string, filePath: string): Promise<void> {
    // Extract audio metadata from the file
    const audioMeta = await this.analyzeFile(filePath);

    // Get existing track info for mood inference
    const track = await db.query.tracks.findFirst({
      where: eq(schema.tracks.id, trackId),
    });

    // Infer mood tag from track metadata
    const mood = await this.inferMoodTag({
      title: track?.title,
      artist: track?.artist,
      genre: track?.genre ?? undefined,
    });

    // Update track record with all extracted data
    await db.update(schema.tracks).set({
      bpm: audioMeta.bpm ?? track?.bpm,
      key: audioMeta.key ?? track?.key,
      durationMs: audioMeta.durationMs ?? track?.durationMs,
      mood,
      localPath: filePath,
      downloadedAt: new Date(),
    }).where(eq(schema.tracks.id, trackId));
  }
}
