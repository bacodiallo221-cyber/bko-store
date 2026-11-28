'use client';
import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { errText } from '@/lib/format';
import { mlPhone } from '@/lib/phone';
import { SOUNDS, playSound, getPref, setPref } from '@/lib/sounds';

const PHONES = ['whatsapp', 'phone2', 'phone3', 'owner_phone'];
const FIELDS: [string, string, string][] = [
  ['name', 'Nom de la boutique', 'BKO-STORE'], ['whatsapp', 'Numéro principal (WhatsApp)', '71 89 56 70'],
  ['phone2', 'Numéro secondaire', '71 88 84 09'], ['phone3', 'Autre numéro (facultatif)', ''],
  ['owner_phone', 'Votre numéro perso (jamais affiché)', '66 24 76 71'],
  ['legal_name', 'Responsable ou société', 'Souleymane Diallo'], ['rccm', 'N° RCCM (facultatif)', ''], ['nif', 'NIF (facultatif)', ''],
  ['address', 'Adresse', 'Hamdallaye ACI, Bamako'], ['email', 'E-mail', 'contact@boutique.ml'],
  ['announcement', 'Bandeau d’annonce (haut de la boutique)', 'Livraison rapide partout au Mali · Payez à la réception'], ['delivery_promise', 'Délai de livraison affiché', 'moins de 24 h'],
  ['apdp_number', 'N° de déclaration APDP (facultatif)', ''], ['refund_days', 'Satisfait ou remboursé (jours)', '2'],
  ['pixel_meta', 'Pixel Meta (ID)', ''], ['pixel_tiktok', 'Pixel TikTok (ID)', ''],
];

export default function Settings({ shop, toast, onSaved }: { shop: any; toast: (m: string) => void; onSaved: () => void }) {
  const [f, setF] = useState<any>(Object.fromEntries(FIELDS.map(([k]) => [k, shop[k] ?? ''])));
  const [err, setErr] = useState('');
  const [snd, setSnd] = useState(getPref('snd', 'tching')); const [on, setOn] = useState(getPref('sndOn', true)); const [twice, setTwice] = useState(getPref('twice', true));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    for (const k of PHONES) if (f[k] && !mlPhone(f[k]).ok) return setErr('« ' + FIELDS.find((x) => x[0] === k)![1] + ' » doit être un numéro malien.');
    const row: any = { ...f, refund_days: Number(f.refund_days) || 2 };
    for (const k of PHONES) if (row[k]) row[k] = mlPhone(row[k]).digits;
    Object.keys(row).forEach((k) => { if (row[k] === '') row[k] = k === 'name' ? shop.name : null; });
    const { error } = await sb().from('shops').update(row).eq('id', shop.id);
    if (error) return setErr(errText(error)); toast('Boutique enregistrée'); onSaved();
  }
  const pick = (k: string) => { setSnd(k); setPref('snd', k); playSound(k, 1); };

  return (
    <>
      <Identity shop={shop} toast={toast} onSaved={onSaved} />
      <MetaAds shop={shop} toast={toast} />
      <h2 style={{ fontSize: 16, marginTop: 22 }}>Sons des nouvelles commandes</h2>
      <div className="panel" style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        <label className="check" style={{ marginTop: 0 }}><input type="checkbox" checked={on} onChange={(e) => { setOn(e.target.checked); setPref('sndOn', e.target.checked); }} /><span>Son à chaque nouvelle commande (application ouverte)</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{Object.keys(SOUNDS).map((k) => <button key={k} type="button" className={'btn sm' + (snd === k ? ' primary' : '')} onClick={() => pick(k)}>{SOUNDS[k].label}</button>)}</div>
        <label className="check" style={{ marginTop: 0 }}><input type="checkbox" checked={twice} onChange={(e) => { setTwice(e.target.checked); setPref('twice', e.target.checked); }} /><span>Sonner deux fois</span></label>
      </div>
      <h2 style={{ fontSize: 16, marginTop: 22 }}>Informations de la boutique</h2>
      <p className="muted">Affichées dans les mentions légales, les conditions de vente et la politique de confidentialité.</p>
      <form className="panel" style={{ marginTop: 10 }} onSubmit={save}>
        <div className="two">{FIELDS.map(([k, l, ph]) => <div className="field" key={k}><label htmlFor={'s-' + k}>{l}</label><input id={'s-' + k} value={f[k]} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>)}</div>
        {err && <p className="err">{err}</p>}
        <div style={{ marginTop: 14 }}><button className="btn primary wide">Enregistrer</button></div>
      </form>
    </>
  );
}

