import Link from 'next/link';
import { waLink, fmtPhone } from '@/lib/phone';
import { ThemeButton, ShopAccent } from './Brand';

const ph = (p?: string | null) => String(p || '').replace(/\D/g, '').slice(-8);
export const phones = (shop: any) => [shop?.whatsapp, shop?.phone2, shop?.phone3].map(ph).filter((x) => x.length === 8);

const NAV: [string, string][] = [['/#produits', 'Produits'], ['/suivi', 'Suivre ma commande'], ['/aide', 'Aide & livraison'], ['/contact', 'Contact']];

export function Header({ shop }: { shop: any }) {
  return (
    <>
      {shop?.announcement && <div className="annonce" aria-label="Annonce"><div className="annonce-track">{[0, 1, 2, 3].map((i) => <span key={i} aria-hidden={i > 0}>{shop.announcement}</span>)}</div></div>}
      <header className="bar">
        <ShopAccent color={shop?.accent} />
        <Link href="/" className="brand" aria-label={(shop?.name || 'Boutique') + ' — accueil'}>
          {shop?.logo_url ? <img className="shoplogo" src={shop.logo_url} alt={shop?.name || ''} /> : <><span className="mark" aria-hidden="true" />{shop?.name || 'Boutique'}</>}
        </Link>
        <div className="right">
          <nav className="navlinks" aria-label="Menu">{NAV.map(([h, l]) => <Link key={h} href={h}>{l}</Link>)}</nav>
          <ThemeButton />
          <details className="mnav">
            <summary aria-label="Ouvrir le menu"><span /><span /><span /></summary>
            <nav aria-label="Menu mobile">{[['/', 'Accueil'], ...NAV].map(([h, l]) => <Link key={h} href={h}>{l}</Link>)}
              {waLink(shop?.whatsapp, 'Bonjour') && <a className="btn wa" href={waLink(shop?.whatsapp, 'Bonjour, j’ai une question.')!} target="_blank" rel="noopener">Écrire sur WhatsApp</a>}</nav>
          </details>
        </div>
      </header>
    </>
  );
}

export function Footer({ shop }: { shop: any }) {
  const ps = phones(shop);
  return (
    <footer className="foot2">
      <div className="fcol">
        {shop?.logo_url ? <img className="shoplogo" src={shop.logo_url} alt={shop?.name || ''} /> : <strong>{shop?.name}</strong>}
        <p>Commandez en ligne, payez à la livraison. Satisfait ou remboursé sous {shop?.refund_days || 2} jours.</p>
      </div>
      <div className="fcol"><b>Boutique</b><Link href="/#produits">Tous les produits</Link><Link href="/suivi">Suivre ma commande</Link><Link href="/aide#livraison">Tarifs de livraison</Link></div>
      <div className="fcol"><b>Aide</b><Link href="/aide">Questions fréquentes</Link><Link href="/aide#retours">Retours et remboursement</Link><Link href="/contact">Nous contacter</Link></div>
      <div className="fcol"><b>Contact</b>{ps.map((p, i) => <span key={p} className="mono">+223 {fmtPhone(p)}{i === 0 ? ' · WhatsApp' : ''}</span>)}{shop?.address && <span>{shop.address}</span>}</div>
      <div className="fbottom">
        <span>© {new Date().getFullYear()} {shop?.name}</span>
        <Link href="/mentions">Mentions légales</Link><Link href="/conditions">Conditions de vente</Link><Link href="/confidentialite">Confidentialité</Link>
        <span className="poweredby">Propulsé par <b>Zelvo</b></span>
      </div>
    </footer>
  );
}

export function FloatWa({ shop, text }: { shop: any; text: string }) {
  const href = waLink(shop?.whatsapp, text);
  if (!href) return null;
  return <a className="float-wa" href={href} target="_blank" rel="noopener">WhatsApp · Une question ?</a>;
}

export function NotReady() {
  return (
    <main className="wrap">
      <section className="hero"><h1>Boutique en préparation</h1>
        <p>La boutique n’est pas encore créée. Si vous êtes le vendeur, ouvrez <Link href="/admin">l’espace vendeur</Link> pour la créer.</p>
      </section>
    </main>
  );
}
