import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { generateEventReference, type EventStatus, type EventRecurrence } from '@/lib/events';

const VALID_STATUS: EventStatus[] = ['draft', 'published', 'closed', 'cancelled'];
const VALID_RECURRENCE: EventRecurrence[] = ['none', 'daily', 'weekly', 'monthly'];

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

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });

  const { title, description, starts_at, ends_at, location, fee_amount, fee_currency, status, recurrence } = body;

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
  const finalStatus: EventStatus = VALID_STATUS.includes(status) ? status : 'draft';
  const finalRecurrence: EventRecurrence = VALID_RECURRENCE.includes(recurrence) ? recurrence : 'none';

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
      payment_reference: generateEventReference(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('[events POST] insert failed', error);
    return NextResponse.json({ error: 'create_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data }, { status: 201 });
}
