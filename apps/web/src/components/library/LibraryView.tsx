'use client';

import { useState, useMemo, type CSSProperties } from 'react';
import { StatCard } from './StatCard';
import { LibCard } from './LibCard';
import { useLibraryTracks, useLibraryStats } from '@/hooks/use-api';
import type { LibraryFilters, Track } from '@crate/shared';

const FILTER_CHIPS = ['All', 'Hip-Hop', 'R&B', 'Afrobeats', 'Has stems', 'High energy'];

const chipBase: CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '3px 10px',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  transition: 'all 120ms ease',
};

function chipToFilters(chip: string): LibraryFilters {
  switch (chip) {
    case 'Hip-Hop':
      return { genre: 'Hip-Hop' };
    case 'R&B':
      return { genre: 'R&B' };
    case 'Afrobeats':
      return { genre: 'Afrobeats' };
    case 'Has stems':
      return { hasStems: true };
    case 'High energy':
      return { mood: 'hype' };
    default:
      return {};
  }
}

export function LibraryView() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = useMemo(() => chipToFilters(activeFilter), [activeFilter]);
  const { data: statsData } = useLibraryStats();
  const { data: tracksData, isLoading } = useLibraryTracks(filters);

  const stats = statsData ?? { totalTracks: 0, withStems: 0, playlists: 0, genres: [] };
  const tracks: Track[] = (tracksData as any)?.tracks || [];

  return (
    <div>
      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <StatCard value={stats.totalTracks} label="Total tracks" />
        <StatCard value={stats.withStems} label="With stems" />
        <StatCard value={stats.playlists} label="Playlists" />
        <StatCard value={Array.isArray(stats.genres) ? stats.genres.length : stats.genres} label="Genres" />
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip;
          return (
            <button
              key={chip}
              onClick={() => setActiveFilter(chip)}
              style={{
                ...chipBase,
                background: isActive ? 'var(--c-text-primary)' : 'var(--c-status-pending-bg)',
                color: isActive ? 'var(--c-bg)' : 'var(--c-status-pending)',
                border: isActive
                  ? '1px solid var(--c-text-primary)'
                  : '1px solid var(--c-status-pending-border)',
              }}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* Track grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 8,
        }}
      >
        {tracks.map((track) => (
          <LibCard
            key={track.id}
            title={track.title}
            artist={track.artist}
            bpm={track.bpm}
            keyStr={track.key}
            mood={track.mood}
            genre={track.genre}
            artworkUrl={track.artworkUrl}
          />
        ))}
      </div>

      {!isLoading && tracks.length === 0 && (
        <div
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: 13,
            color: 'rgba(240,234,216,0.35)',
            textAlign: 'center',
            padding: '40px 0',
          }}
        >
          No tracks in your library yet. Download some from the Discover tab.
        </div>
      )}
    </div>
  );
}
