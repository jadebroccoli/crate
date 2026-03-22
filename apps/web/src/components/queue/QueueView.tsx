'use client';

import { useState, useMemo } from 'react';
import { QueueItem as QueueItemComponent, type QueueItemData } from './QueueItem';
import { Badge } from '../ui/Badge';
import { useQueue, useRemoveFromQueue, useRetryQueueItem } from '@/hooks/use-api';
import { useQueueStore } from '@/stores/queue.store';
import type { QueueItem } from '@crate/shared';

/** Merge API data with live SSE updates from the Zustand store */
function mergeWithStore(apiItems: QueueItem[], storeItems: QueueItem[]): QueueItemData[] {
  return apiItems.map((item) => {
    const live = storeItems.find((s) => s.id === item.id);
    const merged = live ?? item;
    return {
      id: merged.id,
      title: '', // Backend QueueItem doesn't include title — we'll use trackId as fallback
      artist: '',
      source: '',
      fileSize: '',
      status: merged.status as QueueItemData['status'],
      progress: merged.progressPct,
      stems: {
        full: merged.wantFullTrack,
        vocals: merged.wantStemVocals,
        instrumental: merged.wantStemInstrumental,
        drums: merged.wantStemDrums,
        bass: merged.wantStemBass,
      },
      savedTo: merged.status === 'done' ? '/Library' : undefined,
    };
  });
}

export function QueueView() {
  const [autoOrg, setAutoOrg] = useState(true);
  const [autoTag, setAutoTag] = useState(true);

  const { data: queueData, isLoading } = useQueue();
  const storeItems = useQueueStore((s) => s.items);
  const removeFromQueue = useRemoveFromQueue();
  const retryItem = useRetryQueueItem();

  const items = useMemo(
    () => mergeWithStore(queueData?.items || [], storeItems),
    [queueData?.items, storeItems],
  );

  const activeCount = items.filter((q) => q.status !== 'done').length;

  return (
    <div>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 24,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              color: 'var(--c-text-primary)',
            }}
          >
            Download queue
          </div>
          <div
            style={{
              fontFamily: 'var(--font-meta)',
              fontSize: 12,
              color: 'rgba(240,234,216,0.35)',
              marginTop: 2,
            }}
          >
            {isLoading
              ? 'Loading...'
              : `${items.length} tracks \u00B7 ${activeCount} active \u00B7 auto-organize ${autoOrg ? 'on' : 'off'}`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 5 }}>
          <Badge
            variant={autoOrg ? 'accent' : 'pending'}
            onClick={() => setAutoOrg(!autoOrg)}
          >
            Auto-organize
          </Badge>
          <Badge
            variant={autoTag ? 'accent' : 'pending'}
            onClick={() => setAutoTag(!autoTag)}
          >
            Auto-tag
          </Badge>
        </div>
      </div>

      {/* Queue items */}
      {items.map((item) => (
        <QueueItemComponent key={item.id} item={item} />
      ))}

      {!isLoading && items.length === 0 && (
        <div
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: 13,
            color: 'rgba(240,234,216,0.35)',
            textAlign: 'center',
            padding: '40px 0',
          }}
        >
          Queue is empty. Add tracks from the Discover tab.
        </div>
      )}

      {/* Footer note */}
      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'rgba(240,234,216,0.28)',
          marginTop: 8,
        }}
      >
        Completed files land in your library, tagged and organized by BPM, key, and energy.
      </div>
    </div>
  );
}
