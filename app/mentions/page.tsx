import { getStore } from '@/lib/supabase';
import { Header, Footer, NotReady } from '@/components/Shell';

export const dynamic = 'force-dynamic';
const V = ({ v }: { v?: string }) => (v ? <>{v}</> : <>—</>);

export default async function Mentions() {
  const store = await getStore(); if (!store) return <NotReady />;
  const s = store.shop;
  return (
    <main className="wrap"><Header shop={s} categories={store.categories} />
      <article className="doc"><h1 style={{ marginTop: 20 }}>Mentions légales</h1>
        <ul>
          <li>Boutique : <V v={s.name} /></li><li>Responsable : <V v={s.legal_name} /></li>
          {s.rccm && <li>RCCM : {s.rccm}</li>}{s.nif && <li>NIF : {s.nif}</li>}
          <li>Adresse : <V v={s.address} /></li><li>Téléphone / WhatsApp : <V v={[s.whatsapp, s.phone2, s.phone3].filter(Boolean).map((x: string) => '+223 ' + x.replace(/(\d{2})(?=\d)/g, '$1 ')).join(' · ')} /></li><li>E-mail : <V v={s.email} /></li>
          {s.apdp_number && <li>Données personnelles : traitement déclaré à l’APDP sous le n° {s.apdp_number}</li>}
          <li>Hébergement : Supabase et Vercel</li>
        </ul>
        <p className="muted">Informations prévues par la loi n° 2016-012 du 6 mai 2016 (art. 16).</p>
      </article>
      <Footer shop={s} /></main>
  );
}
