// Synchronise les dépenses Meta Ads (par publicité et par jour) et les rattache aux produits
// d'après le lien de chaque publicité (…/produit/<id>). Le jeton reste côté serveur pendant l'appel
// et n'est lu qu'avec la session du vendeur (règles RLS de Supabase).
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://felosvhunbxazyqlgcex.supabase.co';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_B6ENo619L-sPaBFgXOqbag_LsGFNqLu';
const GRAPH = 'https://graph.facebook.com/v23.0';
const UUID = /\/produit\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

async function graphAll(url: string, max = 20) {
  const out: any[] = []; let next: string | null = url; let n = 0;
  while (next && n++ < max) {
    const r = await fetch(next, { cache: 'no-store' }); const j = await r.json();
    if (j.error) throw new Error(j.error.message || 'Erreur Meta');
    out.push(...(j.data || [])); next = j.paging?.next || null;
  }
  return out;
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const shopId = String(body.shop || '');
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const since = /^\d{4}-\d{2}-\d{2}$/.test(body.from) ? body.from : iso(new Date(Date.now() - 6 * 86400000));
  const until = /^\d{4}-\d{2}-\d{2}$/.test(body.to) ? body.to : iso(new Date());
  const db = createClient(URL_, KEY, { auth: { persistSession: false }, global: { headers: { Authorization: auth } } });

  const { data: integ, error: e1 } = await db.from('shop_integrations').select('*').eq('shop_id', shopId).maybeSingle();
  if (e1 || !integ) return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 400 });
  if (!integ.meta_account || !integ.meta_token) return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 400 });
  const tok = encodeURIComponent(integ.meta_token), act = 'act_' + integ.meta_account;

  try {
    const { data: prods } = await db.from('products').select('id,name').eq('shop_id', shopId);
    const mine = new Set((prods || []).map((p: any) => p.id));
    const acc = await (await fetch(`${GRAPH}/${act}?fields=currency,name&access_token=${tok}`, { cache: 'no-store' })).json();
    if (acc.error) throw new Error(acc.error.message);
    const fx = acc.currency === 'XOF' ? 1 : acc.currency === 'EUR' ? 655.957 : Number(integ.fx_rate) || 1;

    const ads = await graphAll(`${GRAPH}/${act}/ads?fields=id,name,creative{object_story_spec,asset_feed_spec,link_url,object_url,url_tags}&limit=200&access_token=${tok}`);
    const adProduct = new Map<string, string | null>();
    for (const a of ads) { const m = JSON.stringify(a.creative || {}).replace(/\\\//g, '/').match(UUID); adProduct.set(a.id, m && mine.has(m[1].toLowerCase()) ? m[1].toLowerCase() : null); }

    const tr = encodeURIComponent(JSON.stringify({ since, until }));
    const rows = await graphAll(`${GRAPH}/${act}/insights?level=ad&fields=ad_id,ad_name,spend,impressions,clicks&time_increment=1&time_range=${tr}&limit=500&access_token=${tok}`);
    const up = rows.map((r: any) => ({
      shop_id: shopId, product_id: adProduct.get(r.ad_id) ?? null, day: r.date_start, source: 'meta', ref: 'ad:' + r.ad_id,
      label: String(r.ad_name || '').slice(0, 120), amount: Math.round(Number(r.spend || 0) * fx),
      impressions: Number(r.impressions || 0), clicks: Number(r.clicks || 0), updated_at: new Date().toISOString(),
    }));
    for (let i = 0; i < up.length; i += 500) {
      const { error } = await db.from('product_ad_spend').upsert(up.slice(i, i + 500), { onConflict: 'shop_id,day,source,ref' });
      if (error) throw new Error(error.message);
    }
    const total = up.reduce((a, r) => a + r.amount, 0), matched = up.filter((r) => r.product_id).reduce((a, r) => a + r.amount, 0);
    const note = `${up.length} lignes · ${total} FCFA · ${total - matched} FCFA sans produit`;
    await db.from('shop_integrations').update({ last_sync_at: new Date().toISOString(), last_sync_note: note }).eq('shop_id', shopId);
    return NextResponse.json({ ok: true, rows: up.length, total, matched, unmatched: total - matched, currency: acc.currency, account: acc.name });
  } catch (x: any) {
    const msg = String(x.message || x);
    await db.from('shop_integrations').update({ last_sync_note: 'Erreur : ' + msg.slice(0, 200) }).eq('shop_id', shopId);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
