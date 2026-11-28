import { getStore } from '@/lib/supabase';
import { Header, Footer, NotReady } from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function Privacy() {
  const store = await getStore(); if (!store) return <NotReady />;
  const s = store.shop;
  return (
    <main className="wrap"><Header shop={s} categories={store.categories} />
      <article className="doc"><h1 style={{ marginTop: 20 }}>Politique de confidentialité</h1>
        <p className="muted">Selon la loi n° 2013-015 du 21 mai 2013 sur les données personnelles et la loi n° 2016-012 sur les transactions électroniques.</p>
        <h2>Qui est responsable</h2><p>{s.name}{s.legal_name ? ' (' + s.legal_name + ')' : ''}{s.address ? ', ' + s.address : ''}. Contact : {s.whatsapp || '—'}{s.email ? ' · ' + s.email : ''}.{s.apdp_number ? ' Traitement déclaré à l’APDP sous le n° ' + s.apdp_number + '.' : ''}</p>
        <h2>Ce que nous collectons</h2><ul><li>Nom, téléphone, commune et point de repère</li><li>Votre position GPS, seulement si vous la partagez (jamais pour les envois par car)</li><li>Vos commandes et leur suivi</li><li>Votre navigation sur la boutique, pour la mesure d’audience et la publicité</li></ul>
        <h2>Pourquoi</h2><ul>
          <li><strong>Livrer votre commande :</strong> appel de confirmation, livraison, suivi sur WhatsApp.</li>
          <li><strong>Vous envoyer nos offres</strong> sur WhatsApp, pour des produits proches de vos achats. Vous pouvez refuser en commandant, puis à tout moment en répondant STOP (loi n° 2016-012, art. 40).</li>
          <li><strong>Mesurer et améliorer nos publicités</strong> sur Facebook, Instagram et TikTok, avec les outils de mesure de ces réseaux (loi n° 2013-015, art. 18). Vous pouvez les refuser avec le bandeau de la boutique.</li></ul>
        <h2>Qui y a accès</h2><p>Notre équipe ; le livreur chargé de votre colis (seulement votre nom, votre téléphone, votre adresse et le montant) ; nos prestataires techniques : hébergement, WhatsApp, Meta, TikTok, Google. Certains sont situés hors du Mali (loi n° 2013-015, art. 11). Vos données ne sont jamais vendues.</p>
        <h2>Combien de temps</h2><ul><li>Commandes et preuves d’achat : 10 ans (loi n° 2016-012, art. 116)</li><li>Coordonnées pour les offres : 3 ans après votre dernier achat, ou jusqu’à votre refus</li><li>Position GPS : 30 jours après la livraison</li></ul>
        <h2>Vos droits</h2><p>Accès, correction, suppression et opposition (loi n° 2013-015, art. 12 à 19) : écrivez-nous au {s.whatsapp || 'numéro de la boutique'}. Réponse sous 30 jours. Vous pouvez aussi saisir l’APDP (contact@apdp.ml).</p>
      </article>
      <Footer shop={s} /></main>
  );
}
