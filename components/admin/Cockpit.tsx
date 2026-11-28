'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sb } from '@/lib/supabase';
import { num, errText } from '@/lib/format';
import { fmtPhone } from '@/lib/phone';

// Accueil « Cockpit » de l'espace vendeur : un grand chiffre, une grande courbe, des tuiles.
const iso = (d: Date) => { const z = (n: number) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); };
const addDays = (s: string, n: number) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const span = (a: string, b: string) => Math.round((+new Date(b + 'T12:00:00') - +new Date(a + 'T12:00:00')) / 864e5) + 1;
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const dayLabel = (s: string) => { const d = new Date(s + 'T12:00:00'); return d.getDate() + ' ' + MOIS[d.getMonth()]; };
const PER: [string, string, string][] = [['today', 'Aujourd’hui', 'aujourd’hui'], ['7d', '7 jours', 'ces 7 derniers jours'], ['30d', '30 jours', 'ces 30 derniers jours'], ['month', 'Ce mois', 'ce mois-ci']];
function range(k: string): [string, string] {
  const t = iso(new Date()); const n = new Date();
  if (k === 'today') return [t, t]; if (k === '7d') return [addDays(t, -6), t]; if (k === '30d') return [addDays(t, -29), t];
  return [iso(new Date(n.getFullYear(), n.getMonth(), 1)), t];
}
const profit = (d: any) => (d ? d.revenue - d.goods - d.delivery - d.ads : 0);
const pc = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const SRC: Record<string, [string, string]> = { Facebook: ['#257de0', '#338ced'], WhatsApp: ['#00b894', '#00a888'], 'Accès direct': ['#f2a600', '#d28e05'], TikTok: ['#ee7fac', '#e24d8b'] };
const ST: Record<string, [string, string]> = { a_appeler: ['🛒', 'Nouvelle commande'], pas_reponse: ['📵', 'Pas de réponse'], a_rappeler: ['⏰', 'À rappeler'], confirmee: ['✅', 'Commande confirmée'], en_route: ['🛵', 'Partie en livraison'], livree: ['💰', 'Livrée et encaissée'], refusee: ['✖️', 'Refusée à la porte'], annulee: ['↩️', 'Annulée'] };
const ago = (t: string) => { const m = Math.max(0, Math.round((Date.now() - +new Date(t)) / 60000)); return m < 1 ? 'à l’instant' : m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' j'; };

// Chiffre qui monte jusqu'à sa valeur
function Count({ v }: { v: number }) {
  const [x, setX] = useState(v); const from = useRef(v);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setX(v); return; }
    const a = from.current, t0 = performance.now(); let raf = 0;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / 900); setX(Math.round(a + (v - a) * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); else from.current = v; };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [v]);
  return <>{num(x)}</>;
}

function Delta({ cur, old, invert = false, unit = '%' }: { cur: number; old?: number; invert?: boolean; unit?: string }) {
  if (old === undefined || old === null) return null;
  if (!old) return cur ? <span className="cp-chip up">nouveau</span> : <span className="cp-chip">=</span>;
  const v = unit === 'pts' ? cur - old : Math.round(((cur - old) / Math.abs(old)) * 100);
  if (!v) return <span className="cp-chip">=</span>;
  const good = invert ? v < 0 : v > 0;
  return <span className={'cp-chip ' + (good ? 'up' : 'dn')}>{v > 0 ? '▲ +' : '▼ '}{v} {unit}</span>;
}

