'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDialog } from '@/components/Dialog';

type Props = {
  eventId:        string;
  occurrenceDate: string;
};

export default function CancelSignupButton({ eventId, occurrenceDate }: Props) {
  const router = useRouter();
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');
  const { confirm, dialog } = useDialog();

  async function cancel() {
    const ok = await confirm({
      title:        'Cancel sign-up?',
      message:      'Cancel your sign-up for this session?',
      confirmLabel: 'Cancel sign-up',
      cancelLabel:  'Keep it',
      tone:         'danger',
    });
    if (!ok) return;
    setBusy(true); setError('');
    const res = await fetch(`/api/events/${eventId}/signup?occurrence_date=${occurrenceDate}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'cancel_failed');
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {dialog}
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="text-xs disabled:opacity-50"
        style={{ color: 'var(--color-red)', background: 'none', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
      >
        {busy ? 'Cancelling…' : 'Cancel my sign-up'}
      </button>
      {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
    </div>
  );
}
