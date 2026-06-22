'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/money';

type Client    = { id: string; name: string; company_name: string | null };
type LineItem  = { description: string; quantity: number; unit_price: number };

const EMPTY_LINE: LineItem = { description: '', quantity: 1, unit_price: 0 };

export default function NewInvoice() {
  const router = useRouter();
  const [clients,   setClients]   = useState<Client[]>([]);
  const [clientId,  setClientId]  = useState('');
  const [items,     setItems]     = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [vatRate,   setVatRate]   = useState(0.2);   // 20% default
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate,   setDueDate]   = useState(addDays(new Date(), 14));
  const [desc,      setDesc]      = useState('');
  const [notes,     setNotes]     = useState('');
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d.clients ?? []));
  }, []);

  const subtotal   = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
  const vatAmount  = +(subtotal * vatRate).toFixed(2);
  const total      = +(subtotal + vatAmount).toFixed(2);

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }
  function addItem()         { setItems([...items, { ...EMPTY_LINE }]); }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { setError('Pick a client'); return; }
    if (items.some(i => !i.description || i.quantity <= 0 || i.unit_price < 0)) {
      setError('Each line needs a description, quantity > 0 and a non-negative price');
      return;
    }
    setBusy(true);
    setError('');
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:    clientId,
        line_items:   items,
        vat_rate:     vatRate,
        issue_date:   issueDate,
        due_date:     dueDate,
        description:  desc || null,
        notes:        notes || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Failed to create');
      setBusy(false);
      return;
    }
    const { invoice } = await res.json();
    router.push(`/dashboard/invoices/${invoice.id}`);
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/dashboard/invoices" className="text-sm mb-6 inline-block" style={{ color: 'var(--color-muted)' }}>← Back to invoices</Link>
      <h1 className="text-3xl font-semibold mb-6" style={{ fontFamily: 'var(--font-display)' }}>New invoice</h1>

      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="Client *">
          <select required value={clientId} onChange={e => setClientId(e.target.value)} className={inputCls}>
            <option value="">— Select a client —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.company_name ?? c.name}</option>
            ))}
          </select>
          {clients.length === 0 && (
            <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
              No clients yet. <Link href="/dashboard/clients/new" style={{ color: 'var(--color-accent)' }}>Add one →</Link>
            </p>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Issue date"><input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Due date *"><input required type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} /></Field>
        </div>

        <Field label="Description (optional)">
          <input value={desc} onChange={e => setDesc(e.target.value)} className={inputCls} placeholder="Consulting work — May 2026" />
        </Field>

        {/* Line items */}
        <div>
          <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>Line items</p>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid gap-2" style={{ gridTemplateColumns: '1fr 80px 110px 30px' }}>
                <input placeholder="Description" value={it.description} onChange={e => updateItem(i, { description: e.target.value })} className={inputCls} />
                <input type="number" min={0} step={1}    value={it.quantity}   onChange={e => updateItem(i, { quantity: +e.target.value })}   className={inputCls} />
                <input type="number" min={0} step={0.01} value={it.unit_price} onChange={e => updateItem(i, { unit_price: +e.target.value })} className={inputCls} />
                <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                  className="text-lg disabled:opacity-30" style={{ color: 'var(--color-muted)' }}>×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="mt-2 text-sm" style={{ color: 'var(--color-accent)' }}>+ Add line</button>
        </div>

        {/* VAT + totals */}
        <div className="grid grid-cols-2 gap-4 items-end">
          <Field label="VAT rate">
            <select value={vatRate} onChange={e => setVatRate(+e.target.value)} className={inputCls}>
              <option value={0}>0% (no VAT)</option>
              <option value={0.05}>5% (reduced)</option>
              <option value={0.2}>20% (standard)</option>
            </select>
          </Field>
          <div className="p-4 rounded-xl text-sm space-y-1" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <Row label="Subtotal" value={formatMoney(subtotal)} />
            <Row label={`VAT (${(vatRate * 100).toFixed(0)}%)`} value={formatMoney(vatAmount)} />
            <div className="pt-1 mt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <Row label="Total" value={formatMoney(total)} bold />
            </div>
          </div>
        </div>

        <Field label="Internal notes (not on invoice)"><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} /></Field>

        {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}

        <div className="flex gap-3">
          <button disabled={busy} type="submit" className="px-6 py-2.5 rounded-full font-medium text-sm disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}>
            {busy ? 'Creating…' : 'Create invoice'}
          </button>
          <Link href="/dashboard/invoices" className="px-6 py-2.5 rounded-full text-sm" style={{ color: 'var(--color-muted)' }}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}

function addDays(d: Date, n: number): string {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out.toISOString().slice(0, 10);
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

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between" style={{ color: bold ? 'var(--color-fg)' : 'var(--color-muted)', fontWeight: bold ? 600 : 400 }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
