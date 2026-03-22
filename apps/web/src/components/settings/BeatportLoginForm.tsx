'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useBeatportLogin } from '@/hooks/use-api';

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

export function BeatportLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const beatportLogin = useBeatportLogin();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    beatportLogin.mutate({ username: username.trim(), password });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
          autoComplete="username"
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--c-border-hover)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--c-border)')}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          autoComplete="current-password"
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--c-border-hover)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--c-border)')}
        />
      </div>
      <div>
        <Button
          type="submit"
          variant="primary"
          disabled={beatportLogin.isPending || !username.trim() || !password.trim()}
          style={{ fontSize: 12, padding: '7px 16px' }}
        >
          {beatportLogin.isPending ? 'Connecting...' : 'Connect'}
        </Button>
      </div>
      {beatportLogin.isError && (
        <div style={errorStyle}>{beatportLogin.error.message}</div>
      )}
    </form>
  );
}
