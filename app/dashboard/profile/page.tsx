import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import ProfileLogoutButton from './ProfileLogoutButton';
import NameEditor from './NameEditor';

type Profile = {
  id:         string;
  name:       string | null;
  first_name: string | null;
  last_name:  string | null;
  email:      string;
  avatar_url: string | null;
  created_at: string;
};

type PaidSignup = {
  fee_amount:   number | null;
  fee_currency: string | null;
  events: { fee_amount: number; fee_currency: string } | null;
};

export default async function ProfilePage() {
  const session = await auth();
  const profileId = session!.user.profileId;
  const todayUtc = new Date().toISOString().slice(0, 10);

  const [
    profileRes,
    hostingCountRes,
    signupCountRes,
    upcomingCountRes,
    attendedCountRes,
    attendanceTotalRes,
    paidRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id, name, first_name, last_name, email, avatar_url, created_at').eq('id', profileId).maybeSingle(),
    supabase.from('events').select('id', { head: true, count: 'exact' }).eq('admin_id', profileId),
    supabase.from('event_signups').select('id', { head: true, count: 'exact' }).eq('profile_id', profileId).neq('status', 'cancelled'),
    supabase.from('event_signups').select('id', { head: true, count: 'exact' }).eq('profile_id', profileId).neq('status', 'cancelled').gte('occurrence_date', todayUtc),
    supabase.from('event_attendance').select('id', { head: true, count: 'exact' }).eq('profile_id', profileId).eq('attended', true),
    supabase.from('event_attendance').select('id', { head: true, count: 'exact' }).eq('profile_id', profileId),
    supabase.from('event_signups').select('fee_amount, fee_currency, events(fee_amount, fee_currency)').eq('profile_id', profileId).eq('payment_status', 'paid'),
  ]);

  const profile = profileRes.data as Profile | null;
  if (!profile) return null;

  const hostingCount     = hostingCountRes.count ?? 0;
  const signupCount      = signupCountRes.count  ?? 0;
  const upcomingCount    = upcomingCountRes.count ?? 0;
  const attendedCount    = attendedCountRes.count ?? 0;
  const attendanceTotal  = attendanceTotalRes.count ?? 0;
  const attendanceRate   = attendanceTotal === 0 ? null : Math.round((attendedCount / attendanceTotal) * 100);

  // Sum paid amounts grouped by currency. Most users will only have one currency,
  // but if they paid for events in different currencies, show them separately.
  const paidByCurrency = new Map<string, number>();
  for (const row of (paidRes.data ?? []) as unknown as PaidSignup[]) {
    // Prefer the frozen per-signup fee (what was actually paid) over the
    // event's current live price.
    const amt = row.fee_amount ?? row.events?.fee_amount;
    const ccy = row.fee_currency ?? row.events?.fee_currency;
    if (amt == null || !ccy) continue;
    paidByCurrency.set(ccy, (paidByCurrency.get(ccy) ?? 0) + Number(amt));
  }
  const paidLines = Array.from(paidByCurrency.entries()).map(([ccy, amt]) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: ccy, maximumFractionDigits: 2 }).format(amt)
  );
  const paidLabel = paidLines.length ? paidLines.join(' · ') : '—';

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Profile</h1>
      <p className="text-sm mb-10" style={{ color: 'var(--color-muted)' }}>
        Your account details and event activity.
      </p>

      {/* ── Personal info ── */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Account</h2>
        <div className="p-6 rounded-2xl flex items-start gap-5 flex-wrap"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-accent-dk)', color: 'var(--color-yellow)', fontFamily: 'var(--font-display)', fontSize: 26 }}>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.name ?? profile.email} width={64} height={64}
                referrerPolicy="no-referrer" style={{ width: 64, height: 64, objectFit: 'cover' }} />
            ) : (
              (profile.name ?? profile.email)[0].toUpperCase()
            )}
          </div>
          <NameEditor
            initialFirstName={profile.first_name ?? ''}
            initialLastName={profile.last_name ?? ''}
            email={profile.email}
          />
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <ProfileLogoutButton />
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Member since {memberSince}</p>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Activity</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Events hosting"        value={String(hostingCount)} />
          <Stat label="Sessions signed up"    value={String(signupCount)} />
          <Stat label="Upcoming sessions"     value={String(upcomingCount)} />
          <Stat label="Sessions attended"     value={`${attendedCount}${attendanceTotal ? ` / ${attendanceTotal}` : ''}`} />
          <Stat label="Attendance rate"       value={attendanceRate == null ? '—' : `${attendanceRate}%`} />
          <Stat label="Total paid to hosts"   value={paidLabel} />
        </div>
        {attendanceTotal === 0 && (
          <p className="text-xs mt-3" style={{ color: 'var(--color-muted)' }}>
            Attendance rate starts to populate once hosts mark you as attended after each session.
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{label}</p>
      <p className="text-2xl font-semibold mt-1" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
    </div>
  );
}
