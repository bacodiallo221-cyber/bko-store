import { getStore } from '@/lib/supabase';
import { Header, Footer, NotReady, phones } from '@/components/Shell';
import { waLink, fmtPhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Contact' };

export default async function Contact() {
  const store = await getStore(); if (!store) return <NotReady />;
  const s = store.shop; const ps = phones(s);
  const wa = waLink(s.whatsapp, 'Bonjour ' + s.name + ', j’ai une question.');
  return (
    <main className="wrap"><Header shop={s} />
      <section className="hero"><span className="kicker">Contact</span><h1>Une question ? On vous répond.</h1>
        <p>Avant ou après votre commande, écrivez-nous sur WhatsApp ou appelez-nous. Une vraie personne vous accompagne jusqu’à la livraison.</p></section>
      <div className="cgrid">
        {wa && <a className="ccard wa" href={wa} target="_blank" rel="noopener"><span className="kicker">Le plus rapide</span><b>WhatsApp</b><span className="mono">+223 {fmtPhone(ps[0])}</span><span>Écrire maintenant →</span></a>}
        {ps.map((p, i) => <a key={p} className="ccard" href={'tel:+223' + p}><span className="kicker">{i === 0 ? 'Numéro principal' : 'Autre numéro'}</span><b className="mono">+223 {fmtPhone(p)}</b><span>Appeler</span></a>)}
        {s.address && <div className="ccard"><span className="kicker">Adresse</span><b>{s.address}</b><span>Retrait possible sur rendez-vous</span></div>}
        {s.email && <a className="ccard" href={'mailto:' + s.email}><span className="kicker">E-mail</span><b>{s.email}</b><span>Réponse sous 24 h</span></a>}
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <strong>Horaires</strong><p className="muted" style={{ margin: '6px 0 0' }}>Tous les jours de 8 h à 20 h. Les commandes passées la nuit sont confirmées dès le matin.</p>
      </div>
      <Footer shop={s} />
    </main>
  );
}
