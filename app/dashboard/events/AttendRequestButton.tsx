'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  eventId:        string;
  occurrenceDate: string;
  signupMode:     'first_come' | 'curated';
};

export default function AttendRequestButton({ eventId, occurrenceDate, signupMode }: Props) {
  const router = useRouter();
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true); setError('');
    const res = await fetch(`/api/events/${eventId}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occurrence_date: occurrenceDate }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'signup_failed');
      setBusy(false);
      return;
    }
    router.refresh();
  }

  const label = busy
    ? (signupMode === 'curated' ? 'Requesting…' : 'Signing up…')
    : (signupMode === 'curated' ? 'Request to attend' : 'Sign me up');

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
      >
        {label}
      </button>
      {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
    </div>
  );
}
