'use client';

import { type CSSProperties, type ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface ConnectionCardProps {
  name: string;
  description: string;
  connected: boolean;
  isLoading?: boolean;
  userLabel?: string;
  badgeVariant: 'accent' | 'beatport' | 'soundcloud';
  onDisconnect: () => void;
  disconnecting?: boolean;
  children?: ReactNode; // Connect form when disconnected
}

const cardStyle: CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '20px 24px',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 4,
};

const nameStyle: CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: 14,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--c-text-primary)',
};

const descStyle: CSSProperties = {
  fontFamily: 'var(--font-meta)',
  fontSize: 12,
  color: 'var(--c-text-muted)',
  marginTop: 2,
};

const connectedRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 14,
};

const userLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-meta)',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--c-text-secondary)',
};

export function ConnectionCard({
  name,
  description,
  connected,
  isLoading,
  userLabel,
  badgeVariant,
  onDisconnect,
  disconnecting,
  children,
}: ConnectionCardProps) {
  if (isLoading) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <span style={nameStyle}>{name}</span>
          <span style={{ ...descStyle, fontSize: 11 }}>Loading...</span>
        </div>
        <div style={descStyle}>{description}</div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <span style={nameStyle}>{name}</span>
        {connected ? (
          <Badge variant={badgeVariant}>Connected</Badge>
        ) : (
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--c-text-muted)',
            }}
          >
            Not connected
          </span>
        )}
      </div>
      <div style={descStyle}>{description}</div>

      {connected ? (
        <div style={connectedRowStyle}>
          {userLabel && <span style={userLabelStyle}>{userLabel}</span>}
          <Button
            variant="ghost"
            onClick={onDisconnect}
            disabled={disconnecting}
            style={{ marginLeft: 'auto', fontSize: 11, padding: '6px 14px' }}
          >
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>{children}</div>
      )}
    </div>
  );
}
