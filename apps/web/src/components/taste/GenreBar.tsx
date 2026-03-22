import { type CSSProperties } from 'react';

interface GenreBarProps {
  label: string;
  percent: number;
  color: string;
}

export function GenreBar({ label, percent, color }: GenreBarProps) {
  const row: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  };

  const labelStyle: CSSProperties = {
    fontFamily: 'var(--font-ui)',
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'rgba(240,234,216,0.7)',
    width: 120,
    flexShrink: 0,
  };

  const track: CSSProperties = {
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: 'rgba(240,234,216,0.06)',
    overflow: 'hidden',
  };

  const fill: CSSProperties = {
    height: '100%',
    borderRadius: 2,
    width: `${percent}%`,
    background: color,
    transition: 'width 0.3s ease',
  };

  const pctStyle: CSSProperties = {
    fontFamily: 'var(--font-meta)',
    fontSize: 13,
    fontWeight: 500,
    minWidth: 32,
    textAlign: 'right',
    color,
  };

  return (
    <div style={row}>
      <span style={labelStyle}>{label}</span>
      <div style={track}>
        <div style={fill} />
      </div>
      <span style={pctStyle}>{percent}%</span>
    </div>
  );
}
