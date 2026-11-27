import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStore } from '@/lib/supabase';
import { fmt, num } from '@/lib/format';
import { Header, Footer, NotReady } from '@/components/Shell';
import Consent from '@/components/Consent';
import OrderForm from '@/components/OrderForm';
import Blocks from '@/components/Blocks';
import { Countdown, StickyCta, Gallery } from '@/components/Urgency';

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
  return (
    <main className="wrap">
      <Header shop={shop} />
      <Consent />
      <Link href="/" className="back">← Tous les produits</Link>
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
            <li><b>Livraison {shop.delivery_promise || '24 à 48 h'}</b><span>Bamako et régions</span></li>
            <li><b>Service client</b><span>Réponse sur WhatsApp</span></li>
          </ul>
          {p.description && <p className="desc">{p.description}</p>}
          <div id="commander"><OrderForm product={p} zones={store.zones} shop={shop} /></div>
        </div>
      </div>
      <Blocks blocks={p.blocks} />
      {reviews.length > 0 && (
        <section id="avis" className="reviews">
          <h2 className="b-title">Ils ont déjà commandé</h2>
          <div className="rv-grid">{reviews.map((r: any, i: number) => (
            <figure key={i} className="rv">
              {r.image_url && <img src={r.image_url} alt={'Retour de ' + r.author} loading="lazy" />}
              <figcaption><span className="stars">{'★'.repeat(r.rating)}</span>{r.body && <p>« {r.body} »</p>}<b>{r.author}</b>{r.city && <span className="muted" style={{ display: 'inline' }}> · {r.city}</span>}</figcaption>
            </figure>))}</div>
        </section>)}
      <Footer shop={shop} />
      {p.stock > 0 && <StickyCta label={'Commander — ' + fmt(p.price)} />}
    </main>
  );
}
