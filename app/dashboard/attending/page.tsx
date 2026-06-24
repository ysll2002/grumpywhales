import { redirect } from 'next/navigation';

// Attending merged into /dashboard. Keep this route as a redirect.
export default function AttendingRedirect() {
  redirect('/dashboard');
}
