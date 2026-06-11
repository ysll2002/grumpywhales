import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/email';
import { invoiceEmail } from '@/lib/email-templates';

export async function POST(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const userId = session.user.profileId;

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, clients(name, email, company_name)')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();

  if (error)   return NextResponse.json({ error: error.message }, { status: 500 });
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;
  if (!client?.email) {
    return NextResponse.json({ error: 'Client has no email address' }, { status: 400 });
  }

  const { data: issuer } = await supabase
    .from('profiles')
    .select('name, company_name, business_address')
    .eq('id', userId)
    .single();

  const { subject, text, html } = invoiceEmail({
    invoice: {
      invoice_number: invoice.invoice_number,
      amount:         Number(invoice.amount),
      currency:       invoice.currency,
      vat_amount:     Number(invoice.vat_amount),
      reference:      invoice.reference,
      issue_date:     invoice.issue_date,
      due_date:       invoice.due_date,
      description:    invoice.description,
      line_items:     invoice.line_items,
    },
    issuer: issuer ?? {},
    client: { name: client.name, company_name: client.company_name },
  });

  let resend_id: string | null = null;
  try {
    const r = await sendEmail({ to: client.email, subject, html, text });
    resend_id = r.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Email send failed: ${msg}` }, { status: 502 });
  }

  // Record the send + flip status to 'sent'
  await supabase.from('invoice_emails').insert({
    invoice_id: invoice.id,
    type:       'invoice_sent',
    sent_to:    client.email,
    resend_id,
  });

  await supabase
    .from('invoices')
    .update({ status: 'sent', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', invoice.id);

  return NextResponse.json({ success: true, sent_to: client.email, resend_id });
}
