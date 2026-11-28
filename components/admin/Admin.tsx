'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { sb, SHOP_SLUG } from '@/lib/supabase';
import { errText } from '@/lib/format';
import Orders from './Orders';
import Products from './Products';
import Zones from './Zones';
import Team from './Team';
import Settings from './Settings';
import Invoices from './Invoices';
import DashboardView from './Dashboard';
import Clients from './Clients';
import Cockpit from './Cockpit';
import { playSound, getPref } from '@/lib/sounds';
import { ZelvoLogo, ThemeButton } from '../Brand';

export default function Admin() {
  const [session, setSession] = useState<any>(undefined);
  useEffect(() => {
    sb().auth.getSession().then(({ data }: any) => setSession(data.session));
    const { data } = sb().auth.onAuthStateChange((_e: any, s: any) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <main className="wrap"><p className="muted" style={{ marginTop: 40 }}>Chargement…</p></main>;
  if (!session) return <Login />;
  return <Dashboard session={session} />;
}

function Login() {
  const [email, setEmail] = useState(''); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const redirect = () => location.origin + '/auth/callback';
  async function google() {
    setErr('');
    const { error } = await sb().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect() } });
    if (error) setErr(String(error.message).includes('provider') ? 'La connexion Google n’est pas encore activée. Utilisez le lien par e-mail en attendant.' : errText(error));
  }
  async function mail(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setMsg('');
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr('Entrez une adresse e-mail valide.'); return; }
    const { error } = await sb().auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } });
    if (error) setErr(String(error.message).includes('rate') ? 'Trop de demandes. Attendez quelques minutes.' : errText(error));
    else setMsg('Lien envoyé à ' + email + '. Ouvrez-le sur cet appareil.');
  }
  return (
    <main className="wrap" style={{ maxWidth: 440 }}>
      <header className="bar"><ZelvoLogo /><ThemeButton /></header>
      <section className="hero"><span className="kicker">Espace vendeur</span><h1>Bon retour.</h1><p>Connectez-vous pour gérer vos commandes.</p></section>
      <div className="panel" style={{ marginTop: 16 }}>
        <button className="btn primary wide" onClick={google}>Continuer avec Google</button>
        <p className="muted" style={{ textAlign: 'center', margin: '14px 0' }}>ou</p>
        <form onSubmit={mail}>
          <div className="field" style={{ marginTop: 0 }}><label htmlFor="em">Recevoir un lien de connexion par e-mail</label>
            <input id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" /></div>
          <div style={{ marginTop: 10 }}><button className="btn wide">Envoyer le lien</button></div>
        </form>
        {msg && <p className="info-line t-ok">{msg}</p>}
        {err && <p className="err" role="alert">{err}</p>}
      </div>
    </main>
  );
}

const ICONS: Record<string, string> = {
  home: '<path d="M3 11 12 4l9 7v9H3z"/><path d="M9 20v-6h6v6"/>', orders: '<path d="M4 4h2l2 12h11l2-8H7"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/>',
  products: '<path d="M3 7 12 3l9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>', clients: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/><path d="M17 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-6"/>',
  stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', invoices: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h6"/>',
  zones: '<path d="M2 6h12v10H2zM14 10h4l4 3v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>', team: '<circle cx="12" cy="7" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  shop: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>', more: '<path d="M4 6h16M4 12h16M4 18h16"/>', out: '<path d="M9 21H4V3h5M16 17l5-5-5-5M21 12H9"/>',
};
const Ico = ({ k }: { k: string }) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[k] }} />;
const NAV: [string | null, [string, string][]][] = [
  [null, [['home', 'Accueil'], ['orders', 'Commandes'], ['products', 'Produits'], ['clients', 'Clients et relances']]],
  ['Ventes', [['stats', 'Statistiques et pub'], ['invoices', 'Factures et proformas']]],
  ['Logistique', [['zones', 'Zones et gares'], ['team', 'Équipe et livreurs']]],
  ['Boutique', [['settings', 'Réglages']]],
];
const TITLES: Record<string, string> = Object.fromEntries(NAV.flatMap(([, l]) => l));

