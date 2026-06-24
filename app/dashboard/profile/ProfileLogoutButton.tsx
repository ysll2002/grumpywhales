'use client';

import { signOut } from 'next-auth/react';

export default function ProfileLogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="px-4 py-2 rounded-full text-sm font-medium"
      style={{
        backgroundColor: 'transparent',
        color:           'var(--color-red)',
        border:          '1px solid var(--color-border)',
        cursor:          'pointer',
      }}
    >
      Log out
    </button>
  );
}
