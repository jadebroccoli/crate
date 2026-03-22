'use client';

import type { QueueItem as QueueItemType } from '@crate/shared';

interface QueueItemProps {
  item: QueueItemType;
  trackTitle?: string;
  trackArtist?: string;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
}

const statusColors: Record<string, string> = {
  pending: 'text-yellow-400',
  downloading: 'text-blue-400',
  analyzing: 'text-purple-400',
  done: 'text-green-400',
  error: 'text-red-400',
};

export function QueueItemRow({ item, trackTitle, trackArtist, onRetry, onRemove }: QueueItemProps) {
  return (
    <div className="flex items-center gap-4 bg-crate-surface border border-crate-border rounded-lg p-4">
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{trackTitle || 'Unknown Track'}</h3>
        <p className="text-sm text-crate-muted truncate">{trackArtist || 'Unknown Artist'}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs capitalize ${statusColors[item.status] || ''}`}>
          {item.status}
        </span>
        {item.status === 'downloading' && (
          <div className="w-24 h-1.5 bg-crate-border rounded-full overflow-hidden">
            <div
              className="h-full bg-crate-accent rounded-full transition-all"
              style={{ width: `${item.progressPct}%` }}
            />
          </div>
        )}
        {item.status === 'error' && onRetry && (
          <button
            onClick={() => onRetry(item.id)}
            className="px-2 py-1 text-xs border border-crate-border rounded hover:bg-white/5"
          >
            Retry
          </button>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(item.id)}
            className="px-2 py-1 text-xs text-red-400 border border-red-400/30 rounded hover:bg-red-400/10"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
