import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { computeNextOccurrences, occurrenceDate, signupOpenInfo } from '@/lib/events';
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
  const { data: event, error: lookupErr } = await supabase
    .from('events')
    .select('id, status, starts_at, recurrence, signup_mode, capacity, fee_amount, cancelled_dates, signup_open_dow, signup_open_time')
    .eq('id', id)
    .maybeSingle();
  if (lookupErr) {
    console.error('[signup POST] event lookup failed', { id, lookupErr });
    return NextResponse.json({ error: 'event_lookup_failed', detail: lookupErr.message }, { status: 500 });
  }
  if (!event) {
    console.error('[signup POST] event not found', { id });
    return NextResponse.json({ error: 'event_not_found', detail: `id=${id}` }, { status: 404 });
  }

  if (event.status !== 'published') {
    return NextResponse.json({ error: 'event_not_open' }, { status: 409 });
  }

  const occDate = resolveOccurrenceDate(event, body.occurrence_date);
  if (!occDate) return NextResponse.json({ error: 'invalid_occurrence' }, { status: 400 });
  if ((event.cancelled_dates ?? []).includes(occDate)) {
    return NextResponse.json({ error: 'occurrence_cancelled' }, { status: 409 });
  }

  // Honour the weekly sign-up window — refuse early sign-ups before the
  // configured day/time. Hosts/co-admins managing the roster from the
  // admin page hit a different endpoint, so this only affects attendees.
  const occIso = (() => {
    const start = new Date(event.starts_at);
    const [y, m, d] = occDate.split('-').map(Number);
    const out = new Date(start);
    out.setUTCFullYear(y, m - 1, d);
    return out.toISOString();
  })();
  const openInfo = signupOpenInfo(event, occIso);
  if (!openInfo.open) {
    return NextResponse.json({
      error:   'signups_not_open_yet',
      detail:  `Sign-ups open ${openInfo.opensAt.toISOString()}`,
      opens_at: openInfo.opensAt.toISOString(),
    }, { status: 409 });
  }

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

  // Capacity is an indicative target, not a hard cap — first-come signups
  // are always accepted; curated ones still wait for the host to publish.
  const status: SignupStatus = event.signup_mode === 'curated' ? 'pending' : 'accepted';

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
