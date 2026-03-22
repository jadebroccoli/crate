'use client';

import { useState, useMemo } from 'react';
import { TasteBanner } from './TasteBanner';
import { FilterRow } from './FilterRow';
import { TrackCard, type TrackCardData } from './TrackCard';
import { CrateLoader } from './CrateLoader';
import { Button } from '../ui/Button';
import { useDiscoverFeed, useTasteProfile, useAddToQueue, useSpotifyLogin, useDismissTrack } from '@/hooks/use-api';
import { usePlayerStore } from '@/stores/player.store';
import type { RankedTrack, DiscoveryFilters } from '@crate/shared';

const SOURCES = ['Beatport', 'SoundCloud', 'Spotify'];
const FILTERS = ['Stems only', 'New this week'];

function rankedToCard(t: RankedTrack): TrackCardData {
  return {
    id: t.externalId,
    title: t.title,
    artist: t.artist,
    bpm: t.bpm,
    key: t.key,
    source: t.sourcePlatform,
    artworkUrl: t.artworkUrl,
    isTopPick: t.isTopPick,
    genre: t.genre,
    sourceUrl: t.sourceUrl,
    previewUrl: t.previewUrl,
    sourcePlatform: t.sourcePlatform,
  };
}

function timeAgo(date?: Date | string): string | undefined {
  if (!date) return undefined;
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function DiscoverView() {
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set(SOURCES));
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  // Build API filters from UI state
  const filters = useMemo<DiscoveryFilters>(() => {
    const f: DiscoveryFilters = {};
    if (activeSources.size === 1) {
      const src = [...activeSources][0].toLowerCase();
      f.source = src as DiscoveryFilters['source'];
    }
    if (activeFilters.has('Stems only')) f.stemsOnly = true;
    return f;
  }, [activeSources, activeFilters]);

  const { data: profile, isLoading: profileLoading } = useTasteProfile();
  const { data: feedData, isLoading: feedLoading, error: feedError } = useDiscoverFeed(filters, !!profile);
  const addToQueue = useAddToQueue();
  const dismissTrack = useDismissTrack();
  const spotifyLogin = useSpotifyLogin();
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const playTrack = usePlayerStore((s) => s.play);

  const tracks: TrackCardData[] = (feedData?.tracks || []).map(rankedToCard);

  // Derive genre names from taste profile
  const genres = profile?.genreBreakdown
    ? Object.entries(profile.genreBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name)
    : [];

  const toggle = (set: Set<string>, val: string): Set<string> => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    return next;
  };

  const handleDownload = (track: TrackCardData) => {
    addToQueue.mutate({
      title: track.title,
      artist: track.artist,
      sourceUrl: track.sourceUrl,
      sourcePlatform: track.source,
      bpm: track.bpm,
      key: track.key,
      artworkUrl: track.artworkUrl,
      genre: track.genre,
      wantFullTrack: true,
    });
  };

  const handleDownloadWithStems = (track: TrackCardData) => {
    addToQueue.mutate({
      title: track.title,
      artist: track.artist,
      sourceUrl: track.sourceUrl,
      sourcePlatform: track.source,
      bpm: track.bpm,
      key: track.key,
      artworkUrl: track.artworkUrl,
      genre: track.genre,
      wantFullTrack: true,
      wantStemVocals: true,
      wantStemInstrumental: true,
    });
  };

  const handlePlay = (track: TrackCardData) => {
    playTrack({
      id: track.id,
      title: track.title,
      artist: track.artist,
      artworkUrl: track.artworkUrl,
      previewUrl: track.previewUrl,
      sourcePlatform: track.sourcePlatform || track.source,
    });
  };

  const handleDismiss = (track: TrackCardData) => {
    const trackKey = track.id;
    setDismissingIds((prev) => new Set(prev).add(trackKey));
    setTimeout(() => {
      dismissTrack.mutate({
        externalId: track.id,
        sourcePlatform: track.sourcePlatform || track.source,
      });
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(trackKey);
        return next;
      });
    }, 250);
  };

  const handleAddAllToQueue = () => {
    tracks.forEach((t) => handleDownload(t));
  };

  const handleDownloadAllWithStems = () => {
    tracks.forEach((t) => handleDownloadWithStems(t));
  };

  return (
    <div>
      <TasteBanner
        connected={!!profile}
        trackCount={tracks.length}
        syncTime={timeAgo(profile?.lastSyncedAt)}
        genres={genres}
        onConnect={() => spotifyLogin.mutate()}
      />

      <FilterRow
        sources={SOURCES}
        activeSources={activeSources}
        onToggleSource={(s) => setActiveSources(toggle(activeSources, s))}
        filters={FILTERS}
        activeFilters={activeFilters}
        onToggleFilter={(f) => setActiveFilters(toggle(activeFilters, f))}
      />

      {/* Loading state */}
      {(feedLoading || profileLoading) && <CrateLoader />}

      {/* Section label */}
      {!feedLoading && !profileLoading && (
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'rgba(240,234,216,0.28)',
            marginBottom: 10,
          }}
        >
          {`AI picks for you \u00B7 ${tracks.length} tracks`}
        </div>
      )}

      {/* Track list */}
      {!feedLoading && !profileLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tracks.map((track) => {
            const isDismissing = dismissingIds.has(track.id);
            return (
              <div
                key={track.id}
                style={{
                  opacity: isDismissing ? 0 : 1,
                  maxHeight: isDismissing ? 0 : 200,
                  overflow: 'hidden',
                  transition: 'opacity 200ms ease, max-height 200ms ease',
                }}
              >
                <TrackCard
                  track={track}
                  onDownload={() => handleDownload(track)}
                  onStem={() => handleDownloadWithStems(track)}
                  onPlay={() => handlePlay(track)}
                  onDismiss={() => handleDismiss(track)}
                />
              </div>
            );
          })}
          {tracks.length === 0 && (
            <div
              style={{
                fontFamily: 'var(--font-meta)',
                fontSize: 13,
                color: 'rgba(240,234,216,0.35)',
                textAlign: 'center',
                padding: '40px 0',
              }}
            >
              {profile
                ? 'No tracks found. Try adjusting your filters.'
                : 'Connect Spotify in Taste Profile to get AI recommendations.'}
            </div>
          )}
        </div>
      )}

      {/* Bottom action row */}
      {tracks.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={handleAddAllToQueue}>
            Add all to queue ↓
          </Button>
          <Button variant="primary" onClick={handleDownloadAllWithStems}>
            Download all with stems
          </Button>
        </div>
      )}
    </div>
  );
}
