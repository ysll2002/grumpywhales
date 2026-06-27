import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isPlatformAdmin } from '@/lib/platform-admin';
import { sendEmail } from '@/lib/email';
import { adminInviteEmail } from '@/lib/email-templates';

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

  // Welcome email. The admin row is in place either way (we return ok=true),
  // but surface the email result so the UI can show "sent" / "send failed
  // — fix RESEND_API_KEY / verify the sender domain".
  let email_sent = false;
  let email_error: string | null = null;
  try {
    const { data: inviter } = await supabase
      .from('profiles').select('name').eq('id', session.user.profileId).maybeSingle();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://grumpywhales.com';
    const { subject, text, html } = adminInviteEmail({
      invitedEmail:  email,
      invitedByName: inviter?.name ?? null,
      dashboardUrl:  `${baseUrl}/dashboard/manage`,
    });
    await sendEmail({ to: email, subject, text, html });
    email_sent = true;
  } catch (err) {
    email_error = err instanceof Error ? err.message : 'unknown';
    console.error('[admins POST] invite email failed', err);
  }

  return NextResponse.json({ ok: true, email, email_sent, email_error });
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