// Grande courbe : cette période (aire lumineuse) et la précédente (pointillés), réticule au survol.
function Curve({ days, prev }: { days: any[]; prev: any[] }) {
  const box = useRef<HTMLDivElement>(null); const [i, setI] = useState<number | null>(null);
  const W = 1000, H = 240, pl = 8, pr = 8, pt = 16, pb = 26;
  const c = days.map((d) => d.revenue), p = days.map((_, k) => prev[k]?.revenue ?? 0); const n = c.length;
  const mx = Math.max(1, ...c, ...p); const top = mx * 1.12;
  const x = (k: number) => pl + (W - pl - pr) * (n <= 1 ? 0.5 : k / (n - 1)); const y = (v: number) => pt + (H - pt - pb) * (1 - v / top);
  const pts = (a: number[]) => a.map((v, k) => x(k) + ',' + y(v)).join(' ');
  const every = Math.ceil(n / 7);
  const pick = (e: React.PointerEvent) => { const r = (e.currentTarget as SVGElement).getBoundingClientRect(); const xx = ((e.clientX - r.left) / r.width) * W; setI(Math.max(0, Math.min(n - 1, Math.round(((xx - pl) / (W - pl - pr)) * (n - 1))))); };
  const sc = () => (box.current ? box.current.getBoundingClientRect().width / W : 1);
  return (
    <div className="cp-curve" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Argent encaissé par jour, comparé à la période précédente">
        <defs><linearGradient id="cpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--cp-acc)" stopOpacity=".38" /><stop offset="1" stopColor="var(--cp-acc)" stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={pl} x2={W - pr} y1={pt + (H - pt - pb) * f} y2={pt + (H - pt - pb) * f} stroke="var(--line)" strokeDasharray="2 6" />)}
        <polygon points={`${x(0)},${H - pb} ${pts(c)} ${x(n - 1)},${H - pb}`} fill="url(#cpg)" className="cp-area" />
        <polyline points={pts(p)} fill="none" stroke="var(--muted)" strokeOpacity=".7" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
        <polyline points={pts(c)} fill="none" stroke="var(--cp-acc)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="cp-line" />
        {days.map((d, k) => k % every === 0 && <text key={k} x={x(k)} y={H - 6} textAnchor="middle" className="cp-ax">{dayLabel(d.day)}</text>)}
        {i !== null && <><line x1={x(i)} x2={x(i)} y1={pt} y2={H - pb} stroke="var(--fg)" strokeOpacity=".3" /><circle cx={x(i)} cy={y(c[i])} r="6" fill="var(--cp-acc)" stroke="var(--surface)" strokeWidth="2" /></>}
        <rect x="0" y="0" width={W} height={H} fill="transparent" tabIndex={0} aria-label="Détail par jour"
          onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setI(null)} onBlur={() => setI(null)} onFocus={() => setI(n - 1)}
          onKeyDown={(e) => { if (e.key === 'ArrowLeft') setI(Math.max(0, (i ?? n) - 1)); if (e.key === 'ArrowRight') setI(Math.min(n - 1, (i ?? -1) + 1)); }} />
      </svg>
      {i !== null && <div className="cp-tt" style={{ left: Math.min((box.current?.clientWidth || 300) - 90, Math.max(90, x(i) * sc())), top: y(c[i]) * sc() }}>
        <span>{dayLabel(days[i].day)}</span><b>{num(c[i])} F</b><span>{days[i].delivered} livrée{days[i].delivered > 1 ? 's' : ''} · {days[i].orders} reçue{days[i].orders > 1 ? 's' : ''}</span><span>Avant : {num(p[i])} F</span></div>}
    </div>
  );
}

