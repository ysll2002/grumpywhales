'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'plaid_link_token';

export default function PlaidLinkButton() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/plaid/link-token', { method: 'POST' });
        const body = await res.json();
        if (!res.ok) {
          const plaid = body.plaid as { error_code?: string; error_message?: string; display_message?: string } | null;
          if (plaid?.error_code) {
            throw new Error(`${plaid.error_code}: ${plaid.error_message ?? plaid.display_message ?? body.error}`);
          }
          throw new Error(body.error ?? 'Failed to create link token');
        }
        setLinkToken(body.link_token);
        window.localStorage.setItem(STORAGE_KEY, body.link_token);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create link token');
      }
    })();
  }, []);

  const onSuccess = useCallback(
    async (public_token: string, metadata: { institution?: { name?: string } | null }) => {
      setLoading(true);
      try {
        const res = await fetch('/api/plaid/exchange', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            public_token,
            institution_name: metadata.institution?.name ?? null,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Exchange failed');

        await fetch('/api/plaid/sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ connection_id: body.connection.id }),
        });

        window.localStorage.removeItem(STORAGE_KEY);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Connection failed');
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  const disabled = !ready || !linkToken || loading;

  return (
    <div>
      <button
        type="button"
        onClick={() => open()}
        disabled={disabled}
        className="rounded-full px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
      >
        {loading ? 'Connecting…' : 'Connect a bank account'}
      </button>
      {error && <p className="mt-2 text-sm" style={{ color: 'var(--color-red)' }}>{error}</p>}
    </div>
  );
}
