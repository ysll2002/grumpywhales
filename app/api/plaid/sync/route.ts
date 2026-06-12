import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { plaid } from '@/lib/plaid';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { matchTransactionToInvoice, IncomingTransaction } from '@/lib/match';

type BankConnection = {
  id:                  string;
  user_id:             string;
  plaid_access_token:  string;
  plaid_cursor:        string | null;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { connection_id } = await req.json().catch(() => ({ connection_id: undefined }));

  const query = supabase
    .from('bank_connections')
    .select('id, user_id, plaid_access_token, plaid_cursor')
    .eq('user_id', session.user.profileId);

  const { data: connections } = connection_id
    ? await query.eq('id', connection_id)
    : await query;

  if (!connections?.length) {
    return NextResponse.json({ error: 'No connections found' }, { status: 404 });
  }

  const results = [];
  for (const conn of connections as BankConnection[]) {
    try {
      results.push(await syncOne(conn));
    } catch (e) {
      results.push({
        connection_id: conn.id,
        error: e instanceof Error ? e.message : 'sync failed',
      });
    }
  }

  return NextResponse.json({ results });
}

async function syncOne(conn: BankConnection) {
  let cursor = conn.plaid_cursor ?? undefined;
  let added: Array<Record<string, unknown>> = [];
  let hasMore = true;

  while (hasMore) {
    const { data } = await plaid().transactionsSync({
      access_token: conn.plaid_access_token,
      cursor,
    });
    added = added.concat(data.added as unknown as Array<Record<string, unknown>>);
    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  let inserted = 0;
  let matched  = 0;

  for (const t of added) {
    // Plaid: positive amount = money leaving the account; flip so positive = credit
    const amount = -Number((t as { amount: number }).amount);

    const { data: row, error: insertErr } = await supabase
      .from('transactions')
      .insert({
        user_id:              conn.user_id,
        bank_connection_id:   conn.id,
        plaid_transaction_id: (t as { transaction_id: string }).transaction_id,
        amount,
        currency:             (t as { iso_currency_code: string | null }).iso_currency_code ?? 'GBP',
        date:                 (t as { date: string }).date,
        description:          (t as { name: string | null }).name ?? null,
        counterparty:         (t as { merchant_name?: string | null }).merchant_name ?? null,
      })
      .select('id')
      .single();

    if (insertErr) continue;
    inserted++;

    if (amount <= 0) continue;

    const incoming: IncomingTransaction = {
      id:           row.id,
      user_id:      conn.user_id,
      amount,
      date:         (t as { date: string }).date,
      description:  (t as { name: string | null }).name ?? null,
      counterparty: (t as { merchant_name?: string | null }).merchant_name ?? null,
    };
    const result = await matchTransactionToInvoice(incoming);
    if (result.matched) matched++;
  }

  await supabase
    .from('bank_connections')
    .update({
      plaid_cursor:   cursor ?? null,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', conn.id);

  return { connection_id: conn.id, inserted, matched };
}
