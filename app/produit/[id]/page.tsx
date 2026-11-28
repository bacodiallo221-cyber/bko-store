import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStore } from '@/lib/supabase';
import { fmt, num } from '@/lib/format';
import { Header, Footer, NotReady } from '@/components/Shell';
import Consent from '@/components/Consent';
import OrderForm from '@/components/OrderForm';
import Blocks from '@/components/Blocks';
import { Countdown, StickyCta, Gallery, Tabs } from '@/components/Urgency';
import { ProductCard } from '@/components/Showcase';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const store = await getStore(); const p = store?.products.find((x: any) => x.id === params.id);
  return p ? { title: p.name, description: p.tagline || p.description?.slice(0, 150), openGraph: { title: p.name, images: p.images?.slice(0, 1) } } : {};
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const store = await getStore();
  if (!store) return <NotReady />;
  const { shop } = store;
  const p = store.products.find((x: any) => x.id === params.id);
  if (!p) notFound();
  const off = p.compare_price ? Math.round((1 - p.price / p.compare_price) * 100) : 0;
  const showStock = p.stock > 0 && (p.stock_display === 'always' || (p.stock_display === 'low' && p.stock <= (p.low_stock_at || 10)));
  const reviews = p.reviews || [];
  const avg = reviews.length ? reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length : 0;
  const blocks = Array.isArray(p.blocks) ? p.blocks : [];
  const desc = blocks.filter((b: any) => b.type !== 'faq'); const faq = blocks.filter((b: any) => b.type === 'faq');
  const cat = (store.categories || []).find((c: any) => c.id === p.category_id);
  const related = [...store.products.filter((x: any) => x.id !== p.id && x.stock > 0 && x.category_id && x.category_id === p.category_id),
    ...store.products.filter((x: any) => x.id !== p.id && x.stock > 0 && x.category_id !== p.category_id)].slice(0, 4);
  return (
    <main className="wrap">
      <Header shop={shop} categories={store.categories} active={cat ? 'c:' + cat.slug : 'all'} />
      <Consent />
      <nav className="crumb2" aria-label="Fil d’Ariane"><Link href="/">Accueil</Link> / {cat ? <Link href={'/collection/' + cat.slug}>{cat.name}</Link> : <Link href="/produits">Produits</Link>}</nav>
      <div className="pp">
        <Gallery images={p.images || []} name={p.name} badge={off >= 5 ? '−' + off + ' %' : null} />
        <div>
          <h1>{p.name}</h1>
          {p.tagline && <p className="tagline">{p.tagline}</p>}
          {reviews.length > 0 && <a href="#avis" className="stars-line"><span className="stars">{'★'.repeat(Math.round(avg))}</span> {reviews.length} avis client{reviews.length > 1 ? 's' : ''}</a>}
          <div className="pricebig">{fmt(p.price)}{p.compare_price && <s className="was">{num(p.compare_price)}</s>}</div>
          {p.compare_price && <p className="save">Vous économisez {fmt(p.compare_price - p.price)}</p>}
          {p.promo_ends_at && <Countdown until={p.promo_ends_at} after={'le prix repasse à ' + fmt(p.compare_price)} />}
          {showStock && <div className="stockline"><span className="dotlive" />{p.stock <= (p.low_stock_at || 10) ? <>Plus que <b>{p.stock} pièce{p.stock > 1 ? 's' : ''}</b> en stock</> : <>En stock : <b>{p.stock} pièces</b></>}
            <span className="bar"><i style={{ width: Math.max(6, Math.min(100, (p.stock / Math.max(p.low_stock_at || 10, p.stock, 1)) * 100)) + '%' }} /></span></div>}
          <ul className="badges4">
            <li><b>Paiement à la livraison</b><span>Vous payez en main propre</span></li>
            <li><b>Satisfait ou remboursé</b><span>{shop.refund_days || 2} jours après réception</span></li>
            <li><b>Livré en {shop.delivery_promise || 'moins de 24 h'}</b><span>à Bamako · régions en 48 h</span></li>
            <li><b>Service client</b><span>Réponse sur WhatsApp</span></li>
          </ul>
          <div id="commander"><OrderForm product={p} zones={store.zones} shop={shop} /></div>
        </div>
      </div>
      <Tabs tabs={[
        ...(p.description || desc.length ? [{ id: 'desc', label: 'Description', body: <>{p.description && <p className="lead2">{p.description}</p>}<Blocks blocks={desc} /></> }] : []),
        ...(reviews.length ? [{ id: 'avis', label: 'Avis (' + reviews.length + ')', body: <div id="avis">
          <div className="z-rsum"><div className="big">{avg.toFixed(1).replace('.', ',')}<small>{reviews.length} avis</small></div>
            <div className="bars">{[5, 4, 3, 2, 1].map((k) => { const n = reviews.filter((r: any) => r.rating === k).length; const pc = Math.round((n / reviews.length) * 100); return <div key={k} className="rb">{k}★<i><b style={{ width: pc + '%' }} /></i>{pc} %</div>; })}</div></div>
          <div className="rv-grid">{reviews.map((r: any, i: number) => (
            <figure key={i} className="rv">{r.image_url && <img src={r.image_url} alt={'Retour de ' + r.author} loading="lazy" />}
              <figcaption><span className="stars">{'★'.repeat(r.rating)}</span>{r.body && <p>« {r.body} »</p>}<b>{r.author}</b>{r.city && <span className="muted" style={{ display: 'inline' }}> · {r.city}</span>}</figcaption></figure>))}</div></div> }] : []),
        { id: 'liv', label: 'Livraison et questions', body: <>
          <div className="z-dl">
            <div><b>Bamako · livré en {shop.delivery_promise || 'moins de 24 h'}</b><p>Le livreur vous appelle et vient chez vous. Le prix dépend de la distance et s’affiche quand vous tapez votre quartier.</p></div>
            <div><b>Régions · 48 à 72 h</b><p>Envoi par car avec la compagnie de votre choix. {shop.region_payment === 'avance' ? 'Paiement avant l’envoi : nous vous expliquons au téléphone.' : 'Vous récupérez et payez votre colis à la gare.'}</p></div>
            <div><b>Paiement</b><p>En espèces, à la réception, après avoir vu votre colis.</p></div>
            <div><b>Retour</b><p>Satisfait ou remboursé sous {shop.refund_days || 2} jours.</p></div>
          </div>
          <Blocks blocks={faq} /></> },
      ]} />
      {related.length > 0 && <section className="homeblock"><div className="section-h"><h2>Vous aimerez aussi</h2></div>
        <div className="grid2">{related.map((x: any, i: number) => <ProductCard key={x.id} p={x} i={i} loyalty={Number(shop.loyalty_percent) || 0} />)}</div></section>}
      <Footer shop={shop} />
      {p.stock > 0 && <StickyCta label={'Commander — ' + fmt(p.price)} />}
    </main>
  );
}
