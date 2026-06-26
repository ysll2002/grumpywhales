import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { isEventAdmin } from '@/lib/event-admin';

// Preflight for the Settings page delete button. Returns whether the event
// can be deleted right now, and if not, the count of unpaid signups so the
// host knows what's blocking it.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { id } = await params;
  if (!(await isEventAdmin(id, session.user.profileId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { count } = await supabase
    .from('event_signups')
    .select('id', { head: true, count: 'exact' })
    .eq('event_id', id)
    .eq('payment_status', 'unpaid')
    .neq('status', 'cancelled');

  const unpaid_count = count ?? 0;
  return NextResponse.json({ ok: unpaid_count === 0, unpaid_count });
}
