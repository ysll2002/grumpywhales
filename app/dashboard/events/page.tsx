import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import Link from 'next/link';
import { formatEventDateTime, formatMoney, RECURRENCE_LABELS, type Event } from '@/lib/events';

const statusBadge: Record<string, { bg: string; fg: string; label: string }> = {
  draft:     { bg: '#2A2F37', fg: '#8B949E', label: 'Draft' },
  published: { bg: '#1E3A5F', fg: '#5BA3F5', label: 'Live' },
  closed:    { bg: '#1F2937', fg: '#9CA3AF', label: 'Closed' },
  cancelled: { bg: '#3F1F1F', fg: '#F87171', label: 'Cancelled' },
};

export default async function EventsListPage() {
  const session = await auth();
  const profileId = session!.user.profileId;

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('admin_id', profileId)
    .order('starts_at', { ascending: false });

  const list: Event[] = events ?? [];

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Events</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Every event you&apos;ve created. You&apos;re the admin.</p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="px-5 py-2.5 rounded-full text-sm font-medium"
          style={{ backgroundColor: 'var(--color-accent)', color: '#0A0D12', textDecoration: 'none' }}
        >
          + New event
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="p-10 rounded-2xl text-center" style={{ backgroundColor: 'var(--color-card)', border: '1px dashed var(--color-border)' }}>
          <p className="text-lg mb-2" style={{ fontFamily: 'var(--font-display)' }}>No events yet</p>
          <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>Create your first event in under a minute.</p>
          <Link
            href="/dashboard/events/new"
            className="inline-block px-6 py-3 rounded-full text-sm font-medium"
            style={{ backgroundColor: 'var(--color-accent)', color: '#0A0D12', textDecoration: 'none' }}
          >
            Create event →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map(ev => {
            const badge = statusBadge[ev.status] ?? statusBadge.draft;
            return (
              <Link
                key={ev.id}
                href={`/dashboard/events/${ev.id}`}
                className="p-5 rounded-2xl flex items-start justify-between gap-4"
                style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-fg)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-base font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>{ev.title}</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: badge.bg, color: badge.fg }}>
                      {badge.label}
                    </span>
                    {ev.recurrence && ev.recurrence !== 'none' && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#2A2F37', color: '#8B949E' }}>
                        ↻ {RECURRENCE_LABELS[ev.recurrence]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-1" style={{ color: 'var(--color-muted)' }}>
                    {formatEventDateTime(ev.starts_at)}{ev.location ? ` · ${ev.location}` : ''}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                    Ref: <code style={{ color: 'var(--color-fg)' }}>{ev.payment_reference}</code>
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-semibold">{ev.fee_amount > 0 ? formatMoney(ev.fee_amount, ev.fee_currency) : 'Free'}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>per attendee</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
