import { type ReactNode, type CSSProperties } from 'react';

type BadgeVariant =
  | 'accent'
  | 'rnb'
  | 'afro'
  | 'pop'
  | 'solid'
  | 'pending'
  | 'download'
  | 'done'
  | 'error'
  | 'beatport'
  | 'soundcloud'
  | 'djcity'
  | 'spotify';

const variantStyles: Record<BadgeVariant, CSSProperties> = {
  accent: {
    background: 'var(--c-accent-bg)',
    color: 'var(--c-accent)',
    border: '1px solid var(--c-accent-border)',
  },
  rnb: {
    background: 'var(--c-genre-rnb-bg)',
    color: 'var(--c-genre-rnb)',
    border: '1px solid var(--c-genre-rnb-border)',
  },
  afro: {
    background: 'var(--c-genre-afro-bg)',
    color: 'var(--c-genre-afro)',
    border: '1px solid var(--c-genre-afro-border)',
  },
  pop: {
    background: 'var(--c-genre-pop-bg)',
    color: 'var(--c-genre-pop)',
    border: '1px solid var(--c-genre-pop-border)',
  },
  solid: {
    background: 'var(--c-text-primary)',
    color: 'var(--c-bg)',
    border: '1px solid var(--c-text-primary)',
  },
  pending: {
    background: 'var(--c-status-pending-bg)',
    color: 'var(--c-status-pending)',
    border: '1px solid var(--c-status-pending-border)',
  },
  download: {
    background: 'var(--c-status-downloading-bg)',
    color: 'var(--c-status-downloading)',
    border: '1px solid var(--c-status-downloading-border)',
  },
  done: {
    background: 'var(--c-status-done-bg)',
    color: 'var(--c-status-done)',
    border: '1px solid var(--c-status-done-border)',
  },
  error: {
    background: 'var(--c-status-error-bg)',
    color: 'var(--c-status-error)',
    border: '1px solid var(--c-status-error-border)',
  },
  beatport: {
    background: 'rgba(232,160,32,0.1)',
    color: '#c89018',
    border: '1px solid rgba(232,160,32,0.2)',
  },
  soundcloud: {
    background: 'rgba(196,108,52,0.1)',
    color: '#c46c34',
    border: '1px solid rgba(196,108,52,0.2)',
  },
  djcity: {
    background: 'rgba(108,140,196,0.1)',
    color: '#6c8cc4',
    border: '1px solid rgba(108,140,196,0.2)',
  },
  spotify: {
    background: 'rgba(30,215,96,0.1)',
    color: '#1ed760',
    border: '1px solid rgba(30,215,96,0.2)',
  },
};

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function Badge({ variant, children, onClick, className = '', style }: BadgeProps) {
  const base: CSSProperties = {
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '3px 9px',
    borderRadius: 'var(--radius-sm)',
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    transition: 'all 120ms ease',
    cursor: onClick ? 'pointer' : undefined,
    ...variantStyles[variant],
    ...style,
  };

  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag style={base} onClick={onClick} className={className}>
      {children}
    </Tag>
  );
}
