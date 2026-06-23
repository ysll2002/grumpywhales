import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isEventAdmin } from '@/lib/event-admin';
import { formatEventDateTime, type Event } from '@/lib/events';
import AttendeesTable, { type AttendeeRow } from './AttendeesTable';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

type SignupQueryRow = {
  id:             string;
  status:         string;
  payment_status: string;
  signed_up_at:   string;
  sort_order:     number | null;
  profile_id:     string;
  profiles:       { name: string | null; email: string } | null;
};

type AttendanceQueryRow = {
  profile_id:      string;
  occurrence_date: string;
  attended:        boolean;
};

export default async function AttendeesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) redirect('/login');
  const { id: eventId } = await params;

  if (!(await isEventAdmin(eventId, session.user.profileId))) {
    notFound();
  }

  const { data: event } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();
  if (!event) notFound();
  const ev: Event = event;
  const occurrenceDate = ev.starts_at.slice(0, 10);

  const [{ data: signupRows }, { data: attendanceRows }] = await Promise.all([
    supabase
      .from('event_signups')
      .select('id, status, payment_status, signed_up_at, sort_order, profile_id, profiles(name, email)')
      .eq('event_id', eventId)
      .neq('status', 'cancelled'),
    supabase
      .from('event_attendance')
      .select('profile_id, occurrence_date, attended')
      .eq('event_id', eventId),
  ]);

  const signups    = (signupRows    ?? []) as unknown as SignupQueryRow[];
  const attendance = (attendanceRows ?? []) as unknown as AttendanceQueryRow[];

  const cutoff = Date.now() - NINETY_DAYS_MS;
  const initial: AttendeeRow[] = signups.map(s => {
    const mine  = attendance.filter(a => a.profile_id === s.profile_id);
    const past3 = mine.filter(a => new Date(a.occurrence_date).getTime() >= cutoff);
    const todayMark = mine.find(a => a.occurrence_date === occurrenceDate);
    return {
      signup_id:        s.id,
      profile_id:       s.profile_id,
      name:             s.profiles?.name ?? null,
      email:            s.profiles?.email ?? null,
      status:           s.status as AttendeeRow['status'],
      payment_status:   s.payment_status as AttendeeRow['payment_status'],
      signed_up_at:     s.signed_up_at,
      sort_order:       s.sort_order,
      attended_today:   todayMark?.attended ?? null,
      past_3mo_attended: past3.filter(a => a.attended).length,
      past_3mo_total:    past3.length,
      lifetime_attended: mine.filter(a => a.attended).length,
      lifetime_total:    mine.length,
    };
  }).sort((a, b) => {
    if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
    if (a.sort_order != null) return -1;
    if (b.sort_order != null) return 1;
    return new Date(a.signed_up_at).getTime() - new Date(b.signed_up_at).getTime();
  });

  const eventStarted = new Date(ev.starts_at).getTime() <= Date.now();

  return (
    <div className="p-8 max-w-6xl">
      <Link href={`/dashboard/events/${ev.id}`} className="text-sm mb-4 inline-block" style={{ color: 'var(--color-muted)', textDecoration: 'none' }}>
        ← Back to event
      </Link>

      <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Attendees</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
        <strong>{ev.title}</strong> · {formatEventDateTime(ev.starts_at)}
      </p>

      <AttendeesTable
        eventId={ev.id}
        occurrenceDate={occurrenceDate}
        eventStarted={eventStarted}
        capacity={ev.capacity}
        initial={initial}
      />
    </div>
  );
}
