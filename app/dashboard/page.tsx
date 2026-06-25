import { redirect } from 'next/navigation';

// /dashboard now lives at /dashboard/events. Keep this route as a redirect so
// old bookmarks (and any internal '/dashboard' links not yet updated) still
// land in the right place — preserving ?created= if it's there.
export default async function DashboardRedirect({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { created } = await searchParams;
  redirect(created ? `/dashboard/events?created=${encodeURIComponent(created)}` : '/dashboard/events');
}
