'use client';

import { Topbar } from './Topbar';
import { TabBar } from './TabBar';
import { PlayerBar } from '../player/PlayerBar';
import { useQueueSSE } from '@/hooks/use-queue-sse';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useQueueStore } from '@/stores/queue.store';
import { usePlayerStore } from '@/stores/player.store';

export function AppShell({ children }: { children: React.ReactNode }) {
  // Connect SSE for live queue progress at the app root
  useQueueSSE();

  // Global audio player
  const { seek } = useAudioPlayer();
  const hasTrack = usePlayerStore((s) => !!s.currentTrack);

  const queueCount = useQueueStore((s) =>
    s.items.filter((i) => i.status !== 'done').length,
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Topbar />
      <TabBar queueCount={queueCount} />
      <main
        className="flex-1 overflow-y-auto mx-auto w-full"
        style={{
          maxWidth: 'var(--app-max-width)',
          padding: '28px 32px',
          paddingBottom: hasTrack ? 92 : 28,
        }}
      >
        {children}
      </main>
      <PlayerBar onSeek={seek} />
    </div>
  );
}
