import { NextRequest, NextResponse } from 'next/server';
import { plaid } from '@/lib/plaid';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { matchTransactionToInvoice, IncomingTransaction } from '@/lib/match';

type WebhookBody = {
  webhook_type: string;
  webhook_code: string;
  item_id:      string;
};

export async function POST(req: NextRequest) {
  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // We only act on transactions events here. Plaid sends ITEM, AUTH, etc. too;
  // 200 them so Plaid doesn't keep retrying.
  if (body.webhook_type !== 'TRANSACTIONS') return NextResponse.json({ ok: true, skipped: body.webhook_type });

  const { data: conn } = await supabase
    .from('bank_connections')
    .select('id, user_id, plaid_access_token, plaid_cursor')
    .eq('plaid_item_id', body.item_id)
    .maybeSingle();

  if (!conn) return NextResponse.json({ ok: true, unknown_item: true });

  try {
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

    for (const t of added) {
      const amount = -Number((t as { amount: number }).amount);
      const { data: row } = await supabase
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
      if (!row || amount <= 0) continue;

      const incoming: IncomingTransaction = {
        id:           row.id,
        user_id:      conn.user_id,
        amount,
        date:         (t as { date: string }).date,
        description:  (t as { name: string | null }).name ?? null,
        counterparty: (t as { merchant_name?: string | null }).merchant_name ?? null,
      };
      await matchTransactionToInvoice(incoming);
    }

    await supabase
      .from('bank_connections')
      .update({ plaid_cursor: cursor ?? null, last_synced_at: new Date().toISOString() })
      .eq('id', conn.id);

    return NextResponse.json({ ok: true, synced: added.length });
  } catch (e) {
    // Log but return 200 — Plaid retries 5xx, but we don't want infinite retries
    // for our own bugs. We'll catch them via /api/plaid/sync manual button instead.
    console.error('webhook sync failed', e);
    return NextResponse.json({ ok: true, error: e instanceof Error ? e.message : 'sync failed' });
  }
}
