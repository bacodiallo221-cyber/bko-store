'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { fmt, num } from '@/lib/format';

// Grand bandeau d'accueil : l'accroche de la boutique, puis les produits en photo.
// Change seul toutes les 5 s, se touche à gauche/droite ou se glisse au doigt.
export function HeroSlider({ items, shop }: { items: any[]; shop: any }) {
  const slides = [null, ...items]; const n = slides.length;
  const [i, setI] = useState(0); const [tick, setTick] = useState(0); const pause = useRef(false); const sx = useRef<number | null>(null);
  useEffect(() => { const t = setInterval(() => { if (!pause.current && !document.hidden) setI((x) => (x + 1) % n); }, 5000); return () => clearInterval(t); }, [n, tick]);
  const go = (k: number) => { setI((k + n) % n); setTick((t) => t + 1); };
  const promise = shop?.delivery_promise || 'moins de 24 h';
  return (
    <section className="z-hero" aria-roledescription="carrousel" onMouseEnter={() => (pause.current = true)} onMouseLeave={() => (pause.current = false)}
      onTouchStart={(e) => { sx.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { const d = (sx.current ?? 0) - e.changedTouches[0].clientX; if (Math.abs(d) > 40) go(i + (d > 0 ? 1 : -1)); sx.current = null; }}>
      {slides.map((p, k) => (
        <div key={p ? p.id : 'intro'} className={'z-sl' + (k === i ? ' on' : '')} aria-hidden={k !== i}>
          {p ? (p.images?.[0] ? <img src={p.images[0]} alt="" /> : <span className="z-ph">{p.name.slice(0, 2).toUpperCase()}</span>)
            : <div className="z-intro">{shop?.logo_url && <img className="z-bag" src={shop.logo_url} alt="" />}</div>}
        </div>))}
      <div className="z-bars" aria-hidden="true">{slides.map((_, k) => <i key={k + '-' + tick} className={k === i ? 'on' : k < i ? 'done' : ''} />)}</div>
      {n > 1 && <><button type="button" className="z-nx l" aria-label="Précédent" onClick={() => go(i - 1)} /><button type="button" className="z-nx r" aria-label="Suivant" onClick={() => go(i + 1)} /></>}
      <div className="z-tx" key={i}>{(() => {
        const p = slides[i];
        if (!p) return <><span className="kicker z-k">{shop?.name || 'Votre boutique'} · Bamako</span><h1>Commandez.<br />On livre.<br /><em>Vous payez à la porte.</em></h1>
          <p>Des produits utiles, livrés en {promise} à Bamako. Rien à payer avant d’avoir le colis en main.</p><Link href="/produits" className="btn z-w">Découvrir les produits →</Link></>;
        const off = p.compare_price ? Math.round((1 - p.price / p.compare_price) * 100) : 0;
        return <><span className="z-tag">{off >= 5 ? '−' + off + ' % aujourd’hui' : 'Nouveau'}</span><h1>{p.name}</h1>{p.tagline && <p>{p.tagline}</p>}
          <div className="z-pr"><b>{fmt(p.price)}</b>{p.compare_price && <s>{num(p.compare_price)}</s>}</div>
          <Link href={'/produit/' + p.id} className="btn z-w">Commander · payer à la livraison →</Link></>;
      })()}</div>
    </section>
  );
}

// Les 4 promesses sous la photo : les chiffres comptent à l'arrivée à l'écran.
export function Promises({ shop }: { shop: any }) {
  const r = useRef<HTMLDivElement>(null); const [k, setK] = useState(0);
  useEffect(() => {
    const el = r.current; if (!el) return;
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { setK(1); return; }
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) return; io.disconnect(); const t0 = performance.now();
      const step = (t: number) => { const x = Math.min(1, (t - t0) / 1100); setK(1 - Math.pow(1 - x, 3)); if (x < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }, { threshold: 0.3 });
    io.observe(el); return () => io.disconnect();
  }, []);
  const c = (v: number) => <span className="n">{Math.round(v * k)}</span>;
  const h = Number(String(shop?.delivery_promise || '24').match(/\d+/g)?.slice(-1)[0]) || 24;
  return (
    <div className={'z-prom' + (k > 0 ? ' in' : '')} ref={r}>
      <div><b><span className="n">0</span> F avant livraison</b><span>Vous payez en main propre, au livreur.</span></div>
      <div><b>Livré en moins de {c(h)} h</b><span>Chez vous, partout à Bamako.</span></div>
      <div><b>Ouvrez, vérifiez</b><span>Le colis ne vous plaît pas ? Vous ne payez pas.</span></div>
      <div><b>Tout le Mali en {c(48)} h</b><span>Envoi par car, retrait à la gare.</span></div>
    </div>
  );
}

