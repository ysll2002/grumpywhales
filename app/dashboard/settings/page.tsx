import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { isPlatformAdmin, listPlatformUsers } from '@/lib/platform-admin';
import AdminsManager, { type UserRow } from './AdminsManager';

export default async function SettingsPage() {
  const session = await auth();
  if (!(await isPlatformAdmin(session?.user?.email))) notFound();

  const users = await listPlatformUsers();
  const rows: UserRow[] = users.map(u => ({
    email:      u.email,
    name:       u.name,
    created_at: u.created_at,
    is_admin:   u.is_admin,
    notes:      u.notes,
  }));

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>
      <p className="text-sm mb-10" style={{ color: 'var(--color-muted)' }}>
        Everyone registered on GrumpyWhales. Platform admins are marked; anyone else can be promoted from the input above.
      </p>

      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Users</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>
          Admins can create events and invite other admins. New admins gain access the next time they sign in with this email.
        </p>
        <AdminsManager initial={rows} currentEmail={session?.user?.email ?? null} />
      </section>
    </div>
  );
}
