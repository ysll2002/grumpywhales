import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isPlatformAdmin } from '@/lib/platform-admin';
import { formatEventDateTime, formatMoney, type Event } from '@/lib/events';

type DueRow = {
  id:              string;
  occurrence_date: string;
  signed_up_at:    string;
  profiles:        { name: string | null; email: string } | null;
  events:          (Event & { admin_id: string }) | null;
};

function occurrenceIso(eventStartsAt: string, occDate: string): string {
  const start = new Date(eventStartsAt);
  const [y, m, d] = occDate.split('-').map(Number);
  const out = new Date(start);
  out.setUTCFullYear(y, m - 1, d);
  return out.toISOString();
}

export default async function PaymentDuePage() {
  const session = await auth();
  if (!session?.user?.profileId || !(await isPlatformAdmin(session.user.email))) notFound();
  const profileId = session.user.profileId;

  // Same scoping as the Manage event stats: every event the admin manages.
  // Platform admins manage all events; a per-event co-admin would see only
  // their own. For now the page is gated to platform admins anyway.
  const { data: events } = await supabase
    .from('events').select('id, admin_id').order('starts_at', { ascending: true });
  const managedEventIds = (events ?? []).map(e => e.id);

  let rows: DueRow[] = [];
  if (managedEventIds.length > 0) {
    const { data } = await supabase
      .from('event_signups')
      .select('id, occurrence_date, signed_up_at, profiles(name, email), events(*)')
      .in('event_id', managedEventIds)
      .eq('status', 'accepted')
      .eq('payment_status', 'unpaid')
      .order('occurrence_date', { ascending: true });
    rows = ((data ?? []) as unknown as DueRow[])
      .filter(r => r.events && r.profiles)
      .filter(r => !(r.events!.cancelled_dates ?? []).includes(r.occurrence_date));
  }

  // Totals by currency.
  const totalsByCurrency = new Map<string, number>();
  for (const r of rows) {
    if (!r.events) continue;
    totalsByCurrency.set(
      r.events.fee_currency,
      (totalsByCurrency.get(r.events.fee_currency) ?? 0) + Number(r.events.fee_amount),
    );
  }
  const totalLabel = Array.from(totalsByCurrency.entries()).map(([ccy, amt]) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: ccy, maximumFractionDigits: 2 }).format(amt)
  ).join(' · ') || '—';

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <Link href="/dashboard/manage" className="text-sm mb-4 inline-block" style={{ color: 'var(--color-muted)', textDecoration: 'none' }}>
        ← Manage event
      </Link>

      <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Payment due</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        Every accepted attendee who hasn&apos;t paid yet, across every event you manage.
      </p>

      {rows.length === 0 ? (
        <div className="p-10 rounded-2xl text-center" style={{ backgroundColor: 'var(--color-card)', border: '1px dashed var(--color-border)' }}>
          <p className="text-base mb-1" style={{ fontFamily: 'var(--font-display)' }}>All paid up</p>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No outstanding payments right now.</p>
        </div>
      ) : (
        <>
          <div className="p-5 rounded-2xl mb-6 flex items-center justify-between flex-wrap gap-3"
            style={{ backgroundColor: '#FEE2E2', border: '1px solid var(--color-red)' }}>
            <p className="text-sm" style={{ color: 'var(--color-red)' }}>
              <strong>Total outstanding:</strong> {totalLabel}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-red)' }}>
              {rows.length} sign-up{rows.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="rounded-2xl overflow-x-auto" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <Th>Attendee</Th>
                  <Th>Event</Th>
                  <Th>Session</Th>
                  <Th>Fee</Th>
                  <Th>{' '}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const iso = occurrenceIso(r.events!.starts_at, r.occurrence_date);
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <Td>
                        <div className="font-medium">{r.profiles!.name ?? '—'}</div>
                        <a href={`mailto:${r.profiles!.email}`} className="text-xs underline"
                          style={{ color: 'var(--color-muted)' }}>
                          {r.profiles!.email}
                        </a>
                      </Td>
                      <Td>{r.events!.title}</Td>
                      <Td muted>{formatEventDateTime(iso)}</Td>
                      <Td>{formatMoney(r.events!.fee_amount, r.events!.fee_currency)}</Td>
                      <Td>
                        <Link
                          href={`/dashboard/events/${r.events!.id}/attendees?occurrence=${r.occurrence_date}`}
                          className="text-xs"
                          style={{ color: 'var(--color-accent-dk)' }}
                        >
                          Open attendees →
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{children}</th>;
}
function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <td className="px-4 py-3" style={{ color: muted ? 'var(--color-muted)' : undefined }}>{children}</td>;
}
