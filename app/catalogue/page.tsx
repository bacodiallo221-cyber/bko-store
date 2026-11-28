import Link from 'next/link';
import { getStore } from '@/lib/supabase';
import { byGroup } from '@/lib/categories';
import { Header, Footer, FloatWa, NotReady } from '@/components/Shell';
import { Reveal } from '@/components/Showcase';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Catalogue' };

// Seules les catégories qui ont au moins un produit en ligne sont affichées (filtrées par store_get).
export default async function Catalogue() {
  const store = await getStore(); if (!store) return <NotReady />;
  const { shop, products } = store; const categories = store.categories || [];
  const cover = (c: any) => c.image_url || products.find((p: any) => p.category_id === c.id && p.images?.[0])?.images[0];
  const count = (c: any) => products.filter((p: any) => p.category_id === c.id).length;
  return (
    <main className="wrap">
      <Header shop={shop} categories={categories} active="cat" />
      <section className="col-hero"><span className="kicker">Catalogue</span><h1>Catalogue</h1><p className="muted">Touchez une catégorie pour voir ses produits.</p></section>
      {!categories.length ? <p className="empty">Le catalogue arrive bientôt. <Link href="/produits">Voir tous les produits →</Link></p> :
        byGroup(categories).map(([g, icon, list], gi) => (
          <Reveal key={g} className="z-cg" delay={gi * 60}><h2><i>{icon}</i>{g}</h2>
            <div className="cats">{list.map((c: any) => (
              <Link key={c.id} href={'/collection/' + c.slug} className="cat">
                <span className="cat-img">{cover(c) ? <img src={cover(c)} alt="" loading="lazy" /> : <span>{c.name.slice(0, 2).toUpperCase()}</span>}</span>
                <span className="cat-n">{c.name}<small>{count(c)} article{count(c) > 1 ? 's' : ''} →</small></span></Link>))}</div></Reveal>))}
      <Footer shop={shop} />
      <FloatWa shop={shop} text="Bonjour, je cherche un produit." />
    </main>
  );
}
