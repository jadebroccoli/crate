'use client';

import { useMemo, type CSSProperties } from 'react';
import { GenreBar } from './GenreBar';
import { Button } from '../ui/Button';
import { useTasteProfile, useSyncTaste, useSpotifyStatus, useSpotifyLogin, useDisconnectSpotify } from '@/hooks/use-api';
import { useTasteStore } from '@/stores/taste.store';

const GENRE_COLORS: Record<string, string> = {
  // Core genres
  'Hip-Hop': '#e8a020',
  'Hip-Hop / Rap': '#e8a020',
  'Rap': '#e8a020',
  'Trap': '#d4911a',
  'R&B': '#c46c34',
  'R&B / Soul': '#c46c34',
  'Soul': '#c46c34',
  'Afrobeats': '#6c8cc4',
  'Afro House': '#5e80b8',
  'Amapiano': '#7a9cd4',

  // Pop / K-Pop / J-Pop
  'Pop': '#d4a0d0',
  'Pop (crossover)': '#d4a0d0',
  'K-Pop': '#e86cb4',
  'J-Pop': '#e88cb4',
  'Dance Pop': '#c87ce0',
  'Electropop': '#a878d8',
  'Synth Pop': '#b480d0',
  'Indie Pop': '#d0a0c0',

  // Electronic / Dance
  'Electronic': '#58c8e0',
  'Electronic Pop': '#70b8e0',
  'EDM': '#50b0d8',
  'House': '#4cc8a0',
  'Deep House': '#3cb890',
  'Tech House': '#5cd8a8',
  'Techno': '#60d0c0',
  'Trance': '#48c0e8',
  'Drum & Bass': '#38b8b0',
  'Dubstep': '#6878d0',
  'Future Bass': '#8090e0',
  'Future House': '#60a8d8',
  'Bass House': '#50c0b0',
  'Progressive House': '#58b8c8',
  'Melodic House': '#68c8b8',

  // Latin / Reggaeton
  'Reggaeton': '#e0c040',
  'Latin': '#d8b838',
  'Dancehall': '#d0a830',
  'Baile Funk': '#c89828',

  // Other
  'Funk': '#d89040',
  'Disco': '#e0a860',
  'Jersey Club': '#c88050',
  'Lofi': '#90a8b0',
  'Alternative': '#a0a0b8',
  'Rock': '#b87868',
  'Indie': '#a89880',
  'Jazz': '#c8a870',
  'Classical': '#a0b0b8',
  'Country': '#c8a060',
  'Reggae': '#68b868',
  'Gospel': '#d0b880',
};