const ACCENTS = [['#169B45', 'Vert'], ['#0C0C0E', 'Noir'], ['#C9302C', 'Rouge'], ['#1F3A93', 'Bleu'], ['#B8860B', 'Or'], ['#7A3EB1', 'Violet']];

// Tampon : le fond blanc devient transparent et l'encre devient bleu cachet, pour un rendu réaliste sur la facture.
async function inkStamp(file: File): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = URL.createObjectURL(file); });
  const max = 700, k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const x = c.getContext('2d')!; x.drawImage(img, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height), px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const a = Math.max(0, Math.min(255, (205 - l) * 1.7));
    px[i] = 23; px[i + 1] = 45; px[i + 2] = 120; px[i + 3] = a;
  }
  x.putImageData(d, 0, 0);
  return new Promise((ok) => c.toBlob((b) => ok(b!), 'image/png'));
}

function Identity({ shop, toast, onSaved }: { shop: any; toast: (m: string) => void; onSaved: () => void }) {
  const [busy, setBusy] = useState('');
  async function up(kind: 'logo' | 'stamp', e: any) {
    const file: File | undefined = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast('Image trop lourde (3 Mo maximum).');
    setBusy(kind);
    let body: Blob = file; let ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (kind === 'stamp') { try { body = await inkStamp(file); ext = 'png'; } catch { /* image gardée telle quelle */ } }
    const path = shop.id + '/marque/' + kind + '-' + Date.now() + '.' + ext;
    const { error } = await sb().storage.from('produits').upload(path, body, { upsert: false, contentType: kind === 'stamp' && ext === 'png' ? 'image/png' : file.type });
    if (error) { setBusy(''); return toast(errText(error)); }
    const url = sb().storage.from('produits').getPublicUrl(path).data.publicUrl;
    const { error: e2 } = await sb().from('shops').update({ [kind + '_url']: url }).eq('id', shop.id);
    setBusy(''); if (e2) return toast(errText(e2));
    toast(kind === 'logo' ? 'Logo enregistré' : 'Tampon enregistré'); onSaved();
  }
  async function clear(kind: 'logo' | 'stamp') {
    const { error } = await sb().from('shops').update({ [kind + '_url']: null }).eq('id', shop.id);
    if (error) return toast(errText(error)); onSaved();
  }
  async function accent(c: string) {
    const { error } = await sb().from('shops').update({ accent: c }).eq('id', shop.id);
    if (error) return toast(errText(error)); toast('Couleur enregistrée'); onSaved();
  }
  const Slot = ({ kind, label, hint }: { kind: 'logo' | 'stamp'; label: string; hint: string }) => (
    <div className="panel" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
      <strong>{label}</strong><span className="muted" style={{ marginTop: -6 }}>{hint}</span>
      <div style={{ height: 110, display: 'grid', placeItems: 'center', background: '#fff', border: '1px solid var(--line)' }}>
        {shop[kind + '_url'] ? <img src={shop[kind + '_url']} alt="" style={{ maxHeight: 96, maxWidth: '90%', objectFit: 'contain' }} /> : <span style={{ color: '#888', fontSize: 13 }}>Aucune image</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label className="btn sm primary" style={{ cursor: 'pointer' }}>{busy === kind ? 'Envoi…' : shop[kind + '_url'] ? 'Changer' : 'Ajouter'}
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => up(kind, e)} /></label>
        {shop[kind + '_url'] && <button type="button" className="btn sm" onClick={() => clear(kind)}>Retirer</button>}
      </div>
    </div>
  );
  return (
    <>
      <h2 style={{ fontSize: 16, marginTop: 18 }}>Identité de la boutique</h2>
      <p className="muted">Votre logo et votre couleur habillent la vitrine ; le tampon s’imprime sur les factures.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginTop: 10 }}>
        <Slot kind="logo" label="Logo" hint="PNG ou JPG, fond blanc ou transparent." />
        <Slot kind="stamp" label="Tampon" hint="Photo nette du cachet sur fond blanc." />
        <div className="panel" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <strong>Couleur de la vitrine</strong><span className="muted" style={{ marginTop: -6 }}>Boutons et prix côté client.</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{ACCENTS.map(([c, l]) =>
            <button key={c} type="button" title={l} aria-label={l} onClick={() => accent(c)}
              style={{ width: 40, height: 40, background: c, border: shop.accent === c ? '3px solid var(--fg)' : '1px solid var(--line)', cursor: 'pointer' }} />)}</div>
          <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Autre :
            <input type="color" defaultValue={shop.accent || '#169B45'} onBlur={(e) => accent(e.target.value.toUpperCase())} style={{ width: 48, height: 32, border: 0, padding: 0, background: 'none' }} /></label>
        </div>
      </div>
    </>
  );
}

