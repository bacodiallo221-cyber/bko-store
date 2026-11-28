'use client';
import { useEffect, useState } from 'react';

// Compte à rebours jusqu'à la vraie fin de la promotion (fixée par le vendeur).
export function Countdown({ until, after }: { until: string; after: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => { const t = () => setLeft(Math.max(0, +new Date(until) - Date.now())); t(); const id = setInterval(t, 1000); return () => clearInterval(id); }, [until]);
  if (left === null) return null;
  if (left <= 0) return <div className="cd done">Offre terminée. Actualisez la page pour voir le prix actuel.</div>;
  const s = Math.floor(left / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const z = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="cd" role="timer" aria-live="off">
      <span className="cd-l">L’offre se termine dans</span>
      <div className="cd-n">{d > 0 && <span><b>{z(d)}</b>j</span>}<span><b>{z(h)}</b>h</span><span><b>{z(m)}</b>min</span><span><b>{z(sec)}</b>s</span></div>
      <span className="cd-a">Ensuite : {after}</span>
    </div>
  );
}

// Bouton « Commander » en bas de l'écran dès que le formulaire n'est plus visible (avant ou après).
export function StickyCta({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const f = document.getElementById('commander'); if (!f) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0 });
    io.observe(f); return () => io.disconnect();
  }, []);
  if (!show) return null;
  return <a href="#commander" className="sticky-cta">{label}</a>;
}

// Galerie glissable au doigt, avec points et compteur.
export function Gallery({ images, name, badge }: { images: string[]; name: string; badge?: string | null }) {
  const [i, setI] = useState(0);
  if (!images?.length) return <div className="pic gal-main">{name.slice(0, 2).toUpperCase()}{badge && <span className="gal-badge">{badge}</span>}</div>;
  const onScroll = (e: any) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / el.clientWidth)); };
  const to = (k: number) => { const el = document.getElementById('gal-track'); el?.scrollTo({ left: k * el.clientWidth, behavior: 'smooth' }); };
  return (
    <div className="gal">
      <div className="gal-box">
        <div className="gal-track" id="gal-track" onScroll={onScroll}>
          {images.map((u, k) => <img key={u} src={u} alt={k === 0 ? name : ''} loading={k ? 'lazy' : 'eager'} />)}
        </div>
        {badge && <span className="gal-badge">{badge}</span>}
        {images.length > 1 && <><span className="gal-count mono">{i + 1} / {images.length}</span>
          <div className="gal-dots">{images.map((_, k) => <button key={k} type="button" aria-label={'Photo ' + (k + 1)} className={k === i ? 'on' : ''} onClick={() => to(k)} />)}</div></>}
      </div>
      {images.length > 1 && <>
        <div className="thumbs">{images.map((u, k) => <button key={u} type="button" className={'thumb' + (k === i ? ' on' : '')} onClick={() => to(k)} aria-label={'Photo ' + (k + 1)}><img src={u} alt="" loading="lazy" /></button>)}</div></>}
    </div>
  );
}

// Onglets sous le formulaire (Description, Avis, Livraison) : restent collés en haut pendant la lecture.
export function Tabs({ tabs }: { tabs: { id: string; label: string; body: React.ReactNode }[] }) {
  const [t, setT] = useState(tabs[0]?.id);
  if (!tabs.length) return null;
  return (
    <section className="z-tabs-w" id="details">
      <div className="z-tabs" role="tablist">{tabs.map((x) => <button key={x.id} type="button" role="tab" aria-selected={t === x.id} className={t === x.id ? 'on' : ''}
        onClick={() => { setT(x.id); const el = document.getElementById('details'); if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{x.label}</button>)}</div>
      {tabs.map((x) => <div key={x.id} role="tabpanel" hidden={t !== x.id} className="z-tp">{x.body}</div>)}
    </section>
  );
}
