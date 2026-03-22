'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/discover', label: 'Discover' },
  { href: '/queue', label: 'Queue' },
  { href: '/library', label: 'Library' },
  { href: '/taste', label: 'Taste profile' },
];

export function TabBar({ queueCount = 0 }: { queueCount?: number }) {
  const pathname = usePathname();

  return (
    <div
      className="flex items-stretch"
      style={{
        height: 44,
        background: 'var(--c-bg)',
        borderBottom: '1px solid rgba(240, 234, 216, 0.07)',
        paddingLeft: 32,
      }}
    >
      {tabs.map((tab, i) => {
        const isActive = pathname === tab.href || (pathname === '/' && tab.href === '/discover');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex items-center transition-colors"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: i === 0 ? '0 20px 0 0' : '0 20px',
              color: isActive ? '#e8a020' : 'rgba(240,234,216,0.28)',
              borderBottom: isActive ? '2px solid #e8a020' : '2px solid transparent',
              transitionDuration: '150ms',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = 'rgba(240,234,216,0.55)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = 'rgba(240,234,216,0.28)';
            }}
          >
            {tab.label}
            {tab.href === '/queue' && queueCount > 0 && (
              <span
                style={{
                  background: 'rgba(108,140,196,0.12)',
                  color: '#6c8cc4',
                  border: '1px solid rgba(108,140,196,0.25)',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 3,
                  marginLeft: 5,
                  fontFamily: 'var(--font-ui)',
                  textTransform: 'uppercase',
                }}
              >
                {queueCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
