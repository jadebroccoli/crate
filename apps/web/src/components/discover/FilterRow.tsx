'use client';

import { type CSSProperties } from 'react';

interface FilterRowProps {
  sources: string[];
  activeSources: Set<string>;
  onToggleSource: (source: string) => void;
  filters: string[];
  activeFilters: Set<string>;
  onToggleFilter: (filter: string) => void;
}

const chipBase: CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '3px 10px',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  transition: 'all 120ms ease',
};

const activeChip: CSSProperties = {
  ...chipBase,
  background: 'var(--c-text-primary)',
  color: 'var(--c-bg)',
  border: '1px solid var(--c-text-primary)',
};

const inactiveChip: CSSProperties = {
  ...chipBase,
  background: 'var(--c-status-pending-bg)',
  color: 'var(--c-status-pending)',
  border: '1px solid var(--c-status-pending-border)',
};

export function FilterRow({
  sources,
  activeSources,
  onToggleSource,
  filters,
  activeFilters,
  onToggleFilter,
}: FilterRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 16,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--c-text-muted)',
        }}
      >
        Source:
      </span>

      {sources.map((s) => (
        <button
          key={s}
          onClick={() => onToggleSource(s)}
          style={activeSources.has(s) ? activeChip : inactiveChip}
        >
          {s}
        </button>
      ))}

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => onToggleFilter(f)}
            style={activeFilters.has(f) ? activeChip : inactiveChip}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
