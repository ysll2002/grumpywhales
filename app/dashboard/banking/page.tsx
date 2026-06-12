import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import PlaidLinkButton      from '@/components/PlaidLinkButton';
import SyncBankButton       from '@/components/SyncBankButton';
import DisconnectBankButton from '@/components/DisconnectBankButton';
import { formatMoney }      from '@/lib/money';

export default async function BankingPage() {
  const session = await auth();
  const userId  = session!.user.profileId;

  const [{ data: connections }, { data: transactions }] = await Promise.all([
    supabase
      .from('bank_connections')
      .select('id, institution_name, last_synced_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('transactions')
      .select('id, amount, currency, date, description, counterparty, matched_invoice_id')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(25),
  ]);

  const hasConnections = (connections?.length ?? 0) > 0;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Banking</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Connect a bank to automatically detect payments and mark invoices paid.
          </p>
        </div>
        {hasConnections && <SyncBankButton />}
      </div>

      {!hasConnections ? (
        <div className="p-12 rounded-2xl text-center" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="mb-4" style={{ color: 'var(--color-muted)' }}>
            No banks connected. We&apos;ll match incoming payments to your invoices using the payment reference.
          </p>
          <PlaidLinkButton />
        </div>
      ) : (
        <>
          <div className="rounded-2xl overflow-hidden mb-10" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Bank', 'Last synced', 'Connected', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {connections!.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-5 py-3 font-medium">{c.institution_name ?? 'Bank'}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-muted)' }}>
                      {c.last_synced_at ? new Date(c.last_synced_at).toLocaleString('en-GB') : 'Never'}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--color-muted)' }}>
                      {new Date(c.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DisconnectBankButton connectionId={c.id} institutionName={c.institution_name ?? 'this bank'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-6">
            <PlaidLinkButton />
          </div>

          <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>Recent transactions</h2>
          {(transactions?.length ?? 0) === 0 ? (
            <div className="p-8 rounded-2xl text-center" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <p style={{ color: 'var(--color-muted)' }}>No transactions yet. Try clicking <em>Sync now</em>.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Date', 'Description', 'Amount', 'Status'].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions!.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-5 py-3" style={{ color: 'var(--color-muted)' }}>
                        {new Date(t.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-5 py-3">
                        <div>{t.description ?? '—'}</div>
                        {t.counterparty && <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{t.counterparty}</div>}
                      </td>
                      <td className="px-5 py-3" style={{ color: Number(t.amount) > 0 ? 'var(--color-accent)' : 'var(--color-fg)' }}>
                        {Number(t.amount) > 0 ? '+' : ''}{formatMoney(Number(t.amount), t.currency)}
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                        {t.matched_invoice_id ? 'Matched to invoice' : Number(t.amount) > 0 ? 'No match' : 'Outgoing'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
