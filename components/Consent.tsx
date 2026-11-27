'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Bandeau d'information sur les outils de mesure et de publicité (loi 2013-015, art. 18).
export default function Consent() {
  const [state, setState] = useState<string | null>('pending');
  useEffect(() => { try { setState(localStorage.getItem('consent')); } catch { setState(null); } }, []);
  if (state === 'pending' || state) return null;
  const choose = (v: string) => { try { localStorage.setItem('consent', v); } catch {} setState(v); };
  return (
    <div className="consent" role="region" aria-label="Mesure d’audience et publicité">
      <p>Nous utilisons des outils de mesure et de publicité (Meta, TikTok) pour améliorer la boutique et vous montrer nos offres. <Link href="/confidentialite">En savoir plus</Link></p>
      <button className="btn sm" onClick={() => choose('refused')}>Refuser</button>
      <button className="btn sm primary" onClick={() => choose('accepted')}>D’accord</button>
    </div>
  );
}
