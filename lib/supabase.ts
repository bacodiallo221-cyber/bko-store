import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://felosvhunbxazyqlgcex.supabase.co';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_B6ENo619L-sPaBFgXOqbag_LsGFNqLu';
export const SHOP_SLUG = process.env.NEXT_PUBLIC_SHOP_SLUG || 'bko-store';

// Navigateur : garde la session du vendeur ou du livreur.
let browser: any = null;
export function sb() {
  if (!browser) browser = createBrowserClient(URL, KEY);
  return browser;
}

// Serveur : lecture publique de la boutique (aucune session).
export async function getStore() {
  const c = createClient(URL, KEY, { auth: { persistSession: false }, global: { fetch: (u: any, o: any) => fetch(u, { ...o, cache: 'no-store' }) } });
  const { data, error } = await c.rpc('store_get', { p_slug: SHOP_SLUG });
  if (error) return null;
  return data as any;
}
