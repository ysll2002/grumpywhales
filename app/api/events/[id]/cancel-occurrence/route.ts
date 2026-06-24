import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isEventAdmin } from '@/lib/event-admin';
import { sendEmail } from '@/lib/email';
import { occurrenceCancelledEmail } from '@/lib/email-templates';

type SignupForEmail = {
  payment_status: 'free' | 'unpaid' | 'paid';
  profiles:       { name: string | null; email: string } | null;
};

// POST   /api/events/:id/cancel-occurrence    body { occurrence_date } — cancel one session
// DELETE /api/events/:id/cancel-occurrence    body { occurrence_date } — un-cancel one session
//
// Cancel writes the date into events.cancelled_dates and emails every non-
// cancelled attendee on that date. Un-cancel just removes the date; previously
// cancelled signups are left as-is (the admin can re-invite manually).

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const { id: eventId } = await params;
  if (!await isEventAdmin(eventId, session.user.profileId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { occurrence_date?: string };
  if (!body.occurrence_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.occurrence_date)) {
    return NextResponse.json({ error: 'missing_occurrence_date' }, { status: 400 });
  }

  const { data: event } = await supabase
    .from('events')
    .select('title, starts_at, payment_reference, admin_id, cancelled_dates')
    .eq('id', eventId).maybeSingle();
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const already = (event.cancelled_dates ?? []).includes(body.occurrence_date);
  if (already) return NextResponse.json({ ok: true, already: true });

  await supabase
    .from('events')
    .update({
      cancelled_dates: [...(event.cancelled_dates ?? []), body.occurrence_date],
      updated_at:      new Date().toISOString(),
    })
    .eq('id', eventId);

  // Notify everyone on that date who hadn't already cancelled themselves.
  const { data: signupRows } = await supabase
    .from('event_signups')
    .select('payment_status, profiles(name, email)')
    .eq('event_id', eventId)
    .eq('occurrence_date', body.occurrence_date)
    .neq('status', 'cancelled');
  const signups = (signupRows ?? []) as unknown as SignupForEmail[];

  const { data: host } = await supabase
    .from('profiles').select('name').eq('id', event.admin_id).maybeSingle();
  const hostName = host?.name ?? null;

  const baseUrl  = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://grumpywhales.com';
  const eventUrl = `${baseUrl}/e/${event.payment_reference}`;

  // Build the occurrence ISO from the requested date + event time-of-day.
  const seriesStart = new Date(event.starts_at);
  const [y, m, d]   = body.occurrence_date.split('-').map(Number);
  const occurrence  = new Date(seriesStart);
  occurrence.setUTCFullYear(y, m - 1, d);
  const occurrenceIso = occurrence.toISOString();

  const results = await Promise.allSettled(signups.map(async s => {
    if (!s.profiles?.email) return { skipped: true };
    const { subject, text, html } = occurrenceCancelledEmail({
      attendeeName: s.profiles.name,
      event:        { title: event.title, payment_reference: event.payment_reference },
      occurrenceIso,
      paid:         s.payment_status === 'paid',
      hostName,
      eventUrl,
    });
    await sendEmail({ to: s.profiles.email, subject, text, html });
    return { sent: true };
  }));

  const sent   = results.filter(r => r.status === 'fulfilled' && (r.value as { sent?: boolean }).sent).length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return NextResponse.json({ ok: true, notified: sent, failed });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const { id: eventId } = await params;
  if (!await isEventAdmin(eventId, session.user.profileId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { occurrence_date?: string };
  if (!body.occurrence_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.occurrence_date)) {
    return NextResponse.json({ error: 'missing_occurrence_date' }, { status: 400 });
  }

  const { data: event } = await supabase
    .from('events').select('cancelled_dates').eq('id', eventId).maybeSingle();
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const next = (event.cancelled_dates ?? []).filter((d: string) => d !== body.occurrence_date);
  await supabase
    .from('events')
    .update({ cancelled_dates: next, updated_at: new Date().toISOString() })
    .eq('id', eventId);
  return NextResponse.json({ ok: true });
}
