'use client';
import { useEffect, useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EditClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.client) setForm({
          name: d.client.name ?? '',
          email: d.client.email ?? '',
          company_name: d.client.company_name ?? '',
          billing_address: d.client.billing_address ?? '',
          notes: d.client.notes ?? '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Failed to save');
      setBusy(false);
      return;
    }
    router.push('/dashboard/clients');
  }

  async function onArchive() {
    if (!confirm('Archive this client? Existing invoices stay intact.')) return;
    await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    router.push('/dashboard/clients');
  }

  if (loading) return <div className="p-8" style={{ color: 'var(--color-muted)' }}>Loading…</div>;

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/dashboard/clients" className="text-sm mb-6 inline-block" style={{ color: 'var(--color-muted)' }}>← Back to clients</Link>
      <h1 className="text-3xl font-semibold mb-6" style={{ fontFamily: 'var(--font-display)' }}>Edit client</h1>

      <form onSubmit={onSave} className="space-y-4">
        <Field label="Name *"><input required value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
        <Field label="Email *"><input required type="email" value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} /></Field>
        <Field label="Company name"><input value={form.company_name ?? ''} onChange={e => setForm({ ...form, company_name: e.target.value })} className={inputCls} /></Field>
        <Field label="Billing address"><textarea rows={3} value={form.billing_address ?? ''} onChange={e => setForm({ ...form, billing_address: e.target.value })} className={inputCls} /></Field>
        <Field label="Internal notes"><textarea rows={2} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })} className={inputCls} /></Field>

        {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}

        <div className="flex justify-between pt-2">
          <div className="flex gap-3">
            <button disabled={busy} type="submit" className="px-6 py-2.5 rounded-full font-medium text-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <Link href="/dashboard/clients" className="px-6 py-2.5 rounded-full text-sm" style={{ color: 'var(--color-muted)' }}>Cancel</Link>
          </div>
          <button type="button" onClick={onArchive} className="px-4 py-2.5 rounded-full text-sm" style={{ color: 'var(--color-red)' }}>
            Archive
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm bg-white border border-[color:var(--color-border)] text-[color:var(--color-fg)]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>{label}</span>
      {children}
    </label>
  );
}
