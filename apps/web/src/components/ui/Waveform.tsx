import { type CSSProperties } from 'react';

/**
 * Deterministic 5-bar mini waveform derived from track ID.
 */
function hashId(id: string): number[] {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < 5; i++) {
    // Range 8–26px
    const v = (Math.abs((h * (i + 1) * 2654435761) >> 16) % 19) + 8;
    bars.push(v);
  }
  return bars;
}

interface WaveformProps {
  trackId: string;
  active?: boolean;
  color?: string;
}

export function Waveform({ trackId, active = false, color }: WaveformProps) {
  const heights = hashId(trackId);
  const barColor = color || (active ? 'var(--c-wave-active)' : 'var(--c-wave-inactive)');

  const container: CSSProperties = {
    width: 36,
    height: 26,
    display: 'flex',
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  };

  return (
    <div style={container}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: h,
            borderRadius: 1,
            background: barColor,
          }}
        />
      ))}
    </div>
  );
}
