'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useQueueStore } from '@/stores/queue.store';
import { queryKeys } from './use-api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4242';
const RECONNECT_DELAY = 5_000;

/**
 * Connects to the SSE endpoint for live queue progress updates.
 * Call once at the app root (AppShell).
 */
export function useQueueSSE() {
  const qc = useQueryClient();
  const updateItem = useQueueStore((s) => s.updateItem);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      const es = new EventSource(`${API_BASE}/api/events`);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'download:progress':
              // { type, queueItemId, progressPct, status? }
              updateItem(data.queueItemId, {
                progressPct: data.progressPct,
                ...(data.status ? { status: data.status } : {}),
              });
              break;

            case 'download:done':
            case 'download:error':
              // Refetch the full queue to get final state
              qc.invalidateQueries({ queryKey: queryKeys.queue });
              break;

            case 'heartbeat':
            case 'connected':
              // no-op
              break;
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (isMounted) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
        }
      };
    }

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [qc, updateItem]);
}
