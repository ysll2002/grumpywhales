'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncBankButton({ connectionId }: { connectionId?: string }) {
  const router = useRouter();
  const [busy,   setBusy]   = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/plaid/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(connectionId ? { connection_id: connectionId } : {}),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Sync failed');

      const totals = (body.results ?? []).reduce(
        (acc: { inserted: number; matched: number }, r: { inserted?: number; matched?: number }) => ({
          inserted: acc.inserted + (r.inserted ?? 0),
          matched:  acc.matched  + (r.matched  ?? 0),
        }),
        { inserted: 0, matched: 0 },
      );
      setResult(`${totals.inserted} new · ${totals.matched} matched to invoices`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {busy ? 'Syncing…' : 'Sync now'}
      </button>
      {result && <span className="text-sm text-gray-600">{result}</span>}
      {error  && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
