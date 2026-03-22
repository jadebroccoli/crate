'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4242';

function CallbackHandler() {
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to Spotify…');
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent React Strict Mode double-fire from consuming the state twice
    if (hasRun.current) return;
    hasRun.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setMessage(`Spotify denied access: ${error}`);
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setMessage('Missing authorization parameters.');
      return;
    }

    // Forward the code + state to the backend for token exchange
    fetch(`${API_BASE}/api/auth/spotify/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Token exchange failed');
        setStatus('success');
        setMessage(`Connected as ${data.displayName || data.spotifyUserId}! You can close this tab.`);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message);
      });
  }, [params]);

  const icon = status === 'loading' ? '⏳' : status === 'success' ? '✓' : '✗';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--c-bg, #0e0e10)',
        color: 'var(--c-text-primary, #e8e0d4)',
        fontFamily: 'var(--font-ui, system-ui)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
        <p style={{ fontSize: 15, lineHeight: 1.5, opacity: status === 'loading' ? 0.6 : 1 }}>
          {message}
        </p>
        {status !== 'loading' && (
          <button
            onClick={() => window.close()}
            style={{
              marginTop: 24,
              padding: '10px 24px',
              background: 'var(--c-accent-bg, rgba(232,160,32,0.1))',
              color: 'var(--c-accent, #e8a020)',
              border: '1px solid var(--c-accent-border, rgba(232,160,32,0.2))',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
            }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0e0e10',
            color: '#e8e0d4',
          }}
        >
          Loading…
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
