import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isEventAdmin } from '@/lib/event-admin';
import type { SignupStatus, PaymentStatus } from '@/lib/signups';

type SignupRow = {
  id:             string;
  status:         SignupStatus;
  payment_status: PaymentStatus;
  signed_up_at:   string;
  sort_order:     number | null;
  profile_id:     string;
  profiles:       { name: string | null; email: string } | null;
};

type AttendanceRow = {
  profile_id:      string;
  occurrence_date: string;
  attended:        boolean;
};

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const { id: eventId } = await params;
  if (!await isEventAdmin(eventId, session.user.profileId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: event } = await supabase
    .from('events').select('starts_at').eq('id', eventId).maybeSingle();
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const occurrenceDateForThis = event.starts_at.slice(0, 10);   // YYYY-MM-DD

  const [signupsRes, attendanceRes] = await Promise.all([
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

  const signups    = (signupsRes.data ?? []) as unknown as SignupRow[];
  const attendance = (attendanceRes.data ?? []) as unknown as AttendanceRow[];

  const cutoff = Date.now() - NINETY_DAYS_MS;
  const rows = signups.map(s => {
    const mine = attendance.filter(a => a.profile_id === s.profile_id);
    const past3 = mine.filter(a => new Date(a.occurrence_date).getTime() >= cutoff);
    const lifetimeAttended = mine.filter(a => a.attended).length;
    const past3Attended    = past3.filter(a => a.attended).length;
    const todayMark = mine.find(a => a.occurrence_date === occurrenceDateForThis);

    return {
      signup_id:      s.id,
      profile_id:     s.profile_id,
      name:           s.profiles?.name ?? null,
      email:          s.profiles?.email ?? null,
      status:         s.status,
      payment_status: s.payment_status,
      signed_up_at:   s.signed_up_at,
      sort_order:     s.sort_order,
      attended_today: todayMark?.attended ?? null,   // null = unrecorded for this date
      past_3mo:       { attended: past3Attended,    total: past3.length },
      lifetime:       { attended: lifetimeAttended, total: mine.length  },
    };
  });

  rows.sort((a, b) => {
    if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
    if (a.sort_order != null) return -1;
    if (b.sort_order != null) return 1;
    return new Date(a.signed_up_at).getTime() - new Date(b.signed_up_at).getTime();
  });

  return NextResponse.json({ attendees: rows, occurrence_date: occurrenceDateForThis });
}

// PATCH: bulk reorder. Body: { order: [signup_id, signup_id, ...] }
// Server writes sort_order = array index for each.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const { id: eventId } = await params;
  if (!await isEventAdmin(eventId, session.user.profileId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as { order?: string[] } | null;
  if (!body || !Array.isArray(body.order)) {
    return NextResponse.json({ error: 'invalid_order' }, { status: 400 });
  }

  // Update each one's sort_order = its index. Could be one big SQL, but a
  // handful of small updates is plenty for typical attendee-list sizes.
  await Promise.all(body.order.map((signupId, idx) =>
    supabase.from('event_signups').update({ sort_order: idx, updated_at: new Date().toISOString() })
      .eq('id', signupId).eq('event_id', eventId)
  ));

  return NextResponse.json({ ok: true });
}
