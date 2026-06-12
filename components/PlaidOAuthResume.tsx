'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'plaid_link_token';

export default function PlaidOAuthResume() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    setLinkToken(typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null);
  }, []);

  const onSuccess = useCallback(
    async (public_token: string, metadata: { institution?: { name?: string } | null }) => {
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
        router.replace('/dashboard/banking');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Connection failed');
      }
    },
    [router],
  );

  const { open, ready } = usePlaidLink({
    token:               linkToken,
    receivedRedirectUri: typeof window !== 'undefined' ? window.location.href : undefined,
    onSuccess,
  });

  useEffect(() => {
    if (ready && linkToken) open();
  }, [ready, linkToken, open]);

  if (!linkToken) {
    return (
      <p className="text-sm text-red-600">
        Session lost — please go back to Banking and try connecting again.
      </p>
    );
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return null;
}
