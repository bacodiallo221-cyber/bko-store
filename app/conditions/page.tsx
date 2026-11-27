import { getStore } from '@/lib/supabase';
import { Header, Footer, NotReady } from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function Conditions() {
  const store = await getStore(); if (!store) return <NotReady />;
  const s = store.shop, d = s.refund_days || 2;
  return (
    <main className="wrap"><Header shop={s} />
      <article className="doc"><h1 style={{ marginTop: 20 }}>Conditions de vente</h1>
        <h2>Prix</h2><p>Prix en FCFA. Les frais de livraison sont affichés avant la validation et inclus dans le total à payer.</p>
        <h2>Commande</h2><p>Vous vérifiez le récapitulatif avant de valider. Une confirmation avec le détail de la commande vous est ensuite donnée et envoyée.</p>
        <h2>Paiement</h2><p>À la livraison, en espèces ou par Mobile Money, après remise du colis. Pour un envoi par car, au retrait à la gare.</p>
        <h2>Livraison</h2><p>Bamako : 24 à 48 h. Autres villes : envoi par car, 24 à 72 h selon la ville. Si un produit manque, nous vous prévenons avant la livraison.</p>
        <h2>Satisfait ou remboursé : {d} jours</h2><p>Vous pouvez vérifier le colis devant le livreur avant de payer. Si le produit ne vous convient pas, prévenez-nous sur WhatsApp dans les {d} jours après réception. Rapportez-le complet, dans son emballage d’origine : nous vous remboursons sous 48 h, en espèces ou par Mobile Money.</p>
        <h2>Droit de rétractation</h2><p>Pour les achats à distance, la loi n° 2016-012 (art. 72) prévoit en plus un délai légal de 14 jours après réception. Les frais de retour restent alors à votre charge.</p>
        <h2>Contact</h2><p>WhatsApp +223 {s.whatsapp}{s.phone2 ? ' · +223 ' + s.phone2 : ''}{s.email ? ' · ' + s.email : ''} · <a href="/contact">toutes nos coordonnées</a></p>
      </article>
      <Footer shop={s} /></main>
  );
}
