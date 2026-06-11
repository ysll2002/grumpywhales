import { auth } from '@/auth';

export default async function DashboardHome() {
  const session = await auth();
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        Welcome back, {session?.user.name ?? 'there'}.
      </h1>
      <p className="text-[color:var(--color-muted)] mb-10">
        You haven&apos;t sent any invoices yet. Create your first one to start tracking payments.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Outstanding', value: '£0.00' },
          { label: 'Overdue',     value: '0' },
          { label: 'Paid (30d)',  value: '£0.00' },
        ].map(m => (
          <div key={m.label} className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{m.label}</p>
            <p className="text-2xl font-semibold mt-1">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
