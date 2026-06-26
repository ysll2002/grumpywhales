import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import Link from 'next/link';
import { formatEventDateTime, formatMoney, type Event } from '@/lib/events';
import { isPlatformAdmin } from '@/lib/platform-admin';

const HOST_STATUS_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  published: { bg: '#D1FAE5', fg: 'var(--color-accent-dk)', label: 'Live' },
  closed:    { bg: '#E5E7EB', fg: '#374151',                label: 'Closed' },
  cancelled: { bg: '#FEE2E2', fg: 'var(--color-red)',       label: 'Cancelled' },
};

export default async function ManageEventsPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId || !(await isPlatformAdmin(session.user.email))) notFound();
  const profileId = session.user.profileId;
  const isAdmin = true; // gated above — every viewer here is a platform admin
  const { created } = await searchParams;
  const now = Date.now();

  // Platform admins manage every event; co-admins on individual events see
  // those events too. Since the page itself is admin-gated, we show the
  // whole catalogue here.
  const hostingQuery = isAdmin
    ? supabase.from('events').select('*').order('starts_at', { ascending: true })
    : supabase.from('events').select('*').eq('admin_id', profileId).order('starts_at', { ascending: true });

  const { data: hostingData } = await hostingQuery;
  const hostingEvents = (hostingData ?? []) as Event[];
  const justCreated   = created ? hostingEvents.find(e => e.id === created) : null;
  const upcomingHosting = hostingEvents.filter(e => new Date(e.starts_at).getTime() >= now);

  return (
    <div className="p-8 max-w-5xl">
      {justCreated && (
        <div className="rounded-2xl px-5 py-4 mb-6"
          style={{ backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--color-accent-dk)' }}>
            ✓ <strong>&ldquo;{justCreated.title}&rdquo; is live.</strong> Share this link to start collecting sign-ups:
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <code className="text-sm font-medium" style={{ color: 'var(--color-accent-dk)' }}>
              grumpywhales.com/e/{justCreated.payment_reference}
            </code>
            <Link href={`/e/${justCreated.payment_reference}`} target="_blank" className="text-sm font-medium" style={{ color: 'var(--color-accent-dk)' }}>
              Open ↗
            </Link>
            <Link href={`/dashboard/events/${justCreated.id}`} className="text-sm font-medium" style={{ color: 'var(--color-accent-dk)' }}>
              Edit settings →
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Manage event</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Every event on the platform — create a new one or open an existing one to manage its attendees and settings.
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="px-5 py-2.5 rounded-full text-sm font-medium"
          style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', textDecoration: 'none' }}
        >
          + New event
        </Link>
      </div>

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Hosting</h2>
        {hostingEvents.length === 0 ? (
          <div className="p-10 rounded-2xl text-center" style={{ backgroundColor: 'var(--color-card)', border: '1px dashed var(--color-border)' }}>
            <p className="text-base mb-2" style={{ fontFamily: 'var(--font-display)' }}>No events yet</p>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Create your first event in under a minute.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {(upcomingHosting.length ? upcomingHosting : hostingEvents).map(ev => {
              const badge = HOST_STATUS_BADGE[ev.status] ?? HOST_STATUS_BADGE.published;
              return (
                <div key={ev.id} className="p-5 rounded-2xl flex items-start justify-between gap-4 flex-wrap"
                  style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}>
                  <Link href={`/dashboard/events/${ev.id}/attendees`}
                    className="min-w-0 flex-1 block"
                    style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-base font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>{ev.title}</span>
                      <Badge tone={badge}>{badge.label}</Badge>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                      {formatEventDateTime(ev.starts_at)}{ev.location ? ` · ${ev.location}` : ''}
                    </p>
                  </Link>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <p className="text-xl font-semibold">{ev.fee_amount > 0 ? formatMoney(ev.fee_amount, ev.fee_currency) : 'Free'}</p>
                    <Link href={`/dashboard/events/${ev.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
                      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-fg)', border: '1px solid var(--color-border)', textDecoration: 'none' }}
                      aria-label="Settings">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                      Settings
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Badge({ tone, children }: { tone: { bg: string; fg: string }; children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
      style={{ backgroundColor: tone.bg, color: tone.fg }}>
      {children}
    </span>
  );
}
