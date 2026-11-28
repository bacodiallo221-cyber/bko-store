import Link from 'next/link';
import { getStore } from '@/lib/supabase';
import { fmt } from '@/lib/format';
import { Header, Footer, NotReady } from '@/components/Shell';
import { waLink } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Aide, livraison et retours' };

export default async function Aide() {
  const store = await getStore(); if (!store) return <NotReady />;
  const s = store.shop; const zones = store.zones || [];
  const bamako = zones.filter((z: any) => z.city === 'Bamako'), others = zones.filter((z: any) => z.city !== 'Bamako');
  const days = s.refund_days || 2;
  const faq: [string, string][] = [
    ['Comment commander ?', 'Choisissez votre produit, remplissez quatre champs (nom, téléphone, quartier, repère) et validez. Aucun paiement en ligne, aucun compte à créer.'],
    ['Quand est-ce que je paie ?', 'Seulement à la livraison, en espèces, après avoir vérifié votre colis. Vous ne payez rien à l’avance.'],
    ['Est-ce que vous m’appelez ?', 'Oui : nous vous appelons pour confirmer la commande et le lieu de livraison, au créneau que vous avez choisi. Gardez votre téléphone allumé.'],
    ['Combien de temps pour être livré ?', 'À Bamako : en moins de 24 h' + '. Dans les régions, le colis voyage par car et vous le récupérez à la gare de votre ville ; nous vous appelons à son arrivée.'],
    ['Comment suivre ma commande ?', 'Avec votre numéro de commande et votre téléphone, sur la page « Suivre ma commande ».'],
    ['Je peux modifier ou annuler ?', 'Oui, tant que le colis n’est pas parti : écrivez-nous sur WhatsApp avec votre numéro de commande.'],
  ];
  const wa = waLink(s.whatsapp, 'Bonjour, j’ai une question sur ma commande.');
  return (
    <main className="wrap"><Header shop={s} categories={store.categories} active="aide" />
      <section className="hero"><span className="kicker">Aide</span><h1>Tout savoir avant de commander</h1>
        <p>Paiement, livraison, retours : les réponses aux questions qu’on nous pose le plus.</p></section>
      <ol className="how">
        <li><b>1</b><strong>Vous commandez</strong><span>En 1 minute, sans payer.</span></li>
        <li><b>2</b><strong>On vous appelle</strong><span>Pour confirmer l’adresse.</span></li>
        <li><b>3</b><strong>Vous payez à la livraison</strong><span>Après avoir vérifié le colis.</span></li>
      </ol>
      <section className="b-faq" style={{ maxWidth: 760 }}><h2 className="b-title">Questions fréquentes</h2>
        {faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>

      <section id="livraison" style={{ marginTop: 32 }}><h2 className="b-title">Tarifs et délais de livraison</h2>
        {!zones.length ? <p className="muted">Les zones de livraison seront bientôt affichées.</p> :
          <div className="tablewrap"><table className="inv-list">
            <thead><tr><th>Zone</th><th>Mode</th><th>Délai</th><th style={{ textAlign: 'right' }}>Frais</th></tr></thead>
            <tbody>{[...bamako, ...others].map((z: any) => <tr key={z.id}>
              <td><strong>{z.city === 'Bamako' ? 'Bamako · ' + z.label : z.label}</strong></td>
              <td>{z.mode === 'bus' ? 'Par car' + (z.carrier ? ' (' + z.carrier + ')' : '') + ', retrait à la gare' : 'Livreur à domicile'}</td>
              <td>{z.delay_days <= 1 ? 'Moins de 24 h' : z.delay_days + ' jours'}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{fmt(z.fee)}</td></tr>)}</tbody>
          </table></div>}
        <p className="muted" style={{ marginTop: 8 }}>Certains packs ont la livraison offerte : c’est indiqué sur la page du produit.</p>
      </section>

      <section id="retours" style={{ marginTop: 32, maxWidth: 760 }}><h2 className="b-title">Retours et remboursement</h2>
        <div className="b-text">
          <p><strong>Satisfait ou remboursé sous {days} jours.</strong> Si le produit ne vous convient pas, contactez-nous dans les {days} jours qui suivent la réception : nous reprenons le produit et vous remboursons.</p>
          <p>Le produit doit être rendu complet, dans son emballage, sans avoir été abîmé. Un produit défectueux ou différent de la commande est repris ou échangé sans frais.</p>
          <p>Conformément à la loi n° 2016-012 sur les transactions électroniques, vous disposez dans tous les cas d’un droit de rétractation légal de 14 jours. <Link href="/conditions">Conditions de vente complètes</Link>.</p>
        </div>
      </section>
      <div className="panel" style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <span><strong>Vous ne trouvez pas votre réponse ?</strong><span className="muted">Nous répondons vite, tous les jours.</span></span>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{wa && <a className="btn wa" href={wa} target="_blank" rel="noopener">WhatsApp</a>}<Link className="btn" href="/contact">Tous nos contacts</Link></span>
      </div>
      <Footer shop={s} />
    </main>
  );
}
