'use client';

import { useState, type CSSProperties } from 'react';
import { CrateIcon } from '../icons/CrateIcon';

interface LibCardProps {
  title: string;
  artist: string;
  bpm?: number;
  keyStr?: string;
  mood?: string;
  artworkUrl?: string;
  genre?: string;
}

const moodColors: Record<string, string> = {
  hype: 'var(--c-accent)',
  vibes: 'var(--c-genre-afro)',
  smooth: 'rgba(240,234,216,0.45)',
  melodic: 'rgba(240,234,216,0.45)',
  stems: 'rgba(106,160,96,0.9)',
};

const genreTints: Record<string, string> = {
  'Hip-Hop': 'rgba(34,30,20,1)',
  'R&B': 'rgba(30,22,18,1)',
  'Afrobeats': 'rgba(20,24,30,1)',
  'Pop': 'rgba(24,24,24,1)',
};

export function LibCard({ title, artist, bpm, keyStr, mood, artworkUrl, genre }: LibCardProps) {
  const [hovered, setHovered] = useState(false);

  const artBg = genre ? genreTints[genre] || 'var(--c-surface-2)' : 'var(--c-surface-2)';

  const card: CSSProperties = {
    background: 'var(--c-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 10,
    border: hovered ? '1px solid var(--c-border-hover)' : '1px solid var(--c-border)',
    cursor: 'pointer',
    transition: 'border-color 120ms ease',
  };

  const pill: CSSProperties = {
    fontFamily: 'var(--font-meta)',
    fontSize: 11,
    background: 'rgba(240,234,216,0.06)',
    color: 'rgba(240,234,216,0.4)',
    borderRadius: 2,
    padding: '2px 6px',
  };

  return (
    <div
      style={card}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Art square */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: 'var(--radius-xl)',
          background: artBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
          overflow: 'hidden',
        }}
      >
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ opacity: 0.2 }}>
            <CrateIcon size={28} />
          </span>
        )}
      </div>

      {/* Title */}
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
        {title}
      </div>

      {/* Artist */}
      <div
        style={{
          fontFamily: 'var(--font-meta)',
          fontSize: 12,
          color: 'rgba(240,234,216,0.38)',
          marginTop: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {artist}
      </div>

      {/* Tags row */}
      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
        {bpm && <span style={pill}>{bpm} BPM</span>}
        {keyStr && <span style={pill}>{keyStr}</span>}
        {mood && (
          <span
            style={{
              ...pill,
              color: moodColors[mood] || 'rgba(240,234,216,0.4)',
              background: 'rgba(240,234,216,0.06)',
            }}
          >
            {mood}
          </span>
        )}
      </div>
    </div>
  );
}
