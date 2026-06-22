'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SendInvoiceButton({ invoiceId, clientEmail }: { invoiceId: string; clientEmail: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSend() {
    if (!confirm(`Send this invoice to ${clientEmail}?`)) return;
    setBusy(true);
    setError('');
    const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: 'POST' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Failed to send');
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button onClick={onSend} disabled={busy} className="px-5 py-2.5 rounded-full font-medium text-sm disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}>
        {busy ? 'Sending…' : 'Send to client →'}
      </button>
      {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
    </div>
  );
}
