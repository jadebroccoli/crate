'use client';

import { type CSSProperties, useState, useCallback, useRef } from 'react';
import { usePlayerStore } from '@/stores/player.store';
import { CrateIcon } from '../icons/CrateIcon';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface PlayerBarProps {
  onSeek: (fraction: number) => void;
}

export function PlayerBar({ onSeek }: PlayerBarProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const volume = usePlayerStore((s) => s.volume);
  const error = usePlayerStore((s) => s.error);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const setVolume = usePlayerStore((s) => s.setVolume);

  const [playHovered, setPlayHovered] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = progressRef.current?.getBoundingClientRect();
      if (!rect) return;
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(fraction);
    },
    [onSeek],
  );

  const handleVolumeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = volumeRef.current?.getBoundingClientRect();
      if (!rect) return;
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setVolume(fraction);
    },
    [setVolume],
  );

  if (!currentTrack) return null;

  const bar: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    background: 'var(--c-surface)',
    borderTop: '1px solid var(--c-border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    gap: 16,
    zIndex: 100,
  };

  const artStyle: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 4,
    background: 'var(--c-surface-2)',
    flexShrink: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const progressTrack: CSSProperties = {
    flex: 1,
    height: 4,
    background: 'var(--c-surface-2)',
    borderRadius: 2,
    cursor: error ? 'default' : 'pointer',
    position: 'relative',
  };

  const progressFill: CSSProperties = {
    height: '100%',
    background: error ? 'rgba(240,234,216,0.12)' : 'var(--c-accent)',
    borderRadius: 2,
    width: error ? '0%' : `${progress * 100}%`,
    transition: 'width 100ms linear',
  };

  const volumeTrack: CSSProperties = {
    width: 80,
    height: 4,
    background: 'var(--c-surface-2)',
    borderRadius: 2,
    cursor: 'pointer',
    position: 'relative',
    flexShrink: 0,
  };

  const volumeFill: CSSProperties = {
    height: '100%',
    background: 'rgba(240,234,216,0.45)',
    borderRadius: 2,
    width: `${volume * 100}%`,
  };

  return (
    <div style={bar}>
      {/* Artwork */}
      <div style={artStyle}>
        {currentTrack.artworkUrl ? (
          <img
            src={currentTrack.artworkUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ opacity: 0.2 }}>
            <CrateIcon size={14} />
          </span>
        )}
      </div>

      {/* Title + Artist / Error */}
      <div style={{ minWidth: 0, width: 180, flexShrink: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--c-text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {currentTrack.title}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: 11,
            color: error ? 'rgba(255,120,100,0.7)' : 'rgba(240,234,216,0.38)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginTop: 1,
          }}
        >
          {error || currentTrack.artist}
        </div>
      </div>

      {/* Play/Pause */}
      <button
        onClick={togglePlayPause}
        onMouseEnter={() => setPlayHovered(true)}
        onMouseLeave={() => setPlayHovered(false)}
        disabled={!!error}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: error
            ? 'rgba(240,234,216,0.08)'
            : playHovered
              ? '#f0b830'
              : 'var(--c-accent)',
          border: 'none',
          cursor: error ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 120ms ease',
        }}
      >
        <span
          style={{
            fontSize: 14,
            color: error ? 'rgba(240,234,216,0.25)' : 'var(--c-bg)',
            marginLeft: isPlaying ? 0 : 2,
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </span>
      </button>

      {/* Current time */}
      <span
        style={{
          fontFamily: 'var(--font-meta)',
          fontSize: 11,
          color: 'rgba(240,234,216,0.45)',
          flexShrink: 0,
          width: 36,
          textAlign: 'right',
        }}
      >
        {formatTime(currentTime)}
      </span>

      {/* Progress bar */}
      <div ref={progressRef} style={progressTrack} onClick={error ? undefined : handleProgressClick}>
        <div style={progressFill} />
      </div>

      {/* Duration */}
      <span
        style={{
          fontFamily: 'var(--font-meta)',
          fontSize: 11,
          color: 'rgba(240,234,216,0.28)',
          flexShrink: 0,
          width: 36,
        }}
      >
        {formatTime(duration)}
      </span>

      {/* Volume icon */}
      <span
        style={{
          fontSize: 14,
          color: 'rgba(240,234,216,0.38)',
          flexShrink: 0,
        }}
      >
        &#9834;
      </span>

      {/* Volume slider */}
      <div ref={volumeRef} style={volumeTrack} onClick={handleVolumeClick}>
        <div style={volumeFill} />
      </div>
    </div>
  );
}
