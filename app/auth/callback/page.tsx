'use client';
import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';

// Retour de Google ou du lien e-mail : on termine la connexion puis on renvoie vers l'espace vendeur.
export default function Callback() {
  const [msg, setMsg] = useState('Connexion en cours…');
  useEffect(() => {
    (async () => {
      const qs = new URLSearchParams(location.search);
      const next = qs.get('next') || '/admin';
      let { data } = await sb().auth.getSession();
      if (!data.session && qs.get('code')) {
        const r = await sb().auth.exchangeCodeForSession(qs.get('code'));
        if (r.error) { setMsg('Le lien a expiré ou a déjà servi. Recommencez la connexion.'); return; }
      }
      location.replace(next);
    })();
  }, []);
  return <main className="wrap"><section className="hero"><h1>{msg}</h1></section></main>;
}
