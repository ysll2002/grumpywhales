import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import Link from 'next/link';
import { formatEventDateTime, formatMoney, computeNextOccurrences, signupOpenInfo, type Event } from '@/lib/events';
import AttendRequestButton from './AttendRequestButton';
import { SIGNUP_STATUS_LABELS, PAYMENT_STATUS_LABELS, type SignupStatus, type PaymentStatus } from '@/lib/signups';
import { isPlatformAdmin } from '@/lib/platform-admin';

// Window we scan to find the next discoverable session per event. Discovery
// surfaces only ONE card per event (the next un-cancelled, un-joined date)
// so a user can't accidentally request multiple sessions of a recurring
// event from this page — they pick further-out dates from /e/<ref> if needed.
const DISCOVERY_SCAN_WINDOW = 12;

const STATUS_BADGE: Record<SignupStatus, { bg: string; fg: string }> = {
  accepted:   { bg: '#D1FAE5', fg: 'var(--color-accent-dk)' },
  pending:    { bg: '#EDE9FE', fg: '#6D28D9' },
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

  // 2. Discovery rows — for every published event, surface the FIRST
  //    un-cancelled future date the user hasn't already joined. Capped at
  //    one per event so a user can't tap 'Request to attend' 8 times in a
  //    row and end up enrolled in every future session of a weekly event.
  const discoveryRows: AttendingDisplay[] = ((allEventsRes.data ?? []) as Event[])
    .flatMap(ev => {
      const cancelled = new Set(ev.cancelled_dates ?? []);
      const next = computeNextOccurrences(ev, DISCOVERY_SCAN_WINDOW).find(iso => {
        const d = iso.slice(0, 10);
        return !cancelled.has(d) && !mySignupKeys.has(`${ev.id}:${d}`);
      });
      if (!next) return [];
      return [{
        key:       `${ev.id}:${next.slice(0, 10)}`,
        event:     ev,
        iso:       next,
        cancelled: false,
        signup:    null,
      }];
    });

  const allAttending = [...myRows, ...discoveryRows];

  // Fetch signup totals (matches the admin Attendees 'Signed up' column —
  // any non-cancelled status) for every (event_id, occurrence_date) we
  // show. One pass, bucket locally.
  const involvedEventIds = Array.from(new Set(allAttending.map(r => r.event.id)));
  const signupCountByKey = new Map<string, number>();
  if (involvedEventIds.length > 0) {
    const { data: signupRows } = await supabase
      .from('event_signups')
      .select('event_id, occurrence_date')
      .in('event_id', involvedEventIds)
      .neq('status', 'cancelled');
    for (const r of (signupRows ?? []) as { event_id: string; occurrence_date: string }[]) {
      const k = `${r.event_id}:${r.occurrence_date}`;
      signupCountByKey.set(k, (signupCountByKey.get(k) ?? 0) + 1);
    }
  }

  // Materialise extra metadata each card needs (counts + sign-up window).
  const enriched = allAttending.map(r => {
    const openInfo = signupOpenInfo(r.event, r.iso);
    return {
      ...r,
      signedUp:   signupCountByKey.get(r.key) ?? 0,
      opensAtIso: openInfo.open ? null : openInfo.opensAt.toISOString(),
    };
  });

  // Upcoming = anything still ahead of now, ascending (soonest first).
  // Past = anything before now, descending (most recent first). Discovery
  // rows are always future so the past list only contains your own signups.
  const upcomingEvents = enriched
    .filter(r => new Date(r.iso).getTime() >= now)
    .sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
  const pastEvents = enriched
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
  event, iso, cancelled, signup, signedUp, opensAtIso, past = false,
}: {
  event:      Event;
  iso:        string;
  cancelled:  boolean;
  signup:     { id: string; status: SignupStatus; payment_status: PaymentStatus } | null;
  signedUp:   number;
  opensAtIso: string | null;
  past?:      boolean;
}) {
  const dateLine = formatEventDateTime(iso).toUpperCase();
  const capacityLine = event.capacity != null
    ? `${signedUp} / ${event.capacity} signed up`
    : `${signedUp} signed up`;
  const occurrenceDate = iso.slice(0, 10);

  return (
    <div
      className="p-5 rounded-2xl flex items-start justify-between gap-4 flex-wrap"
      style={{
        backgroundColor: cancelled || past ? '#FAFAFA' : 'var(--color-card)',
        border:          '1px solid var(--color-border)',
        color:           'var(--color-fg)',
        opacity:         cancelled ? 0.75 : past ? 0.85 : 1,
      }}>
      {/* The card body (left side) navigates to the public event page.
          The right column stays its own interactive area so the signup
          button isn't nested inside an <a>. */}
      <Link href={`/e/${event.payment_reference}`}
        className="min-w-0 flex-1 block"
        style={{ textDecoration: 'none', color: 'inherit' }}>
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted)' }}>
          {event.title}{event.location ? ` · ${event.location}` : ''}
        </p>
        <p className="text-base sm:text-lg font-bold leading-tight" style={{ fontFamily: 'var(--font-display)', textDecoration: cancelled ? 'line-through' : undefined }}>
          {dateLine}
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          {cancelled ? 'Sign-ups closed' : capacityLine}
        </p>
      </Link>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {cancelled ? (
          <Badge tone={{ bg: '#FEE2E2', fg: 'var(--color-red)' }}>Cancelled by host</Badge>
        ) : signup ? (
          <>
            <Badge tone={STATUS_BADGE[signup.status]}>{SIGNUP_STATUS_LABELS[signup.status]}</Badge>
            {/* Suppress the 'UNPAID / payment due' badge until the host
                publishes this session's final list. PAID still shows
                immediately so the attendee sees their payment landed. */}
            {Number(event.fee_amount) > 0 && (
              signup.payment_status === 'paid'
                ? <Badge tone={PAYMENT_BADGE.paid}>{PAYMENT_STATUS_LABELS.paid}</Badge>
                : (event.published_occurrence_dates ?? []).includes(occurrenceDate)
                  ? <Badge tone={PAYMENT_BADGE[signup.payment_status]}>{PAYMENT_STATUS_LABELS[signup.payment_status]}</Badge>
                  : null
            )}
          </>
        ) : opensAtIso ? (
          <>
            <Badge tone={{ bg: '#FFF4B8', fg: '#7C5800' }}>
              Sign-ups open {new Date(opensAtIso).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Badge>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Status will change to “Open for sign-up” at that time.
            </p>
          </>
        ) : past ? null : (
          <AttendRequestButton
            eventId={event.id}
            occurrenceDate={occurrenceDate}
            signupMode={event.signup_mode}
          />
        )}
        <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
          {Number(event.fee_amount) > 0 ? `${formatMoney(event.fee_amount, event.fee_currency)} per session` : 'Free'}
        </p>
      </div>
    </div>
  );
}
