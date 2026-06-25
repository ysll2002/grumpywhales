import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.profileId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { first_name?: string; last_name?: string };
  const first = (body.first_name ?? '').trim();
  const last  = (body.last_name  ?? '').trim();

  if (!first && !last) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const name = [first, last].filter(Boolean).join(' ');

  const { error } = await supabase
    .from('profiles')
    .update({ first_name: first || null, last_name: last || null, name })
    .eq('id', session.user.profileId);

  if (error) {
    return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, name });
}