function Dashboard({ session }: { session: any }) {
  const [shop, setShop] = useState<any>(undefined);
  const [tab, setTabRaw] = useState('home');
  const [sheet, setSheet] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [pulse, setPulse] = useState(0); const [toCall, setToCall] = useState(0); const [ring, setRing] = useState<any>(null);
  const toast = useCallback((m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(''), 2800); }, []);
  const setTab = useCallback((t: string) => { setTabRaw(t); setSheet(false); try { history.replaceState(null, '', '#' + t); } catch {} window.scrollTo({ top: 0 }); }, []);
  useEffect(() => { const h = location.hash.slice(1); if (h && (TITLES[h] || h === 'home')) setTabRaw(h); }, []);

  const loadShop = useCallback(async () => {
    const { data: mem } = await sb().rpc('my_memberships');
    const admin = (mem || []).find((m: any) => m.role === 'owner' || m.role === 'manager');
    if (!admin) { setShop(null); return; }
    const { data } = await sb().from('shops').select('*').eq('id', admin.shop_id).single();
    setShop(data || null);
  }, []);
  useEffect(() => { loadShop(); }, [loadShop]);

  // Nombre de commandes à appeler (pastille rouge du menu)
  useEffect(() => {
    if (!shop) return;
    sb().from('orders').select('id', { count: 'exact', head: true }).eq('shop_id', shop.id).in('status', ['a_appeler', 'pas_reponse', 'a_rappeler'])
      .then(({ count }: any) => setToCall(count || 0));
  }, [shop, pulse]);
  // Temps réel pour tout l'espace vendeur : « Tching ! » à chaque nouvelle commande, quel que soit l'onglet ouvert.
  useEffect(() => {
    if (!shop) return;
    const ch = sb().channel('admin-' + shop.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: 'shop_id=eq.' + shop.id }, (p: any) => {
        if (getPref('sndOn', true)) playSound(getPref('snd', 'tching'), getPref('twice', true) ? 2 : 1);
        try { navigator.vibrate?.([160, 80, 160, 80, 240]); } catch {}
        try { if (document.hidden && Notification.permission === 'granted') new Notification('Tching ! Nouvelle commande n° ' + p.new.number, { body: p.new.customer_name }); } catch {}
        setRing({ n: p.new.number, name: p.new.customer_name }); setTimeout(() => setRing(null), 8000);
        setTimeout(() => setPulse((x) => x + 1), 600);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: 'shop_id=eq.' + shop.id }, () => setPulse((x) => x + 1))
      .subscribe();
    return () => { sb().removeChannel(ch); };
  }, [shop]);

  if (shop === undefined) return <main className="wrap"><p className="muted" style={{ marginTop: 40 }}>Chargement…</p></main>;
  if (shop === null) return <CreateShop onDone={loadShop} email={session.user?.email} />;

  const badge = (k: string) => (k === 'orders' && toCall > 0 ? <span className="zs-k r">{toCall}</span> : null);
  const item = ([k, l]: [string, string]) => <button key={k} type="button" className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}><Ico k={k} />{l}{badge(k)}</button>;
  return (
    <div className="zs">
      <aside className="zs-side" aria-label="Menu">
        <div className="zs-ws">{shop.logo_url ? <img src={shop.logo_url} alt="" /> : <i>{(shop.name || 'Z').slice(0, 2).toUpperCase()}</i>}<div><b>{shop.name}</b><small>Zelvo · espace vendeur</small></div></div>
        <nav>{NAV.map(([g, items]) => <div key={g || 'main'}>{g && <div className="zs-sec">{g}</div>}{items.map(item)}</div>)}</nav>
        <div className="zs-foot">
          <Link href="/" target="_blank" className="zs-shop"><Ico k="shop" />Voir la boutique</Link>
          <div className="zs-row"><ThemeButton /><button type="button" className="btn sm" onClick={() => sb().auth.signOut()}>Quitter</button><span className="zs-z"><ZelvoLogo size={20} /></span></div>
        </div>
      </aside>
      <main className="zs-main">
        <header className="zs-top"><ZelvoLogo size={24} /><div className="zs-sp" /><Link href="/" target="_blank" className="btn sm">Boutique ↗</Link><ThemeButton /></header>
        {shop.slug !== SHOP_SLUG && <p className="info-line t-warn">Ce site affiche la boutique « {SHOP_SLUG} ». Votre boutique a l’identifiant « {shop.slug} » : mettez NEXT_PUBLIC_SHOP_SLUG={shop.slug} dans Vercel.</p>}
        {tab !== 'home' && <h1 className="zs-title">{TITLES[tab]}</h1>}
        {tab === 'home' && <Cockpit shop={shop} toast={toast} onGo={setTab} pulse={pulse} />}
        {tab === 'orders' && <Orders shop={shop} toast={toast} />}
        {tab === 'stats' && <DashboardView shop={shop} toast={toast} />}
        {tab === 'clients' && <Clients shop={shop} toast={toast} onSaved={loadShop} />}
        {tab === 'invoices' && <Invoices shop={shop} toast={toast} />}
        {tab === 'products' && <Products shop={shop} toast={toast} />}
        {tab === 'zones' && <Zones shop={shop} toast={toast} onSaved={loadShop} />}
        {tab === 'team' && <Team shop={shop} toast={toast} />}
        {tab === 'settings' && <Settings shop={shop} toast={toast} onSaved={loadShop} />}
      </main>
      <nav className="zs-tab" aria-label="Menu rapide">
        {([['home', 'Accueil'], ['orders', 'Commandes'], ['products', 'Produits'], ['clients', 'Clients']] as [string, string][]).map(([k, l]) => (
          <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><Ico k={k} />{l}{k === 'orders' && toCall > 0 && <span className="zs-k r">{toCall}</span>}</button>))}
        <button type="button" className={sheet || !['home', 'orders', 'products', 'clients'].includes(tab) ? 'on' : ''} onClick={() => setSheet(!sheet)}><Ico k="more" />Plus</button>
      </nav>
      {sheet && <div className="zs-sheet" onClick={(e) => { if (e.target === e.currentTarget) setSheet(false); }}><div className="in" role="dialog" aria-label="Toutes les rubriques">
        <b>Toutes les rubriques</b>
        <div className="gr">{NAV.flatMap(([, l]) => l).filter(([k]) => !['home', 'orders', 'products', 'clients'].includes(k)).map(([k, l]) => <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><Ico k={k} />{l}</button>)}
          <Link href="/" target="_blank"><Ico k="shop" />Voir la boutique</Link><button type="button" onClick={() => sb().auth.signOut()}><Ico k="out" />Quitter</button></div></div></div>}
      {ring && tab !== 'orders' && <button type="button" className="zs-ring" onClick={() => { setRing(null); setTab('orders'); }}>🔔 Tching ! Nouvelle commande n° {ring.n} · {ring.name} <b>Voir →</b></button>}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  );
}

