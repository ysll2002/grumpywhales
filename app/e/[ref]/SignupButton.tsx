'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SignupStatus, PaymentStatus } from '@/lib/signups';

type Props = {
  eventId:        string;
  signedIn:       boolean;
  loginHref:      string;
  currentStatus:  SignupStatus | null;
  paymentStatus:  PaymentStatus | null;
  signupMode:     'first_come' | 'curated';
  isFull:         boolean;
};

export default function SignupButton({
  eventId, signedIn, loginHref, currentStatus, paymentStatus, signupMode, isFull,
}: Props) {
  const router = useRouter();
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  if (!signedIn) {
    return (
      <a
        href={loginHref}
        className="inline-block px-7 py-3 rounded-full font-medium text-base"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', textDecoration: 'none' }}
      >
        Sign in to join →
      </a>
    );
  }

  async function signUp() {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/events/${eventId}/signup`, { method: 'POST' });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'signup_failed');
      return;
    }
    router.refresh();
  }

  async function cancel() {
    if (!confirm('Cancel your sign-up for this event?')) return;
    setBusy(true);
    setError('');
    const res = await fetch(`/api/events/${eventId}/signup`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'cancel_failed');
      return;
    }
    router.refresh();
  }

  const isActive = currentStatus && currentStatus !== 'cancelled' && currentStatus !== 'declined';

  if (isActive) {
    const label =
      currentStatus === 'accepted'   ? "You're on the roster" :
      currentStatus === 'pending'    ? "Awaiting the host's decision" :
      currentStatus === 'waitlisted' ? "You're on the waitlist" :
      currentStatus;

    return (
      <div className="flex flex-col gap-3 items-start">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
          style={{ backgroundColor: '#D1FAE5', color: 'var(--color-accent-dk)' }}>
          ✓ {label}
        </div>
        {paymentStatus === 'unpaid' && (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Payment will be enabled here once Stripe is wired up.
          </p>
        )}
        <button
          onClick={cancel}
          disabled={busy}
          className="text-sm disabled:opacity-50"
          style={{ color: 'var(--color-red)', background: 'none', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
        >
          {busy ? 'Cancelling…' : 'Cancel my sign-up'}
        </button>
        {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
      </div>
    );
  }

  if (isFull && signupMode === 'first_come') {
    return (
      <div className="flex flex-col gap-3 items-start">
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          This event is full. Join the waitlist — you&apos;ll be moved up if someone drops out.
        </p>
        <button
          onClick={signUp}
          disabled={busy}
          className="px-7 py-3 rounded-full font-medium text-base disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-yellow)', color: 'var(--color-dark)', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
        >
          {busy ? 'Joining…' : 'Join the waitlist'}
        </button>
        {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        onClick={signUp}
        disabled={busy}
        className="px-7 py-3 rounded-full font-medium text-base disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
      >
        {busy ? 'Signing up…' : signupMode === 'curated' ? 'Request to attend' : 'Sign me up'}
      </button>
      {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
    </div>
  );
}
