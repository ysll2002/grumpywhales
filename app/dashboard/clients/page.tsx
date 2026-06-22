import Link from 'next/link';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export default async function ClientsPage() {
  const session = await auth();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, company_name, archived, created_at')
    .eq('user_id', session!.user.profileId)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Clients</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>People you bill</p>
        </div>
        <Link href="/dashboard/clients/new" className="px-5 py-2.5 rounded-full font-medium text-sm" style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}>
          + New client
        </Link>
      </div>

      {!clients || clients.length === 0 ? (
        <div className="p-12 rounded-2xl text-center" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p style={{ color: 'var(--color-muted)' }}>No clients yet. Add one to start invoicing.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Name', 'Company', 'Email', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-[color:var(--color-bg)]" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-5 py-3 font-medium">{c.name}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--color-muted)' }}>{c.company_name ?? '—'}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--color-muted)' }}>{c.email}</td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/dashboard/clients/${c.id}`} style={{ color: 'var(--color-accent)' }}>Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
