import Link from 'next/link';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { formatEventDateTime, formatMoney, type Event } from '@/lib/events';
import { SIGNUP_STATUS_LABELS, PAYMENT_STATUS_LABELS, type SignupStatus, type PaymentStatus } from '@/lib/signups';

type SignupRow = {
  id:             string;
  status:         SignupStatus;
  payment_status: PaymentStatus;
  signed_up_at:   string;
  events:         Event | null;
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

export default async function AttendingPage() {
  const session = await auth();
  const profileId = session!.user.profileId;

  const { data } = await supabase
    .from('event_signups')
    .select('id, status, payment_status, signed_up_at, events(*)')
    .eq('profile_id', profileId)
    .neq('status', 'cancelled')
    .order('signed_up_at', { ascending: false });

  const rows = (data ?? []) as unknown as SignupRow[];
  const now = Date.now();
  const upcoming = rows.filter(r => r.events && new Date(r.events.starts_at).getTime() >= now);
  const past     = rows.filter(r => r.events && new Date(r.events.starts_at).getTime() <  now);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Attending</h1>
      <p className="text-sm mb-10" style={{ color: 'var(--color-muted)' }}>
        Events you&apos;ve signed up for, with payment status.
      </p>

      <Section title="Upcoming" rows={upcoming} empty="No upcoming events. Open an event link to sign up." />
      <Section title="Past"     rows={past}     empty="No past events yet." />
    </div>
  );
}

function Section({ title, rows, empty }: { title: string; rows: SignupRow[]; empty: string }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{empty}</p>
      ) : (
        <div className="grid gap-3">
          {rows.map(r => r.events && (
            <Link
              key={r.id}
              href={`/e/${r.events.payment_reference}`}
              className="p-5 rounded-2xl flex items-start justify-between gap-4"
              style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-fg)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-base font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>{r.events.title}</span>
                  <Badge tone={STATUS_BADGE[r.status]}>{SIGNUP_STATUS_LABELS[r.status]}</Badge>
                  {Number(r.events.fee_amount) > 0 && (
                    <Badge tone={PAYMENT_BADGE[r.payment_status]}>{PAYMENT_STATUS_LABELS[r.payment_status]}</Badge>
                  )}
                </div>
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  {formatEventDateTime(r.events.starts_at)}{r.events.location ? ` · ${r.events.location}` : ''}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-semibold">{Number(r.events.fee_amount) > 0 ? formatMoney(r.events.fee_amount, r.events.fee_currency) : 'Free'}</p>
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