export default function Cockpit({ shop, toast, onGo, pulse }: { shop: any; toast: (m: string) => void; onGo: (t: string) => void; pulse: number }) {
  const [per, setPer] = useState(() => { try { return localStorage.getItem('zelvo-per') || '7d'; } catch { return '7d'; } });
  const [d, setD] = useState<any>(null); const [pv, setPv] = useState<any>(null); const [ch, setCh] = useState<any>(null); const [mo, setMo] = useState<any>(null); const [ck, setCk] = useState<any>(null);
  const [goal, setGoal] = useState(0); const [editGoal, setEditGoal] = useState(false); const [dark, setDark] = useState(false);
  useEffect(() => { try { setGoal(Number(localStorage.getItem('zelvo-goal-' + shop.id)) || 0); } catch {} }, [shop.id]);
  useEffect(() => { const f = () => setDark(document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches)); f(); const o = new MutationObserver(f); o.observe(document.documentElement, { attributes: true }); return () => o.disconnect(); }, []);

  const load = useCallback(async () => {
    const [a, b] = range(per); const len = span(a, b); const rpc = (f: string, t: string) => sb().rpc('dashboard', { p_shop: shop.id, p_from: f, p_to: t });
    const ca = len < 7 ? addDays(b, -6) : a; const cl = span(ca, b);
    const m0 = range('month');
    const [r1, r2, r3, r4, r5, r6] = await Promise.all([rpc(a, b), rpc(addDays(a, -len), addDays(a, -1)),
      len < 7 ? rpc(ca, b) : Promise.resolve({ data: null }), len < 7 ? rpc(addDays(ca, -cl), addDays(ca, -1)) : Promise.resolve({ data: null }),
      per === 'month' ? Promise.resolve({ data: null }) : rpc(m0[0], m0[1]), sb().rpc('cockpit', { p_shop: shop.id })]);
    if (r1.error) return toast(errText(r1.error));
    setD(r1.data); setPv(r2.data); setCh(len < 7 ? { cur: r3.data, prev: r4.data } : { cur: r1.data, prev: r2.data }); setMo(per === 'month' ? r1.data : r5.data);
    if (!r6.error) setCk(r6.data);
  }, [per, shop.id, toast]);
  useEffect(() => { load(); }, [load, pulse]);
  useEffect(() => { const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const k = useMemo(() => d && ({ net: profit(d), conf: pc(d.confirmed, d.orders), liv: pc(d.delivered, d.confirmed), basket: d.delivered ? Math.round(d.revenue / d.delivered) : 0, cpl: d.delivered ? Math.round(d.ads / d.delivered) : 0 }), [d]);
  const kp = useMemo(() => pv && ({ net: profit(pv), conf: pc(pv.confirmed, pv.orders), liv: pc(pv.delivered, pv.confirmed), basket: pv.delivered ? Math.round(pv.revenue / pv.delivered) : 0, cpl: pv.delivered ? Math.round(pv.ads / pv.delivered) : 0 }), [pv]);
  const label = PER.find((p) => p[0] === per)!;
  const hour = new Date().getHours();
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const wait = ck?.oldest_call ? ago(ck.oldest_call) : null;
  const prods = (d?.products || []).filter((p: any) => p.orders > 0).sort((a: any, b: any) => b.profit - a.profit).slice(0, 4);
  const srcTotal = (d?.sources || []).reduce((a: number, s: any) => a + s.orders, 0);
  const areaTotal = d ? d.areas.bamako + d.areas.regions : 0;
  const goalPct = goal > 0 && mo ? Math.min(100, Math.round((mo.revenue / goal) * 100)) : 0;
  const choose = (p: string) => { setPer(p); try { localStorage.setItem('zelvo-per', p); } catch {} };
  function saveGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const v = Number(String(new FormData(e.currentTarget).get('g') || '').replace(/\D/g, '')) || 0;
    setGoal(v); setEditGoal(false); try { localStorage.setItem('zelvo-goal-' + shop.id, String(v)); } catch {} toast(v ? 'Objectif du mois : ' + num(v) + ' F' : 'Objectif retiré');
  }

  if (!d || !k) return <div className="cp"><div className="cp-skel" /><div className="cp-skel s2" /></div>;
  return (
    <div className="cp">
      <div className="cp-hd">
        <div className="cp-who">{shop.logo_url ? <img src={shop.logo_url} alt="" /> : <span>{(shop.name || 'B').slice(0, 2).toUpperCase()}</span>}
          <div><h1>{hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'} 👋</h1><p>{today.charAt(0).toUpperCase() + today.slice(1)} · {shop.name}</p></div></div>
        <div className="cp-pills" role="tablist">{PER.map(([key, l]) => <button key={key} role="tab" aria-selected={per === key} className={per === key ? 'on' : ''} onClick={() => choose(key)}>{l}</button>)}</div>
      </div>

      <section className="cp-hero">
        <div className="cp-hero-top">
          <div><div className="cp-lab">Argent encaissé {label[2]}</div>
            <div className="cp-big"><b><Count v={d.revenue} /></b><small>FCFA</small><Delta cur={d.revenue} old={pv?.revenue} /></div>
            <div className="cp-meta"><span><b>{d.delivered}</b> colis livrés</span><span><b className={k.net < 0 ? 'neg' : ''}>{num(k.net)} F</b> de bénéfice</span><span><b>{num(d.ads)} F</b> de pub</span>{d.pipeline > 0 && <span><b>{num(d.pipeline)} F</b> en route</span>}</div></div>
          <div className="cp-goal">
            {editGoal ? <form onSubmit={saveGoal}><label htmlFor="cpg-in">Objectif du mois (F)</label><input id="cpg-in" name="g" inputMode="numeric" defaultValue={goal || ''} placeholder="1 000 000" autoFocus /><button className="cp-btn">OK</button></form>
              : goal > 0 ? <button type="button" className="cp-ring" onClick={() => setEditGoal(true)} aria-label="Modifier l’objectif du mois">
                <svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" fill="none" stroke="var(--line)" strokeWidth="9" /><circle cx="42" cy="42" r="34" fill="none" stroke="var(--cp-acc)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(2 * Math.PI * 34 * goalPct) / 100} 999`} transform="rotate(-90 42 42)" className="cp-ringv" /></svg>
                <span><b>{goalPct} %</b>de l’objectif<small>{num(mo?.revenue || 0)} / {num(goal)} F</small></span></button>
              : <button type="button" className="cp-setgoal" onClick={() => setEditGoal(true)}>🎯 Fixer un objectif du mois</button>}
          </div>
        </div>
        <div className="cp-lg"><span><i className="a" />{per === 'today' ? '7 derniers jours' : 'Cette période'}</span><span><i className="b" />Période précédente</span></div>
        {ch?.cur?.days?.length ? <Curve days={ch.cur.days} prev={ch.prev?.days || []} /> : null}
      </section>

      <div className="cp-bento">
        <div className={'cp-tile cp-urg' + (ck?.to_call ? '' : ' calm')}>
          {ck?.to_call ? <span className="cp-ping" aria-hidden="true" /> : null}
          <h2>{ck?.to_call ? 'À appeler maintenant' : 'Tout le monde a été appelé'}</h2>
          <div className="n">{ck?.to_call ?? '–'}</div>
          <p>{ck?.to_call ? <>La plus ancienne attend depuis <b>{wait}</b>. Pas le temps ? Confiez les appels à un livreur en un clic.</> : 'Bravo ! Les nouvelles commandes apparaîtront ici avec un « Tching ».'}</p>
          <div className="cp-urg-a">{ck?.first_call && <a className="cp-go" href={'tel:+223' + ck.first_call.phone}>📞 Appeler {ck.first_call.name.split(' ')[0]} · {fmtPhone(ck.first_call.phone)}</a>}
            <button type="button" className="cp-go2" onClick={() => onGo('orders')}>📲 Confier au livreur →</button></div>
        </div>
        <div className="cp-mini">
          {[['Commandes reçues', d.orders, '', <Delta key="a" cur={d.orders} old={pv?.orders} />, null, 'orders'],
            ['Confirmées', k.conf, '%', <Delta key="b" cur={k.conf} old={kp?.conf} unit="pts" />, k.conf, 'orders'],
            ['Livrées', k.liv, '%', <Delta key="c" cur={k.liv} old={kp?.liv} unit="pts" />, k.liv, 'orders'],
            ['Panier moyen', k.basket, 'F', <Delta key="d" cur={k.basket} old={kp?.basket} />, null, 'stats'],
            ['Pub par livraison', k.cpl, 'F', <Delta key="e" cur={k.cpl} old={kp?.cpl} invert />, null, 'stats'],
            ['Caisse livreurs', ck?.cash || 0, 'F', <span key="f" className="cp-chip">à récupérer</span>, null, 'team']].map(([l, v, u, dl, bar, go]: any) => (
            <button type="button" key={l} className="cp-m" onClick={() => onGo(go)}><span className="l">{l}</span><span className="v"><Count v={v} /><small>{u}</small></span>
              <span className="r">{bar !== null && <span className="cp-bar"><i style={{ width: bar + '%' }} /></span>}{dl}</span></button>))}
        </div>

        {(ck && (ck.no_driver || ck.to_depot || ck.low_stock?.length || ck.en_route)) ? <div className="cp-todo">
          {ck.no_driver > 0 && <button type="button" onClick={() => onGo('orders')}><b>{ck.no_driver}</b>confirmée{ck.no_driver > 1 ? 's' : ''} sans livreur</button>}
          {ck.to_depot > 0 && <button type="button" onClick={() => onGo('orders')}><b>{ck.to_depot}</b>colis à déposer au car</button>}
          {ck.en_route > 0 && <button type="button" onClick={() => onGo('orders')}><b>{ck.en_route}</b>en route</button>}
          {ck.low_stock?.length > 0 && <button type="button" onClick={() => onGo('products')}><b>{ck.low_stock.length}</b>stock bas : {ck.low_stock.slice(0, 2).map((p: any) => p.name + ' (' + p.stock + ')').join(', ')}</button>}
        </div> : null}

        <div className="cp-tile cp-fun"><h2>Parcours des commandes<small>{label[1]}</small></h2>
          <div className="cp-steps">{[['1', 'Reçues', d.orders, 100], ['2', 'Confirmées', d.confirmed, pc(d.confirmed, d.orders)], ['3', 'Livrées', d.delivered, pc(d.delivered, d.orders)]].map(([n, l, v, p]: any) => (
            <div key={n} className="cp-st"><span className="dot">{n}</span><div><div className="t">{l}</div><div className="tr"><i style={{ width: p + '%' }} /></div></div><b>{v}<small>{p} %</small></b></div>))}</div>
          <div className="cp-lose"><span>✖ {d.refused} refusée{d.refused > 1 ? 's' : ''}</span><span>↩ {d.cancelled} annulée{d.cancelled > 1 ? 's' : ''}</span><span>🛵 {d.in_progress} en cours</span><span>📞 {d.pending} à appeler</span></div></div>

        <div className="cp-tile cp-top"><h2>Ce qui rapporte le plus<button type="button" className="cp-link" onClick={() => onGo('stats')}>Détails →</button></h2>
          {prods.length ? prods.map((p: any, i: number) => (
            <div key={p.id} className="cp-pr"><span className="rk">0{i + 1}</span><div><b>{p.name}</b><small>{p.orders} commande{p.orders > 1 ? 's' : ''} · {p.delivered} livrée{p.delivered > 1 ? 's' : ''} · {num(p.revenue)} F</small></div>
              <div className="p"><b className={p.profit < 0 ? 'neg' : ''}>{num(p.profit)} F</b><small>{p.ads ? num(p.ads) + ' F de pub' : 'bénéfice'}</small></div></div>))
            : <p className="cp-empty">Aucune vente sur cette période.</p>}</div>

        <div className="cp-tile cp-src"><h2>D’où viennent les clients</h2>
          {srcTotal ? <><div className="cp-stack">{d.sources.map((s: any) => <i key={s.source} title={s.source + ' : ' + pc(s.orders, srcTotal) + ' %'} style={{ width: pc(s.orders, srcTotal) + '%', background: (SRC[s.source] || ['#888', '#888'])[dark ? 1 : 0] }} />)}</div>
            <div className="cp-leg">{d.sources.map((s: any) => <div key={s.source}><i style={{ background: (SRC[s.source] || ['#888', '#888'])[dark ? 1 : 0] }} /><span>{s.source}</span><b>{pc(s.orders, srcTotal)} %</b><small>{s.orders}</small></div>)}</div></>
            : <p className="cp-empty">Pas encore de commande sur cette période.</p>}</div>

        <div className="cp-tile cp-zone"><h2>Où vous livrez</h2>
          {areaTotal ? <><div className="cp-split"><div style={{ flex: Math.max(d.areas.bamako, 0.001) }}><b>{pc(d.areas.bamako, areaTotal)} %</b>Bamako</div><div style={{ flex: Math.max(d.areas.regions, 0.001) }}><b>{pc(d.areas.regions, areaTotal)} %</b>Régions</div></div>
            <div className="cp-places">{(d.areas.top || []).map((t: any) => <div key={t.place}><span>{t.place}</span><b>{t.orders}</b></div>)}</div></>
            : <p className="cp-empty">Les quartiers apparaîtront avec les commandes.</p>}</div>

        <div className="cp-tile cp-cash"><h2>Argent chez les livreurs<button type="button" className="cp-link" onClick={() => onGo('team')}>Gérer →</button></h2>
          <div className="big"><Count v={ck?.cash || 0} /> F</div>
          {(ck?.drivers || []).length ? ck.drivers.map((m: any) => <div key={m.name} className="cp-drv"><span className="a">{m.name.slice(0, 2).toUpperCase()}</span><span><b>{m.name}</b> · {m.today} livrée{m.today > 1 ? 's' : ''} aujourd’hui{m.en_route ? ' · ' + m.en_route + ' en route' : ''}</span><b>{num(m.cash)} F</b></div>)
            : <p className="cp-empty">Ajoutez vos livreurs dans « Équipe et livreurs ».</p>}</div>

        <div className="cp-tile cp-live"><h2>En direct<small className="cp-on">● LIVE</small></h2>
          {(ck?.feed || []).length ? ck.feed.map((e: any, i: number) => { const s = ST[e.status] || ['•', e.status]; return (
            <div key={e.at + e.number + i} className={'cp-ev' + (Date.now() - +new Date(e.at) < 90000 ? ' new' : '')}><span className="e">{s[0]}</span>
              <div>{s[1]} · n° {e.number}<small>{e.name?.split(' ')[0]} · {e.product}{e.place ? ' · ' + e.place : ''} · {num(e.total)} F</small></div><time>{ago(e.at)}</time></div>); })
            : <p className="cp-empty">Les commandes apparaîtront ici en temps réel.</p>}</div>
      </div>
    </div>
  );
}
