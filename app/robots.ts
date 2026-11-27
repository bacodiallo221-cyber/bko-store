import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/livreur', '/api', '/auth'] }], sitemap: (process.env.NEXT_PUBLIC_SITE_URL || 'https://bko-store.vercel.app') + '/sitemap.xml' };
}
