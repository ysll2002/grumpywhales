'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  initialFirstName: string;
  initialLastName:  string;
  email:            string;
};

export default function NameEditor({ initialFirstName, initialLastName, email }: Props) {
  const router = useRouter();
  const [first, setFirst]   = useState(initialFirstName);
  const [last,  setLast]    = useState(initialLastName);
  const [busy,  setBusy]    = useState(false);
  const [error, setError]   = useState('');
  const [saved, setSaved]   = useState(false);

  const dirty = first !== initialFirstName || last !== initialLastName;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || busy) return;
    if (!first.trim() && !last.trim()) {
      setError('Please enter at least a first or last name.');
      return;
    }
    setBusy(true); setError(''); setSaved(false);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: first.trim(), last_name: last.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'save_failed');
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 min-w-0 flex-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--color-muted)' }}>First name</span>
          <input
            type="text"
            value={first}
            onChange={e => { setFirst(e.target.value); setSaved(false); setError(''); }}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            autoComplete="given-name"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--color-muted)' }}>Last name</span>
          <input
            type="text"
            value={last}
            onChange={e => { setLast(e.target.value); setSaved(false); setError(''); }}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            autoComplete="family-name"
          />
        </label>
      </div>
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{email}</p>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={!dirty || busy}
          className="px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: !dirty || busy ? 'not-allowed' : 'pointer' }}
        >
          {busy ? 'Saving…' : 'Save name'}
        </button>
        {saved && <span className="text-xs" style={{ color: 'var(--color-accent-dk)' }}>Saved.</span>}
        {error && <span className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</span>}
      </div>
    </form>
  );
}
