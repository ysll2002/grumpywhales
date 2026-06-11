import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 flex-shrink-0 sticky top-0 h-screen flex flex-col py-5" style={{ backgroundColor: '#0A0D12', borderRight: '1px solid var(--color-border)' }}>
        <Link href="/dashboard" className="text-xl font-bold px-5 mb-8" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>
          GrumpyWhales
        </Link>
        <nav className="flex flex-col gap-1 px-2 text-sm">
          {[
            { href: '/dashboard',          label: 'Overview' },
            { href: '/dashboard/invoices', label: 'Invoices' },
            { href: '/dashboard/clients',  label: 'Clients' },
            { href: '/dashboard/banking',  label: 'Banking' },
            { href: '/dashboard/settings', label: 'Settings' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="px-3 py-2 rounded-lg hover:bg-[#161B22]" style={{ color: 'var(--color-muted)' }}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto px-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="px-2 py-2 text-xs" style={{ color: 'var(--color-muted)' }}>
            <p style={{ color: 'var(--color-fg)', fontWeight: 500 }}>{session.user.name ?? 'User'}</p>
            <p className="truncate">{session.user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
