'use client';

import { type CSSProperties } from 'react';
import { CrateIcon } from '../icons/CrateIcon';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';

export interface QueueItemData {
  id: string;
  title: string;
  artist: string;
  source: string;
  fileSize: string;
  status: 'downloading' | 'pending' | 'done' | 'error';
  progress: number;
  stems: {
    full: boolean;
    vocals: boolean;
    instrumental: boolean;
    drums: boolean;
    bass: boolean;
  };
  savedTo?: string | null;
  artworkUrl?: string;
}

const stemKeys = [
  { key: 'full', label: 'Full track' },
  { key: 'vocals', label: 'Vocals stem' },
  { key: 'instrumental', label: 'Instrumental' },
  { key: 'drums', label: 'Drums stem' },
  { key: 'bass', label: 'Bass stem' },
] as const;

const statusVariantMap: Record<string, 'download' | 'pending' | 'done' | 'error'> = {
  downloading: 'download',
  pending: 'pending',
  done: 'done',
  error: 'error',
};

const statusLabels: Record<string, string> = {
  downloading: 'Downloading',
  pending: 'Pending',
  done: 'Done',
  error: 'Error',
};

interface QueueItemProps {
  item: QueueItemData;
  onToggleStem?: (stemKey: string) => void;
}

export function QueueItem({ item, onToggleStem }: QueueItemProps) {
  const card: CSSProperties = {
    background: 'var(--c-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px 18px',
    border: '1px solid var(--c-border)',
    marginBottom: 8,
  };

  return (
    <div style={card}>
      {/* Item header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {/* Art thumbnail */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 4,
            background: 'var(--c-surface-2)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {item.artworkUrl ? (
            <img
              src={item.artworkUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ opacity: 0.2 }}>
              <CrateIcon size={14} />
            </span>
          )}
        </div>

        {/* Title block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--c-text-primary)',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.title} — {item.artist}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-meta)',
              fontSize: 12,
              color: 'rgba(240,234,216,0.35)',
              marginTop: 1,
            }}
          >
            From {item.source} &middot; {item.fileSize}
          </div>
        </div>

        {/* Status badge */}
        <Badge variant={statusVariantMap[item.status] || 'pending'}>
          {statusLabels[item.status]}
        </Badge>
      </div>

      {/* Progress bar */}
      <ProgressBar percent={item.progress} done={item.status === 'done'} />

      {/* Stem toggles or done message */}
      {item.status === 'done' && item.savedTo ? (
        <div
          style={{
            marginTop: 7,
            fontFamily: 'var(--font-meta)',
            fontSize: 12,
            color: 'var(--c-status-done)',
          }}
        >
          Saved to {item.savedTo} &middot; tagged automatically
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
          {stemKeys.map((stem) => {
            const isOn = item.stems[stem.key as keyof typeof item.stems];
            return (
              <Badge
                key={stem.key}
                variant={isOn ? 'solid' : 'pending'}
                onClick={() => onToggleStem?.(stem.key)}
              >
                {stem.label}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
