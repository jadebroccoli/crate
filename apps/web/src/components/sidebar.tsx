'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/discover', label: 'Discover', icon: '🎵' },
  { href: '/queue', label: 'Queue', icon: '📥' },
  { href: '/library', label: 'Library', icon: '📁' },
  { href: '/taste', label: 'Taste', icon: '🎯' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-crate-surface border-r border-crate-border flex flex-col">
      <div className="p-4 border-b border-crate-border">
        <h1 className="text-xl font-bold tracking-tight">CRATE</h1>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-crate-accent/10 text-crate-accent'
                  : 'text-crate-muted hover:text-crate-text hover:bg-white/5'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
