'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabase';
import { fmt, num, errText } from '@/lib/format';
import { Sheet } from './ui';

const iso = (d: Date) => { const z = (n: number) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); };
const addDays = (s: string, n: number) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a: string, b: string) => Math.round((+new Date(b + 'T12:00:00') - +new Date(a + 'T12:00:00')) / 86400000) + 1;

function preset(k: string): [string, string] {
  const t = iso(new Date());
  const now = new Date();
  if (k === 'today') return [t, t];
  if (k === 'yesterday') { const y = addDays(t, -1); return [y, y]; }
  if (k === '7d') return [addDays(t, -6), t];
  if (k === '30d') return [addDays(t, -29), t];
  if (k === 'month') return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), t];
  if (k === 'lastmonth') return [iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), iso(new Date(now.getFullYear(), now.getMonth(), 0))];
  return ['2025-01-01', t];
}
const PRESETS: [string, string][] = [['today', 'Aujourd’hui'], ['yesterday', 'Hier'], ['7d', '7 jours'], ['30d', '30 jours'], ['month', 'Ce mois'], ['lastmonth', 'Mois dernier'], ['all', 'Total']];
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export default function Dashboard({ shop, toast }: { shop: any; toast: (m: string) => void }) {
  const [p, setP] = useState('7d'); const [range, setRange] = useState<[string, string]>(preset('7d'));
  const [d, setD] = useState<any>(null); const [prev, setPrev] = useState<any>(null);
  const [integ, setInteg] = useState<any>(null); const [syncing, setSyncing] = useState(false); const [spend, setSpend] = useState<any>(null);

  const load = useCallback(async () => {
    const [from, to] = range; const len = daysBetween(from, to);
    const [a, b] = await Promise.all([
      sb().rpc('dashboard', { p_shop: shop.id, p_from: from, p_to: to }),
      p === 'all' ? Promise.resolve({ data: null }) : sb().rpc('dashboard', { p_shop: shop.id, p_from: addDays(from, -len), p_to: addDays(from, -1) }),
    ]);
    if (a.error) return toast(errText(a.error));
    setD(a.data); setPrev(b.data);
  }, [range, p, shop.id, toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { sb().from('shop_integrations').select('meta_account,last_sync_at,last_sync_note').eq('shop_id', shop.id).maybeSingle().then(({ data }: any) => setInteg(data)); }, [shop.id]);

  async function sync() {
    setSyncing(true);
    const { data: s } = await sb().auth.getSession();
    const r = await fetch('/api/meta-sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.session?.access_token },
      body: JSON.stringify({ shop: shop.id, from: range[0] < addDays(iso(new Date()), -89) ? addDays(iso(new Date()), -89) : range[0], to: range[1] }) }).then((x) => x.json()).catch(() => ({ error: 'Connexion impossible' }));
    setSyncing(false);
    if (r.error) return toast(r.error === 'NOT_CONNECTED' ? 'Connectez d’abord Meta Ads dans l’onglet Boutique.' : /token|session|OAuth/i.test(r.error) ? 'Meta refuse le jeton : vérifiez-le dans l’onglet Boutique.' : /reduce the amount/i.test(r.error) ? 'Meta demande moins de données : choisissez une période plus courte (7 jours) et réessayez.' : 'Meta : ' + r.error);
    toast('Meta synchronisé : ' + fmt(r.total) + (r.unmatched ? ' (dont ' + fmt(r.unmatched) + ' sans produit)' : ''));
    setInteg({ ...integ, last_sync_at: new Date().toISOString() }); load();
  }

  const k = useMemo(() => {
    if (!d) return null;
    const net = d.revenue - d.goods - d.delivery - d.ads;
    return { net, cpa: d.confirmed ? Math.round(d.ads / d.confirmed) : 0, roas: d.ads ? d.revenue / d.ads : 0, conf: pct(d.confirmed, d.orders), deliv: pct(d.delivered, d.confirmed), basket: d.delivered ? Math.round(d.revenue / d.delivered) : 0 };
  }, [d]);
  const delta = (cur: number, old?: number, invert = false) => {
    if (!prev || old === undefined) return null;
    if (!old) return cur ? <span className="dl up">nouveau</span> : null;
    const v = Math.round(((cur - old) / Math.abs(old)) * 100); if (!v) return <span className="dl">=</span>;
    const good = invert ? v < 0 : v > 0;
    return <span className={'dl ' + (good ? 'up' : 'down')}>{v > 0 ? '+' : ''}{v} %</span>;
  };
  const prevNet = prev ? prev.revenue - prev.goods - prev.delivery - prev.ads : undefined;

  return (
    <>
      <div className="toolbar" style={{ alignItems: 'flex-end' }}>
        <div className="chips">{PRESETS.map(([key, l]) => <button key={key} type="button" className={'chip' + (p === key ? ' on' : '')} onClick={() => { setP(key); setRange(preset(key)); }}>{l}</button>)}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" className="blockin" style={{ width: 'auto' }} value={range[0]} max={range[1]} onChange={(e) => { setP('custom'); setRange([e.target.value, range[1]]); }} aria-label="Du" />
          <span className="muted">→</span>
          <input type="date" className="blockin" style={{ width: 'auto' }} value={range[1]} min={range[0]} onChange={(e) => { setP('custom'); setRange([range[0], e.target.value]); }} aria-label="Au" />
        </div>
      </div>
      {!d || !k ? <p className="muted" style={{ marginTop: 16 }}>Chargement…</p> : <>
        <div className="dash">
          <div className="dk hero"><span className="l">Bénéfice net</span><b className={k.net < 0 ? 'neg' : ''}>{num(k.net)}</b><span className="u">FCFA {delta(k.net, prevNet)}</span>
            <span className="f">Ventes livrées − achats − livraison − pub</span></div>
          <div className="dk"><span className="l">Chiffre d’affaires</span><b>{num(d.revenue)}</b><span className="u">FCFA livrés {delta(d.revenue, prev?.revenue)}</span></div>
          <div className="dk"><span className="l">Dépense pub</span><b>{num(d.ads)}</b><span className="u">FCFA {delta(d.ads, prev?.ads, true)}</span></div>
          <div className="dk"><span className="l">ROAS</span><b>{d.ads ? k.roas.toFixed(1) : '—'}</b><span className="u">FCFA vendus pour 1 FCFA de pub</span></div>
          <div className="dk"><span className="l">Commandes</span><b>{d.orders}</b><span className="u">{delta(d.orders, prev?.orders)} {d.from_ads ? '· ' + d.from_ads + ' venues de la pub' : ''}</span></div>
          <div className="dk"><span className="l">Confirmées</span><b>{k.conf}<small>%</small></b><span className="u">{d.confirmed} sur {d.orders}</span></div>
          <div className="dk"><span className="l">Livrées</span><b>{k.deliv}<small>%</small></b><span className="u">{d.delivered} livrées · {d.refused} refusées</span></div>
          <div className="dk"><span className="l">Coût par commande</span><b>{d.ads ? num(k.cpa) : '—'}</b><span className="u">pub ÷ commandes confirmées</span></div>
        </div>
        <div className="dash2">
          <div><span className="l">En cours</span><b>{fmt(d.pipeline)}</b><span>{d.in_progress} colis confirmés ou en route</span></div>
          <div><span className="l">Chez les livreurs</span><b>{fmt(d.cash_with_drivers)}</b><span>argent encaissé, pas encore remis</span></div>
          <div><span className="l">Panier moyen</span><b>{fmt(k.basket)}</b><span>par commande livrée</span></div>
          <div><span className="l">À appeler</span><b>{d.pending}</b><span>commandes pas encore confirmées</span></div>
        </div>

        <Chart days={d.days} />

        <div className="toolbar" style={{ marginTop: 22 }}>
          <h2 style={{ fontSize: 16 }}>Par produit</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {integ?.meta_account && <span className="muted" style={{ display: 'inline' }}>{integ.last_sync_at ? 'Meta mis à jour ' + new Date(integ.last_sync_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Meta jamais synchronisé'}</span>}
            <button className="btn sm" onClick={() => setSpend({ day: range[1] })}>+ Saisir une dépense pub</button>
            <button className="btn sm primary" disabled={syncing} onClick={sync}>{syncing ? 'Synchronisation…' : 'Synchroniser Meta Ads'}</button>
          </div>
        </div>
        {d.ads_unassigned > 0 && <p className="info-line t-warn">{fmt(d.ads_unassigned)} de pub ne sont rattachés à aucun produit : vérifiez que vos publicités utilisent bien le « Lien pub » du produit (onglet Produits).</p>}
        {!d.products.length ? <p className="empty" style={{ marginTop: 10 }}>Aucune commande ni dépense sur cette période.</p> :
          <div className="tablewrap"><table className="inv-list dash-t">
            <thead><tr><th>Produit</th><th className="r">Cmd</th><th className="r">Conf.</th><th className="r">Livrées</th><th className="r">Ventes</th><th className="r">Pub</th><th className="r">Coût/cmd</th><th className="r">Bénéfice</th><th></th></tr></thead>
            <tbody>{d.products.map((x: any) => (
              <tr key={x.id}>
                <td><strong>{x.name}</strong><span className="muted">stock {x.stock}</span></td>
                <td className="r mono">{x.orders}</td><td className="r mono">{x.confirmed} <small className="muted" style={{ display: 'inline' }}>{pct(x.confirmed, x.orders)}%</small></td>
                <td className="r mono">{x.delivered}</td><td className="r mono">{num(x.revenue)}</td><td className="r mono">{num(x.ads)}</td>
                <td className="r mono">{x.ads && x.confirmed ? num(Math.round(x.ads / x.confirmed)) : '—'}</td>
                <td className={'r mono ' + (x.profit < 0 ? 'neg' : 'pos')}><b>{num(x.profit)}</b></td>
                <td className="r"><button className="btn sm" onClick={() => setSpend({ product: x.id, name: x.name, day: range[1] })}>Pub</button></td>
              </tr>))}</tbody>
          </table></div>}
      </>}
      {spend && <SpendSheet shop={shop} init={spend} onClose={() => setSpend(null)} onSaved={() => { setSpend(null); toast('Dépense enregistrée'); load(); }} />}
    </>
  );
}

function Chart({ days }: { days: any[] }) {
  if (!days?.length) return null;
  const W = 720, H = 200, P = 26, n = days.length, bw = Math.max(2, (W - P * 2) / n - 3);
  const maxO = Math.max(1, ...days.map((x) => x.orders)), maxA = Math.max(1, ...days.map((x) => x.ads), ...days.map((x) => x.revenue));
  const x = (i: number) => P + i * ((W - P * 2) / n);
  const line = (key: string) => days.map((d, i) => (i ? 'L' : 'M') + (x(i) + bw / 2).toFixed(1) + ' ' + (H - P - (d[key] / maxA) * (H - P * 2)).toFixed(1)).join(' ');
  const every = Math.ceil(n / 8);
  return (
    <div className="panel" style={{ marginTop: 14, padding: 14 }}>
      <div className="legend"><span><i className="lg-o" />Commandes</span><span><i className="lg-r" />Ventes livrées</span><span><i className="lg-a" />Pub</span></div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 480, display: 'block' }} role="img" aria-label="Commandes, ventes et pub par jour">
          <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="var(--line)" />
          {days.map((d, i) => <g key={i}><rect x={x(i)} y={H - P - (d.orders / maxO) * (H - P * 2)} width={bw} height={(d.orders / maxO) * (H - P * 2)} fill="var(--brand)" opacity=".9"><title>{d.day} : {d.orders} commande(s)</title></rect>
            {i % every === 0 && <text x={x(i) + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">{String(d.day).slice(8, 10)}/{String(d.day).slice(5, 7)}</text>}
            {d.orders > 0 && n <= 31 && <text x={x(i) + bw / 2} y={H - P - (d.orders / maxO) * (H - P * 2) - 4} textAnchor="middle" fontSize="10" fill="var(--fg)">{d.orders}</text>}</g>)}
          <path d={line('revenue')} fill="none" stroke="var(--ok)" strokeWidth="2" />
          <path d={line('ads')} fill="none" stroke="var(--bad)" strokeWidth="2" strokeDasharray="5 4" />
        </svg>
      </div>
    </div>
  );
}

function SpendSheet({ shop, init, onClose, onSaved }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [product, setProduct] = useState(init.product || ''); const [day, setDay] = useState(init.day); const [amount, setAmount] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { sb().from('products').select('id,name').eq('shop_id', shop.id).order('name').then(({ data }: any) => setProducts(data || [])); }, [shop.id]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const { error } = await sb().rpc('set_manual_spend', { p_shop: shop.id, p_product: product || null, p_day: day, p_amount: Number(amount) || 0 });
    if (error) return setErr(errText(error)); onSaved();
  }
  return (
    <Sheet title="Dépense pub (saisie manuelle)" onClose={onClose}>
      <p className="muted">Pour les pubs hors Meta, ou si Meta n’est pas connecté. Le montant remplace celui déjà saisi pour ce produit et ce jour.</p>
      <form onSubmit={save}>
        <div className="field"><label htmlFor="sp-p">Produit</label><select id="sp-p" value={product} onChange={(e) => setProduct(e.target.value)}><option value="">Toute la boutique (sans produit)</option>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
        <div className="two"><div className="field"><label htmlFor="sp-d">Jour</label><input id="sp-d" type="date" value={day} onChange={(e) => setDay(e.target.value)} /></div>
          <div className="field"><label htmlFor="sp-a">Montant (FCFA)</label><input id="sp-a" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} /></div></div>
        {err && <p className="err">{err}</p>}
        <button className="btn primary wide" style={{ marginTop: 12 }}>Enregistrer</button>
      </form>
    </Sheet>
  );
}
