'use client';

import type { TasteProfile } from '@crate/shared';

interface TasteBannerProps {
  profile: TasteProfile | null;
  onSync?: () => void;
}

export function TasteBanner({ profile, onSync }: TasteBannerProps) {
  if (!profile) {
    return (
      <div className="bg-crate-surface border border-crate-border rounded-lg p-6 mb-6">
        <h2 className="font-bold mb-2">Connect Spotify to get started</h2>
        <p className="text-sm text-crate-muted mb-4">
          We'll analyze your listening history to find tracks you'll love.
        </p>
        <button
          onClick={onSync}
          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-400 transition-colors"
        >
          Connect Spotify
        </button>
      </div>
    );
  }

  return (
    <div className="bg-crate-surface border border-crate-border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">Your Taste Profile</h2>
        <button
          onClick={onSync}
          className="px-3 py-1 text-xs border border-crate-border rounded hover:bg-white/5"
        >
          Re-sync
        </button>
      </div>
      {profile.aiSummary && (
        <p className="text-sm text-crate-muted">{profile.aiSummary}</p>
      )}
      <div className="flex gap-2 mt-3 flex-wrap">
        {Object.entries(profile.genreBreakdown)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([genre, score]) => (
            <span
              key={genre}
              className="px-2 py-1 text-xs bg-crate-accent/10 text-crate-accent rounded-full"
            >
              {genre} ({Math.round(score * 100)}%)
            </span>
          ))}
      </div>
    </div>
  );
}