function MetaAds({ shop, toast }: { shop: any; toast: (m: string) => void }) {
  const [f, setF] = useState<any>(null); const [err, setErr] = useState(''); const [open, setOpen] = useState(false);
  useEffect(() => { sb().from('shop_integrations').select('*').eq('shop_id', shop.id).maybeSingle().then(({ data }: any) => setF({ meta_account: data?.meta_account || '', meta_token: data?.meta_token || '', fx_rate: data?.fx_rate || 600, note: data?.last_sync_note || '', connected: !!data?.meta_token })); }, [shop.id]);
  if (!f) return null;
  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const acc = String(f.meta_account).replace(/^act_/, '').replace(/\D/g, '');
    if (acc && acc.length < 5) return setErr('Identifiant du compte publicitaire invalide.');
    const { error } = await sb().from('shop_integrations').upsert({ shop_id: shop.id, meta_account: acc || null, meta_token: f.meta_token.trim() || null, fx_rate: Number(f.fx_rate) || 1 });
    if (error) return setErr(errText(error));
    setF({ ...f, meta_account: acc, connected: !!f.meta_token.trim() }); toast('Meta Ads enregistré'); setOpen(false);
  }
  return (
    <>
      <h2 style={{ fontSize: 16, marginTop: 22 }}>Meta Ads (Facebook et Instagram)</h2>
      <div className="panel" style={{ marginTop: 10 }}>
        <p style={{ margin: 0 }}>{f.connected ? <><span className="badge t-ok">Connecté</span> compte {f.meta_account}{f.note ? ' · ' + f.note : ''}</> : 'Non connecté : les dépenses de chaque pub s’afficheront par produit dans le tableau de bord.'}</p>
        {!open ? <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setOpen(true)}>{f.connected ? 'Modifier' : 'Connecter Meta Ads'}</button> :
          <form onSubmit={save}>
            <div className="field"><label htmlFor="ma">Identifiant du compte publicitaire</label><input id="ma" value={f.meta_account} onChange={(e) => setF({ ...f, meta_account: e.target.value })} placeholder="act_123456789 ou 123456789" /></div>
            <div className="field"><label htmlFor="mt">Jeton d’accès (lecture seule « ads_read »)</label><input id="mt" type="password" autoComplete="off" value={f.meta_token} onChange={(e) => setF({ ...f, meta_token: e.target.value })} /></div>
            <div className="field"><label htmlFor="mf">Taux de change si le compte n’est pas en FCFA (1 unité = … FCFA)</label><input id="mf" inputMode="decimal" value={f.fx_rate} onChange={(e) => setF({ ...f, fx_rate: e.target.value })} />
              <span className="muted">Compte en XOF : rien à faire. En EUR : 655,957 automatique. En USD : mettez le taux de votre banque (ex. 600).</span></div>
            {err && <p className="err">{err}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button className="btn primary">Enregistrer</button><button type="button" className="btn" onClick={() => setOpen(false)}>Annuler</button></div>
          </form>}
      </div>
    </>
  );
}
