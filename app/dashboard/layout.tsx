import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import LogoutButton from '@/components/LogoutButton';
import { isPlatformAdmin } from '@/lib/platform-admin';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import MobileSidebar from './MobileSidebar';

type UnpaidProbe = {
  occurrence_date: string;
  events: { cancelled_dates: string[] | null; published_occurrence_dates: string[] | null } | null;
};

// Count signups that are actually "payment due" right now — matches the
// filter used by /dashboard/unpaid so the sidebar badge can never drift
// out of step with that page (host published, not host-cancelled, etc.).
async function unpaidCountFor(profileId: string): Promise<number> {
  const { data } = await supabase
    .from('event_signups')
    .select('occurrence_date, events(cancelled_dates, published_occurrence_dates)')
    .eq('profile_id', profileId)
    .eq('payment_status', 'unpaid')
    .eq('status', 'accepted');
  return ((data ?? []) as unknown as UnpaidProbe[])
    .filter(r => r.events)
    .filter(r => !(r.events!.cancelled_dates ?? []).includes(r.occurrence_date))
    .length;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');
  const [isAdmin, unpaidCount] = await Promise.all([
    isPlatformAdmin(session.user?.email),
    unpaidCountFor(session.user.profileId),
  ]);

  const nav: { href: string; label: string; badge?: number }[] = [
    ...(isAdmin ? [{ href: '/dashboard/manage',   label: 'Manage event' }] : []),
    { href: '/dashboard/events',  label: 'Join event' },
    { href: '/dashboard/unpaid',  label: 'Unpaid', badge: unpaidCount },
    { href: '/dashboard/profile', label: 'Profile' },
    ...(isAdmin ? [{ href: '/dashboard/settings', label: 'Settings' }] : []),
  ];

  return (
    // Block layout on phones/tablets so the mobile hamburger header sits
    // full-width above <main>; switch to a row at lg so the desktop
    // sidebar lives alongside it. Without lg: the sticky header becomes a
    // flex child and ends up next to <main>, squeezing both into half
    // columns.
    <div className="min-h-screen lg:flex">
      {/* Mobile (< lg) only — slide-out drawer + sticky hamburger header. */}
      <MobileSidebar
        nav={nav}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? null}
      />

      {/* Desktop sidebar — only above lg so iPad portrait (768–1023px)
          still uses the slide-out drawer instead of getting a cramped
          two-column layout. */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 sticky top-0 h-screen flex-col py-5" style={{ backgroundColor: 'var(--color-accent-dk)', color: '#FFFFFF' }}>
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold px-5 mb-8" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-yellow)', textDecoration: 'none' }}>
          <Image src="/logo.png" alt="GA Football Club" width={32} height={32} priority style={{ borderRadius: 5 }} />
          GA Football Club
        </Link>
        <nav className="flex flex-col gap-1 px-2 text-sm">
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              className="px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] flex items-center justify-between gap-2"
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
            <p style={{ color: '#FFFFFF', fontWeight: 600 }}>{session.user.name ?? 'User'}</p>
            <p className="truncate">{session.user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 lg:overflow-auto">{children}</main>
    </div>
  );
}
