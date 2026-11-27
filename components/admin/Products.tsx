'use client';
import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { fmt, errText } from '@/lib/format';
import { Sheet, copy, uploadFile } from './ui';

export default function Products({ shop, toast }: { shop: any; toast: (m: string) => void }) {
  const [list, setList] = useState<any[] | null>(null); const [edit, setEdit] = useState<any>(null);
  const [reviews, setReviews] = useState<any>(null); const [adLink, setAdLink] = useState<any>(null);
  const load = useCallback(async () => {
    const { data, error } = await sb().from('products').select('*, product_offers(*)').eq('shop_id', shop.id).order('created_at', { ascending: false });
    if (error) return toast(errText(error)); setList(data || []);
  }, [shop.id, toast]);
  useEffect(() => { load(); }, [load]);
  async function stock(p: any, d: number) {
    const v = Math.max(0, p.stock + d);
    const { error } = await sb().from('products').update({ stock: v }).eq('id', p.id);
    if (error) return toast(errText(error)); load();
  }
  return (
    <>
      <div className="toolbar"><span className="muted">{list ? list.length + ' produit(s)' : ''}</span><button className="btn primary" onClick={() => setEdit({})}>+ Ajouter un produit</button></div>
      {!list ? <p className="muted">Chargement…</p> : !list.length ? <p className="empty" style={{ marginTop: 12 }}>Aucun produit. Ajoutez le premier.</p> :
        <ul className="rows">{list.map((p) => (
          <li key={p.id}>
            <span className="pic" style={{ width: 52, aspectRatio: '1', fontSize: 14 }}>{p.images?.[0] ? <img src={p.images[0]} alt="" /> : p.name.slice(0, 2).toUpperCase()}</span>
            <div className="grow"><strong>{p.name}</strong>{!p.active && <span className="badge t-mute" style={{ marginLeft: 6 }}>Masqué</span>}
              {p.promo_ends_at && new Date(p.promo_ends_at) > new Date() && <span className="badge t-warn" style={{ marginLeft: 6 }}>Promo en cours</span>}
              <span className="muted">Vendu {fmt(p.price)}{p.compare_price ? ' (au lieu de ' + fmt(p.compare_price) + ')' : ''} · acheté {fmt(p.cost)} · marge {fmt(p.price - p.cost)}</span></div>
            <span className={'pill t-' + (p.stock <= 0 ? 'bad' : p.stock <= 5 ? 'warn' : 'ok')}>{p.stock <= 0 ? 'Épuisé' : p.stock <= 5 ? 'Stock bas' : 'En stock'}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <button className="btn sm" aria-label="Retirer une unité" onClick={() => stock(p, -1)} disabled={p.stock <= 0}>−</button>
              <strong className="mono" style={{ minWidth: 34, textAlign: 'center' }}>{p.stock}</strong>
              <button className="btn sm" aria-label="Ajouter une unité" onClick={() => stock(p, 1)}>+</button></span>
            <button className="btn sm" onClick={() => setAdLink(p)}>Lien pub</button>
            <button className="btn sm" onClick={() => setReviews(p)}>Avis</button>
            <button className="btn sm primary" onClick={() => setEdit(p)}>Modifier</button>
          </li>))}</ul>}
      {edit && <ProductForm shop={shop} p={edit} all={list || []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); toast('Produit enregistré'); }} />}
      {reviews && <Reviews shop={shop} p={reviews} toast={toast} onClose={() => setReviews(null)} />}
      {adLink && <AdLink p={adLink} toast={toast} onClose={() => setAdLink(null)} />}
    </>
  );
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function AdLink({ p, toast, onClose }: any) {
  const base = location.origin + '/produit/' + p.id;
  const links = [
    ['Meta Ads (Facebook / Instagram)', base + '?utm_source=facebook&utm_medium=paid&utm_campaign=' + slug(p.name)],
    ['TikTok Ads', base + '?utm_source=tiktok&utm_medium=paid&utm_campaign=' + slug(p.name)],
    ['Lien simple (WhatsApp, statut…)', base],
  ];
  return (
    <Sheet title={'Liens de ' + p.name} onClose={onClose}>
      <p className="muted">Collez le lien Meta comme « URL du site web » de vos publicités. La dépense de chaque pub qui pointe vers ce lien est rattachée à ce produit dans le tableau de bord, et les commandes venues de la pub sont comptées.</p>
      <div className="stack" style={{ marginTop: 12 }}>{links.map(([l, u]) => (
        <div key={l} className="panel" style={{ padding: 12 }}>
          <strong style={{ fontSize: 14 }}>{l}</strong>
          <div className="mono" style={{ fontSize: 12, wordBreak: 'break-all', margin: '6px 0 10px', color: 'var(--muted)' }}>{u}</div>
          <button className="btn sm primary" onClick={() => copy(u, toast, 'Lien copié')}>Copier</button>
        </div>))}</div>
    </Sheet>
  );
}

