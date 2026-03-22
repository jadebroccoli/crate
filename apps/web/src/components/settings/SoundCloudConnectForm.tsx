'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useSoundCloudConnect } from '@/hooks/use-api';

const inputStyle: CSSProperties = {
  fontFamily: 'var(--font-meta)',
  fontSize: 13,
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--c-border)',
  background: 'var(--c-bg)',
  color: 'var(--c-text-primary)',
  outline: 'none',
  width: '100%',
  transition: 'border-color 120ms ease',
};

const errorStyle: CSSProperties = {
  fontFamily: 'var(--font-meta)',
  fontSize: 12,
  color: 'var(--c-status-error)',
  marginTop: 8,
};

const hintStyle: CSSProperties = {
  fontFamily: 'var(--font-meta)',
  fontSize: 11,
  color: 'var(--c-text-muted)',
  marginTop: 4,
};

export function SoundCloudConnectForm() {
  const [profileUrl, setProfileUrl] = useState('');
  const soundcloudConnect = useSoundCloudConnect();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!profileUrl.trim()) return;
    soundcloudConnect.mutate({ profileUrl: profileUrl.trim() });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <input
          type="text"
          placeholder="https://soundcloud.com/your-username"
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--c-border-hover)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--c-border)')}
        />
        <div style={hintStyle}>
          Paste your SoundCloud profile URL to import your likes for taste profiling
        </div>
      </div>
      <div>
        <Button
          type="submit"
          variant="primary"
          disabled={soundcloudConnect.isPending || !profileUrl.trim()}
          style={{ fontSize: 12, padding: '7px 16px' }}
        >
          {soundcloudConnect.isPending ? 'Linking...' : 'Link Profile'}
        </Button>
      </div>
      {soundcloudConnect.isError && (
        <div style={errorStyle}>{soundcloudConnect.error.message}</div>
      )}
    </form>
  );
}
