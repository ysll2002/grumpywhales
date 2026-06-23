import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { type EventStatus, type EventRecurrence, type EventSignupMode } from '@/lib/events';

const VALID_STATUS: EventStatus[] = ['published', 'closed', 'cancelled'];
const VALID_RECURRENCE: EventRecurrence[] = ['none', 'daily', 'weekly', 'monthly'];
const VALID_SIGNUP_MODE: EventSignupMode[] = ['first_come', 'curated'];

async function loadOwnedEvent(eventId: string, profileId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('admin_id', profileId)
    .maybeSingle();
  return { data, error };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { id } = await params;
  const { data, error } = await loadOwnedEvent(id, session.user.profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ event: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { id } = await params;
  const { data: existing } = await loadOwnedEvent(id, session.user.profileId);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.title === 'string') {
    if (!body.title.trim()) return NextResponse.json({ error: 'title_required' }, { status: 400 });
    patch.title = body.title.trim();
  }
  if ('description' in body) {
    patch.description = body.description ? body.description.toString().trim() || null : null;
  }
  if ('location' in body) {
    patch.location = body.location ? body.location.toString().trim() || null : null;
  }
  if ('starts_at' in body) {
    if (typeof body.starts_at !== 'string' || isNaN(Date.parse(body.starts_at))) {
      return NextResponse.json({ error: 'starts_at_invalid' }, { status: 400 });
    }
    patch.starts_at = new Date(body.starts_at).toISOString();
  }
  if ('ends_at' in body) {
    if (body.ends_at && (typeof body.ends_at !== 'string' || isNaN(Date.parse(body.ends_at)))) {
      return NextResponse.json({ error: 'ends_at_invalid' }, { status: 400 });
    }
    patch.ends_at = body.ends_at ? new Date(body.ends_at).toISOString() : null;
  }
  if ('fee_amount' in body) {
    const amount = Number(body.fee_amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'fee_invalid' }, { status: 400 });
    }
    patch.fee_amount = amount;
  }
  if (typeof body.fee_currency === 'string') {
    patch.fee_currency = body.fee_currency.toUpperCase().slice(0, 3);
  }
  if (typeof body.status === 'string') {
    if (!VALID_STATUS.includes(body.status as EventStatus)) {
      return NextResponse.json({ error: 'status_invalid' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (typeof body.recurrence === 'string') {
    if (!VALID_RECURRENCE.includes(body.recurrence as EventRecurrence)) {
      return NextResponse.json({ error: 'recurrence_invalid' }, { status: 400 });
    }
    patch.recurrence = body.recurrence;
  }
  if (typeof body.signup_mode === 'string') {
    if (!VALID_SIGNUP_MODE.includes(body.signup_mode as EventSignupMode)) {
      return NextResponse.json({ error: 'signup_mode_invalid' }, { status: 400 });
    }
    patch.signup_mode = body.signup_mode;
  }
  if ('capacity' in body) {
    if (body.capacity == null || body.capacity === '') {
      patch.capacity = null;
    } else {
      const n = Number(body.capacity);
      if (!Number.isInteger(n) || n < 1) {
        return NextResponse.json({ error: 'capacity_invalid' }, { status: 400 });
      }
      patch.capacity = n;
    }
  }
  if ('lat' in body) {
    const v = parseCoord(body.lat, -90, 90);
    if (v === 'invalid') return NextResponse.json({ error: 'lat_invalid' }, { status: 400 });
    patch.lat = v;
  }
  if ('lng' in body) {
    const v = parseCoord(body.lng, -180, 180);
    if (v === 'invalid') return NextResponse.json({ error: 'lng_invalid' }, { status: 400 });
    patch.lng = v;
  }

  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', id)
    .eq('admin_id', session.user.profileId)
    .select('*')
    .single();

  if (error) {
    console.error('[events PATCH] update failed', error);
    return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}

function parseCoord(value: unknown, min: number, max: number): number | null | 'invalid' {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return 'invalid';
  return n;
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('admin_id', session.user.profileId);

  if (error) {
    return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