function CreateShop({ onDone, email }: { onDone: () => void; email?: string }) {
  const [name, setName] = useState('BKO-STORE'); const [slug, setSlug] = useState(SHOP_SLUG); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) { setErr('Identifiant : lettres minuscules, chiffres et tirets (3 à 40 caractères).'); return; }
    setBusy(true); const { error } = await sb().rpc('create_shop', { p_name: name, p_slug: slug }); setBusy(false);
    if (error) setErr(errText(error)); else onDone();
  }
  return (
    <main className="wrap" style={{ maxWidth: 480 }}>
      <header className="bar"><ZelvoLogo /><ThemeButton /></header>
      <section className="hero"><h1>Créer votre boutique</h1><p>Connecté avec {email}. Cette étape ne se fait qu’une fois.</p></section>
      <form className="panel" style={{ marginTop: 16 }} onSubmit={create}>
        <div className="field" style={{ marginTop: 0 }}><label htmlFor="sn">Nom de la boutique</label><input id="sn" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="ss">Identifiant (dans l’adresse du site)</label><input id="ss" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} /></div>
        {err && <p className="err">{err}</p>}
        <div style={{ marginTop: 12 }}><button className="btn primary wide" disabled={busy}>{busy ? 'Création…' : 'Créer la boutique'}</button></div>
      </form>
    </main>
  );
}
