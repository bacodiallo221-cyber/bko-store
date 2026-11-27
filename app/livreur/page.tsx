import Link from 'next/link';
export const metadata = { title: 'Espace livreur' };
export default function Livreur() {
  return (
    <main className="wrap" style={{ maxWidth: 480 }}>
      <section className="hero"><h1>Espace livreur</h1>
        <p>L’application livreur arrive à la prochaine mise à jour : connexion avec votre numéro et votre code, colis en temps réel, position pendant les livraisons.</p>
        <p><Link href="/">Retour à la boutique</Link></p></section>
    </main>
  );
}
