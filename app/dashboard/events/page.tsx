import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import Link from 'next/link';
import { formatEventDateTime, formatMoney, computeNextOccurrences, type Event } from '@/lib/events';
import { SIGNUP_STATUS_LABELS, PAYMENT_STATUS_LABELS, type SignupStatus, type PaymentStatus } from '@/lib/signups';
import { isPlatformAdmin } from '@/lib/platform-admin';

const DISCOVERY_OCCURRENCES_PER_EVENT = 8;

const STATUS_BADGE: Record<SignupStatus, { bg: string; fg: string }> = {
  accepted:   { bg: '#D1FAE5', fg: 'var(--color-accent-dk)' },
  pending:    { bg: '#FFF4B8', fg: '#7C5800' },
  waitlisted: { bg: '#FFF4B8', fg: '#7C5800' },
  declined:   { bg: '#FEE2E2', fg: 'var(--color-red)' },
  cancelled:  { bg: '#E5E7EB', fg: '#6B7280' },
};

const PAYMENT_BADGE: Record<PaymentStatus, { bg: string; fg: string }> = {
  free:   { bg: '#E5E7EB', fg: '#374151' },
  unpaid: { bg: '#FEE2E2', fg: 'var(--color-red)' },
  paid:   { bg: '#D1FAE5', fg: 'var(--color-accent-dk)' },
};

const HOST_STATUS_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  published: { bg: '#D1FAE5', fg: 'var(--color-accent-dk)', label: 'Live' },
  closed:    { bg: '#E5E7EB', fg: '#374151',                label: 'Closed' },
  cancelled: { bg: '#FEE2E2', fg: 'var(--color-red)',       label: 'Cancelled' },
};

type AttendingRow = {
  id:              string;
  occurrence_date: string;
  status:          SignupStatus;
  payment_status:  PaymentStatus;
  events:          Event | null;
};

