'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CrateIcon } from '../icons/CrateIcon';

function GearIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const isSettings = pathname === '/settings';

  return (
    <div
      className="flex items-center justify-between px-6"
      style={{
        height: 60,
        borderBottom: '1px solid var(--c-border)',
        background: 'var(--c-bg)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <CrateIcon size={28} />
        <span
          style={{
            fontFamily: 'var(--font-wordmark)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: '24px',
            color: 'var(--c-text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          Crate
        </span>
      </div>
      <Link
        href="/settings"
        style={{
          color: isSettings ? 'var(--c-accent)' : 'var(--c-text-muted)',
          padding: 8,
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 150ms ease, background 150ms ease',
        }}
        onMouseEnter={(e) => {
          if (!isSettings) {
            e.currentTarget.style.color = 'var(--c-text-primary)';
            e.currentTarget.style.background = 'var(--c-surface-2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSettings) {
            e.currentTarget.style.color = 'var(--c-text-muted)';
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <GearIcon size={18} />
      </Link>
    </div>
  );
}
