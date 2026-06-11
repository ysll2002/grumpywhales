import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { nextInvoiceNumber, generatePaymentReference } from '@/lib/invoice-number';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount, currency, status, issue_date, due_date, paid_at, client_id, clients(name, company_name)')
    .eq('user_id', session.user.profileId)
    .order('issue_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoices: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    client_id,
    line_items,
    vat_rate,
    issue_date,
    due_date,
    description,
    notes,
    currency = 'GBP',
  } = body;

  if (!client_id || !Array.isArray(line_items) || line_items.length === 0) {
    return NextResponse.json({ error: 'Client and at least one line item required' }, { status: 400 });
  }

  // Verify client belongs to this user
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', session.user.profileId)
    .eq('id', client_id)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const subtotal = line_items.reduce(
    (s: number, i: { quantity: number; unit_price: number }) => s + i.quantity * i.unit_price,
    0,
  );
  const vat_amount = +(subtotal * (vat_rate ?? 0)).toFixed(2);
  const amount     = +(subtotal + vat_amount).toFixed(2);

  const invoice_number = await nextInvoiceNumber(session.user.profileId);
  const reference      = generatePaymentReference(invoice_number);

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      user_id:        session.user.profileId,
      client_id,
      invoice_number,
      amount,
      currency,
      vat_amount,
      reference,
      status:         'draft',
      issue_date:     issue_date ?? new Date().toISOString().slice(0, 10),
      due_date,
      description:    description ?? null,
      line_items,
      notes:          notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoice: data });
}
