import type { MetadataRoute } from 'next';

// Cached at the edge; refresh once a day so changes propagate without a manual redeploy.
export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://grumpywhales.com';
  const now  = new Date();
  return [
    { url: `${base}/`,         lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/login`,    lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/register`,           lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/bokio-alternative`,  lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/privacy`,            lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/terms`,              lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ];
}