// Same helper used elsewhere: combine event.starts_at time-of-day with occurrence_date.
function occurrenceIso(eventStartsAt: string, occDate: string): string {
  const start = new Date(eventStartsAt);
  const [y, m, d] = occDate.split('-').map(Number);
  const out = new Date(start);
  out.setUTCFullYear(y, m - 1, d);
  return out.toISOString();
}

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const session = await auth();
  const profileId = session!.user.profileId;
  const isAdmin   = await isPlatformAdmin(session?.user?.email);
  const { created } = await searchParams;
  const now = Date.now();

  // Platform admins manage every event, so they see the full list under Hosting.
  // Everyone else only sees the events they personally admin.
  const hostingQuery = isAdmin
    ? supabase.from('events').select('*').order('starts_at', { ascending: true })
    : supabase.from('events').select('*').eq('admin_id', profileId).order('starts_at', { ascending: true });

  const [hostingRes, attendingRes, allEventsRes] = await Promise.all([
    hostingQuery,
    supabase
      .from('event_signups')
      .select('id, occurrence_date, status, payment_status, events(*)')
      .eq('profile_id', profileId)
      .neq('status', 'cancelled')
      .order('occurrence_date', { ascending: true }),
    // Every published event on the platform — used to surface sessions the
    // user has NOT signed up to alongside the ones they have.
    supabase.from('events').select('*').eq('status', 'published'),
  ]);

  const hostingEvents = (hostingRes.data ?? []) as Event[];
  const justCreated   = created ? hostingEvents.find(e => e.id === created) : null;

  const upcomingHosting = hostingEvents.filter(e => new Date(e.starts_at).getTime() >= now);

  type AttendingDisplay = {
    key:       string;
    event:     Event;
    iso:       string;
    cancelled: boolean;
    signup:    { id: string; status: SignupStatus; payment_status: PaymentStatus } | null;
  };

  // 1. My signups — past + future, all kept regardless of date.
  const myRows: AttendingDisplay[] = ((attendingRes.data ?? []) as unknown as AttendingRow[])
    .filter(r => r.events)
    .map(r => ({
      key:       `${r.events!.id}:${r.occurrence_date}`,
      event:     r.events!,
      iso:       occurrenceIso(r.events!.starts_at, r.occurrence_date),
      cancelled: (r.events!.cancelled_dates ?? []).includes(r.occurrence_date),
      signup:    { id: r.id, status: r.status, payment_status: r.payment_status },
    }));
  const mySignupKeys = new Set(myRows.map(r => r.key));

  // 2. Discovery rows — for every published event, expand the next N
  //    un-cancelled occurrences, drop the ones already in mySignupKeys.
  const discoveryRows: AttendingDisplay[] = ((allEventsRes.data ?? []) as Event[])
    .flatMap(ev => {
      const cancelled = new Set(ev.cancelled_dates ?? []);
      return computeNextOccurrences(ev, DISCOVERY_OCCURRENCES_PER_EVENT)
        .filter(iso => !cancelled.has(iso.slice(0, 10)))
        .map(iso => ({
          key:       `${ev.id}:${iso.slice(0, 10)}`,
          event:     ev,
          iso,
          cancelled: false,
          signup:    null,
        }));
    })
    .filter(r => !mySignupKeys.has(r.key));

  const allAttending = [...myRows, ...discoveryRows];
  // Upcoming = anything still ahead of now, ascending (soonest first).
  // Past = anything before now, descending (most recent first). Discovery
  // rows are always future so the past list only contains your own signups.
  const upcomingEvents = allAttending
    .filter(r => new Date(r.iso).getTime() >= now)
    .sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
  const pastEvents = allAttending
    .filter(r => new Date(r.iso).getTime() <  now)
    .sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime());

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
          <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>My events</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Everything you&apos;re hosting and attending in one place.
          </p>
        </div>
      </div>

      {/* HOSTING — only platform admins can create events, and the Hosting
          section is only meaningful for users who have hosted at least one. */}
      {(isAdmin || hostingEvents.length > 0) && (
      <section className="mb-12">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Hosting</h2>
          {isAdmin && (
            <Link
              href="/dashboard/events/new"
              className="px-5 py-2.5 rounded-full text-sm font-medium"
              style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', textDecoration: 'none' }}
            >
              + New event
            </Link>
          )}
        </div>
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

      )}

      {/* UPCOMING EVENTS */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Upcoming events</h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No upcoming sessions on the platform yet.</p>
        ) : (
          <div className="grid gap-3">
            {upcomingEvents.map(({ key, ...item }) => <AttendingCard key={key} {...item} />)}
          </div>
        )}
      </section>

      {/* PAST EVENTS */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Past events</h2>
        {pastEvents.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>You haven&apos;t attended any sessions yet.</p>
        ) : (
          <div className="grid gap-3">
            {pastEvents.map(({ key, ...item }) => <AttendingCard key={key} {...item} past />)}
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

function AttendingCard({
  event, iso, cancelled, signup, past = false,
}: {
  event:     Event;
  iso:       string;
  cancelled: boolean;
  signup:    { id: string; status: SignupStatus; payment_status: PaymentStatus } | null;
  past?:     boolean;
}) {
  return (
    <Link href={`/e/${event.payment_reference}`}
      className="p-5 rounded-2xl flex items-start justify-between gap-4"
      style={{
        backgroundColor: cancelled || past ? '#FAFAFA' : 'var(--color-card)',
        border:          '1px solid var(--color-border)',
        textDecoration:  'none', color: 'var(--color-fg)',
        opacity:         cancelled ? 0.75 : past ? 0.85 : 1,
      }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-base font-semibold truncate" style={{ fontFamily: 'var(--font-display)', textDecoration: cancelled ? 'line-through' : undefined }}>
            {event.title}
          </span>
          {cancelled ? (
            <Badge tone={{ bg: '#FEE2E2', fg: 'var(--color-red)' }}>Cancelled by host</Badge>
          ) : signup ? (
            <>
              <Badge tone={STATUS_BADGE[signup.status]}>{SIGNUP_STATUS_LABELS[signup.status]}</Badge>
              {Number(event.fee_amount) > 0 && (
                <Badge tone={PAYMENT_BADGE[signup.payment_status]}>{PAYMENT_STATUS_LABELS[signup.payment_status]}</Badge>
              )}
            </>
          ) : (
            <Badge tone={{ bg: '#DBEAFE', fg: '#1D4ED8' }}>Open to join</Badge>
          )}
        </div>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {formatEventDateTime(iso)}{event.location ? ` · ${event.location}` : ''}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xl font-semibold">{Number(event.fee_amount) > 0 ? formatMoney(event.fee_amount, event.fee_currency) : 'Free'}</p>
      </div>
    </Link>
  );
}
