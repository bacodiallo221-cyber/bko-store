import { getStore } from '@/lib/supabase';
import { Header, Footer, FloatWa, NotReady } from '@/components/Shell';
import { FilterGrid } from '@/components/Showcase';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tous nos produits' };

export default async function AllProducts() {
  const store = await getStore(); if (!store) return <NotReady />;
  const { shop, products } = store; const categories = store.categories || [];
  return (
    <main className="wrap">
      <Header shop={shop} categories={categories} active="all" />
      <section className="col-hero"><span className="kicker">Tous nos produits</span><h1>Produits</h1><p className="muted">{products.length} article{products.length > 1 ? 's' : ''} · paiement à la livraison</p></section>
      {products.length === 0 ? <p className="empty">Les produits arrivent bientôt.</p> : <FilterGrid products={products} categories={categories} loyalty={Number(shop.loyalty_percent) || 0} />}
      <Footer shop={shop} />
      <FloatWa shop={shop} text="Bonjour, j’ai une question sur vos produits." />
    </main>
  );
}
