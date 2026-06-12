import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { plaid } from '@/lib/plaid';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { connection_id } = await req.json();
  if (!connection_id) {
    return NextResponse.json({ error: 'connection_id required' }, { status: 400 });
  }

  const { data: conn } = await supabase
    .from('bank_connections')
    .select('id, plaid_access_token')
    .eq('id',      connection_id)
    .eq('user_id', session.user.profileId)
    .single();

  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    await plaid().itemRemove({ access_token: conn.plaid_access_token });
  } catch {
    // If Plaid says the item is already gone, keep going so we still delete our record.
  }

  await supabase.from('bank_connections').delete().eq('id', conn.id);

  return NextResponse.json({ ok: true });
}
