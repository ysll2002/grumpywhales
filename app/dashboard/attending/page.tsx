import Link from 'next/link';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { formatEventDateTime, formatMoney, type Event } from '@/lib/events';
import { SIGNUP_STATUS_LABELS, PAYMENT_STATUS_LABELS, type SignupStatus, type PaymentStatus } from '@/lib/signups';

type SignupRow = {
  id:              string;
  occurrence_date: string;
  status:          SignupStatus;
  payment_status:  PaymentStatus;
  signed_up_at:    string;
  events:          Event | null;
};

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

// Build the ISO timestamp for this specific occurrence by taking the time-of-day
// from event.starts_at and applying the occurrence_date.
function occurrenceIso(eventStartsAt: string, occurrenceDate: string): string {
  const start = new Date(eventStartsAt);
  const [y, m, d] = occurrenceDate.split('-').map(Number);
  const out = new Date(start);
  out.setUTCFullYear(y, m - 1, d);
  return out.toISOString();
}

export default async function AttendingPage() {
  const session = await auth();
  const profileId = session!.user.profileId;

  const { data } = await supabase
    .from('event_signups')
    .select('id, occurrence_date, status, payment_status, signed_up_at, events(*)')
    .eq('profile_id', profileId)
    .neq('status', 'cancelled')
    .order('occurrence_date', { ascending: true });

  const rows = (data ?? []) as unknown as SignupRow[];
  const now = Date.now();

  // Build derived ISO for upcoming/past split and display
  const enriched = rows
    .filter(r => r.events)
    .map(r => ({
      row: r,
      iso: occurrenceIso(r.events!.starts_at, r.occurrence_date),
      cancelled: (r.events!.cancelled_dates ?? []).includes(r.occurrence_date),
    }));

  const upcoming = enriched.filter(r => new Date(r.iso).getTime() >= now);
  const past     = enriched.filter(r => new Date(r.iso).getTime() <  now).reverse();   // newest past first

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Attending</h1>
      <p className="text-sm mb-10" style={{ color: 'var(--color-muted)' }}>
        Sessions you&apos;ve signed up for, with payment status. Each session of a recurring event is listed separately.
      </p>

      <Section title="Upcoming" rows={upcoming} empty="No upcoming sessions. Open an event link to sign up." />
      <Section title="Past"     rows={past}     empty="No past sessions yet." />
    </div>
  );
}

function Section({ title, rows, empty }:
  { title: string; rows: { row: SignupRow; iso: string; cancelled: boolean }[]; empty: string }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{empty}</p>
      ) : (
        <div className="grid gap-3">
          {rows.map(({ row, iso, cancelled }) => row.events && (
            <Link
              key={row.id}
              href={`/e/${row.events.payment_reference}`}
              className="p-5 rounded-2xl flex items-start justify-between gap-4"
              style={{
                backgroundColor: cancelled ? '#FAFAFA' : 'var(--color-card)',
                border:          '1px solid var(--color-border)',
                textDecoration:  'none',
                color:           'var(--color-fg)',
                opacity:         cancelled ? 0.75 : 1,
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-base font-semibold truncate" style={{ fontFamily: 'var(--font-display)', textDecoration: cancelled ? 'line-through' : undefined }}>{row.events.title}</span>
                  {cancelled ? (
                    <Badge tone={{ bg: '#FEE2E2', fg: 'var(--color-red)' }}>Cancelled by host</Badge>
                  ) : (
                    <>
                      <Badge tone={STATUS_BADGE[row.status]}>{SIGNUP_STATUS_LABELS[row.status]}</Badge>
                      {Number(row.events.fee_amount) > 0 && (
                        <Badge tone={PAYMENT_BADGE[row.payment_status]}>{PAYMENT_STATUS_LABELS[row.payment_status]}</Badge>
                      )}
                    </>
                  )}
                </div>
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  {formatEventDateTime(iso)}{row.events.location ? ` · ${row.events.location}` : ''}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-semibold">{Number(row.events.fee_amount) > 0 ? formatMoney(row.events.fee_amount, row.events.fee_currency) : 'Free'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
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
