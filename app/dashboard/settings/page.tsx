import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { isPlatformAdmin, listPlatformAdmins } from '@/lib/platform-admin';
import AdminsManager, { type AdminRow } from './AdminsManager';

export default async function SettingsPage() {
  const session = await auth();
  if (!(await isPlatformAdmin(session?.user?.email))) notFound();

  const admins = await listPlatformAdmins();
  const rows: AdminRow[] = admins.map(a => ({
    email:      a.email,
    created_at: a.created_at,
  }));

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>
      <p className="text-sm mb-10" style={{ color: 'var(--color-muted)' }}>
        Manage who can host events on GrumpyWhales.
      </p>

      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Platform admins</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>
          Admins can create events and invite other admins. New admins gain access the next time they sign in with this email.
        </p>
        <AdminsManager initial={rows} />
      </section>
    </div>
  );
}
