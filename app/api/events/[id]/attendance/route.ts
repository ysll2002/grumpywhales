import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isEventAdmin } from '@/lib/event-admin';

// POST /api/events/:id/attendance
// Body: { occurrence_date: 'YYYY-MM-DD', marks: [{ profile_id, attended: bool | null }] }
// attended = null means "clear the record for this person on this date".
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const { id: eventId } = await params;
  if (!await isEventAdmin(eventId, session.user.profileId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  type Mark = { profile_id: string; attended: boolean | null };
  const body = await req.json().catch(() => null) as { occurrence_date?: string; marks?: Mark[] } | null;
  if (!body || typeof body.occurrence_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.occurrence_date)
      || !Array.isArray(body.marks)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const recorder = session.user.profileId;
  const toUpsert = body.marks.filter(m => m.attended !== null).map(m => ({
    event_id:        eventId,
    profile_id:      m.profile_id,
    occurrence_date: body.occurrence_date!,
    attended:        m.attended as boolean,
    recorded_by:     recorder,
    recorded_at:     new Date().toISOString(),
  }));
  const toDelete = body.marks.filter(m => m.attended === null).map(m => m.profile_id);

  if (toUpsert.length) {
    const { error } = await supabase.from('event_attendance')
      .upsert(toUpsert, { onConflict: 'event_id,occurrence_date,profile_id' });
    if (error) return NextResponse.json({ error: 'attendance_failed', detail: error.message }, { status: 500 });
  }
  if (toDelete.length) {
    const { error } = await supabase.from('event_attendance').delete()
      .eq('event_id', eventId).eq('occurrence_date', body.occurrence_date)
      .in('profile_id', toDelete);
    if (error) return NextResponse.json({ error: 'attendance_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
