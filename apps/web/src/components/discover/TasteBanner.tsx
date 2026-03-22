'use client';

import { Badge } from '../ui/Badge';

interface TasteBannerProps {
  connected: boolean;
  trackCount: number;
  syncTime?: string;
  genres: string[];
  onConnect?: () => void;
}

export function TasteBanner({ connected, trackCount, syncTime, genres, onConnect }: TasteBannerProps) {
  const genreVariantMap: Record<string, 'accent' | 'rnb' | 'afro' | 'pop'> = {
    'Hip-Hop': 'accent',
    'R&B': 'rnb',
    'Afrobeats': 'afro',
    'Pop': 'pop',
  };

  return (
    <div
      style={{
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderLeft: '2px solid var(--c-accent)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 18px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: '#221e14',
          fontFamily: 'var(--font-ui)',
          fontSize: 11,
          fontWeight: 800,
          color: '#e8a020',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        DJ
      </div>

      {/* Labels */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 15,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            color: 'var(--c-text-primary)',
          }}
        >
          {connected ? 'Connected to Spotify' : 'Connect Spotify'}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: 12,
            color: 'rgba(240,234,216,0.35)',
            marginTop: 2,
          }}
        >
          {trackCount > 0 ? `${trackCount} tracks found` : 'Sync your taste profile to discover tracks'}{syncTime ? ` \u00B7 synced ${syncTime}` : ''}
        </div>
      </div>

      {/* Genre badges or connect button */}
      {connected ? (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {genres.map((g) => (
            <Badge key={g} variant={genreVariantMap[g] || 'pending'}>
              {g}
            </Badge>
          ))}
        </div>
      ) : (
        <button
          onClick={onConnect}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '7px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--c-accent-bg)',
            color: 'var(--c-accent)',
            border: '1px solid var(--c-accent-border)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Connect
        </button>
      )}
    </div>
  );
}
