'use client';

import { useState } from 'react';

export type AdminRow = {
  email:      string;
  created_at: string | null;
};

export default function AdminsManager({ initial }: { initial: AdminRow[] }) {
  const [rows,  setRows]  = useState<AdminRow[]>(initial);
  const [email, setEmail] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');
  const [info,  setInfo]  = useState('');

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setBusy(true); setError(''); setInfo('');
    const res = await fetch('/api/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'invite_failed');
      return;
    }
    if (!rows.some(r => r.email.toLowerCase() === trimmed)) {
      setRows([...rows, { email: trimmed, created_at: new Date().toISOString() }]);
    }
    setEmail('');
    setInfo(`${trimmed} can now host events.`);
  }

  async function remove(target: string) {
    if (!confirm(`Remove ${target} as a platform admin?`)) return;
    setError(''); setInfo('');
    const res = await fetch('/api/admins', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: target }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'remove_failed');
      return;
    }
    setRows(rs => rs.filter(r => r.email.toLowerCase() !== target.toLowerCase()));
    setInfo(`${target} removed.`);
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={invite} className="flex items-center gap-3 flex-wrap p-5 rounded-2xl"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); setInfo(''); }}
          placeholder="invite@example.com"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
          autoComplete="off"
          required
        />
        <button
          type="submit" disabled={busy || !email.trim()}
          className="px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: busy ? 'wait' : 'pointer' }}
        >
          {busy ? 'Inviting…' : 'Invite admin'}
        </button>
      </form>
      {info  && <p className="text-xs" style={{ color: 'var(--color-accent-dk)' }}>{info}</p>}
      {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <Th>Email</Th>
              <Th>Added</Th>
              <Th>{' '}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.email} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="px-4 py-3">
                  <span className="font-medium">{r.email}</span>
                  <span className="ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: '#D1FAE5', color: 'var(--color-accent-dk)' }}>
                    Admin
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>
                  {r.created_at
                    ? new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button" onClick={() => remove(r.email)}
                    disabled={rows.length <= 1}
                    className="text-xs disabled:opacity-30"
                    style={{ color: 'var(--color-red)', background: 'none', border: 'none', cursor: rows.length <= 1 ? 'not-allowed' : 'pointer' }}
                    title={rows.length <= 1 ? 'At least one admin must remain' : undefined}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{children}</th>;
}
