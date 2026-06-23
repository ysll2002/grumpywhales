import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import EditEventForm from './EditEventForm';
import { formatEventDateTime, formatMoney, RECURRENCE_LABELS, SIGNUP_MODE_LABELS, type Event } from '@/lib/events';

export default async function EventAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const profileId = session!.user.profileId;
  const { id } = await params;

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('admin_id', profileId)
    .maybeSingle();

  if (!event) notFound();
  const ev: Event = event;

  // Roster counts — P3 will surface the full attendee list; for now just totals
  const { count: acceptedCount } = await supabase
    .from('event_signups').select('id', { head: true, count: 'exact' })
    .eq('event_id', ev.id).eq('status', 'accepted');
  const { count: pendingCount } = await supabase
    .from('event_signups').select('id', { head: true, count: 'exact' })
    .eq('event_id', ev.id).eq('status', 'pending');

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/dashboard/events" className="text-sm mb-4 inline-block" style={{ color: 'var(--color-muted)', textDecoration: 'none' }}>
        ← All events
      </Link>

      <div className="flex items-start justify-between mb-2 flex-wrap gap-4">
        <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{ev.title}</h1>
        <span className="text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-semibold" style={{
          backgroundColor: ev.status === 'published' ? '#D1FAE5' : ev.status === 'cancelled' ? '#FEE2E2' : '#E5E7EB',
          color:           ev.status === 'published' ? 'var(--color-accent-dk)' : ev.status === 'cancelled' ? 'var(--color-red)' : '#374151',
        }}>
          {ev.status}
        </span>
      </div>

      <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
        You are the admin of this event.
      </p>

      {/* ── Snapshot card ── */}
      <div className="p-5 rounded-2xl mb-6 grid sm:grid-cols-3 gap-5" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted)' }}>When</p>
          <p className="text-sm font-medium">{formatEventDateTime(ev.starts_at)}</p>
          {ev.ends_at && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>until {formatEventDateTime(ev.ends_at)}</p>}
          {ev.recurrence !== 'none' && <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>↻ Repeats {RECURRENCE_LABELS[ev.recurrence].toLowerCase()}</p>}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted)' }}>Fee</p>
          <p className="text-sm font-medium">{ev.fee_amount > 0 ? formatMoney(ev.fee_amount, ev.fee_currency) : 'Free'}</p>
          {ev.fee_amount > 0 && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>per attendee</p>}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted)' }}>Roster</p>
          <p className="text-sm font-medium">
            {acceptedCount ?? 0}{ev.capacity != null ? ` / ${ev.capacity}` : ''} accepted
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {SIGNUP_MODE_LABELS[ev.signup_mode]}{pendingCount ? ` · ${pendingCount} awaiting you` : ''}
          </p>
        </div>
      </div>

      {/* ── Public share link ── */}
      {ev.status === 'published' && ev.payment_reference && (
        <div className="p-4 rounded-2xl mb-8 flex items-center justify-between gap-3" style={{ backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0' }}>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-accent-dk)' }}>Share this event</p>
            <code className="text-sm font-medium truncate block" style={{ color: 'var(--color-accent-dk)' }}>
              grumpywhales.com/e/{ev.payment_reference}
            </code>
          </div>
          <Link href={`/e/${ev.payment_reference}`} target="_blank" className="text-sm font-medium" style={{ color: 'var(--color-accent-dk)' }}>
            Open ↗
          </Link>
        </div>
      )}

      {/* ── Roster shortcut ── */}
      <Link
        href={`/dashboard/events/${ev.id}/roster`}
        className="block p-4 rounded-2xl mb-8 flex items-center justify-between"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-fg)' }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Roster</p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            See who&apos;s signed up, change status, reorder, mark attendance.
          </p>
        </div>
        <span className="text-sm" style={{ color: 'var(--color-accent)' }}>Open →</span>
      </Link>

      {/* ── Settings ── */}
      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Settings</h2>
      <EditEventForm event={ev} />
    </div>
  );
}
