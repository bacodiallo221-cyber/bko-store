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

// Bouton « Commander » qui reste en bas de l'écran sur téléphone, jusqu'au formulaire.
export function StickyCta({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const f = document.getElementById('commander'); if (!f) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top > 0), { threshold: 0 });
    io.observe(f); return () => io.disconnect();
  }, []);
  if (!show) return null;
  return <a href="#commander" className="sticky-cta">{label}</a>;
}

// Galerie avec compteur 1 / N.
export function Gallery({ images, name, badge }: { images: string[]; name: string; badge?: string | null }) {
  const [i, setI] = useState(0);
  if (!images?.length) return <div className="pic gal-main">{name.slice(0, 2).toUpperCase()}{badge && <span className="gal-badge">{badge}</span>}</div>;
  return (
    <div>
      <div className="pic gal-main"><img src={images[i]} alt={name} />{badge && <span className="gal-badge">{badge}</span>}
        {images.length > 1 && <span className="gal-count mono">{i + 1} / {images.length}</span>}</div>
      {images.length > 1 && <div className="thumbs">{images.map((u, k) => <button key={u} type="button" className={'thumb' + (k === i ? ' on' : '')} onClick={() => setI(k)} aria-label={'Photo ' + (k + 1)}><img src={u} alt="" loading="lazy" /></button>)}</div>}
    </div>
  );
}
