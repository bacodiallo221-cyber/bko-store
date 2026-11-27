import Link from 'next/link';
import { getStore } from '@/lib/supabase';
import { fmt, num } from '@/lib/format';
import { Header, Footer, FloatWa, NotReady } from '@/components/Shell';
import Consent from '@/components/Consent';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const store = await getStore();
  if (!store) return <NotReady />;
  const { shop, products } = store;
  const reviews = products.flatMap((p: any) => (p.reviews || []).map((r: any) => ({ ...r, product: p.name }))).sort((a: any, b: any) => b.rating - a.rating);
  return (
    <main className="wrap">
      <Header shop={shop} />
      <Consent />
      <section className="hero">
        <span className="kicker">Paiement à la livraison</span>
        <h1>{shop.name}</h1>
        <p>Choisissez, remplissez quatre champs, et payez seulement quand le colis est entre vos mains.</p>
      </section>
      <ul className="stats3" aria-label="Nos engagements">
        <li><b>0 F</b><span>à payer en avance</span></li>
        <li><b>{shop.delivery_promise || '24 à 48 h'}</b><span>de livraison</span></li>
        <li><b>{shop.refund_days || 2} j</b><span>satisfait ou remboursé</span></li>
      </ul>
      <div className="section-h" id="produits"><h2>Nos produits</h2><span className="muted">{products.length} articles</span></div>
      {products.length === 0 && <p className="empty">Les produits arrivent bientôt.</p>}
      <div className="grid">
        {products.map((p: any) => {
          const out = p.stock <= 0;
          return (
            <Link key={p.id} href={'/produit/' + p.id} className={'card' + (out ? ' out' : '')} aria-disabled={out}>
              <span className="pic">
                {p.images?.[0] ? <img src={p.images[0]} alt="" loading="lazy" /> : p.name.slice(0, 2).toUpperCase()}
                {out ? <span className="tag out">Épuisé</span> : p.compare_price ? <span className="tag off">−{Math.round((1 - p.price / p.compare_price) * 100)} %</span> : p.stock <= 5 ? <span className="tag low">Plus que {p.stock}</span> : null}
              </span>
              <span className="cname">{p.name}</span>
              <span className="cprice">{fmt(p.price)}{p.compare_price && <s className="was">{num(p.compare_price)}</s>}</span>
            </Link>
          );
        })}
      </div>
      <section className="homeblock"><h2 className="b-title">Comment ça marche</h2>
        <ol className="how">
          <li><b>1</b><strong>Vous commandez</strong><span>En 1 minute, sans payer ni créer de compte.</span></li>
          <li><b>2</b><strong>On vous appelle</strong><span>Pour confirmer, au moment qui vous arrange.</span></li>
          <li><b>3</b><strong>Vous payez à la livraison</strong><span>Après avoir vérifié votre colis.</span></li>
        </ol></section>
      {reviews.length > 0 && <section className="homeblock"><h2 className="b-title">Ils nous font confiance</h2>
        <div className="rv-grid">{reviews.slice(0, 4).map((r: any, i: number) => (
          <figure key={i} className="rv">{r.image_url && <img src={r.image_url} alt={'Retour de ' + r.author} loading="lazy" />}
            <figcaption><span className="stars">{'★'.repeat(r.rating)}</span>{r.body && <p>« {r.body} »</p>}<b>{r.author}</b><span className="muted" style={{ display: 'inline' }}>{r.city ? ' · ' + r.city : ''} · {r.product}</span></figcaption></figure>))}</div></section>}
      <section className="homeblock helpband">
        <div><h2 className="b-title" style={{ marginTop: 0 }}>Une question avant de commander ?</h2><p className="muted">Livraison, paiement, retours : tout est expliqué.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link className="btn primary" href="/aide">Questions fréquentes</Link><Link className="btn" href="/suivi">Suivre ma commande</Link></div>
      </section>
      <Footer shop={shop} />
      <FloatWa shop={shop} text="Bonjour, j’ai une question sur vos produits." />
    </main>
  );
}
