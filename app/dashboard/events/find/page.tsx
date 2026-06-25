import Link from 'next/link';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import {
  formatEventDateTime, formatMoney, SIGNUP_MODE_LABELS,
  computeNextOccurrences,
  type Event,
} from '@/lib/events';

type EventWithHost = Event & { profiles: { name: string | null } | null };

const OCCURRENCES_PER_EVENT = 8;

export default async function FindEventsPage() {
  const session = await auth();
  const profileId = session?.user?.profileId ?? null;

  const { data } = await supabase
    .from('events')
    .select('*, profiles!events_admin_id_fkey(name)')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  const events = (data ?? []) as unknown as EventWithHost[];

  // Expand each event into one card per upcoming un-cancelled occurrence,
  // so a recurring event surfaces every day independently.
  const cards = events.flatMap(ev => {
    const cancelled = new Set(ev.cancelled_dates ?? []);
    return computeNextOccurrences(ev, OCCURRENCES_PER_EVENT)
      .filter(iso => !cancelled.has(iso.slice(0, 10)))
      .map(iso => ({ ev, iso }));
  }).sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/dashboard/events" className="text-sm mb-4 inline-block" style={{ color: 'var(--color-muted)', textDecoration: 'none' }}>
        ← My events
      </Link>

      <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Find events</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
        Every upcoming session on GrumpyWhales. Each recurring event lists each day separately — you can apply to join any single session.
      </p>

      {cards.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No upcoming sessions right now.</p>
      ) : (
        <div className="grid gap-3">
          {cards.map(({ ev, iso }) => {
            const hostName = ev.profiles?.name ?? 'A host';
            const fee = Number(ev.fee_amount) > 0 ? formatMoney(ev.fee_amount, ev.fee_currency) : 'Free';
            const isHost = profileId != null && ev.admin_id === profileId;
            const recurring = ev.recurrence !== 'none';
            return (
              <Link key={`${ev.id}-${iso}`} href={`/e/${ev.payment_reference}`}
                className="p-5 rounded-2xl flex items-start justify-between gap-4 flex-wrap"
                style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-fg)' }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-base font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>{ev.title}</span>
                    {recurring && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: '#E5E7EB', color: '#374151' }}>
                        {ev.recurrence}
                      </span>
                    )}
                    {isHost && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: '#FFF4B8', color: '#7C5800' }}>
                        You host this
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium">
                    {formatEventDateTime(iso)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                    {hostName}{ev.location ? ` · ${ev.location}` : ''} · {SIGNUP_MODE_LABELS[ev.signup_mode]}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-semibold">{fee}</p>
                  {Number(ev.fee_amount) > 0 && <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>per session</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
