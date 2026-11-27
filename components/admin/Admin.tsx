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

function Dashboard({ session }: { session: any }) {
  const [shop, setShop] = useState<any>(undefined);
  const [tab, setTab] = useState('orders');
  const [toastMsg, setToastMsg] = useState('');
  const toast = useCallback((m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(''), 2800); }, []);

  const loadShop = useCallback(async () => {
    const { data: mem } = await sb().rpc('my_memberships');
    const admin = (mem || []).find((m: any) => m.role === 'owner' || m.role === 'manager');
    if (!admin) { setShop(null); return; }
    const { data } = await sb().from('shops').select('*').eq('id', admin.shop_id).single();
    setShop(data || null);
  }, []);
  useEffect(() => { loadShop(); }, [loadShop]);

  if (shop === undefined) return <main className="wrap"><p className="muted" style={{ marginTop: 40 }}>Chargement…</p></main>;
  if (shop === null) return <CreateShop onDone={loadShop} email={session.user?.email} />;

  const TABS = [['orders', 'Commandes'], ['dash', 'Tableau de bord'], ['invoices', 'Factures'], ['products', 'Produits'], ['zones', 'Zones et gares'], ['team', 'Équipe'], ['settings', 'Boutique']];
  return (
    <main className="wrap">
      <header className="bar">
        <ZelvoLogo />
        <div className="right"><Link href="/" target="_blank" className="btn sm">{shop.name} ↗</Link><ThemeButton /><button className="btn sm" onClick={() => sb().auth.signOut()}>Quitter</button></div>
      </header>
      {shop.slug !== SHOP_SLUG && <p className="info-line t-warn">Ce site affiche la boutique « {SHOP_SLUG} ». Votre boutique a l’identifiant « {shop.slug} » : mettez NEXT_PUBLIC_SHOP_SLUG={shop.slug} dans Vercel.</p>}
      <div className="adm-shell">
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
      <div style={{ minWidth: 0 }}>
      {tab === 'orders' && <Orders shop={shop} toast={toast} />}
      {tab === 'dash' && <DashboardView shop={shop} toast={toast} />}
      {tab === 'invoices' && <Invoices shop={shop} toast={toast} />}
      {tab === 'products' && <Products shop={shop} toast={toast} />}
      {tab === 'zones' && <Zones shop={shop} toast={toast} />}
      {tab === 'team' && <Team shop={shop} toast={toast} />}
      {tab === 'settings' && <Settings shop={shop} toast={toast} onSaved={loadShop} />}
      </div></div>
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </main>
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
