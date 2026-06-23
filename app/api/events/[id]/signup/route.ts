import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import type { SignupStatus, PaymentStatus } from '@/lib/signups';

// POST /api/events/:id/signup — sign the current user up for the event.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { id } = await params;
  const profileId = session.user.profileId;

  const { data: event } = await supabase
    .from('events')
    .select('id, status, starts_at, signup_mode, capacity, fee_amount')
    .eq('id', id)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (event.status !== 'published') {
    return NextResponse.json({ error: 'event_not_open' }, { status: 409 });
  }
  if (new Date(event.starts_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'event_started' }, { status: 409 });
  }

  // Existing signup — block unless it was previously cancelled.
  const { data: existing } = await supabase
    .from('event_signups')
    .select('id, status')
    .eq('event_id', id)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (existing && existing.status !== 'cancelled') {
    return NextResponse.json({ error: 'already_signed_up', signup: existing }, { status: 409 });
  }

  // Decide status based on mode + capacity.
  let status: SignupStatus;
  if (event.signup_mode === 'curated') {
    status = 'pending';
  } else {
    if (event.capacity != null) {
      const { count } = await supabase
        .from('event_signups')
        .select('id', { head: true, count: 'exact' })
        .eq('event_id', id)
        .eq('status', 'accepted');
      status = (count ?? 0) >= event.capacity ? 'waitlisted' : 'accepted';
    } else {
      status = 'accepted';
    }
  }

  const payment_status: PaymentStatus = Number(event.fee_amount) > 0 ? 'unpaid' : 'free';

  const row = {
    event_id:       id,
    profile_id:     profileId,
    status,
    payment_status,
    signed_up_at:   new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  };

  const { data, error } = existing
    ? await supabase.from('event_signups').update(row).eq('id', existing.id).select('*').single()
    : await supabase.from('event_signups').insert(row).select('*').single();

  if (error) {
    console.error('[signup POST] failed', error);
    return NextResponse.json({ error: 'signup_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ signup: data }, { status: 201 });
}

// DELETE /api/events/:id/signup — cancel the current user's signup.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabase
    .from('event_signups')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('event_id', id)
    .eq('profile_id', session.user.profileId)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'cancel_failed', detail: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ signup: data });
}
