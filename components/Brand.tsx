'use client';
import { useEffect } from 'react';

// Logo Zelvo : carré plein, Z découpé, point citron.
export function ZMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flex: 'none' }}>
      <rect width="64" height="64" fill="#C8F031" />
      <path d="M14 14h36v9L27 41h23v9H14v-9l23-18H14z" fill="#0C0C0E" />
    </svg>
  );
}
export function ZelvoLogo({ size = 28 }: { size?: number }) {
  return <span className="zlogo"><ZMark size={size} />zelvo<span className="dot" /></span>;
}

const KEY = 'zelvo-theme';
function effective() {
  const t = document.documentElement.getAttribute('data-theme');
  return t || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
function paint() { document.documentElement.setAttribute('data-mode', effective()); }

// Bouton lune / soleil : bascule jour ↔ nuit, mémorisé sur l'appareil.
export function ThemeButton() {
  useEffect(() => {
    paint();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', paint);
    return () => mq.removeEventListener?.('change', paint);
  }, []);
  function toggle() {
    const next = effective() === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next); paint();
    try { localStorage.setItem(KEY, next); } catch {}
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', next === 'dark' ? '#0C0C0E' : '#F4F2EC');
  }
  return (
    <button type="button" className="theme-btn" onClick={toggle} aria-label="Mode jour ou nuit" title="Mode jour / nuit">
      <svg className="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
      <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="8" width="8" height="8" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></svg>
    </button>
  );
}

// Couleur de la boutique sur la vitrine (vérifiée : #RRGGBB uniquement).
export function ShopAccent({ color }: { color?: string }) {
  const c = /^#[0-9A-Fa-f]{6}$/.test(color || '') ? color : '#169B45';
  return <style>{`:root:root:root{--brand:${c};--brand-t:${c};--brand-ink:#fff;--cta:${c};--cta-ink:#fff}`}</style>;
}
