'use client';

import { type CSSProperties } from 'react';

/**
 * Animated Crate logo loader — squares stack up one by one in a 3x3 grid,
 * then fade out and restart. Used for the Discover feed loading state.
 */
export function CrateLoader() {
  // Grid cells: [col, row, final opacity], ordered bottom-to-top, left-to-right
  // to create the "stacking up" effect
  const cells: [number, number, number][] = [
    [0, 2, 0.4],  // bottom-left
    [1, 2, 0.2],  // bottom-center
    [2, 2, 0.08], // bottom-right
    [0, 1, 0.7],  // mid-left
    [1, 1, 0.4],  // mid-center
    [2, 1, 0.2],  // mid-right
    [0, 0, 1.0],  // top-left
    [1, 0, 0.7],  // top-center
    [2, 0, 0.4],  // top-right
  ];

  const totalCells = cells.length;
  const staggerMs = 120;
  const holdMs = 600;
  const fadeOutMs = 400;
  const totalDuration = totalCells * staggerMs + holdMs + fadeOutMs;

  const container: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
    gap: 16,
  };

  const gridSize = 48;
  const cellSize = 14;
  const gap = 3;

  // Build keyframes CSS
  const keyframesCSS = cells
    .map((_, i) => {
      const appearAt = (i * staggerMs / totalDuration) * 100;
      const holdEnd = ((totalCells * staggerMs + holdMs) / totalDuration) * 100;
      return `
        @keyframes crate-cell-${i} {
          0%, ${Math.max(0, appearAt - 0.1)}% { opacity: 0; transform: translateY(6px) scale(0.7); }
          ${appearAt}%, ${holdEnd}% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-3px) scale(0.95); }
        }
      `;
    })
    .join('\n');

  return (
    <div style={container}>
      <style>{keyframesCSS}</style>
      <div
        style={{
          width: gridSize,
          height: gridSize,
          position: 'relative',
        }}
      >
        {cells.map(([col, row, opacityTarget], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: col * (cellSize + gap),
              top: row * (cellSize + gap),
              width: cellSize,
              height: cellSize,
              borderRadius: 2,
              background: '#e8a020',
              opacity: opacityTarget,
              animation: `crate-cell-${i} ${totalDuration}ms ease-in-out infinite`,
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'rgba(240,234,216,0.28)',
          animation: `crate-text-pulse 2s ease-in-out infinite`,
        }}
      >
        Digging for tracks...
      </span>
      <style>{`
        @keyframes crate-text-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
