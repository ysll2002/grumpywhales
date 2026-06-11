import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { formatMoney, formatDate, type LineItem } from '@/lib/money';

type Client = {
  id:               string;
  name:             string;
  email:            string;
  company_name:     string | null;
  billing_address:  string | null;
};

type Invoice = {
  id:             string;
  invoice_number: string;
  reference:      string | null;
  amount:         number;
  currency:       string;
  vat_amount:     number;
  status:         string;
  issue_date:     string;
  due_date:       string;
  paid_at:        string | null;
  description:    string | null;
  line_items:     LineItem[] | null;
  notes:          string | null;
  clients:        Client | null;
};

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id }  = await params;

  const { data: invRaw } = await supabase
    .from('invoices')
    .select('*, clients(id, name, email, company_name, billing_address)')
    .eq('user_id', session!.user.profileId)
    .eq('id', id)
    .maybeSingle();

  if (!invRaw) notFound();
  const inv = invRaw as unknown as Invoice;
  const client = inv.clients;
  const items  = inv.line_items ?? [];
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/dashboard/invoices" className="text-sm mb-6 inline-block" style={{ color: 'var(--color-muted)' }}>← Back to invoices</Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-sm font-mono" style={{ color: 'var(--color-muted)' }}>{inv.invoice_number}</p>
          <h1 className="text-3xl font-semibold mt-1" style={{ fontFamily: 'var(--font-display)' }}>
            {client?.company_name ?? client?.name ?? 'Invoice'}
          </h1>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-medium uppercase" style={{
          backgroundColor: inv.status === 'paid' ? '#1E4736' : inv.status === 'overdue' ? '#4C1D1D' : '#2A2F37',
          color:           inv.status === 'paid' ? '#34D399' : inv.status === 'overdue' ? '#F87171' : '#9CA3AF',
        }}>{inv.status}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
        <Block label="Issued"  value={formatDate(inv.issue_date)} />
        <Block label="Due"     value={formatDate(inv.due_date)} />
        <Block label="Client"  value={client?.email ?? '—'} />
        <Block label="Reference" value={inv.reference ?? '—'} mono />
      </div>

      {/* Line items */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Description', 'Qty', 'Unit', 'Total'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="px-4 py-2.5">{it.description}</td>
                <td className="px-4 py-2.5">{it.quantity}</td>
                <td className="px-4 py-2.5">{formatMoney(it.unit_price, inv.currency)}</td>
                <td className="px-4 py-2.5 font-medium">{formatMoney(it.quantity * it.unit_price, inv.currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={3} className="px-4 py-2.5 text-right" style={{ color: 'var(--color-muted)' }}>Subtotal</td>
                <td className="px-4 py-2.5">{formatMoney(subtotal, inv.currency)}</td></tr>
            <tr><td colSpan={3} className="px-4 py-2.5 text-right" style={{ color: 'var(--color-muted)' }}>VAT</td>
                <td className="px-4 py-2.5">{formatMoney(inv.vat_amount, inv.currency)}</td></tr>
            <tr style={{ borderTop: '1px solid var(--color-border)' }}>
              <td colSpan={3} className="px-4 py-3 text-right font-semibold">Total</td>
              <td className="px-4 py-3 font-semibold">{formatMoney(inv.amount, inv.currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {inv.notes && (
        <div className="p-4 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
          <strong style={{ color: 'var(--color-fg)' }}>Internal notes:</strong> {inv.notes}
        </div>
      )}

      <div className="mt-8 text-xs" style={{ color: 'var(--color-muted)' }}>
        Sending and payment tracking arrive in the next iteration.
      </div>
    </div>
  );
}

function Block({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{label}</p>
      <p className={`mt-1 ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  );
}
