'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

const NAV = [
  { href: '/', label: 'Overview', icon: 'M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z' },
  { href: '/reviews', label: 'Review log', icon: 'M4 6h16M4 12h16M4 18h10' },
  { href: '/label', label: 'Label a review', icon: 'M20 12l-8 8-9-9V3h8zM7.5 7.5h.01' },
  { href: '/method', label: 'Method', icon: 'M4 4h11l5 5v11H4zM14 4v6h6' },
];

export function Mark() {
  // A leaf with a bite out of it: the product checks whether food arrived fresh.
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="var(--accent)" />
      <path d="M6.5 17.5C6.5 10 10.5 6.5 17.5 6.5c0 3-1 5-2.5 6.5a2.2 2.2 0 0 0-2.6 2.6C10.9 17 9 17.5 6.5 17.5Z" fill="#fff" />
      <path d="M6.5 17.5 12 12" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="nav">
        {NAV.map((n) => {
          const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link href={n.href} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={n.icon} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Shell({ children, scope }: { children: ReactNode; scope: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [path]);

  return (
    <div className="frame">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" className="product">
          <Mark />
          <span translate="no">Spoilt</span>
        </Link>
        <p className="scope">{scope}</p>
        <Nav />
        <p className="sidebar-foot">
          Built by Krish Gujral ·{' '}
          <a href="https://github.com/krishxyz1/quick-commerce-quality">Source</a>
        </p>
      </aside>

      <header className="topbar">
        <details ref={menu} className="menu">
          <summary aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </summary>
          <div className="menu-sheet">
            <p className="scope">{scope}</p>
            <Nav onNavigate={() => menu.current && (menu.current.open = false)} />
          </div>
        </details>
        <Link href="/" className="product">
          <Mark />
          <span translate="no">Spoilt</span>
        </Link>
      </header>

      <main id="content" className="sheet">
        {children}
      </main>
    </div>
  );
}
