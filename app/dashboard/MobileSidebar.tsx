'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LogoutButton from '@/components/LogoutButton';

export type NavItem = { href: string; label: string; badge?: number };

type Props = {
  nav:        NavItem[];
  userName:   string | null;
  userEmail:  string | null;
};

// Mobile-only: a sticky top bar with a hamburger that slides the same
// sidebar in from the left. Desktop renders the static sidebar in
// DashboardLayout via the same nav data, so the two stay in lock-step.
export default function MobileSidebar({ nav, userName, userEmail }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: 'var(--color-accent-dk)', color: '#FFFFFF' }}>
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-yellow)', textDecoration: 'none' }}
          onClick={() => setOpen(false)}>
          <Image src="/logo.png" alt="GrumpyWhales" width={28} height={28} priority style={{ borderRadius: 4 }} />
          GA Football Club
        </Link>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ backgroundColor: 'rgba(255,255,255,0.10)', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>
            </svg>
          )}
        </button>
      </header>

      {/* Backdrop */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        />
      )}

      {/* Drawer */}
      <aside
        className="lg:hidden fixed top-0 left-0 z-50 h-screen w-72 max-w-[85vw] flex flex-col py-5 transition-transform duration-200"
        style={{
          backgroundColor: 'var(--color-accent-dk)',
          color: '#FFFFFF',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}>
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold px-5 mb-8"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-yellow)', textDecoration: 'none' }}
          onClick={() => setOpen(false)}>
          <Image src="/logo.png" alt="GrumpyWhales" width={32} height={32} priority style={{ borderRadius: 5 }} />
          GA Football Club
        </Link>
        <nav className="flex flex-col gap-1 px-2 text-sm">
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              onClick={() => setOpen(false)}
              className="px-3 py-3 rounded-lg hover:bg-[rgba(255,255,255,0.08)] flex items-center justify-between gap-2"
              style={{ color: 'rgba(255,255,255,0.78)' }}>
              <span>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  aria-label={`${item.badge} unpaid`}
                  className="inline-flex items-center justify-center text-[10px] font-bold rounded-full"
                  style={{
                    backgroundColor: 'var(--color-red)',
                    color: '#FFFFFF',
                    minWidth: 18,
                    height: 18,
                    padding: '0 5px',
                    lineHeight: 1,
                  }}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto px-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="px-2 py-2 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
            <p style={{ color: '#FFFFFF', fontWeight: 600 }}>{userName ?? 'User'}</p>
            <p className="truncate">{userEmail ?? ''}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
