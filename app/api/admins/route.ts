import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isPlatformAdmin } from '@/lib/platform-admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
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

  const { error } = await supabase
    .from('platform_admins')
    .upsert(
      { email, added_by: session.user.profileId },
      { onConflict: 'email', ignoreDuplicates: true },
    );
  if (error) return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, email });
}

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

  // Block removing the last admin — otherwise no-one could ever invite again
  // without direct DB access.
  const { count } = await supabase
    .from('platform_admins')
    .select('email', { head: true, count: 'exact' });
  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: 'cannot_remove_last_admin' }, { status: 400 });
  }

  const { error } = await supabase.from('platform_admins').delete().ilike('email', email);
  if (error) return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
