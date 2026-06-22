import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import EditEventForm from './EditEventForm';
import { formatEventDateTime, formatMoney, RECURRENCE_LABELS, type Event } from '@/lib/events';

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
      <div className="p-5 rounded-2xl mb-8 grid sm:grid-cols-3 gap-5" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
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
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted)' }}>Payment reference</p>
          <code className="text-sm font-medium">{ev.payment_reference}</code>
        </div>
      </div>

      {/* ── Settings ── */}
      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Settings</h2>
      <EditEventForm event={ev} />
    </div>
  );
}
