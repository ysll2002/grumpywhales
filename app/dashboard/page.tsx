import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import Link from 'next/link';
import { formatEventDateTime, formatMoney, type Event } from '@/lib/events';

export default async function DashboardHome() {
  const session = await auth();
  const profileId = session!.user.profileId;

  const { data: eventsData } = await supabase
    .from('events')
    .select('*')
    .eq('admin_id', profileId)
    .order('starts_at', { ascending: true });

  const events: Event[] = eventsData ?? [];
  const now = new Date();
  const upcoming = events.filter(e => new Date(e.starts_at) >= now && e.status !== 'cancelled');
  const published = events.filter(e => e.status === 'published').length;
  const totalFee = upcoming.reduce((sum, e) => sum + Number(e.fee_amount || 0), 0);
  const nextEvent = upcoming[0];

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        Welcome back, {session?.user.name ?? 'there'}.
      </h1>
      <p style={{ color: 'var(--color-muted)' }} className="mb-10">
        {events.length === 0
          ? 'Create your first event to start collecting fees.'
          : 'Your event hub.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total events', value: String(events.length) },
          { label: 'Published',    value: String(published) },
          { label: 'Upcoming fee (per attendee)', value: totalFee > 0 ? formatMoney(totalFee, 'GBP') : '£0' },
        ].map(m => (
          <div key={m.label} className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{m.label}</p>
            <p className="text-2xl font-semibold mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {nextEvent && (
        <Link
          href={`/dashboard/events/${nextEvent.id}`}
          className="block p-5 rounded-2xl mb-6"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-fg)' }}
        >
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted)' }}>Next up</p>
          <p className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>{nextEvent.title}</p>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {formatEventDateTime(nextEvent.starts_at)}{nextEvent.location ? ` · ${nextEvent.location}` : ''}
          </p>
        </Link>
      )}

      <Link
        href="/dashboard/events/new"
        className="inline-block px-6 py-3 rounded-full text-sm font-medium"
        style={{ backgroundColor: 'var(--color-accent)', color: '#0A0D12', textDecoration: 'none' }}
      >
        + Create event
      </Link>
    </div>
  );
}
