import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStore } from '@/lib/supabase';
import { Header, Footer, NotReady } from '@/components/Shell';
import { ProductCard } from '@/components/Showcase';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const store = await getStore(); const c = store?.categories?.find((x: any) => x.slug === params.slug);
  return c ? { title: c.name } : {};
}

export default async function Collection({ params }: { params: { slug: string } }) {
  const store = await getStore(); if (!store) return <NotReady />;
  const c = (store.categories || []).find((x: any) => x.slug === params.slug); if (!c) notFound();
  const items = store.products.filter((p: any) => p.category_id === c.id);
  const loyalty = Number(store.shop.loyalty_percent) || 0;
  return (
    <main className="wrap">
      <Header shop={store.shop} categories={store.categories} active={'c:' + c.slug} />
      <section className="col-hero"><span className="kicker"><Link href="/catalogue">Catalogue</Link></span><h1>{c.name}</h1><p className="muted">{items.length} article{items.length > 1 ? 's' : ''} · paiement à la livraison</p></section>
      <div className="cat-chips">{(store.categories || []).map((x: any) => <Link key={x.id} href={'/collection/' + x.slug} className={x.slug === c.slug ? 'on' : ''}>{x.name}</Link>)}<Link href="/produits">Tout voir</Link></div>
      {!items.length ? <p className="empty" style={{ marginTop: 16 }}>Aucun produit dans cette collection pour le moment.</p> :
        <div className="grid2">{items.map((p: any, i: number) => <ProductCard key={p.id} p={p} i={i} loyalty={loyalty} />)}</div>}
      <Footer shop={store.shop} />
    </main>
  );
}
