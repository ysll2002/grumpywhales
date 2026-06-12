import PlaidOAuthResume from '@/components/PlaidOAuthResume';

export default function OAuthRedirectPage() {
  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        Connecting your bank…
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        Just finishing up. This page will redirect you back to Banking automatically.
      </p>
      <PlaidOAuthResume />
    </div>
  );
}
