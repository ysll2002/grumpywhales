import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { computeNextOccurrences, occurrenceDate } from '@/lib/events';
import type { SignupStatus, PaymentStatus } from '@/lib/signups';

// Validate the requested occurrence_date against the event.
// - For one-off events: must equal the event's start date.
// - For recurring events: must be in the set of next 200 future occurrences.
// Returns the canonical YYYY-MM-DD string or null if invalid.
function resolveOccurrenceDate(event: { starts_at: string; recurrence: 'none' | 'daily' | 'weekly' | 'monthly' }, requested: unknown): string | null {
  if (typeof requested !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requested)) return null;
  if (event.recurrence === 'none') {
    return occurrenceDate(event.starts_at) === requested ? requested : null;
  }
  const valid = new Set(computeNextOccurrences(event, 200).map(iso => iso.slice(0, 10)));
  return valid.has(requested) ? requested : null;
}

// POST /api/events/:id/signup — sign the current user up for a specific
// occurrence of the event. Body: { occurrence_date: 'YYYY-MM-DD' }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { id } = await params;
  const profileId = session.user.profileId;

  const body = await req.json().catch(() => ({}));
  const { data: event } = await supabase
    .from('events')
    .select('id, status, starts_at, recurrence, signup_mode, capacity, fee_amount')
    .eq('id', id)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (event.status !== 'published') {
    return NextResponse.json({ error: 'event_not_open' }, { status: 409 });
  }

  const occDate = resolveOccurrenceDate(event, body.occurrence_date);
  if (!occDate) return NextResponse.json({ error: 'invalid_occurrence' }, { status: 400 });

  // Existing signup for this specific occurrence — block unless cancelled.
  const { data: existing } = await supabase
    .from('event_signups')
    .select('id, status')
    .eq('event_id', id)
    .eq('profile_id', profileId)
    .eq('occurrence_date', occDate)
    .maybeSingle();
  if (existing && existing.status !== 'cancelled') {
    return NextResponse.json({ error: 'already_signed_up', signup: existing }, { status: 409 });
  }

  // Decide status based on mode + per-occurrence capacity.
  let status: SignupStatus;
  if (event.signup_mode === 'curated') {
    status = 'pending';
  } else if (event.capacity != null) {
    const { count } = await supabase
      .from('event_signups')
      .select('id', { head: true, count: 'exact' })
      .eq('event_id', id)
      .eq('occurrence_date', occDate)
      .eq('status', 'accepted');
    status = (count ?? 0) >= event.capacity ? 'waitlisted' : 'accepted';
  } else {
    status = 'accepted';
  }

  const payment_status: PaymentStatus = Number(event.fee_amount) > 0 ? 'unpaid' : 'free';

  const row = {
    event_id:        id,
    profile_id:      profileId,
    occurrence_date: occDate,
    status,
    payment_status,
    signed_up_at:    new Date().toISOString(),
    updated_at:      new Date().toISOString(),
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

// DELETE /api/events/:id/signup?occurrence_date=YYYY-MM-DD
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { id } = await params;
  const occDate = req.nextUrl.searchParams.get('occurrence_date');
  if (!occDate || !/^\d{4}-\d{2}-\d{2}$/.test(occDate)) {
    return NextResponse.json({ error: 'missing_occurrence_date' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('event_signups')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('event_id', id)
    .eq('profile_id', session.user.profileId)
    .eq('occurrence_date', occDate)
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'cancel_failed', detail: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ signup: data });
}
