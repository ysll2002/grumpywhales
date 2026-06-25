// Platform-level admin gate. Backed by the `platform_admins` table.
// `lilin.gabriel@gmail.com` is the hardcoded founding admin — always permitted
// even if the table somehow loses the row, so we never lock ourselves out.

import { supabaseAdmin as supabase } from './supabase-admin';

const FOUNDING_ADMIN_EMAIL = 'lilin.gabriel@gmail.com';

export async function isPlatformAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const lc = email.trim().toLowerCase();
  if (lc === FOUNDING_ADMIN_EMAIL) return true;

  const { data } = await supabase
    .from('platform_admins')
    .select('email')
    .ilike('email', lc)
    .maybeSingle();
  return data != null;
}

// Returns the full admin list, including the founding admin (deduplicated).
export async function listPlatformAdmins(): Promise<{ email: string; created_at: string | null }[]> {
  const { data } = await supabase
    .from('platform_admins')
    .select('email, created_at')
    .order('created_at', { ascending: true });

  const rows = data ?? [];
  const seen = new Set<string>(rows.map(r => r.email.toLowerCase()));
  if (!seen.has(FOUNDING_ADMIN_EMAIL)) {
    rows.unshift({ email: FOUNDING_ADMIN_EMAIL, created_at: null });
  }
  return rows;
}

export { FOUNDING_ADMIN_EMAIL };
