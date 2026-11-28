'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabase';
import { fmt, num, errText } from '@/lib/format';
import { fmtPhone, waLink } from '@/lib/phone';

type Client = { phone: string; name: string; orders: number; delivered: number; spent: number; last: string; products: string[] };

// Clients et relances : offres WhatsApp sur les nouveautés pour les clients déjà livrés,
// avec la réduction fidélité appliquée automatiquement à leur numéro.
export default function Clients({ shop, toast, onSaved }: { shop: any; toast: (m: string) => void; onSaved: () => void }) {
  const [clients, setClients] = useState<Client[] | null>(null); const [stops, setStops] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]); const [pid, setPid] = useState(''); const [pct, setPct] = useState(String(shop.loyalty_percent || 0));
  const [seg, setSeg] = useState<'livres' | 'tous'>('livres'); const [sent, setSent] = useState<Record<string, number>>({}); const [q, setQ] = useState('');

  const load = useCallback(async () => {
    const [o, s, p] = await Promise.all([
      sb().from('orders').select('customer_name,customer_phone,status,created_at,shipping_fee,discount,order_items(product_name,amount)').eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(5000),
      sb().from('marketing_optouts').select('phone').eq('shop_id', shop.id),
      sb().from('products').select('id,name,price,compare_price,created_at,active,stock').eq('shop_id', shop.id).eq('active', true).order('created_at', { ascending: false }),
    ]);
    if (o.error) return toast(errText(o.error));
    const map = new Map<string, Client>();
    for (const r of o.data || []) {
      const c = map.get(r.customer_phone) || { phone: r.customer_phone, name: r.customer_name, orders: 0, delivered: 0, spent: 0, last: r.created_at, products: [] };
      c.orders++; if (r.status === 'livree') { c.delivered++; c.spent += (r.order_items || []).reduce((a: number, i: any) => a + i.amount, 0) + (r.shipping_fee || 0) - (r.discount || 0); }
      for (const i of r.order_items || []) if (!c.products.includes(i.product_name)) c.products.push(i.product_name);
      map.set(r.customer_phone, c);
    }
    setClients(Array.from(map.values()).sort((a, b) => b.spent - a.spent || +new Date(b.last) - +new Date(a.last)));
    setStops((s.data || []).map((x: any) => x.phone)); setProducts(p.data || []); setPid((x) => x || p.data?.[0]?.id || '');
  }, [shop.id, toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { try { setSent(JSON.parse(localStorage.getItem('zelvo-relance-' + pid) || '{}')); } catch { setSent({}); } }, [pid]);

  const prod = products.find((x) => x.id === pid);
  const loyalty = Number(shop.loyalty_percent) || 0;
  const list = useMemo(() => (clients || []).filter((c) => (seg === 'tous' || c.delivered > 0) && !stops.includes(c.phone)
    && (!q || (c.name + c.phone).toLowerCase().includes(q.toLowerCase()))), [clients, seg, stops, q]);

  async function savePct() {
    const v = Math.max(0, Math.min(50, Number(pct) || 0));
    const { error } = await sb().from('shops').update({ loyalty_percent: v }).eq('id', shop.id);
    if (error) return toast(errText(error)); toast(v ? 'Réduction fidélité : −' + v + ' %' : 'Réduction fidélité désactivée'); onSaved();
  }
  async function stop(c: Client) {
    const { error } = await sb().from('marketing_optouts').insert({ shop_id: shop.id, phone: c.phone });
    if (error) return toast(errText(error)); toast(c.name + ' ne recevra plus d’offres'); load();
  }
  function message(c: Client) {
    if (!prod) return '';
    const first = c.name.split(' ')[0];
    const link = location.origin + '/produit/' + prod.id + '?utm_source=whatsapp&utm_medium=relance';
    return 'Bonjour ' + first + ' 👋\nNouveau chez ' + shop.name + ' : *' + prod.name + '* à ' + fmt(prod.price) + (prod.compare_price ? ' au lieu de ' + fmt(prod.compare_price) : '') + '.'
      + (loyalty ? '\n🎁 Comme vous êtes déjà client(e), vous avez −' + loyalty + ' % en plus, appliqués automatiquement avec votre numéro.' : '')
      + '\n💵 Paiement à la livraison.\n👉 ' + link + '\n\n(Répondez STOP pour ne plus recevoir nos offres.)';
  }
  function mark(c: Client) { const n = { ...sent, [c.phone]: Date.now() }; setSent(n); try { localStorage.setItem('zelvo-relance-' + pid, JSON.stringify(n)); } catch {} }

  const all = clients || []; const deliveredCount = all.filter((c) => c.delivered > 0).length;
  return (
    <>
      <div className="kpis">
        <div className="k"><div className="l">Clients</div><div className="v">{all.length}</div></div>
        <div className="k"><div className="l">Déjà livrés</div><div className="v">{deliveredCount}</div></div>
        <div className="k"><div className="l">Clients fidèles (2+)</div><div className="v">{all.filter((c) => c.delivered >= 2).length}</div></div>
      </div>

      <h2 style={{ fontSize: 16, marginTop: 22 }}>🎁 Réduction fidélité</h2>
      <div className="panel" style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ marginTop: 0, flex: '1 1 220px' }}><label htmlFor="lp">Réduction pour les clients déjà livrés (%)</label><input id="lp" inputMode="numeric" value={pct} onChange={(e) => setPct(e.target.value.replace(/\D/g, ''))} /></div>
        <button className="btn primary" onClick={savePct}>Enregistrer</button>
        <p className="muted" style={{ margin: 0, flexBasis: '100%' }}>Appliquée automatiquement à la commande quand le numéro a déjà reçu un colis. Affichée sur la boutique (« Déjà client : −{pct || 0} % »). 0 = désactivé.</p>
      </div>

      <h2 style={{ fontSize: 16, marginTop: 22 }}>📣 Relancer avec une nouveauté</h2>
      <div className="panel" style={{ marginTop: 10 }}>
        <div className="two">
          <div className="field" style={{ marginTop: 0 }}><label htmlFor="rp">Produit à proposer</label><select id="rp" value={pid} onChange={(e) => setPid(e.target.value)}>{products.map((x) => <option key={x.id} value={x.id}>{x.name} — {fmt(x.price)}{Date.now() - +new Date(x.created_at) < 14 * 864e5 ? ' · nouveau' : ''}</option>)}</select></div>
          <div className="field" style={{ marginTop: 0 }}><label htmlFor="rs">Qui relancer ?</label><select id="rs" value={seg} onChange={(e) => setSeg(e.target.value as any)}><option value="livres">Clients déjà livrés ({deliveredCount})</option><option value="tous">Tous les clients ({all.length})</option></select></div>
        </div>
        {prod && list[0] && <><p className="muted" style={{ margin: '12px 0 6px' }}>Aperçu du message :</p><div className="msg" style={{ whiteSpace: 'pre-wrap' }}>{message(list[0])}</div></>}
        <p className="muted" style={{ margin: '10px 0 0' }}>Un toucher sur « Envoyer » ouvre WhatsApp avec le message prêt pour ce client. Les clients qui répondent STOP : touchez « STOP » pour ne plus jamais les relancer.</p>
      </div>

      <div className="toolbar" style={{ marginTop: 14 }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un client…" style={{ maxWidth: 280 }} /><span className="muted">{list.length} à relancer · {Object.keys(sent).filter((p) => list.some((c) => c.phone === p)).length} déjà envoyés</span></div>
      {!clients ? <p className="muted">Chargement…</p> : !list.length ? <p className="empty" style={{ marginTop: 12 }}>Aucun client à relancer pour l’instant.</p> :
        <ul className="rows">{list.map((c) => {
          const href = waLink(c.phone, message(c));
          return (
            <li key={c.phone} style={sent[c.phone] ? { opacity: .55 } : undefined}>
              <div className="grow"><strong>{c.name}</strong> {c.delivered >= 2 && <span className="badge t-ok">Fidèle</span>}
                <span className="muted"><span className="mono">+223 {fmtPhone(c.phone)}</span> · {c.delivered}/{c.orders} livrée(s) · {num(c.spent)} F · {c.products.slice(0, 2).join(', ')}</span></div>
              {href && <a className="btn sm wa" href={href} target="_blank" rel="noopener" onClick={() => mark(c)}>{sent[c.phone] ? 'Renvoyer' : 'Envoyer'}</a>}
              <button className="btn sm" onClick={() => stop(c)}>STOP</button>
            </li>);
        })}</ul>}
    </>
  );
}
