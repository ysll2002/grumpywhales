'use client';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

export default function Register() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const reg = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="text-2xl font-bold mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>
        GrumpyWhales
      </Link>

      <div className="w-full max-w-sm p-8 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h1 className="text-2xl font-semibold mb-6">Create your account</h1>

        <form onSubmit={onSubmit} className="space-y-3">
          <input required placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
          <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
          <input type="password" required minLength={8} placeholder="Password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
          {error && <p className="text-xs" style={{ color: '#F87171' }}>{error}</p>}
          <button disabled={busy} type="submit" className="w-full py-2.5 rounded-xl font-medium text-sm disabled:opacity-50" style={{ backgroundColor: 'var(--color-accent)', color: '#0E1116' }}>
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
