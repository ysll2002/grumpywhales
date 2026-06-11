import Link from 'next/link';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { formatMoney, formatDate } from '@/lib/money';

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  draft:     { bg: '#2A2F37', fg: '#9CA3AF' },
  sent:      { bg: '#1E3A5F', fg: '#5BA3F5' },
  paid:      { bg: '#1E4736', fg: '#34D399' },
  overdue:   { bg: '#4C1D1D', fg: '#F87171' },
  cancelled: { bg: '#2A2F37', fg: '#6B7280' },
};

export default async function InvoicesPage() {
  const session = await auth();
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount, currency, status, issue_date, due_date, paid_at, clients(name, company_name)')
    .eq('user_id', session!.user.profileId)
    .order('issue_date', { ascending: false });

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Invoices</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Drafts, sent and paid</p>
        </div>
        <Link href="/dashboard/invoices/new" className="px-5 py-2.5 rounded-full font-medium text-sm" style={{ backgroundColor: 'var(--color-accent)', color: '#0E1116' }}>
          + New invoice
        </Link>
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="p-12 rounded-2xl text-center" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p style={{ color: 'var(--color-muted)' }}>No invoices yet. Create your first one.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Number', 'Client', 'Issued', 'Due', 'Amount', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const client = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients;
                const style = STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft;
                return (
                  <tr key={inv.id} className="hover:bg-[#1A2030]" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-5 py-3 font-mono">
                      <Link href={`/dashboard/invoices/${inv.id}`} style={{ color: 'var(--color-accent)' }}>{inv.invoice_number}</Link>
                    </td>
                    <td className="px-5 py-3">{client?.company_name ?? client?.name ?? '—'}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-muted)' }}>{formatDate(inv.issue_date)}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-muted)' }}>{formatDate(inv.due_date)}</td>
                    <td className="px-5 py-3 font-medium">{formatMoney(inv.amount, inv.currency)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: style.bg, color: style.fg }}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
