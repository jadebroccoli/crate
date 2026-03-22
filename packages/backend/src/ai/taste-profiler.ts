import Anthropic from '@anthropic-ai/sdk';
import type { RawListeningData } from '@crate/shared';

interface SynthesizedProfile {
  genreBreakdown: Record<string, number>;
  bpmMin: number;
  bpmMax: number;
  preferredKeys: string[];
  energyPreference: number;
  stemPreferences: string[];
  editPreferences: string[];
  aiSummary: string;
}

const SYSTEM_PROMPT = `You are a music taste analyst for DJs. You will receive a DJ's Spotify listening data (top tracks, top artists, and recently played tracks). Your job is to synthesize this into a structured taste profile.

Analyze the data and return a JSON object with exactly these fields:
- genreBreakdown: object mapping genre names to confidence scores (0.0 to 1.0), focusing on DJ-relevant genres (Hip-Hop, R&B, Afrobeats, House, Techno, Pop, Latin, Dancehall, Amapiano, Drill, Jersey Club, etc.)
- bpmMin: estimated minimum preferred BPM (integer)
- bpmMax: estimated maximum preferred BPM (integer)
- preferredKeys: array of preferred Camelot keys (e.g. ["2A", "1A", "4A"]) — infer from genres/energy
- energyPreference: float 0.0-1.0 representing preferred energy level
- stemPreferences: array of preferred stem types (from: "vocals", "instrumental", "drums", "bass")
- editPreferences: array of preferred edit types (from: "clean", "dirty", "dj-edit", "transition", "extended", "radio", "acapella", "instrumental")
- aiSummary: a 2-3 sentence natural language summary of this DJ's taste, written in second person ("You tend to...")

Return ONLY the JSON object, no markdown fences, no explanation.`;

export class TasteProfiler {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async synthesize(rawData: RawListeningData): Promise<SynthesizedProfile> {
    // Compact the data to reduce token usage
    const compactData = {
      topTracks: rawData.topTracks.slice(0, 50).map((t) => ({
        name: t.name,
        artists: t.artists.map((a) => a.name),
        popularity: t.popularity,
      })),
      topArtists: rawData.topArtists.slice(0, 30).map((a) => ({
        name: a.name,
        genres: a.genres,
        popularity: a.popularity,
      })),
      recentlyPlayed: rawData.recentlyPlayed.slice(0, 30).map((t) => ({
        name: t.name,
        artists: t.artists.map((a) => a.name),
      })),
    };

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is the DJ's Spotify listening data:\n\n${JSON.stringify(compactData, null, 2)}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    try {
      const profile = JSON.parse(text) as SynthesizedProfile;
      return profile;
    } catch {
      throw new Error(`Failed to parse Claude taste profile response: ${text.slice(0, 200)}`);
    }
  }
}
