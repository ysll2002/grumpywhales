import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import LogoutButton from '@/components/LogoutButton';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 flex-shrink-0 sticky top-0 h-screen flex flex-col py-5" style={{ backgroundColor: 'var(--color-accent-dk)', color: '#FFFFFF' }}>
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold px-5 mb-8" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-yellow)', textDecoration: 'none' }}>
          <Image src="/logo.png" alt="GrumpyWhales" width={32} height={32} priority style={{ borderRadius: 5 }} />
          GrumpyWhales
        </Link>
        <nav className="flex flex-col gap-1 px-2 text-sm">
          {[
            { href: '/dashboard/events',  label: 'My events' },
            { href: '/dashboard/unpaid',  label: 'Unpaid' },
            { href: '/dashboard/profile', label: 'Profile' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)]" style={{ color: 'rgba(255,255,255,0.78)' }}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto px-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="px-2 py-2 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
            <p style={{ color: '#FFFFFF', fontWeight: 600 }}>{session.user.name ?? 'User'}</p>
            <p className="truncate">{session.user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
