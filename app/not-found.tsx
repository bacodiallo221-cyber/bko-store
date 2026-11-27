import Link from 'next/link';
import { getStore } from '@/lib/supabase';
import { Header, Footer } from '@/components/Shell';

export default async function NotFound() {
  const store = await getStore();
  return (
    <main className="wrap">{store && <Header shop={store.shop} />}
      <section className="hero"><span className="kicker">Erreur 404</span><h1>Cette page n’existe plus</h1>
        <p>Le produit a peut-être été retiré, ou le lien est incomplet.</p>
        <p style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link className="btn primary" href="/#produits">Voir tous les produits</Link><Link className="btn" href="/contact">Nous contacter</Link></p></section>
      {store && <Footer shop={store.shop} />}
    </main>
  );
}
