import { type CSSProperties } from 'react';

interface StatCardProps {
  value: number | string;
  label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  const card: CSSProperties = {
    background: 'var(--c-surface)',
    borderRadius: 'var(--radius-xl)',
    padding: '12px 14px',
    border: '1px solid var(--c-border)',
  };

  return (
    <div style={card}>
      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-stat)',
          fontWeight: 800,
          color: 'var(--c-text-primary)',
          letterSpacing: '0.01em',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-meta)',
          fontSize: 12,
          color: 'var(--c-text-muted)',
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}
