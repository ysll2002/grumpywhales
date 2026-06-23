'use client';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Register() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [agreed,   setAgreed]   = useState(false);
  const [error,    setError]    = useState('');
  const [busy,        setBusy]        = useState(false);
  const [googleBusy,  setGoogleBusy]  = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError('Please tick the box to agree to the Terms and Privacy Policy.');
      return;
    }
    setBusy(true);
    setError('');
    const reg = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, accepted_terms: true }),
    });
    if (!reg.ok) {
      const j = await reg.json().catch(() => ({}));
      setError(j.error ?? 'Sign up failed');
      setBusy(false);
      return;
    }
    const res = await signIn('credentials', { email, password, redirect: false });
    setBusy(false);
    if (res?.error) setError('Account created but sign-in failed — try logging in.');
    else window.location.href = '/dashboard';
  }

  function onGoogle() {
    if (!agreed) {
      setError('Please tick the box to agree to the Terms and Privacy Policy.');
      return;
    }
    setGoogleBusy(true);
    signIn('google', { callbackUrl: '/dashboard' });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="flex items-center gap-3 text-2xl font-bold mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)', textDecoration: 'none' }}>
        <Image src="/logo.png" alt="GrumpyWhales" width={48} height={48} priority style={{ borderRadius: 8 }} />
        GrumpyWhales
      </Link>

      <div className="w-full max-w-sm p-8 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h1 className="text-2xl font-semibold mb-6">Create your account</h1>

        <button
          onClick={onGoogle}
          disabled={busy || googleBusy}
          className="w-full py-2.5 rounded-xl font-medium text-sm mb-4 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
          style={{ backgroundColor: '#FFFFFF', color: 'var(--color-dark)', border: '1px solid var(--color-border)' }}
        >
          <GoogleIcon />
          {googleBusy ? 'Connecting…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3 my-4 text-xs text-[color:var(--color-muted)]">
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} /> or <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input required placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
          <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
          <input type="password" required minLength={8} placeholder="Password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />

          <label className="flex items-start gap-2 text-xs cursor-pointer select-none pt-1" style={{ color: 'var(--color-muted)' }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 shrink-0"
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <span>
              I agree to the{' '}
              <Link href="/terms"   target="_blank" rel="noopener" style={{ color: 'var(--color-accent)' }}>Terms of Service</Link>{' '}and{' '}
              <Link href="/privacy" target="_blank" rel="noopener" style={{ color: 'var(--color-accent)' }}>Privacy Policy</Link>.
            </span>
          </label>

          {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}

          <button
            disabled={busy || !agreed}
            type="submit"
            className="w-full py-2.5 rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
          >
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="text-xs text-center mt-4 text-[color:var(--color-muted)]">
          Already have an account? <Link href="/login" style={{ color: 'var(--color-accent)' }}>Log in</Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A8.99 8.99 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.94H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.06l3.01-2.34z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A8.99 8.99 0 0 0 9 0 8.99 8.99 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}
