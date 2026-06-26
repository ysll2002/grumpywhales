import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isEventAdmin } from '@/lib/event-admin';
import type { SignupStatus } from '@/lib/signups';

const VALID: SignupStatus[] = ['accepted', 'pending', 'waitlisted', 'declined', 'cancelled'];

// PATCH /api/events/:id/signups/:signupId — admin changes a signup's status.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; signupId: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const { id: eventId, signupId } = await params;
  if (!await isEventAdmin(eventId, session.user.profileId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as { status?: string } | null;
  if (!body || typeof body.status !== 'string' || !VALID.includes(body.status as SignupStatus)) {
    return NextResponse.json({ error: 'status_invalid' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('event_signups')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', signupId)
    .eq('event_id', eventId)
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ signup: data });
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
