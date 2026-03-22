'use client';

import { type CSSProperties } from 'react';
import { ConnectionCard } from './ConnectionCard';
import { BeatportLoginForm } from './BeatportLoginForm';
import { SoundCloudConnectForm } from './SoundCloudConnectForm';
import {
  useSpotifyStatus,
  useSpotifyLogin,
  useDisconnectSpotify,
  useBeatportStatus,
  useDisconnectBeatport,
  useSoundCloudStatus,
  useDisconnectSoundCloud,
} from '@/hooks/use-api';
import { Button } from '@/components/ui/Button';

const containerStyle: CSSProperties = {
  maxWidth: 'var(--app-max-width, 1080px)',
  margin: '0 auto',
  padding: '28px 32px',
};

const sectionLabel: CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'var(--c-text-muted)',
  marginBottom: 16,
};

const pageTitle: CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: 18,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--c-text-primary)',
  marginBottom: 28,
};

export function SettingsView() {
  // Spotify
  const { data: spotifyStatus, isLoading: spotifyLoading } = useSpotifyStatus();
  const spotifyLogin = useSpotifyLogin();
  const disconnectSpotify = useDisconnectSpotify();

  // Beatport
  const { data: beatportStatus, isLoading: beatportLoading } = useBeatportStatus();
  const disconnectBeatport = useDisconnectBeatport();

  // SoundCloud
  const { data: soundcloudStatus, isLoading: soundcloudLoading } = useSoundCloudStatus();
  const disconnectSoundCloud = useDisconnectSoundCloud();

  return (
    <div style={containerStyle}>
      <h1 style={pageTitle}>Settings</h1>

      <div style={sectionLabel}>Music Services</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Spotify */}
        <ConnectionCard
          name="Spotify"
          description="Connect your Spotify account to build your taste profile from listening history"
          connected={spotifyStatus?.connected ?? false}
          isLoading={spotifyLoading}
          userLabel={
            spotifyStatus?.connected
              ? `Connected as ${spotifyStatus.displayName || spotifyStatus.spotifyUserId}`
              : undefined
          }
          badgeVariant="accent"
          onDisconnect={() => disconnectSpotify.mutate()}
          disconnecting={disconnectSpotify.isPending}
        >
          <Button
            variant="primary"
            onClick={() => spotifyLogin.mutate()}
            disabled={spotifyLogin.isPending}
          >
            {spotifyLogin.isPending ? 'Opening...' : 'Connect Spotify'}
          </Button>
        </ConnectionCard>

        {/* Beatport */}
        <ConnectionCard
          name="Beatport"
          description="Log in with your Beatport account to search and discover tracks from their catalog"
          connected={beatportStatus?.connected ?? false}
          isLoading={beatportLoading}
          userLabel={
            beatportStatus?.connected
              ? `Logged in as ${beatportStatus.username}`
              : undefined
          }
          badgeVariant="beatport"
          onDisconnect={() => disconnectBeatport.mutate()}
          disconnecting={disconnectBeatport.isPending}
        >
          <BeatportLoginForm />
        </ConnectionCard>

        {/* SoundCloud */}
        <ConnectionCard
          name="SoundCloud"
          description={
            soundcloudStatus?.searchAvailable
              ? 'SoundCloud search is active. Link your profile to import likes for taste profiling.'
              : 'Link your SoundCloud profile to import likes and discover new music'
          }
          connected={soundcloudStatus?.connected ?? false}
          isLoading={soundcloudLoading}
          userLabel={
            soundcloudStatus?.connected
              ? `Linked as ${soundcloudStatus.username}`
              : soundcloudStatus?.searchAvailable
                ? 'Search active — no profile linked'
                : undefined
          }
          badgeVariant="soundcloud"
          onDisconnect={() => disconnectSoundCloud.mutate()}
          disconnecting={disconnectSoundCloud.isPending}
        >
          <SoundCloudConnectForm />
        </ConnectionCard>
      </div>
    </div>
  );
}
