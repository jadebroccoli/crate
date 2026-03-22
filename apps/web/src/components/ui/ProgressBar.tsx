import { type CSSProperties } from 'react';

interface ProgressBarProps {
  percent: number;
  done?: boolean;
}

export function ProgressBar({ percent, done = false }: ProgressBarProps) {
  const track: CSSProperties = {
    width: '100%',
    height: 3,
    borderRadius: 2,
    background: 'var(--c-progress-track)',
    overflow: 'hidden',
  };

  const fill: CSSProperties = {
    height: '100%',
    borderRadius: 2,
    width: `${Math.min(percent, 100)}%`,
    background: done ? 'var(--c-progress-done)' : 'var(--c-progress-fill)',
    transition: 'width 0.3s ease',
  };

  return (
    <div style={track}>
      <div style={fill} />
    </div>
  );
}
