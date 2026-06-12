import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { plaid } from '@/lib/plaid';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { public_token, institution_name } = await req.json();
  if (!public_token) {
    return NextResponse.json({ error: 'public_token required' }, { status: 400 });
  }

  try {
    const { data: exch } = await plaid().itemPublicTokenExchange({ public_token });

    const { data: connection, error } = await supabase
      .from('bank_connections')
      .insert({
        user_id:            session.user.profileId,
        plaid_item_id:      exch.item_id,
        plaid_access_token: exch.access_token,
        institution_name:   institution_name ?? null,
      })
      .select('id, institution_name')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ connection });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Plaid exchange error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
