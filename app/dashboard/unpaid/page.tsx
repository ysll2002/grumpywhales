import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { formatEventDateTime, formatMoney, type Event } from '@/lib/events';
import PayButton from './PayButton';
import PayAllButton from './PayAllButton';

type UnpaidRow = {
  id:              string;
  occurrence_date: string;
  fee_amount:      number | null;
  fee_currency:    string | null;
  events:          Event | null;
};

// The signup carries its own frozen fee once the event's price has been edited
// past its cutoff (paid or past occurrence). Falls back to the event's live
// price for the future-unpaid case.
function feeOf(r: UnpaidRow): { amount: number; currency: string } | null {
  const amt = r.fee_amount ?? r.events?.fee_amount;
  const ccy = r.fee_currency ?? r.events?.fee_currency;
  if (amt == null || !ccy) return null;
  return { amount: Number(amt), currency: ccy };
}

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

  // Only accepted-and-unpaid surfaces as "due". Pending rows carry
  // payment_status='unpaid' in the DB but render as N/A in the UI —
  // they shouldn't show here or contribute to the outstanding total.
  const { data } = await supabase
    .from('event_signups')
    .select('id, occurrence_date, fee_amount, fee_currency, events(*)')
    .eq('profile_id', profileId)
    .eq('payment_status', 'unpaid')
    .eq('status', 'accepted')
    .order('occurrence_date', { ascending: true });

  // Drop rows where the host cancelled that specific session — no payment
  // owed there. Otherwise show every unpaid signup so the user can settle
  // any of them in one place.
  const rows = ((data ?? []) as unknown as UnpaidRow[])
    .filter(r => r.events)
    .filter(r => !(r.events!.cancelled_dates ?? []).includes(r.occurrence_date))
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
    const fee = feeOf(row);
    if (!fee) continue;
    totalsByCurrency.set(fee.currency, (totalsByCurrency.get(fee.currency) ?? 0) + fee.amount);
  }
  const totalLabel = Array.from(totalsByCurrency.entries()).map(([ccy, amt]) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: ccy, maximumFractionDigits: 2 }).format(amt)
  ).join(' · ');

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
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
            <div>
              <p className="text-sm" style={{ color: 'var(--color-red)' }}>
                <strong>Total outstanding:</strong> {totalLabel}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>
                {rows.length} session{rows.length === 1 ? '' : 's'}
              </p>
            </div>
            {/* Single-currency Pay-all flow. Multi-currency totals fall back
                to per-row payment — the server route returns mixed_currencies
                in that case so the button surfaces an inline error. */}
            <PayAllButton totalLabel={totalLabel} count={rows.length} />
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
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold truncate mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                {row.events.title}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                {formatEventDateTime(iso)}{row.events.location ? ` · ${row.events.location}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              {(() => {
                const fee = feeOf(row);
                return fee ? (
                  <>
                    <p className="text-xl font-semibold">{formatMoney(fee.amount, fee.currency)}</p>
                    <PayButton
                      eventId={row.events!.id}
                      occurrenceDate={row.occurrence_date}
                      feeLabel={formatMoney(fee.amount, fee.currency)}
                    />
                  </>
                ) : null;
              })()}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
