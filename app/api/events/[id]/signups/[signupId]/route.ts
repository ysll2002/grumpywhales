import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isEventAdmin } from '@/lib/event-admin';
import type { SignupStatus, PaymentStatus } from '@/lib/signups';
import { TEAM_COLOUR_KEYS, type TeamColour } from '@/lib/signups';
import { sendEmail } from '@/lib/email';
import { attendeeAcceptedEmail } from '@/lib/email-templates';

const VALID_STATUS:  SignupStatus[]  = ['accepted', 'pending', 'waitlisted', 'declined', 'cancelled'];
const VALID_PAYMENT: PaymentStatus[] = ['free', 'unpaid', 'paid'];

// PATCH /api/events/:id/signups/:signupId — admin tweaks a signup row.
// Body may set { status, payment_status }; both optional, validated per-field.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; signupId: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const { id: eventId, signupId } = await params;
  if (!await isEventAdmin(eventId, session.user.profileId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as { status?: string; payment_status?: string; team_colour?: string | null } | null;
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if ('status' in body) {
    if (typeof body.status !== 'string' || !VALID_STATUS.includes(body.status as SignupStatus)) {
      return NextResponse.json({ error: 'status_invalid' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if ('payment_status' in body) {
    if (typeof body.payment_status !== 'string' || !VALID_PAYMENT.includes(body.payment_status as PaymentStatus)) {
      return NextResponse.json({ error: 'payment_status_invalid' }, { status: 400 });
    }
    patch.payment_status = body.payment_status;
    if (body.payment_status === 'paid')   patch.paid_at = new Date().toISOString();
    if (body.payment_status === 'unpaid') patch.paid_at = null;
  }
  if ('team_colour' in body) {
    if (body.team_colour == null) {
      patch.team_colour = null;
    } else if (typeof body.team_colour !== 'string' || !TEAM_COLOUR_KEYS.includes(body.team_colour as TeamColour)) {
      return NextResponse.json({ error: 'team_colour_invalid' }, { status: 400 });
    } else {
      patch.team_colour = body.team_colour;
    }
  }
  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
  }

  // Snapshot the previous status so we can detect the pending → accepted
  // transition after the update and fire the acceptance email exactly once
  // (bulk edits hit this endpoint per-row, so per-transition is correct).
  const { data: prev } = await supabase
    .from('event_signups')
    .select('status')
    .eq('id', signupId)
    .eq('event_id', eventId)
    .maybeSingle();

  const { data, error } = await supabase
    .from('event_signups')
    .update(patch)
    .eq('id', signupId)
    .eq('event_id', eventId)
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (patch.status === 'accepted' && prev?.status !== 'accepted') {
    // Fire-and-forget: email failure must not fail the admin's status change.
    notifyAccepted(eventId, data as { occurrence_date: string; payment_status: PaymentStatus; profile_id: string; fee_amount: number | null; fee_currency: string | null })
      .catch(err => console.error('[signups] accepted email failed', err));
  }

  return NextResponse.json({ signup: data });
}

async function notifyAccepted(
  eventId: string,
  signup: { occurrence_date: string; payment_status: PaymentStatus; profile_id: string; fee_amount: number | null; fee_currency: string | null },
): Promise<void> {
  const [eventRes, profileRes] = await Promise.all([
    supabase.from('events').select('title, starts_at, location, fee_amount, fee_currency').eq('id', eventId).maybeSingle(),
    supabase.from('profiles').select('name, email').eq('id', signup.profile_id).maybeSingle(),
  ]);
  const event   = eventRes.data;
  const profile = profileRes.data;
  if (!event || !profile?.email) return;

  // Resolve the fee: prefer the per-signup snapshot (frozen at accept/paid
  // time), fall back to the event's current price for still-live signups.
  const feeAmount   = signup.fee_amount   ?? event.fee_amount;
  const feeCurrency = signup.fee_currency ?? event.fee_currency;

  // Combine event.starts_at (time-of-day) with occurrence_date to get the
  // exact session moment for the email header/table.
  const seriesStart     = new Date(event.starts_at);
  const [y, m, d]       = signup.occurrence_date.split('-').map(Number);
  const occurrenceStart = new Date(seriesStart);
  occurrenceStart.setUTCFullYear(y, m - 1, d);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://grumpywhales.com';
  const { subject, text, html } = attendeeAcceptedEmail({
    attendeeName:  profile.name,
    event:         { title: event.title, location: event.location, fee_amount: feeAmount, fee_currency: feeCurrency },
    occurrenceIso: occurrenceStart.toISOString(),
    paymentStatus: signup.payment_status,
    eventUrl:      `${baseUrl}/dashboard/events`,
  });
  await sendEmail({ to: profile.email, subject, text, html });
}

// DELETE /api/events/:id/signups/:signupId — admin hard-removes a signup row.
// Refuses if the attendee already paid (force-cancel the status instead so
// the payment record stays). Otherwise wipes the row entirely.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; signupId: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const { id: eventId, signupId } = await params;
  if (!await isEventAdmin(eventId, session.user.profileId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: row } = await supabase
    .from('event_signups')
    .select('id, payment_status')
    .eq('id', signupId)
    .eq('event_id', eventId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (row.payment_status === 'paid') {
    return NextResponse.json({
      error: 'attendee_already_paid',
      detail: 'Refund this attendee in Stripe first, then change their status to Cancelled instead of removing the row.',
    }, { status: 409 });
  }

  const { error } = await supabase.from('event_signups').delete().eq('id', signupId);
  if (error) return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