type Block = { type: string; text?: string; url?: string; caption?: string; items?: any[] };
const BLOCKS: [string, string][] = [['title', 'Titre'], ['text', 'Texte'], ['image', 'Image ou GIF'], ['video', 'Vidéo'], ['benefits', 'Points forts'], ['faq', 'Questions']];

function toLocal(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso); const z = (n: number) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes());
}

function ProductForm({ shop, p, all, onClose, onSaved }: any) {
  const offer = (q: number) => (p.product_offers || []).find((o: any) => o.quantity === q)?.bundle_price || '';
  const [f, setF] = useState<any>({
    name: p.name || '', tagline: p.tagline || '', price: p.price || '', compare: p.compare_price || '', cost: p.cost ?? '', stock: p.stock ?? '',
    option_label: p.option_label || 'Couleur', options: (p.options || ['Standard']).join(', '), description: p.description || '', images: p.images || [],
    pack2: offer(2), pack3: offer(3), upsell: p.upsell_product_id || '', discount: p.upsell_discount ?? 20, active: p.active ?? true,
    promo: toLocal(p.promo_ends_at), stock_display: p.stock_display || 'low', low_at: p.low_stock_at ?? 10,
  });
  const [blocks, setBlocks] = useState<Block[]>(p.blocks || []);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [up, setUp] = useState('');
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function upload(e: any) {
    const files: File[] = Array.from(e.target.files || []); e.target.value = ''; if (!files.length) return;
    setUp('photos'); const urls: string[] = [];
    for (const file of files) { try { urls.push(await uploadFile(sb(), shop.id, file, 'produits')); } catch (x: any) { setErr('Envoi impossible : ' + x.message); } }
    setF((x: any) => ({ ...x, images: [...x.images, ...urls] })); setUp('');
  }
  const move = (i: number, d: number) => { const b = [...blocks]; const j = i + d; if (j < 0 || j >= b.length) return; [b[i], b[j]] = [b[j], b[i]]; setBlocks(b); };
  const setB = (i: number, v: Partial<Block>) => setBlocks(blocks.map((b, j) => (j === i ? { ...b, ...v } : b)));
  const add = (type: string) => setBlocks([...blocks, type === 'benefits' ? { type, items: ['', '', ''] } : type === 'faq' ? { type, items: [{ q: '', a: '' }] } : { type, text: '' }]);
  async function blockFile(i: number, e: any) {
    const file: File | undefined = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    if (file.size > 25 * 1024 * 1024) return setErr('Fichier trop lourd (25 Mo maximum).');
    setUp('b' + i);
    try { setB(i, { url: await uploadFile(sb(), shop.id, file, 'pages') }); } catch (x: any) { setErr('Envoi impossible : ' + x.message); }
    setUp('');
  }
  const promoIn = (h: number | 'minuit') => {
    const d = new Date(); if (h === 'minuit') d.setHours(23, 59, 0, 0); else d.setTime(d.getTime() + h * 3600000);
    setF({ ...f, promo: toLocal(d.toISOString()) });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const price = Number(f.price), cost = Number(f.cost || 0), stock = Number(f.stock || 0), compare = Number(f.compare || 0) || null;
    if (f.name.trim().length < 2) return setErr('Donnez un nom au produit.');
    if (!(price > 0)) return setErr('Indiquez le prix de vente.');
    if (cost >= price) return setErr('Le prix d’achat doit être plus bas que le prix de vente.');
    if (compare && compare <= price) return setErr('Le prix barré doit être plus haut que le prix de vente.');
    if (f.promo && !compare) return setErr('Pour un compte à rebours, indiquez le prix barré : c’est le prix qui s’applique à la fin.');
    const options = f.options.split(',').map((s: string) => s.trim()).filter(Boolean);
    const clean = blocks.map((b) => ({ ...b, items: b.type === 'benefits' ? (b.items || []).map((x: string) => x.trim()).filter(Boolean) : b.type === 'faq' ? (b.items || []).filter((x: any) => x.q?.trim() && x.a?.trim()) : undefined }))
      .filter((b) => (b.type === 'image' || b.type === 'video') ? b.url : (b.type === 'benefits' || b.type === 'faq') ? b.items?.length : b.text?.trim());
    const row = { shop_id: shop.id, name: f.name.trim(), tagline: f.tagline.trim() || null, price, compare_price: compare, cost, stock,
      option_label: f.option_label || 'Variante', options: options.length ? options : ['Standard'], description: f.description, images: f.images,
      upsell_product_id: f.upsell || null, upsell_discount: Number(f.discount) || 0, active: !!f.active,
      promo_ends_at: f.promo ? new Date(f.promo).toISOString() : null, stock_display: f.stock_display, low_stock_at: Number(f.low_at) || 10, blocks: clean };
    setBusy(true);
    const res = p.id ? await sb().from('products').update(row).eq('id', p.id).select().single() : await sb().from('products').insert(row).select().single();
    if (res.error) { setBusy(false); return setErr(errText(res.error)); }
    const id = res.data.id;
    await sb().from('product_offers').delete().eq('product_id', id);
    const offers = [[2, f.pack2], [3, f.pack3]].filter(([, v]) => Number(v) > 0).map(([q, v], i) => ({ product_id: id, quantity: q, bundle_price: Number(v), free_shipping: true, highlight: i === 0 }));
    if (offers.length) { const o = await sb().from('product_offers').insert(offers); if (o.error) { setBusy(false); return setErr(errText(o.error)); } }
    setBusy(false); onSaved();
  }

  return (
    <Sheet wide title={p.id ? 'Modifier le produit' : 'Nouveau produit'} onClose={onClose}>
      <form onSubmit={save}>
        <p className="kicker">1 · L’essentiel</p>
        <div className="field" style={{ marginTop: 6 }}><label htmlFor="pn">Nom</label><input id="pn" value={f.name} onChange={set('name')} /></div>
        <div className="field"><label htmlFor="pt">Accroche (une phrase sous le nom)</label><input id="pt" value={f.tagline} onChange={set('tagline')} placeholder="Ex. Marchez 30 minutes chaque soir, sans sortir de chez vous." /></div>
        <div className="two"><div className="field"><label htmlFor="pp">Prix de vente (FCFA)</label><input id="pp" inputMode="numeric" value={f.price} onChange={set('price')} /></div>
          <div className="field"><label htmlFor="pb">Prix barré (facultatif)</label><input id="pb" inputMode="numeric" value={f.compare} onChange={set('compare')} placeholder="Prix habituel" /></div></div>
        <div className="two"><div className="field"><label htmlFor="pc">Prix d’achat (FCFA)</label><input id="pc" inputMode="numeric" value={f.cost} onChange={set('cost')} /></div>
          <div className="field"><label htmlFor="ps">Stock</label><input id="ps" inputMode="numeric" value={f.stock} onChange={set('stock')} /></div></div>
        <div className="two"><div className="field"><label htmlFor="pl">Nom de l’option</label><input id="pl" value={f.option_label} onChange={set('option_label')} placeholder="Couleur, Pointure…" /></div>
          <div className="field"><label htmlFor="po">Choix (séparés par des virgules)</label><input id="po" value={f.options} onChange={set('options')} placeholder="Noir, Blanc" /></div></div>
        <div className="field"><label htmlFor="pi">Photos de la galerie (photos ou GIF)</label><input id="pi" type="file" accept="image/*" multiple onChange={upload} />
          {up === 'photos' && <span className="muted">Envoi en cours…</span>}
          {f.images.length > 0 && <div className="thumbs">{f.images.map((u: string, i: number) => <span key={u} style={{ position: 'relative' }}><img src={u} alt="" />{i === 0 && <span className="badge t-ok" style={{ position: 'absolute', left: 2, bottom: 2 }}>Principale</span>}<button type="button" className="x" style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, fontSize: 14 }} aria-label="Retirer la photo" onClick={() => setF({ ...f, images: f.images.filter((x: string) => x !== u) })}>×</button></span>)}</div>}</div>
        <div className="field"><label htmlFor="pd">Description courte</label><textarea id="pd" rows={3} value={f.description} onChange={set('description')} /></div>

        <p className="kicker" style={{ marginTop: 22 }}>2 · Urgence</p>
        <div className="field" style={{ marginTop: 6 }}><label htmlFor="pe">Fin de la promotion (compte à rebours)</label>
          <input id="pe" type="datetime-local" value={f.promo} onChange={set('promo')} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <button type="button" className="btn sm" onClick={() => promoIn('minuit')}>Ce soir minuit</button>
            <button type="button" className="btn sm" onClick={() => promoIn(24)}>24 h</button>
            <button type="button" className="btn sm" onClick={() => promoIn(72)}>3 jours</button>
            {f.promo && <button type="button" className="btn sm" onClick={() => setF({ ...f, promo: '' })}>Sans minuteur</button>}
          </div>
          <span className="muted" style={{ marginTop: 6 }}>À la fin, le prix passe automatiquement au prix barré : le compte à rebours est réel, conforme à la loi sur les prix.</span></div>
        <div className="two"><div className="field"><label htmlFor="pk">Afficher le stock restant</label>
          <select id="pk" value={f.stock_display} onChange={set('stock_display')}><option value="low">Seulement quand il en reste peu</option><option value="always">Toujours</option><option value="never">Jamais</option></select></div>
          <div className="field"><label htmlFor="pq">« Peu de stock » à partir de</label><input id="pq" inputMode="numeric" value={f.low_at} onChange={set('low_at')} /></div></div>

        <p className="kicker" style={{ marginTop: 22 }}>3 · Contenu de la page</p>
        <p className="muted" style={{ marginTop: 4 }}>Ajoutez des blocs dans l’ordre où le client les verra : GIF de démonstration, photos avant/après, points forts, questions fréquentes…</p>
        <div className="stack" style={{ marginTop: 10 }}>{blocks.map((b, i) => (
          <div key={i} className="panel" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>{BLOCKS.find(([k]) => k === b.type)?.[1]}</strong>
              <span style={{ display: 'flex', gap: 4 }}><button type="button" className="btn sm" aria-label="Monter" onClick={() => move(i, -1)}>↑</button><button type="button" className="btn sm" aria-label="Descendre" onClick={() => move(i, 1)}>↓</button><button type="button" className="btn sm danger" aria-label="Supprimer le bloc" onClick={() => setBlocks(blocks.filter((_, j) => j !== i))}>×</button></span>
            </div>
            {b.type === 'title' && <input className="blockin" value={b.text || ''} onChange={(e) => setB(i, { text: e.target.value })} placeholder="Ex. Pourquoi tout le monde l’adore" />}
            {b.type === 'text' && <textarea className="blockin" rows={4} value={b.text || ''} onChange={(e) => setB(i, { text: e.target.value })} placeholder="Votre texte. Une ligne vide = nouveau paragraphe." />}
            {(b.type === 'image' || b.type === 'video') && <>
              {b.url && (b.type === 'image' ? <img src={b.url} alt="" style={{ maxHeight: 140, display: 'block', marginBottom: 8 }} /> : <span className="mono muted" style={{ wordBreak: 'break-all', marginBottom: 8 }}>{b.url}</span>)}
              <label className="btn sm" style={{ cursor: 'pointer' }}>{up === 'b' + i ? 'Envoi…' : b.url ? 'Changer le fichier' : b.type === 'image' ? 'Choisir une image ou un GIF' : 'Choisir une vidéo (MP4, 25 Mo max)'}
                <input type="file" hidden accept={b.type === 'image' ? 'image/*' : 'video/mp4,video/webm,video/quicktime'} onChange={(e) => blockFile(i, e)} /></label>
              {b.type === 'video' && <input className="blockin" style={{ marginTop: 8 }} value={b.url || ''} onChange={(e) => setB(i, { url: e.target.value })} placeholder="…ou collez un lien YouTube" />}
              <input className="blockin" style={{ marginTop: 8 }} value={b.caption || ''} onChange={(e) => setB(i, { caption: e.target.value })} placeholder="Légende (facultatif)" />
            </>}
            {b.type === 'benefits' && <div className="stack">{(b.items || []).map((x: string, k: number) =>
              <input key={k} className="blockin" value={x} placeholder={'Point fort ' + (k + 1)} onChange={(e) => setB(i, { items: (b.items || []).map((y, m) => (m === k ? e.target.value : y)) })} />)}
              <button type="button" className="link" onClick={() => setB(i, { items: [...(b.items || []), ''] })}>+ Point fort</button></div>}
            {b.type === 'faq' && <div className="stack">{(b.items || []).map((x: any, k: number) => <div key={k} className="stack" style={{ gap: 4 }}>
              <input className="blockin" value={x.q} placeholder="Question" onChange={(e) => setB(i, { items: (b.items || []).map((y, m) => (m === k ? { ...y, q: e.target.value } : y)) })} />
              <textarea className="blockin" rows={2} value={x.a} placeholder="Réponse" onChange={(e) => setB(i, { items: (b.items || []).map((y, m) => (m === k ? { ...y, a: e.target.value } : y)) })} /></div>)}
              <button type="button" className="link" onClick={() => setB(i, { items: [...(b.items || []), { q: '', a: '' }] })}>+ Question</button></div>}
          </div>))}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>{BLOCKS.map(([k, l]) => <button key={k} type="button" className="btn sm" onClick={() => add(k)}>+ {l}</button>)}</div>

        <p className="kicker" style={{ marginTop: 22 }}>4 · Offres</p>
        <div className="two"><div className="field"><label htmlFor="p2">Prix pack 2 pièces (facultatif)</label><input id="p2" inputMode="numeric" value={f.pack2} onChange={set('pack2')} /></div>
          <div className="field"><label htmlFor="p3">Prix pack 3 pièces (facultatif)</label><input id="p3" inputMode="numeric" value={f.pack3} onChange={set('pack3')} /></div></div>
        <div className="two"><div className="field"><label htmlFor="pu">Offre après la commande</label><select id="pu" value={f.upsell} onChange={set('upsell')}><option value="">Aucune</option>{all.filter((x: any) => x.id !== p.id).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="field"><label htmlFor="pr">Réduction de l’offre (%)</label><input id="pr" inputMode="numeric" value={f.discount} onChange={set('discount')} /></div></div>
        <label className="check"><input type="checkbox" checked={f.active} onChange={set('active')} /><span>Visible dans la boutique</span></label>
        {err && <p className="err" role="alert">{err}</p>}
        <div style={{ marginTop: 14, position: 'sticky', bottom: 0, background: 'var(--surface)', paddingBlock: 8 }}><button className="btn primary wide" disabled={busy || !!up}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      </form>
    </Sheet>
  );
}

