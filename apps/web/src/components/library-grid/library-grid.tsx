'use client';

import type { Track } from '@crate/shared';

interface LibraryGridProps {
  tracks: Track[];
}

export function LibraryGrid({ tracks }: LibraryGridProps) {
  if (tracks.length === 0) {
    return (
      <div className="text-center py-12 text-crate-muted">
        <p>No tracks in your library yet.</p>
        <p className="text-sm mt-1">Head to Discover to find new music.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tracks.map((track) => (
        <div
          key={track.id}
          className="bg-crate-surface border border-crate-border rounded-lg p-4"
        >
          <h3 className="font-medium truncate">{track.title}</h3>
          <p className="text-sm text-crate-muted truncate">{track.artist}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-crate-muted">
            {track.bpm && <span>{track.bpm} BPM</span>}
            {track.key && <span>{track.key}</span>}
            {track.genre && <span>{track.genre}</span>}
            {track.mood && <span className="capitalize">{track.mood}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
