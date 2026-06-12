'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DisconnectBankButton({ connectionId, institutionName }: { connectionId: string; institutionName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    if (!confirm(`Disconnect ${institutionName}? Any future transactions on this bank will stop syncing.`)) return;
    setBusy(true);
    const res = await fetch('/api/plaid/disconnect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ connection_id: connectionId }),
    });
    if (!res.ok) {
      alert((await res.json()).error ?? 'Failed to disconnect');
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={disconnect}
      disabled={busy}
      className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      {busy ? 'Disconnecting…' : 'Disconnect'}
    </button>
  );
}
