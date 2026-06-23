'use client';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function sanitiseRedirect(value: string | null): string {
  // Only allow same-origin paths to avoid open-redirect abuse.
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

function LoginInner() {
  const params   = useSearchParams();
  const redirect = sanitiseRedirect(params.get('redirect'));
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    setBusy(false);
    if (res?.error) setError('Invalid email or password');
    else window.location.href = redirect;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="flex items-center gap-3 text-2xl font-bold mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)', textDecoration: 'none' }}>
        <Image src="/logo.png" alt="GrumpyWhales" width={48} height={48} priority style={{ borderRadius: 8 }} />
        GrumpyWhales
      </Link>

      <div className="w-full max-w-sm p-8 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h1 className="text-2xl font-semibold mb-6">Log in</h1>

        <button
          onClick={() => signIn('google', { callbackUrl: redirect })}
          className="w-full py-2.5 rounded-xl font-medium text-sm mb-4"
          style={{ backgroundColor: '#FFFFFF', color: 'var(--color-dark)', border: '1px solid var(--color-border)' }}
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4 text-xs text-[color:var(--color-muted)]">
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} /> or <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
          <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }} />
          {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
          <button disabled={busy} type="submit" className="w-full py-2.5 rounded-xl font-medium text-sm disabled:opacity-50" style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-center mt-4 text-[color:var(--color-muted)]">
          New here? <Link href="/register" style={{ color: 'var(--color-accent)' }}>Create an account</Link>
        </p>
      </div>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
