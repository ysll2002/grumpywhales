import { redirect } from 'next/navigation';

// Hosting + Attending now live on /dashboard. Keep this route as a redirect so
// old bookmarks (and the post-create flow if anything still points here) work.
export default async function EventsListRedirect({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { created } = await searchParams;
  redirect(created ? `/dashboard?created=${encodeURIComponent(created)}` : '/dashboard');
}
