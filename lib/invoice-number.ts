import { supabaseAdmin } from './supabase-admin';

// Returns the next invoice number for a user, in the form INV-YYYY-NNNN.
// Scoped per-user so each user has their own counter.
export async function nextInvoiceNumber(userId: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `INV-${year}-`;

  const { data } = await supabaseAdmin
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', userId)
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  const last = data?.[0]?.invoice_number;
  const lastSeq = last ? parseInt(last.split('-').pop() ?? '0', 10) : 0;
  const next = String(lastSeq + 1).padStart(4, '0');
  return `${prefix}${next}`;
}

// Returns a payment reference the issuer asks the client to put on the bank
// transfer, used by the Plaid reconciliation to match incoming credits.
// Keep it short and human-typable; 8-char base36 from random bytes is plenty.
export function generatePaymentReference(invoiceNumber: string): string {
  const tail = Math.random().toString(36).slice(2, 8).toUpperCase();
  // e.g. INV-2026-0001 → GW-0001-AB12X9
  const seq = invoiceNumber.split('-').pop() ?? '0000';
  return `GW-${seq}-${tail}`;
}
