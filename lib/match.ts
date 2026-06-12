import { supabaseAdmin as supabase } from './supabase-admin';
import { sendEmail } from './email';
import { thankYouEmail } from './email-templates';

const REFERENCE_RE = /GW-\d{4}-[A-Z0-9]{6}/g;

const AMOUNT_TOLERANCE = 0.01;

export type IncomingTransaction = {
  id:           string;
  user_id:      string;
  amount:       number;
  date:         string;
  description:  string | null;
  counterparty: string | null;
};

export type MatchResult =
  | { matched: false; reason: 'no_reference' | 'reference_not_found' | 'amount_mismatch' | 'already_paid' | 'not_credit' }
  | { matched: true;  invoiceId: string; reference: string };

export async function matchTransactionToInvoice(tx: IncomingTransaction): Promise<MatchResult> {
  if (tx.amount <= 0) return { matched: false, reason: 'not_credit' };

  const candidates = extractReferences(`${tx.description ?? ''} ${tx.counterparty ?? ''}`);
  if (candidates.length === 0) return { matched: false, reason: 'no_reference' };

  for (const ref of candidates) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, amount, status, client_id, invoice_number')
      .eq('user_id',   tx.user_id)
      .eq('reference', ref)
      .maybeSingle();

    if (!invoice) continue;
    if (invoice.status === 'paid') return { matched: false, reason: 'already_paid' };
    if (Math.abs(Number(invoice.amount) - tx.amount) > AMOUNT_TOLERANCE) {
      return { matched: false, reason: 'amount_mismatch' };
    }

    await supabase
      .from('invoices')
      .update({
        status:                 'paid',
        paid_at:                new Date().toISOString(),
        paid_via:               'plaid',
        matched_transaction_id: tx.id,
        updated_at:             new Date().toISOString(),
      })
      .eq('id', invoice.id);

    await supabase
      .from('transactions')
      .update({ matched_invoice_id: invoice.id })
      .eq('id', tx.id);

    await fireThankYou(invoice.id).catch(() => {
      // Email failure must not roll back the match — payment is in the bank
      // regardless of whether the courtesy email landed.
    });

    return { matched: true, invoiceId: invoice.id, reference: ref };
  }

  return { matched: false, reason: 'reference_not_found' };
}

function extractReferences(text: string): string[] {
  const upper = text.toUpperCase().replace(/\s+/g, '');
  return Array.from(new Set(upper.match(REFERENCE_RE) ?? []));
}

async function fireThankYou(invoiceId: string) {
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, amount, currency, vat_amount,
      reference, issue_date, due_date, description, line_items,
      profiles ( company_name, name, email ),
      clients  ( name, email )
    `)
    .eq('id', invoiceId)
    .single();

  type Joined = {
    invoice_number: string;
    amount:         number | string;
    currency:       string;
    vat_amount:     number | string;
    reference:      string | null;
    issue_date:     string;
    due_date:       string;
    description:    string | null;
    line_items:     unknown;
    clients:  { name: string; email: string } | { name: string; email: string }[] | null;
    profiles: { name: string | null; company_name: string | null; email: string }
            | { name: string | null; company_name: string | null; email: string }[]
            | null;
  };
  const joined = invoice as unknown as Joined | null;
  if (!joined) return;
  const client = Array.isArray(joined.clients)  ? joined.clients[0]  : joined.clients;
  const issuer = Array.isArray(joined.profiles) ? joined.profiles[0] : joined.profiles;
  if (!client?.email || !issuer) return;

  const { subject, html, text } = thankYouEmail({
    invoice: {
      invoice_number: joined.invoice_number,
      amount:         Number(joined.amount),
      currency:       joined.currency,
      vat_amount:     Number(joined.vat_amount),
      reference:      joined.reference,
      issue_date:     joined.issue_date,
      due_date:       joined.due_date,
      description:    joined.description,
      line_items:     (joined.line_items ?? null) as never,
    },
    issuer: {
      name:         issuer.name ?? null,
      company_name: issuer.company_name ?? null,
    },
    client: { name: client.name },
  });

  const { id: resendId } = await sendEmail({
    to: client.email,
    subject, html, text,
  });

  await supabase.from('invoice_emails').insert({
    invoice_id: invoiceId,
    type:       'thank_you',
    sent_to:    client.email,
    resend_id:  resendId,
  });
}
