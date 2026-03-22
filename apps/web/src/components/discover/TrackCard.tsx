'use client';

import { type CSSProperties, useState } from 'react';
import { CrateIcon } from '../icons/CrateIcon';
import { Badge } from '../ui/Badge';
import { Waveform } from '../ui/Waveform';

export interface TrackCardData {
  id: string;
  title: string;
  artist: string;
  bpm?: number;
  key?: string;
  source: 'beatport' | 'soundcloud' | 'djcity' | 'spotify';
  artworkUrl?: string;
  isTopPick?: boolean;
  genre?: string;
  sourceUrl?: string;
  previewUrl?: string;
  sourcePlatform?: string;
}

const sourceVariantMap: Record<string, 'beatport' | 'soundcloud' | 'djcity' | 'spotify'> = {
  beatport: 'beatport',
  soundcloud: 'soundcloud',
  djcity: 'djcity',
  spotify: 'spotify',
};

interface TrackCardProps {
  track: TrackCardData;
  onStem?: () => void;
  onDownload?: () => void;
  onPlay?: () => void;
  onDismiss?: () => void;
}

export function TrackCard({ track, onStem, onDownload, onPlay, onDismiss }: TrackCardProps) {
  const [hovered, setHovered] = useState(false);
  const [artHovered, setArtHovered] = useState(false);

  const isTopPick = track.isTopPick;
  const genreColor = track.genre === 'R&B' ? 'var(--c-genre-rnb)' : 'var(--c-accent)';

  const card: CSSProperties = {
    background: hovered ? 'var(--c-surface-2)' : 'var(--c-surface)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    transition: 'background 120ms ease',
    cursor: 'pointer',
    borderLeft: isTopPick ? `2px solid ${genreColor}` : undefined,
  };

  return (
    <div
      style={card}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 1. Art thumbnail with play overlay */}
      <div
        style={{
          width: 44,
          height: 44,
          background: 'var(--c-surface-2)',
          borderRadius: 4,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          cursor: onPlay ? 'pointer' : undefined,
        }}
        onMouseEnter={() => setArtHovered(true)}
        onMouseLeave={() => setArtHovered(false)}
        onClick={(e) => {
          if (onPlay) {
            e.stopPropagation();
            onPlay();
          }
        }}
      >
        {track.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: artHovered && onPlay ? 0.4 : 1,
              transition: 'opacity 120ms ease',
            }}
          />
        ) : (
          <span style={{ opacity: 0.2 }}>
            <CrateIcon size={16} />
          </span>
        )}
        {artHovered && onPlay && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 18, color: 'var(--c-text-primary)' }}>&#9654;</span>
          </div>
        )}
      </div>

      {/* 2. Title + artist */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--c-text-primary)',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {track.title}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: 12,
            color: 'rgba(240,234,216,0.38)',
            marginTop: 1,
          }}
        >
          {track.artist}
        </div>
      </div>

      {/* 3. Top pick badge */}
      {isTopPick && <Badge variant="accent">Top pick</Badge>}

      {/* 4. BPM + key */}
      {track.bpm && (
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div
            style={{
              fontFamily: 'var(--font-meta)',
              fontSize: 15,
              fontWeight: 700,
              color: isTopPick ? genreColor : 'rgba(240,234,216,0.45)',
            }}
          >
            {track.bpm}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-meta)',
              fontSize: 11,
              color: 'rgba(240,234,216,0.28)',
              marginTop: 2,
            }}
          >
            BPM {track.key || ''}
          </div>
        </div>
      )}

      {/* 5. Mini waveform */}
      <Waveform trackId={track.id} active={!!isTopPick} color={isTopPick ? genreColor : undefined} />

      {/* 6. Source badge */}
      <Badge variant={sourceVariantMap[track.source] || 'pending'}>
        {track.source}
      </Badge>

      {/* 7. Stems button (S) */}
      <StemButton onClick={onStem} />

      {/* 8. Download button */}
      <DownloadButton onClick={onDownload} />

      {/* 9. Dismiss button */}
      <DismissButton onClick={onDismiss} />
    </div>
  );
}

function StemButton({ onClick }: { onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 30,
        height: 30,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid rgba(232,160,32,0.25)',
        background: hovered ? '#e8a020' : 'rgba(232,160,32,0.1)',
        color: hovered ? '#0e0c08' : '#e8a020',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 800,
        cursor: 'pointer',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 120ms ease',
      }}
    >
      S
    </button>
  );
}

function DownloadButton({ onClick }: { onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 30,
        height: 30,
        borderRadius: 'var(--radius-sm)',
        border: hovered ? '1px solid rgba(240,234,216,0.3)' : '1px solid rgba(240,234,216,0.14)',
        background: hovered ? 'var(--c-surface-2)' : 'transparent',
        color: hovered ? 'var(--c-text-primary)' : 'rgba(240,234,216,0.45)',
        fontSize: 15,
        cursor: 'pointer',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 120ms ease',
      }}
    >
      ↓
    </button>
  );
}

function DismissButton({ onClick }: { onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 30,
        height: 30,
        borderRadius: 'var(--radius-sm)',
        border: hovered ? '1px solid rgba(232,80,80,0.4)' : '1px solid rgba(240,234,216,0.14)',
        background: hovered ? 'rgba(232,80,80,0.12)' : 'transparent',
        color: hovered ? '#e85050' : 'rgba(240,234,216,0.3)',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 120ms ease',
      }}
    >
      ✕
    </button>
  );
}
