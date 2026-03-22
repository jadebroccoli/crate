import Anthropic from '@anthropic-ai/sdk';
import type { RawTrack, RankedTrack, TasteProfile, MoodTag } from '@crate/shared';

const VALID_MOODS: MoodTag[] = ['hype', 'vibes', 'smooth', 'dark', 'chill', 'groovy', 'heavy', 'melodic'];

const SYSTEM_PROMPT = `You are a DJ music curator AI. You will receive:
1. A DJ's taste profile (genre preferences, BPM range, energy level, preferred keys)
2. An array of candidate tracks with metadata

Your job is to score each track 0-100 based on how well it matches the taste profile, assign a one-word mood tag, and flag the top 3 as "top picks".

Scoring guidelines:
- Genre match is the strongest signal (0-40 points)
- BPM within preferred range adds up to 20 points
- Key compatibility (Camelot wheel proximity) adds up to 15 points
- Energy match adds up to 15 points
- Novelty/discovery bonus for interesting finds: up to 10 points

Mood tags must be exactly one of: hype, vibes, smooth, dark, chill, groovy, heavy, melodic

Return a JSON array of objects with these fields:
- index: the 0-based index of the track in the input array
- score: integer 0-100
- mood: one of the valid mood tags
- isTopPick: boolean (exactly 3 should be true)
- reason: a short (under 15 words) explanation of why this track fits

Return ONLY the JSON array, no markdown fences, no explanation.`;

export class TrackRanker {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async rank(candidates: RawTrack[], profile: TasteProfile): Promise<RankedTrack[]> {
    if (candidates.length === 0) return [];

    // Build compact candidate list for the prompt
    const compactCandidates = candidates.map((c, i) => ({
      index: i,
      title: c.title,
      artist: c.artist,
      bpm: c.bpm,
      key: c.key,
      genre: c.genre,
      subgenre: c.subgenre,
      source: c.sourcePlatform,
      mix: c.mixName,
    }));

    const profileSummary = {
      genres: profile.genreBreakdown,
      bpmRange: [profile.bpmMin, profile.bpmMax],
      energy: profile.energyPreference,
      preferredKeys: profile.preferredKeys,
      editPrefs: profile.editPreferences,
      summary: profile.aiSummary,
    };

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Taste profile:\n${JSON.stringify(profileSummary, null, 2)}\n\nCandidate tracks:\n${JSON.stringify(compactCandidates, null, 2)}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    let rankings: {
      index: number;
      score: number;
      mood: string;
      isTopPick: boolean;
      reason: string;
    }[];

    try {
      // Strip markdown fences if present
      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      // Extract JSON array if there's surrounding text
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        cleaned = arrayMatch[0];
      }
      rankings = JSON.parse(cleaned);
    } catch {
      // If parsing fails entirely, return unranked results rather than crashing
      console.error('[track-ranker] Failed to parse response, returning unranked:', text.slice(0, 300));
      return candidates.map((c) => ({
        ...c,
        score: 50,
        mood: 'vibes' as MoodTag,
        isTopPick: false,
        aiReason: undefined,
      }));
    }

    // Merge rankings back into candidates
    const rankedTracks: RankedTrack[] = candidates.map((candidate, i) => {
      const ranking = rankings.find((r) => r.index === i);
      const mood = ranking?.mood as MoodTag;
      return {
        ...candidate,
        score: ranking?.score ?? 0,
        mood: VALID_MOODS.includes(mood) ? mood : 'vibes',
        isTopPick: ranking?.isTopPick ?? false,
        aiReason: ranking?.reason,
      };
    });

    // Sort by score descending
    rankedTracks.sort((a, b) => b.score - a.score);
    return rankedTracks;
  }
}
