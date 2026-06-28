import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import Link from 'next/link';
import { formatEventDateTime, formatMoney, computeNextOccurrences, signupOpenInfo, type Event } from '@/lib/events';
import AttendRequestButton from './AttendRequestButton';
import CancelSignupButton from './CancelSignupButton';
import PayButton from '../unpaid/PayButton';
import { stripe } from '@/lib/stripe';

// Resolve a paid=1 redirect from Stripe: load the session, confirm it's paid,
// and flip our signup row to paid synchronously so the user doesn't have to
// wait for the webhook before seeing 'Paid'. The session's client_reference_id
// is the signup row id (set when we created the checkout session).
async function confirmPaymentFromSession(sessionId: string, viewerProfileId: string): Promise<void> {
  try {
    const sess = await stripe().checkout.sessions.retrieve(sessionId);
    if (sess.payment_status !== 'paid') return;
    const signupId = sess.client_reference_id;
    if (!signupId) return;
    const paymentIntentId = typeof sess.payment_intent === 'string' ? sess.payment_intent : null;
    await supabase
      .from('event_signups')
      .update({
        payment_status:           'paid',
        paid_at:                  new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
        updated_at:               new Date().toISOString(),
      })
      .eq('id', signupId)
      .eq('profile_id', viewerProfileId)
      .eq('payment_status', 'unpaid');
  } catch (err) {
    console.error('[dashboard/events] stripe verify failed', err);
  }
}
import { SIGNUP_STATUS_LABELS, PAYMENT_STATUS_LABELS, type SignupStatus, type PaymentStatus } from '@/lib/signups';

// Each session is an independently joinable card. Cap the number of
// future cards we expand per event so a long-running weekly doesn't
// dominate the dashboard, but still show all upcoming sessions in the
// window so users can pick any specific date directly from here.
const DISCOVERY_OCCURRENCES_PER_EVENT = 8;

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

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ paid?: string; session_id?: string }> }) {
  const session = await auth();
  const profileId = session!.user.profileId;
  const now = Date.now();

  const { paid, session_id } = await searchParams;
  // Run the Stripe sync-verify BEFORE the signup query so the freshly-paid
  // status shows up in this very render.
  if (paid === '1' && session_id) {
    await confirmPaymentFromSession(session_id, profileId);
  }

  const [attendingRes, allEventsRes] = await Promise.all([
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
  //    un-cancelled occurrences as separate cards, dropping the ones the
  //    user already has a signup for. Each session is its own card with
  //    its own 'Request to attend' button.
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
  // Past = sessions you actually attended — i.e. you held an 'accepted'
  // signup AND the host published the final list for that date. Anything
  // pending, waitlisted, or where the host never published is excluded so
  // the past tab is a record of attendance, not of interest.
  const upcomingEvents = enriched
    .filter(r => new Date(r.iso).getTime() >= now)
    .sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
  const pastEvents = enriched
    .filter(r => new Date(r.iso).getTime() < now)
    .filter(r => r.signup?.status === 'accepted')
    .filter(r => (r.event.published_occurrence_dates ?? []).includes(r.iso.slice(0, 10)))
    .sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime());

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      {paid === '1' && (
        <div className="rounded-2xl px-5 py-3 mb-6 text-sm"
          style={{ backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0', color: 'var(--color-accent-dk)' }}>
          ✓ <strong>Payment received.</strong> See you at the session.
        </div>
      )}
      {paid === '0' && (
        <div className="rounded-2xl px-5 py-3 mb-6 text-sm"
          style={{ backgroundColor: '#FEE2E2', border: '1px solid var(--color-red)', color: 'var(--color-red)' }}>
          Payment cancelled. You can try again from the row below.
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Join event</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Every upcoming session on the platform plus the ones you&apos;re attending.
          </p>
        </div>
      </div>

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

      {/* PAST EVENTS — sessions the user actually attended (accepted +
          host published the final list for that date). */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Past events</h2>
        {pastEvents.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Sessions you were on the final list for will show up here once they&apos;ve happened.
          </p>
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
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted)' }}>
          {event.title}{event.location ? ` · ${event.location}` : ''}
        </p>
        <p className="text-base sm:text-lg font-bold leading-tight" style={{ fontFamily: 'var(--font-display)', textDecoration: cancelled ? 'line-through' : undefined }}>
          {dateLine}
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          {cancelled ? 'Sign-ups closed' : capacityLine}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {cancelled ? (
          <Badge tone={{ bg: '#FEE2E2', fg: 'var(--color-red)' }}>Cancelled by host</Badge>
        ) : signup ? (() => {
          // Payment is only relevant once the attendee is on the final list.
          // Pending = no payment due → no badge, no Pay button. We no longer
          // gate on the host publishing the date — once you're accepted you
          // can pay any time, matching the Unpaid page behaviour.
          const isAccepted = signup.status === 'accepted';
          const showPayBadge = isAccepted && Number(event.fee_amount) > 0;
          const showPayButton =
            isAccepted &&
            !past &&
            Number(event.fee_amount) > 0 &&
            signup.payment_status === 'unpaid';
          const showCancel =
            !past && signup.status !== 'cancelled' && signup.status !== 'declined';

          return (
            <>
              <Badge tone={STATUS_BADGE[signup.status]}>{SIGNUP_STATUS_LABELS[signup.status]}</Badge>
              {/* Suppress the 'UNPAID / payment due' badge until the host
                  publishes this session's final list. PAID still shows
                  immediately so the attendee sees their payment landed. */}
              {showPayBadge && (
                <Badge tone={PAYMENT_BADGE[signup.payment_status]}>{PAYMENT_STATUS_LABELS[signup.payment_status]}</Badge>
              )}
              {/* Once the host has published, the attendee can pay right
                  from the dashboard card — no detour through Unpaid. */}
              {showPayButton && (
                <PayButton
                  eventId={event.id}
                  occurrenceDate={occurrenceDate}
                  feeLabel={formatMoney(event.fee_amount, event.fee_currency)}
                />
              )}
              {/* Cancel only makes sense on future sessions the user is still
                  holding (declined / cancelled signups have no live commitment). */}
              {showCancel && (
                <CancelSignupButton eventId={event.id} occurrenceDate={occurrenceDate} />
              )}
            </>
          );
        })() : opensAtIso ? (
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
