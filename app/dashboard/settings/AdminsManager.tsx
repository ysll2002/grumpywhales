'use client';

import React, { useState } from 'react';
import { useDialog } from '@/components/Dialog';

export type UserRow = {
  email:      string;
  name:       string | null;
  created_at: string | null;
  is_admin:   boolean;
  notes:      string | null;
};

export default function AdminsManager({ initial, currentEmail }: { initial: UserRow[]; currentEmail: string | null }) {
  const [rows,  setRows]  = useState<UserRow[]>(initial);
  const [email, setEmail] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');
  const [info,  setInfo]  = useState('');
  // Which row's Notes panel is expanded, plus draft + save state for that panel.
  const [openNotes,   setOpenNotes]   = useState<string | null>(null);
  const [notesDraft,  setNotesDraft]  = useState('');
  const [notesBusy,   setNotesBusy]   = useState(false);
  const { confirm, dialog } = useDialog();
  const meLower = currentEmail?.toLowerCase() ?? null;

  function toggleNotes(target: string, current: string | null) {
    if (openNotes === target) {
      setOpenNotes(null);
      return;
    }
    setOpenNotes(target);
    setNotesDraft(current ?? '');
    setError(''); setInfo('');
  }

  async function saveNotes(target: string) {
    setNotesBusy(true); setError(''); setInfo('');
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: target, notes: notesDraft }),
    });
    setNotesBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.detail ?? j.error ?? 'notes_save_failed');
      return;
    }
    const j = await res.json().catch(() => ({})) as { notes?: string | null };
    const saved = j.notes ?? null;
    setRows(rs => rs.map(r => r.email.toLowerCase() === target.toLowerCase() ? { ...r, notes: saved } : r));
    setOpenNotes(null);
    setInfo(saved ? `Notes saved for ${target}.` : `Notes cleared for ${target}.`);
  }

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
    const j = await res.json().catch(() => ({})) as { email_sent?: boolean; email_error?: string | null };
    // If the promoted email is already in the user list, just flip its badge;
    // otherwise prepend a stub row (invited email that hasn't signed up yet).
    setRows(rs => {
      const idx = rs.findIndex(r => r.email.toLowerCase() === trimmed);
      if (idx >= 0) {
        const copy = rs.slice();
        copy[idx] = { ...copy[idx], is_admin: true };
        return copy;
      }
      return [{ email: trimmed, name: null, created_at: new Date().toISOString(), is_admin: true, notes: null }, ...rs];
    });
    setEmail('');
    if (j.email_sent) {
      setInfo(`${trimmed} promoted to admin — welcome email sent.`);
    } else {
      setInfo(`${trimmed} promoted to admin, but the welcome email failed to send${j.email_error ? `: ${j.email_error}` : ''}. Check RESEND_API_KEY / verified sender domain.`);
    }
  }

  async function removeAdmin(target: string) {
    const ok = await confirm({
      title:        'Revoke admin?',
      message:      `Revoke admin access for ${target}? They will remain a registered user.`,
      confirmLabel: 'Revoke',
      tone:         'danger',
    });
    if (!ok) return;
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
    setRows(rs => rs.map(r => r.email.toLowerCase() === target.toLowerCase() ? { ...r, is_admin: false } : r));
    setInfo(`${target} is no longer an admin.`);
  }

  async function removeUser(target: string) {
    const ok = await confirm({
      title:        'Remove user?',
      message:      `Permanently remove ${target}? Their signups and attendance records will be deleted. This can't be undone.`,
      confirmLabel: 'Remove',
      tone:         'danger',
    });
    if (!ok) return;
    setError(''); setInfo('');
    const res = await fetch('/api/users', {
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

  const adminCount = rows.filter(r => r.is_admin).length;

  return (
    <div className="flex flex-col gap-5">
      {dialog}
      <form onSubmit={invite} className="flex items-center gap-3 flex-wrap p-5 rounded-2xl"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); setInfo(''); }}
          placeholder="promote@example.com"
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
          {busy ? 'Promoting…' : 'Promote to admin'}
        </button>
      </form>
      {info  && <p className="text-xs" style={{ color: 'var(--color-accent-dk)' }}>{info}</p>}
      {error && <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <Th>User</Th>
              <Th>Joined</Th>
              <Th>{' '}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isSelf   = meLower != null && r.email.toLowerCase() === meLower;
              const isOpen   = openNotes === r.email;
              const hasNotes = !!r.notes && r.notes.trim().length > 0;
              return (
                <React.Fragment key={r.email}>
                  <tr style={{ borderBottom: isOpen ? 'none' : '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div>
                          {r.name && <div className="font-medium">{r.name}</div>}
                          <div className={r.name ? 'text-xs' : 'font-medium'} style={r.name ? { color: 'var(--color-muted)' } : undefined}>{r.email}</div>
                        </div>
                        {r.is_admin && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
                            style={{ backgroundColor: '#D1FAE5', color: 'var(--color-accent-dk)' }}>
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-muted)' }}>
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          type="button" onClick={() => toggleNotes(r.email, r.notes)}
                          className="text-xs"
                          style={{ color: hasNotes ? 'var(--color-accent-dk)' : 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? 'Close notes' : hasNotes ? '● Notes' : 'Add note'}
                        </button>
                        {!isSelf && r.is_admin && (
                          <button
                            type="button" onClick={() => removeAdmin(r.email)}
                            disabled={adminCount <= 1}
                            className="text-xs disabled:opacity-30"
                            style={{ color: '#2563EB', background: 'none', border: 'none', cursor: adminCount <= 1 ? 'not-allowed' : 'pointer' }}
                            title={adminCount <= 1 ? 'At least one admin must remain' : undefined}
                          >
                            Revoke admin
                          </button>
                        )}
                        {!isSelf && (
                          <button
                            type="button" onClick={() => removeUser(r.email)}
                            className="text-xs"
                            style={{ color: 'var(--color-red)', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        )}
                        {isSelf && <span className="text-xs" style={{ color: 'var(--color-muted)' }}>You</span>}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                      <td colSpan={3} className="px-4 py-4">
                        <label className="text-xs uppercase tracking-wider font-semibold block mb-2" style={{ color: 'var(--color-muted)' }}>
                          Admin notes · {r.email}
                        </label>
                        <textarea
                          value={notesDraft}
                          onChange={e => setNotesDraft(e.target.value)}
                          placeholder="Private notes visible only to platform admins."
                          rows={4}
                          maxLength={4000}
                          className="w-full px-3 py-2 rounded-lg text-sm resize-y"
                          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', minHeight: '5rem' }}
                        />
                        <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
                          <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                            {notesDraft.length}/4000
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button" onClick={() => setOpenNotes(null)}
                              className="text-xs px-3 py-1.5 rounded-full"
                              style={{ background: 'none', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button" onClick={() => saveNotes(r.email)}
                              disabled={notesBusy}
                              className="text-xs px-4 py-1.5 rounded-full disabled:opacity-50"
                              style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none', cursor: notesBusy ? 'wait' : 'pointer' }}
                            >
                              {notesBusy ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{children}</th>;
}