// Grille de produits avec filtres par catégorie (animés).
export function FilterGrid({ products, categories, loyalty = 0, start = '' }: { products: any[]; categories: any[]; loyalty?: number; start?: string }) {
  const [c, setC] = useState(start);
  const list = c ? products.filter((p) => p.category_id === c) : products;
  return (
    <>
      {categories.length > 1 && <div className="z-chips" role="tablist">{[{ id: '', name: 'Tous' }, ...categories].map((x) => <button key={x.id} type="button" role="tab" aria-selected={c === x.id} className={c === x.id ? 'on' : ''} onClick={() => setC(x.id)}>{x.name}</button>)}</div>}
      <div className="grid2 z-flt" key={c}>{list.map((p, i) => <ProductCard key={p.id} p={p} i={i} loyalty={loyalty} />)}</div>
    </>
  );
}

// Petite bulle « vient d'être commandé », uniquement à partir des vraies commandes des 3 derniers jours.
export function RecentToast({ recent, products }: { recent: any[]; products: any[] }) {
  const items = (recent || []).map((r) => ({ ...r, p: products.find((p) => p.id === r.product_id) })).filter((r) => r.p && r.place);
  const [k, setK] = useState(-1);
  useEffect(() => {
    if (!items.length) return; let n = 0; let hide: any;
    const show = () => { setK(n % items.length); n++; hide = setTimeout(() => setK(-1), 4500); };
    const first = setTimeout(show, 7000); const t = setInterval(show, 16000);
    return () => { clearTimeout(first); clearInterval(t); clearTimeout(hide); };
  }, [items.length]);
  if (!items.length) return null;
  const r = items[Math.max(0, k)]; const m = Math.max(1, Math.round((Date.now() - +new Date(r.at)) / 60000));
  const ago = m < 60 ? 'il y a ' + m + ' min' : m < 1440 ? 'il y a ' + Math.round(m / 60) + ' h' : 'il y a ' + Math.round(m / 1440) + ' j';
  return (
    <Link href={'/produit/' + r.p.id} className={'z-toast' + (k >= 0 ? ' on' : '')} aria-live="polite" tabIndex={k >= 0 ? 0 : -1}>
      {r.p.images?.[0] && <img src={r.p.images[0]} alt="" />}<span><b>{r.p.name}</b>Commandé à {r.place} · {ago}</span>
    </Link>
  );
}

// Fait apparaître doucement les éléments au défilement.
export function Reveal({ children, className = '', as: Tag = 'div' as any, delay = 0 }: any) {
  const r = useRef<HTMLElement>(null); const [on, setOn] = useState(false);
  useEffect(() => {
    const el = r.current; if (!el) return;
    if (!('IntersectionObserver' in window)) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: '0px 0px -40px 0px' });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <Tag ref={r} className={'rv-in ' + (on ? 'on ' : '') + className} style={{ transitionDelay: delay + 'ms' }}>{children}</Tag>;
}

// Carte produit : 2e photo au survol, badge, prix en gras.
export function ProductCard({ p, i = 0, loyalty = 0 }: { p: any; i?: number; loyalty?: number }) {
  const out = p.stock <= 0; const off = p.compare_price ? Math.round((1 - p.price / p.compare_price) * 100) : 0;
  const isNew = p.created_at && Date.now() - +new Date(p.created_at) < 14 * 864e5;
  return (
    <Reveal as="div" delay={(i % 4) * 70} className="pc-wrap">
      <Link href={'/produit/' + p.id} className={'pc' + (out ? ' out' : '')} aria-disabled={out}>
        <span className="pc-img">
          {p.images?.[0] ? <><img src={p.images[0]} alt="" loading="lazy" />{p.images[1] && <img className="pc-2" src={p.images[1]} alt="" loading="lazy" />}</> : <span className="pc-ph">{p.name.slice(0, 2).toUpperCase()}</span>}
          <span className="pc-tags">{out ? <span className="tag out">Épuisé</span> : <>{off >= 5 && <span className="tag off">−{off} %</span>}{isNew && <span className="tag new">Nouveau</span>}{p.stock <= 5 && <span className="tag low">Plus que {p.stock}</span>}</>}</span>
          {!out && <span className="pc-quick">Commander →</span>}
        </span>
        <span className="pc-n">{p.name}</span>
        <span className="pc-p">{fmt(p.price)}{p.compare_price && <s>{num(p.compare_price)}</s>}</span>
        {loyalty > 0 && isNew && !out && <span className="pc-loy">Déjà client : −{loyalty} %</span>}
        <span className="z-add">{out ? 'Épuisé' : 'Commander'}</span>
      </Link>
    </Reveal>
  );
}

// Rangée horizontale glissable (nouveautés)
export function Rail({ children }: { children: React.ReactNode }) {
  const r = useRef<HTMLDivElement>(null);
  const by = (d: number) => r.current?.scrollBy({ left: d * (r.current.clientWidth * 0.8), behavior: 'smooth' });
  return (
    <div className="rail-w">
      <button type="button" className="rail-b l" aria-label="Précédent" onClick={() => by(-1)}>←</button>
      <div className="rail" ref={r}>{children}</div>
      <button type="button" className="rail-b r" aria-label="Suivant" onClick={() => by(1)}>→</button>
    </div>
  );
}
