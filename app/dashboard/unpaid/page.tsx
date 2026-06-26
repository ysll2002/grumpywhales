import Link from 'next/link';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { formatEventDateTime, formatMoney, type Event } from '@/lib/events';
import PayButton from './PayButton';

type UnpaidRow = {
  id:              string;
  occurrence_date: string;
  events:          Event | null;
};

function occurrenceIso(eventStartsAt: string, occDate: string): string {
  const start = new Date(eventStartsAt);
  const [y, m, d] = occDate.split('-').map(Number);
  const out = new Date(start);
  out.setUTCFullYear(y, m - 1, d);
  return out.toISOString();
}

export default async function UnpaidPage() {
  const session = await auth();
  const profileId = session!.user.profileId;

  const { data } = await supabase
    .from('event_signups')
    .select('id, occurrence_date, events(*)')
    .eq('profile_id', profileId)
    .eq('payment_status', 'unpaid')
    .neq('status', 'cancelled')
    .order('occurrence_date', { ascending: true });

  // Drop rows where:
  //   - the host cancelled that specific session (no payment owed), or
  //   - the host hasn't published this session's final list yet (payment
  //     isn't 'due' until the host says so).
  const rows = ((data ?? []) as unknown as UnpaidRow[])
    .filter(r => r.events)
    .filter(r => !(r.events!.cancelled_dates ?? []).includes(r.occurrence_date))
    .filter(r => (r.events!.published_occurrence_dates ?? []).includes(r.occurrence_date))
    .map(r => ({
      row: r,
      iso: occurrenceIso(r.events!.starts_at, r.occurrence_date),
    }));

  const now = Date.now();
  const upcoming = rows.filter(r => new Date(r.iso).getTime() >= now);
  const past     = rows.filter(r => new Date(r.iso).getTime() <  now);

  // Total owed (group by currency)
  const totalsByCurrency = new Map<string, number>();
  for (const { row } of rows) {
    if (!row.events) continue;
    totalsByCurrency.set(
      row.events.fee_currency,
      (totalsByCurrency.get(row.events.fee_currency) ?? 0) + Number(row.events.fee_amount),
    );
  }
  const totalLabel = Array.from(totalsByCurrency.entries()).map(([ccy, amt]) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: ccy, maximumFractionDigits: 2 }).format(amt)
  ).join(' · ');

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Unpaid</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
        Sessions you&apos;re signed up to but haven&apos;t paid for yet. Pay any one at a time.
      </p>

      {rows.length === 0 ? (
        <div className="p-10 rounded-2xl text-center"
          style={{ backgroundColor: 'var(--color-card)', border: '1px dashed var(--color-border)' }}>
          <p className="text-base mb-1" style={{ fontFamily: 'var(--font-display)' }}>All caught up</p>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Nothing outstanding — every session you&apos;re signed up to is either free or already paid.
          </p>
        </div>
      ) : (
        <>
          <div className="p-5 rounded-2xl mb-6 flex items-center justify-between flex-wrap gap-3"
            style={{ backgroundColor: '#FEE2E2', border: '1px solid var(--color-red)' }}>
            <p className="text-sm" style={{ color: 'var(--color-red)' }}>
              <strong>Total outstanding:</strong> {totalLabel}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-red)' }}>
              {rows.length} session{rows.length === 1 ? '' : 's'}
            </p>
          </div>

          {upcoming.length > 0 && <Section title="Upcoming" items={upcoming} />}
          {past.length     > 0 && <Section title="Past"     items={past}     muted />}
        </>
      )}
    </div>
  );
}

function Section({ title, items, muted }:
  { title: string; items: { row: UnpaidRow; iso: string }[]; muted?: boolean }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
      <div className="grid gap-3">
        {items.map(({ row, iso }) => row.events && (
          <div key={row.id}
            className="p-5 rounded-2xl flex items-start justify-between gap-4 flex-wrap"
            style={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              opacity: muted ? 0.75 : 1,
            }}>
            <Link href={`/e/${row.events.payment_reference}`}
              className="min-w-0 flex-1 block"
              style={{ textDecoration: 'none', color: 'inherit' }}>
              <p className="text-base font-semibold truncate mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                {row.events.title}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                {formatEventDateTime(iso)}{row.events.location ? ` · ${row.events.location}` : ''}
              </p>
            </Link>
            <div className="flex items-center gap-4 flex-shrink-0">
              <p className="text-xl font-semibold">
                {formatMoney(row.events.fee_amount, row.events.fee_currency)}
              </p>
              <PayButton
                eventId={row.events.id}
                occurrenceDate={row.occurrence_date}
                feeLabel={formatMoney(row.events.fee_amount, row.events.fee_currency)}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
