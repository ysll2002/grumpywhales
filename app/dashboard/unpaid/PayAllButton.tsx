'use client';

import { useState } from 'react';
import { useDialog } from '@/components/Dialog';

type Props = {
  totalLabel: string;
  count:      number;
};

export default function PayAllButton({ totalLabel, count }: Props) {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');
  const { confirm, dialog } = useDialog();

  async function payAll() {
    const ok = await confirm({
      title:        'Pay all outstanding?',
      message:      `Pay ${totalLabel} now to settle all ${count} outstanding sign-up${count === 1 ? '' : 's'} in one go.`,
      confirmLabel: `Pay ${totalLabel}`,
    });
    if (!ok) return;
    setBusy(true); setError('');
    const res = await fetch('/api/checkout/pay-all', { method: 'POST' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'payment_failed');
      setBusy(false);
      return;
    }
    const { url } = await res.json() as { url: string };
    if (url) window.location.href = url;
    else { setBusy(false); setError('no_checkout_url'); }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {dialog}
      <button
        type="button"
        onClick={payAll}
        disabled={busy}
        className="px-5 py-2.5 rounded-full font-medium text-sm disabled:opacity-50 whitespace-nowrap"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
      >
        {busy ? 'Redirecting…' : `Pay all ${totalLabel}`}
      </button>
      {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
    </div>
  );
}