// Fallback: generate a deterministic color from genre name
function genreColor(genre: string): string {
  if (GENRE_COLORS[genre]) return GENRE_COLORS[genre];
  // Hash the genre name to a hue
  let hash = 0;
  for (let i = 0; i < genre.length; i++) {
    hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 55%, 60%)`;
}

function energyLabel(val?: number): string {
  if (val == null) return '—';
  if (val >= 0.75) return 'High';
  if (val >= 0.5) return 'Medium-high';
  if (val >= 0.25) return 'Medium';
  return 'Low';
}

const sectionLabel: CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'rgba(240,234,216,0.28)',
  marginBottom: 8,
};

const cardStyle: CSSProperties = {
  background: 'var(--c-surface)',
  borderRadius: 'var(--radius-lg)',
  padding: '14px 16px',
  marginBottom: 12,
  border: '1px solid var(--c-border)',
};

export function TasteView() {
  const { data: profile, isLoading } = useTasteProfile();
  const isSyncing = useTasteStore((s) => s.isSyncing);
  const syncTaste = useSyncTaste();
  const { data: spotifyStatus } = useSpotifyStatus();
  const spotifyLogin = useSpotifyLogin();
  const disconnectSpotify = useDisconnectSpotify();

  // Build genre rows from profile
  const genreRows = useMemo(() => {
    if (!profile?.genreBreakdown) return [];
    return Object.entries(profile.genreBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([name, confidence]) => ({
        label: name,
        pct: Math.round(confidence * 100),
        color: genreColor(name),
      }));
  }, [profile]);

  // Build preference rows from profile
  const prefRows = useMemo(() => {
    if (!profile) return [];
    const rows: { key: string; value: string; accent: boolean }[] = [];
    if (profile.bpmMin || profile.bpmMax) {
      rows.push({
        key: 'BPM sweet spot',
        value: `${profile.bpmMin ?? '?'} \u2013 ${profile.bpmMax ?? '?'}`,
        accent: true,
      });
    }
    if (profile.preferredKeys?.length) {
      rows.push({
        key: 'Preferred keys',
        value: profile.preferredKeys.join(', '),
        accent: true,
      });
    }
    rows.push({
      key: 'Energy level',
      value: energyLabel(profile.energyPreference),
      accent: false,
    });
    if (profile.stemPreferences?.length) {
      rows.push({
        key: 'Stem priority',
        value: profile.stemPreferences.join(' + '),
        accent: false,
      });
    }
    if (profile.editPreferences?.length) {
      rows.push({
        key: 'Edit preference',
        value: profile.editPreferences.join(', '),
        accent: false,
      });
    }
    return rows;
  }, [profile]);

  return (
    <div>
      {/* Intro line */}
      <div
        style={{
          fontFamily: 'var(--font-meta)',
          fontSize: 13,
          color: 'rgba(240,234,216,0.35)',
          marginBottom: 16,
        }}
      >
        {profile?.aiSummary || 'Built from your Spotify listening history + manual feedback'}
      </div>

      {isLoading && (
        <div
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: 13,
            color: 'rgba(240,234,216,0.35)',
            padding: '40px 0',
            textAlign: 'center',
          }}
        >
          Loading taste profile...
        </div>
      )}

      {!isLoading && !profile && (
        <div
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: 13,
            color: 'rgba(240,234,216,0.35)',
            padding: '40px 0',
            textAlign: 'center',
          }}
        >
          No taste profile yet. Connect Spotify and sync to get started.
        </div>
      )}

      {/* Genre breakdown */}
      {genreRows.length > 0 && (
        <>
          <div style={sectionLabel}>Genre breakdown</div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {genreRows.map((g) => (
                <GenreBar key={g.label} label={g.label} percent={g.pct} color={g.color} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Preferences */}
      {prefRows.length > 0 && (
        <>
          <div style={sectionLabel}>Preferences</div>
          <div style={cardStyle}>
            {prefRows.map((pref, i) => (
              <div
                key={pref.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '5px 0',
                  borderBottom:
                    i < prefRows.length - 1 ? '1px solid rgba(240,234,216,0.06)' : undefined,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'rgba(240,234,216,0.45)',
                  }}
                >
                  {pref.key}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-meta)',
                    fontSize: 13,
                    color: pref.accent ? 'var(--c-accent)' : 'rgba(240,234,216,0.6)',
                  }}
                >
                  {pref.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Sync error */}
      {syncTaste.isError && (
        <div
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: 13,
            color: '#e05050',
            background: 'rgba(224,80,80,0.08)',
            border: '1px solid rgba(224,80,80,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: 12,
          }}
        >
          Sync failed: {syncTaste.error instanceof Error ? syncTaste.error.message : 'Unknown error'}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 7, marginTop: 16, flexWrap: 'wrap' }}>
        {spotifyStatus?.connected ? (
          <>
            <Button
              variant="primary"
              onClick={() => syncTaste.mutate()}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Re-sync Spotify'}
            </Button>
            <Button variant="ghost" onClick={() => disconnectSpotify.mutate()}>
              Disconnect Spotify
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            onClick={() => spotifyLogin.mutate()}
            disabled={spotifyLogin.isPending}
          >
            {spotifyLogin.isPending ? 'Opening...' : 'Connect Spotify'}
          </Button>
        )}
        <Button variant="ghost">Add manual preference &#x2197;</Button>
      </div>
    </div>
  );
}
