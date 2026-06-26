import { redirect } from 'next/navigation';

// /dashboard now lives at /dashboard/events ('Join event'). A stale '?created='
// param on the root path was for the old post-create flow that landed here —
// route it to the manage page where the success banner now lives.
export default async function DashboardRedirect({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { created } = await searchParams;
  if (created) redirect(`/dashboard/manage?created=${encodeURIComponent(created)}`);
  redirect('/dashboard/events');
}
