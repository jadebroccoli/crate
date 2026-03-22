'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/discover', label: 'Discover' },
  { href: '/queue', label: 'Queue' },
  { href: '/library', label: 'Library' },
  { href: '/taste', label: 'Taste profile' },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <div className="flex gap-0.5 border-b border-crate-border mb-5">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-[13px] border-b-2 transition-all ${
              isActive
                ? 'text-crate-text border-crate-text font-medium'
                : 'text-crate-muted border-transparent hover:text-crate-text'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
