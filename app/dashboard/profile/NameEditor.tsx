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
  const [first,   setFirst]   = useState(initialFirstName);
  const [last,    setLast]    = useState(initialLastName);
  const [savedFirst, setSavedFirst] = useState(initialFirstName);
  const [savedLast,  setSavedLast]  = useState(initialLastName);
  const [editing, setEditing] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState('');

  const displayName = [savedFirst, savedLast].filter(Boolean).join(' ') || '—';

  function startEdit() {
    setFirst(savedFirst);
    setLast(savedLast);
    setError('');
    setEditing(true);
  }

  function cancel() {
    setFirst(savedFirst);
    setLast(savedLast);
    setError('');
    setEditing(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const f = first.trim();
    const l = last.trim();
    if (!f && !l) {
      setError('Please enter at least a first or last name.');
      return;
    }
    setBusy(true); setError('');
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: f, last_name: l }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'save_failed');
      return;
    }
    setSavedFirst(f);
    setSavedLast(l);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-4 min-w-0 flex-1 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>
            {displayName}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{email}</p>
        </div>
        <button
          type="button"
          onClick={startEdit}
          className="px-5 py-2 rounded-full text-sm font-medium flex-shrink-0"
          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-fg)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 min-w-0 flex-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--color-muted)' }}>First name</span>
          <input
            type="text"
            value={first}
            onChange={e => { setFirst(e.target.value); setError(''); }}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            autoComplete="given-name"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--color-muted)' }}>Last name</span>
          <input
            type="text"
            value={last}
            onChange={e => { setLast(e.target.value); setError(''); }}
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
          disabled={busy}
          className="px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
        >
          {busy ? 'Saving…' : 'Save name'}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-fg)', border: '1px solid var(--color-border)', cursor: busy ? 'wait' : 'pointer' }}
        >
          Cancel
        </button>
        {error && <span className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</span>}
      </div>
    </form>
  );
}
