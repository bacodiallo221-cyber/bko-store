import type { MetadataRoute } from 'next';
import { getStore } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://bko-store.vercel.app';
  const store = await getStore();
  const pages = ['', '/produits', '/catalogue', '/aide', '/contact', '/suivi', '/conditions', '/mentions', '/confidentialite'].map((p) => ({ url: base + p, changeFrequency: 'weekly' as const }));
  return [...pages, ...((store?.categories || []).map((c: any) => ({ url: base + '/collection/' + c.slug, changeFrequency: 'weekly' as const }))), ...((store?.products || []).map((p: any) => ({ url: base + '/produit/' + p.id, changeFrequency: 'daily' as const })))];
}
