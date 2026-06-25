'use client';

import { useState } from 'react';

type Props = {
  eventId:        string;
  occurrenceDate: string;
  feeLabel:       string;
};

export default function PayButton({ eventId, occurrenceDate, feeLabel }: Props) {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  async function pay() {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/events/${eventId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occurrence_date: occurrenceDate }),
    });
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
      <button
        onClick={pay}
        disabled={busy}
        className="px-5 py-2 rounded-full font-medium text-sm disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
      >
        {busy ? 'Redirecting…' : `Pay ${feeLabel}`}
      </button>
      {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
    </div>
  );
}
