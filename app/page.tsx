import Link from 'next/link';
import { getStore } from '@/lib/supabase';
import { fmt } from '@/lib/format';
import { catIcon } from '@/lib/categories';
import { Header, Footer, FloatWa, NotReady, WaIcon } from '@/components/Shell';
import Consent from '@/components/Consent';
import { HeroSlider, Promises, FilterGrid, RecentToast, Reveal } from '@/components/Showcase';
import { waLink } from '@/lib/phone';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const store = await getStore();
  if (!store) return <NotReady />;
  const { shop, products } = store;
  const categories = store.categories || [];
  const live = products.filter((p: any) => p.stock > 0);
  const featured = [...live].sort((a: any, b: any) => (b.compare_price ? 1 : 0) - (a.compare_price ? 1 : 0) || (b.images?.length ? 1 : 0) - (a.images?.length ? 1 : 0)).slice(0, 4);
  const fresh = [...live].sort((a: any, b: any) => +new Date(b.created_at || 0) - +new Date(a.created_at || 0)).slice(0, 8);
  const loyalty = Number(shop.loyalty_percent) || 0;
  const reviews = products.flatMap((p: any) => (p.reviews || []).map((r: any) => ({ ...r, product: p.name }))).sort((a: any, b: any) => b.rating - a.rating).slice(0, 8);
  const wa = waLink(shop.whatsapp, 'Bonjour, j’ai une question sur vos produits.');
  return (
    <main className="wrap">
      <Header shop={shop} categories={categories} active="home" />
      <Consent />
      <HeroSlider items={featured} shop={shop} />
      <Promises shop={shop} />

      {categories.length > 0 && (
        <section className="homeblock"><div className="section-h"><h2>Catalogue</h2><Link href="/catalogue" className="z-more">Tout voir →</Link></div>
          <div className="z-cicons">{categories.map((c: any) => (
            <Link key={c.id} href={'/collection/' + c.slug}><i>{catIcon(c.name)}</i>{c.name}</Link>))}
            <Link href="/catalogue"><i className="all">→</i>Tout le catalogue</Link></div></section>)}

      {fresh.length > 1 && (
        <section className="homeblock" id="nouveautes"><div className="section-h"><h2>✨ Nouveautés</h2><span className="kicker">Faites glisser →</span></div>
          <div className="z-nrow">{fresh.map((p: any) => {
            const off = p.compare_price ? Math.round((1 - p.price / p.compare_price) * 100) : 0;
            return (
              <Link key={p.id} href={'/produit/' + p.id} className="z-nc">
                {p.images?.[0] ? <img src={p.images[0]} alt="" loading="lazy" /> : <span className="z-ph">{p.name.slice(0, 2).toUpperCase()}</span>}
                <span className="c">{off >= 5 ? <span className="z-tag">−{off} %</span> : <span className="z-tag k">Nouveau</span>}<b className="n">{p.name}</b>
                  <span className="pr"><b>{fmt(p.price)}</b><span className="go">Voir →</span></span></span>
              </Link>);
          })}</div></section>)}

      {loyalty > 0 && <Reveal className="z-loy"><b>−{loyalty} %</b><p><strong>Déjà client ?</strong> Votre réduction s’applique toute seule avec votre numéro.</p></Reveal>}

      <section className="homeblock" id="produits"><div className="section-h"><h2>Tous nos produits</h2><Link href="/produits" className="z-more">{products.length} articles →</Link></div>
        {products.length === 0 ? <p className="empty">Les produits arrivent bientôt.</p> : <FilterGrid products={products} categories={categories} loyalty={loyalty} />}</section>

      <Reveal className="homeblock"><h2 className="b-title">Comment ça marche</h2>
        <div className="z-steps"><div><i>1</i><b>Commandez en 1 min</b><span>Sans compte, sans payer</span></div><div><i>2</i><b>On vous appelle</b><span>Pour confirmer l’adresse</span></div><div><i>3</i><b>Payez à la porte</b><span>Après avoir vu le colis</span></div></div></Reveal>

      {reviews.length > 0 && <section className="homeblock"><div className="section-h"><h2>Ils ont reçu leur colis</h2></div>
        <div className="rv-marq"><div className="rv-track">{[...reviews, ...reviews].map((r: any, i: number) => (
          <figure key={i} className="rv2" aria-hidden={i >= reviews.length}>{r.image_url && <img src={r.image_url} alt="" loading="lazy" />}
            <figcaption><span className="stars">{'★'.repeat(r.rating)}</span>{r.body && <p>« {r.body} »</p>}<b>{r.author}</b><span className="muted" style={{ display: 'inline' }}>{r.city ? ' · ' + r.city : ''}</span></figcaption></figure>))}</div></div></section>}

      <Reveal className="homeblock helpband">
        <div><h2 className="b-title" style={{ marginTop: 0 }}>Une question avant de commander ?</h2><p className="muted">Réponse rapide sur WhatsApp. Livraison, paiement, retours : tout est expliqué.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{wa && <a className="btn z-wabtn" href={wa} target="_blank" rel="noopener"><WaIcon /> Écrire sur WhatsApp</a>}<Link className="btn" href="/aide">Questions fréquentes</Link></div>
      </Reveal>
      <Footer shop={shop} />
      <RecentToast recent={store.recent || []} products={products} />
      <FloatWa shop={shop} text="Bonjour, j’ai une question sur vos produits." />
    </main>
  );
}
