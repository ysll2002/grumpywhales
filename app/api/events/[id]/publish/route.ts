import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isEventAdmin } from '@/lib/event-admin';
import { sendEmail } from '@/lib/email';
import { attendeeListPublishEmail } from '@/lib/email-templates';

type SignupForEmail = {
  status:    'accepted' | 'waitlisted' | 'declined' | 'pending';
  profiles:  { name: string | null; email: string } | null;
};

// POST /api/events/:id/publish — emails every non-cancelled attendee for the
// given occurrence_date with their final status and the event details.
// Body: { occurrence_date: 'YYYY-MM-DD' }
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

  // Event + host details
  const { data: event } = await supabase
    .from('events')
    .select('title, starts_at, location, fee_amount, fee_currency, payment_reference, admin_id')
    .eq('id', eventId)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: host } = await supabase
    .from('profiles').select('name').eq('id', event.admin_id).maybeSingle();
  const hostName = host?.name ?? null;

  // Signups for this specific occurrence.
  const { data: signupRows } = await supabase
    .from('event_signups')
    .select('status, profiles(name, email)')
    .eq('event_id', eventId)
    .eq('occurrence_date', body.occurrence_date)
    .neq('status', 'cancelled');
  const signups = (signupRows ?? []) as unknown as SignupForEmail[];

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://grumpywhales.com';
  const eventUrl = `${baseUrl}/e/${event.payment_reference}`;

  // Compute the actual start ISO for THIS occurrence (event.starts_at gives
  // time-of-day; occurrence_date overrides the date).
  const seriesStart = new Date(event.starts_at);
  const [y, m, d]   = body.occurrence_date.split('-').map(Number);
  const occurrenceStart = new Date(seriesStart);
  occurrenceStart.setUTCFullYear(y, m - 1, d);
  const eventForEmail = { ...event, starts_at: occurrenceStart.toISOString() };

  // Send in parallel, swallow individual failures so one bad address doesn't
  // stop the rest. Report counts so the host knows what happened.
  const results = await Promise.allSettled(signups.map(async s => {
    if (!s.profiles?.email) return { skipped: true };
    const { subject, text, html } = attendeeListPublishEmail({
      attendeeName: s.profiles.name,
      status:       s.status,
      event:        eventForEmail,
      hostName,
      eventUrl,
    });
    await sendEmail({ to: s.profiles.email, subject, text, html });
    return { sent: true };
  }));

  const sent    = results.filter(r => r.status === 'fulfilled' && (r.value as { sent?: boolean }).sent).length;
  const skipped = results.filter(r => r.status === 'fulfilled' && (r.value as { skipped?: boolean }).skipped).length;
  const failed  = results.filter(r => r.status === 'rejected').length;

  await supabase.from('events').update({
    attendees_published_at: new Date().toISOString(),
    updated_at:             new Date().toISOString(),
  }).eq('id', eventId);

  return NextResponse.json({ sent, skipped, failed });
}
