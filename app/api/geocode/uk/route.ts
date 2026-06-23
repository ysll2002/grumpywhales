import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// Proxy to Mapbox Geocoding API, limited to UK addresses.
// We proxy server-side so MAPBOX_TOKEN never reaches the browser bundle.
// Response is a trimmed-down shape: { results: [{ id, place_name, lat, lng }] }

type MapboxFeature = {
  id:         string;
  place_name: string;
  center:     [number, number];   // [lng, lat]
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.profileId) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const token = process.env.MAPBOX_TOKEN;
  if (!token) return NextResponse.json({ error: 'mapbox_not_configured' }, { status: 500 });

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
  url.searchParams.set('access_token', token);
  url.searchParams.set('country',      'gb');
  url.searchParams.set('language',     'en');
  url.searchParams.set('limit',        '8');
  url.searchParams.set('types',        'address,postcode,poi,place,neighborhood');
  url.searchParams.set('autocomplete', 'true');

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    return NextResponse.json({ error: 'geocode_failed', status: res.status }, { status: 502 });
  }
  const body = await res.json() as { features?: MapboxFeature[] };
  const results = (body.features ?? []).map(f => ({
    id:         f.id,
    place_name: f.place_name,
    lng:        f.center[0],
    lat:        f.center[1],
  }));
  return NextResponse.json({ results });
}
