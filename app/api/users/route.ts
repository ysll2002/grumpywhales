import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isPlatformAdmin } from '@/lib/platform-admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTES_MAX = 4000;

// PATCH /api/users — platform admin updates their private notes on a user.
// Body: { email, notes }. An empty / whitespace-only notes value clears it.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  if (!(await isPlatformAdmin(session.user.email))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { email?: string; notes?: unknown };
  const email = (body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (typeof body.notes !== 'string' && body.notes !== null) {
    return NextResponse.json({ error: 'invalid_notes' }, { status: 400 });
  }
  const raw = typeof body.notes === 'string' ? body.notes : '';
  if (raw.length > NOTES_MAX) {
    return NextResponse.json({ error: 'notes_too_long', detail: `Max ${NOTES_MAX} characters.` }, { status: 400 });
  }
  const notes = raw.trim() === '' ? null : raw;

  const upd = await supabase
    .from('profiles')
    .update({ admin_notes: notes })
    .ilike('email', email)
    .select('email')
    .maybeSingle();
  if (upd.error) return NextResponse.json({ error: 'update_failed', detail: upd.error.message }, { status: 500 });
  if (!upd.data)  return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({ ok: true, notes });
}

// DELETE /api/users — platform admin removes a user entirely. Any admin status
// is revoked as part of the delete. Blocked if the target owns events (they'd
// be orphaned); the admin has to reassign or delete those first.
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  if (!(await isPlatformAdmin(session.user.email))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { email?: string };
  const email = (body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (email === session.user.email?.trim().toLowerCase()) {
    return NextResponse.json({ error: 'cannot_remove_self' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles').select('id, email').ilike('email', email).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Block if they own any event — better to force explicit cleanup than to
  // silently orphan events with a null admin_id.
  const { count: ownedEvents } = await supabase
    .from('events').select('id', { head: true, count: 'exact' }).eq('admin_id', profile.id);
  if ((ownedEvents ?? 0) > 0) {
    return NextResponse.json({
      error:  'owns_events',
      detail: `${email} owns ${ownedEvents} event${ownedEvents === 1 ? '' : 's'}. Delete or reassign those before removing the user.`,
    }, { status: 409 });
  }

  // Revoke admin (idempotent) then cascade the user's dependent rows before
  // dropping the profile itself. Individual failures surface a detail so the
  // UI can show what stopped.
  const fail = (at: string, msg: string) => {
    console.error(`[users DELETE] ${at} failed`, msg);
    return NextResponse.json({ error: 'delete_failed', at, detail: msg }, { status: 500 });
  };

  const adminDel = await supabase.from('platform_admins').delete().ilike('email', email);
  if (adminDel.error) return fail('platform_admins', adminDel.error.message);

  const signupsDel = await supabase.from('event_signups').delete().eq('profile_id', profile.id);
  if (signupsDel.error) return fail('event_signups', signupsDel.error.message);

  const attendanceDel = await supabase.from('event_attendance').delete().eq('profile_id', profile.id);
  if (attendanceDel.error) return fail('event_attendance', attendanceDel.error.message);

  const profileDel = await supabase.from('profiles').delete().eq('id', profile.id);
  if (profileDel.error) return fail('profiles', profileDel.error.message);

  return NextResponse.json({ ok: true });
}
