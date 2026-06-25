// Platform-level admin gate. The list lives in an env var so it can be rotated
// without a deploy and never reaches the client bundle.
//
//   PLATFORM_ADMIN_EMAILS=alice@example.com,bob@example.com
//
// Comparison is case-insensitive on the local part + domain.

export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.PLATFORM_ADMIN_EMAILS;
  if (!raw) return false;
  const target = email.trim().toLowerCase();
  return raw.split(',').some(e => e.trim().toLowerCase() === target);
}
