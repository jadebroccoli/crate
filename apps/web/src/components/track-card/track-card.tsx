'use client';

import type { RankedTrack } from '@crate/shared';

interface TrackCardProps {
  track: RankedTrack;
  onAddToQueue?: (track: RankedTrack) => void;
}

export function TrackCard({ track, onAddToQueue }: TrackCardProps) {
  return (
    <div className="bg-crate-surface border border-crate-border rounded-lg p-4 hover:border-crate-accent/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{track.title}</h3>
          <p className="text-sm text-crate-muted truncate">{track.artist}</p>
        </div>
        {track.isTopPick && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-crate-accent/20 text-crate-accent rounded-full">
            Top Pick
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-crate-muted">
        {track.bpm && <span>{track.bpm} BPM</span>}
        {track.key && <span>{track.key}</span>}
        {track.genre && <span>{track.genre}</span>}
        {track.mood && <span className="capitalize">{track.mood}</span>}
      </div>
      {track.aiReason && (
        <p className="mt-2 text-xs text-crate-muted italic">{track.aiReason}</p>
      )}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-crate-muted capitalize">{track.sourcePlatform}</span>
        <button
          onClick={() => onAddToQueue?.(track)}
          className="px-3 py-1 text-xs bg-crate-accent text-white rounded hover:bg-crate-accent/80 transition-colors"
        >
          + Queue
        </button>
      </div>
    </div>
  );
}