function Reviews({ shop, p, toast, onClose }: any) {
  const [list, setList] = useState<any[] | null>(null);
  const [f, setF] = useState({ author: '', city: '', rating: 5, body: '', image_url: '' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const load = useCallback(async () => { const { data } = await sb().from('product_reviews').select('*').eq('product_id', p.id).order('created_at', { ascending: false }); setList(data || []); }, [p.id]);
  useEffect(() => { load(); }, [load]);
  async function pic(e: any) { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; setBusy(true); try { setF({ ...f, image_url: await uploadFile(sb(), shop.id, file, 'avis') }); } catch (x: any) { setErr(x.message); } setBusy(false); }
  async function addReview(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (f.author.trim().length < 2) return setErr('Indiquez le prénom du client.');
    if (!f.body.trim() && !f.image_url) return setErr('Ajoutez son message ou une capture.');
    const { error } = await sb().from('product_reviews').insert({ shop_id: shop.id, product_id: p.id, author: f.author.trim(), city: f.city.trim() || null, rating: f.rating, body: f.body.trim() || null, image_url: f.image_url || null });
    if (error) return setErr(errText(error));
    setF({ author: '', city: '', rating: 5, body: '', image_url: '' }); load(); toast('Avis ajouté');
  }
  async function toggle(r: any) { await sb().from('product_reviews').update({ visible: !r.visible }).eq('id', r.id); load(); }
  async function del(r: any) { await sb().from('product_reviews').delete().eq('id', r.id); load(); }
  return (
    <Sheet title={'Avis · ' + p.name} onClose={onClose}>
      <p className="muted">Ajoutez les vrais retours de vos clients : leur message WhatsApp (en capture), la photo du colis reçu. Des avis inventés sont interdits et font perdre la confiance.</p>
      <form onSubmit={addReview} className="panel" style={{ marginTop: 10, padding: 12 }}>
        <div className="two"><div className="field" style={{ marginTop: 0 }}><label htmlFor="ra">Prénom du client</label><input id="ra" value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} placeholder="Awa K." /></div>
          <div className="field" style={{ marginTop: 0 }}><label htmlFor="rc">Ville</label><input id="rc" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Bamako" /></div></div>
        <div className="field"><label>Note</label><div className="chips">{[5, 4, 3].map((n) => <button key={n} type="button" className={'chip' + (f.rating === n ? ' on' : '')} onClick={() => setF({ ...f, rating: n })}>{'★'.repeat(n)}</button>)}</div></div>
        <div className="field"><label htmlFor="rb">Son message</label><textarea id="rb" rows={2} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
        <div className="field"><label className="btn sm" style={{ cursor: 'pointer', display: 'inline-flex' }}>{busy ? 'Envoi…' : f.image_url ? 'Capture ajoutée ✓' : 'Ajouter une capture ou photo'}<input type="file" hidden accept="image/*" onChange={pic} /></label></div>
        {err && <p className="err">{err}</p>}
        <button className="btn primary wide" style={{ marginTop: 10 }} disabled={busy}>Ajouter l’avis</button>
      </form>
      <ul className="rows">{(list || []).map((r) => <li key={r.id}>
        {r.image_url && <img src={r.image_url} alt="" style={{ width: 44, height: 44, objectFit: 'cover' }} />}
        <div className="grow"><strong>{r.author}</strong> <span style={{ color: '#E0A100' }}>{'★'.repeat(r.rating)}</span><span className="muted">{r.city}{r.body ? ' · ' + r.body : ''}</span></div>
        <button className="btn sm" onClick={() => toggle(r)}>{r.visible ? 'Masquer' : 'Afficher'}</button><button className="btn sm danger" onClick={() => del(r)}>Supprimer</button></li>)}</ul>
    </Sheet>
  );
}
