import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isEventAdmin } from '@/lib/event-admin';
import {
  formatEventDateTime, computeNextOccurrences, occurrenceDate,
  type Event,
} from '@/lib/events';
import AttendeesTable, { type AttendeeRow } from './AttendeesTable';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS     = 24 * 60 * 60 * 1000;

type SignupQueryRow = {
  id:              string;
  status:          string;
  payment_status:  string;
  signed_up_at:    string;
  occurrence_date: string;
  sort_order:      number | null;
  profile_id:      string;
  team_colour:     string | null;
  profiles:        { name: string | null; email: string } | null;
};

type AttendanceQueryRow = {
  profile_id:      string;
  occurrence_date: string;
  attended:        boolean;
};

// Build the list of occurrences the admin can pick from on the selector:
// the last 4 + the next 8 (for recurring), or just the single date (one-off).
function adminOccurrenceList(event: Event): string[] {
  if (event.recurrence === 'none') return [occurrenceDate(event.starts_at)];
  const future = computeNextOccurrences(event, 8);
  // Past: walk backwards from now by recurrence step, up to 4 dates, but never before event.starts_at.
  const past: string[] = [];
  const stepDays = event.recurrence === 'daily' ? 1 : event.recurrence === 'weekly' ? 7 : 30;
  const cursor = new Date(future[0] ?? event.starts_at);
  for (let i = 0; i < 4; i++) {
    cursor.setUTCDate(cursor.getUTCDate() - stepDays);
    if (cursor.getTime() < new Date(event.starts_at).getTime()) break;
    past.unshift(cursor.toISOString());
  }
  return [...past, ...future].map(occurrenceDate);
}

export default async function AttendeesPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ occurrence?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.profileId) redirect('/login');
  const { id: eventId } = await params;
  const { occurrence: requestedOcc } = await searchParams;

  if (!(await isEventAdmin(eventId, session.user.profileId))) notFound();

  const { data: event } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();
  if (!event) notFound();
  const ev: Event = event;

  const occurrences = adminOccurrenceList(ev);
  // Default to the next upcoming occurrence (the first one >= today UTC).
  const todayUtc = new Date().toISOString().slice(0, 10);
  const defaultOcc = occurrences.find(d => d >= todayUtc) ?? occurrences[occurrences.length - 1] ?? occurrenceDate(ev.starts_at);
  const selected = (requestedOcc && occurrences.includes(requestedOcc)) ? requestedOcc : defaultOcc;

  const [{ data: signupRows }, { data: attendanceRows }] = await Promise.all([
    supabase
      .from('event_signups')
      .select('id, status, payment_status, signed_up_at, occurrence_date, sort_order, profile_id, team_colour, profiles(name, email)')
      .eq('event_id', eventId)
      .eq('occurrence_date', selected)
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
    const thisOccurrenceMark = mine.find(a => a.occurrence_date === selected);
    return {
      signup_id:         s.id,
      profile_id:        s.profile_id,
      name:              s.profiles?.name ?? null,
      email:             s.profiles?.email ?? null,
      status:            s.status as AttendeeRow['status'],
      payment_status:    s.payment_status as AttendeeRow['payment_status'],
      team_colour:       s.team_colour as AttendeeRow['team_colour'],
      signed_up_at:      s.signed_up_at,
      sort_order:        s.sort_order,
      attended_today:    thisOccurrenceMark?.attended ?? null,
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

  const eventStarted = new Date(selected).getTime() + ONE_DAY_MS <= Date.now();

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <Link href="/dashboard/events" className="text-sm mb-4 inline-block" style={{ color: 'var(--color-muted)', textDecoration: 'none' }}>
        ← My events
      </Link>

      <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Attendees</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        <strong>{ev.title}</strong> · {formatEventDateTime(ev.starts_at)}
      </p>

      {ev.recurrence !== 'none' && occurrences.length > 1 && (
        <div className="mb-6">
          <label className="text-[10px] uppercase tracking-wider block mb-2" style={{ color: 'var(--color-muted)' }}>
            Session
          </label>
          <div className="flex gap-2 flex-wrap">
            {occurrences.map(d => (
              <Link
                key={d}
                href={`?occurrence=${d}`}
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: d === selected ? 'var(--color-accent)' : 'var(--color-card)',
                  color:           d === selected ? '#FFFFFF'              : 'var(--color-fg)',
                  border:          d === selected ? 'none'                 : '1px solid var(--color-border)',
                  textDecoration:  'none',
                }}
              >
                {new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* `key` forces a fresh client component instance per session date,
          so the table's local `rows` state always reflects what the server
          just fetched for the selected occurrence — switching tabs no
          longer carries over the previous tab's optimistic edits. */}
      <AttendeesTable
        key={selected}
        eventId={ev.id}
        occurrenceDate={selected}
        eventStarted={eventStarted}
        capacity={ev.capacity}
        publishedAt={ev.attendees_published_at}
        cancelled={(ev.cancelled_dates ?? []).includes(selected)}
        isRecurring={ev.recurrence !== 'none'}
        initial={initial}
      />
    </div>
  );
}
