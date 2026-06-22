'use client';
import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-[rgba(255,255,255,0.08)]"
      style={{ color: 'rgba(255,255,255,0.78)', background: 'transparent', border: 'none', cursor: 'pointer' }}
    >
      Log out
    </button>
  );
}
