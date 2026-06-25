import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { generateEventReference, type EventStatus, type EventRecurrence, type EventSignupMode } from '@/lib/events';
import { isPlatformAdmin } from '@/lib/platform-admin';

const VALID_STATUS: EventStatus[] = ['published', 'closed', 'cancelled'];
const VALID_RECURRENCE: EventRecurrence[] = ['none', 'daily', 'weekly', 'monthly'];
const VALID_SIGNUP_MODE: EventSignupMode[] = ['first_come', 'curated'];

export async function GET() {
  const session = await auth();
  if (!session?.user?.profileId) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('admin_id', session.user.profileId)
    .order('starts_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.profileId) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  if (!(await isPlatformAdmin(session.user.email))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });

  const { title, description, starts_at, ends_at, location, lat, lng, fee_amount, fee_currency, status, recurrence, signup_mode, capacity } = body;

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (typeof starts_at !== 'string' || isNaN(Date.parse(starts_at))) {
    return NextResponse.json({ error: 'starts_at_invalid' }, { status: 400 });
  }
  if (ends_at && (typeof ends_at !== 'string' || isNaN(Date.parse(ends_at)))) {
    return NextResponse.json({ error: 'ends_at_invalid' }, { status: 400 });
  }
  const amount = Number(fee_amount ?? 0);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'fee_invalid' }, { status: 400 });
  }
  const finalStatus: EventStatus = VALID_STATUS.includes(status) ? status : 'published';
  const finalRecurrence: EventRecurrence = VALID_RECURRENCE.includes(recurrence) ? recurrence : 'none';
  const finalSignupMode: EventSignupMode = VALID_SIGNUP_MODE.includes(signup_mode) ? signup_mode : 'first_come';
  let finalCapacity: number | null = null;
  if (capacity != null && capacity !== '') {
    const n = Number(capacity);
    if (!Number.isInteger(n) || n < 1) {
      return NextResponse.json({ error: 'capacity_invalid' }, { status: 400 });
    }
    finalCapacity = n;
  }
  const finalLat = parseCoord(lat, -90,  90);
  const finalLng = parseCoord(lng, -180, 180);
  if (finalLat === 'invalid' || finalLng === 'invalid') {
    return NextResponse.json({ error: 'coords_invalid' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      admin_id:          session.user.profileId,
      title:             title.trim(),
      description:       (description ?? '').toString().trim() || null,
      starts_at:         new Date(starts_at).toISOString(),
      ends_at:           ends_at ? new Date(ends_at).toISOString() : null,
      location:          (location ?? '').toString().trim() || null,
      fee_amount:        amount,
      fee_currency:      (fee_currency || 'GBP').toString().toUpperCase().slice(0, 3),
      status:            finalStatus,
      recurrence:        finalRecurrence,
      signup_mode:       finalSignupMode,
      capacity:          finalCapacity,
      lat:               finalLat,
      lng:               finalLng,
      payment_reference: generateEventReference(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('[events POST] insert failed', error);
    return NextResponse.json({ error: 'create_failed', detail: error.message }, { status: 500 });
  }

  // Auto-enrol the host as an accepted attendee — they shouldn't have to
  // "sign up" for their own event. Host doesn't pay themselves either.
  const { error: signupErr } = await supabase.from('event_signups').insert({
    event_id:       data.id,
    profile_id:     session.user.profileId,
    status:         'accepted',
    payment_status: 'free',
  });
  if (signupErr) {
    // Non-fatal — event itself was created. Log and continue.
    console.error('[events POST] host auto-signup failed', signupErr);
  }

  return NextResponse.json({ event: data }, { status: 201 });
}

// Returns the numeric value, null (when blank/null), or 'invalid' on bad input.
function parseCoord(value: unknown, min: number, max: number): number | null | 'invalid' {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return 'invalid';
  return n;
}
