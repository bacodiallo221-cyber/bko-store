'use client';
import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { errText } from '@/lib/format';
import { mlPhone, fmtPhone } from '@/lib/phone';
import { Sheet, copy } from './ui';

export default function Team({ shop, toast }: { shop: any; toast: (m: string) => void }) {
  const [list, setList] = useState<any[] | null>(null); const [products, setProducts] = useState<any[]>([]);
  const [invite, setInvite] = useState(false); const [msg, setMsg] = useState<any>(null); const [perm, setPerm] = useState<any>(null);
  const load = useCallback(async () => {
    const [m, p] = await Promise.all([
      sb().from('shop_members').select('*, driver_products(product_id)').eq('shop_id', shop.id).eq('role', 'driver').neq('status', 'removed').order('created_at'),
      sb().from('products').select('id,name').eq('shop_id', shop.id).order('name'),
    ]);
    if (m.error) return toast(errText(m.error)); setList(m.data || []); setProducts(p.data || []);
  }, [shop.id, toast]);
  useEffect(() => { load(); }, [load]);

  async function remove(d: any) {
    const { error } = await sb().rpc('remove_driver', { p_member: d.id });
    if (error) return toast(errText(error)); toast('Accès de ' + d.display_name + ' retiré'); load();
  }
  const names = (d: any) => d.all_products ? 'Tous les produits' : d.driver_products.map((x: any) => products.find((p) => p.id === x.product_id)?.name).filter(Boolean).join(', ');

  return (
    <>
      <div className="toolbar"><p className="muted" style={{ margin: 0 }}>Chaque livreur se connecte avec son numéro et son code. Il ne voit que les colis que vous lui confiez.</p>
        <button className="btn primary" onClick={() => setInvite(true)}>+ Ajouter un livreur</button></div>
      {!list ? <p className="muted">Chargement…</p> : !list.length ? <p className="empty" style={{ marginTop: 12 }}>Aucun livreur pour l’instant.</p> :
        <ul className="rows">{list.map((d) => (
          <li key={d.id}><div className="grow"><strong>{d.display_name}</strong> <span className={'pill t-' + (d.status === 'active' ? 'ok' : 'warn')}>{d.status === 'active' ? 'Connecté' : 'Invitation envoyée'}</span>
            <span className="muted">+223 {fmtPhone(d.phone)} · {d.area || '—'} · {names(d)}</span></div>
            <button className="btn sm" onClick={() => setPerm(d)}>Produits</button>
            <RemoveBtn onConfirm={() => remove(d)} />
          </li>))}</ul>}
      {invite && <InviteForm shop={shop} onClose={() => setInvite(false)} onDone={(m: any) => { setInvite(false); setMsg(m); load(); }} />}
      {msg && (
        <Sheet title={'Invitation de ' + msg.name.split(' ')[0]} onClose={() => setMsg(null)}>
          <p className="muted">Envoyez-lui ce message sur WhatsApp. Le code est valable 7 jours, une seule fois.</p>
          <div className="msg">{msg.text}</div>
          <div className="stack"><a className="btn wa wide" href={'https://wa.me/223' + msg.phone + '?text=' + encodeURIComponent(msg.text)} target="_blank" rel="noopener">Envoyer sur WhatsApp</a>
            <button className="btn wide" onClick={() => copy(msg.text, toast, 'Message copié')}>Copier le message</button></div>
        </Sheet>)}
      {perm && <PermForm d={perm} products={products} onClose={() => setPerm(null)} onSaved={() => { setPerm(null); load(); toast('Produits mis à jour'); }} />}
    </>
  );
}

function RemoveBtn({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return armed ? <button className="btn sm" style={{ background: 'var(--bad)', color: '#fff' }} onClick={onConfirm} onBlur={() => setArmed(false)}>Confirmer le retrait</button>
    : <button className="btn sm danger" onClick={() => setArmed(true)}>Retirer l’accès</button>;
}

function InviteForm({ shop, onClose, onDone }: any) {
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [area, setArea] = useState(''); const [err, setErr] = useState('');
  async function send(e: React.FormEvent) {
    e.preventDefault(); const ph = mlPhone(phone);
    if (name.trim().length < 2) return setErr('Entrez le nom du livreur.');
    if (!ph.ok) return setErr('Entrez un numéro malien valide (8 chiffres ou +223).');
    const { data: code, error } = await sb().rpc('invite_driver', { p_shop: shop.id, p_name: name.trim(), p_phone: ph.digits, p_area: area.trim() || null, p_products: null });
    if (error) return setErr(String(error.message).includes('duplicate') ? 'Ce numéro est déjà dans votre équipe.' : errText(error));
    const text = 'Bonjour ' + name.trim().split(' ')[0] + ', tu es ajouté comme livreur de ' + shop.name + '.\n1. Ouvre ce lien : ' + location.origin + '/livreur\n2. Ajoute-le à ton écran d’accueil (iPhone : Safari, Partager, Sur l’écran d’accueil. Android : Chrome, Installer l’application).\n3. Connecte-toi avec ton numéro +223 ' + fmtPhone(ph.digits) + ' et le code ' + String(code).replace(/(\d{3})(\d{3})/, '$1 $2') + '.';
    onDone({ name: name.trim(), phone: ph.digits, text });
  }
  return (
    <Sheet title="Ajouter un livreur" onClose={onClose}>
      <form onSubmit={send}>
        <div className="field" style={{ marginTop: 0 }}><label htmlFor="iv-n">Nom et prénom</label><input id="iv-n" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="iv-p">Téléphone</label><div className="phone"><span>+223</span><input id="iv-p" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="70 00 00 00" /></div></div>
        <div className="field"><label htmlFor="iv-a">Zone</label><input id="iv-a" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ex. Communes V et VI" /></div>
        {err && <p className="err">{err}</p>}
        <div style={{ marginTop: 14 }}><button className="btn primary wide">Créer l’invitation</button></div>
      </form>
    </Sheet>
  );
}

function PermForm({ d, products, onClose, onSaved }: any) {
  const [all, setAll] = useState(d.all_products); const [sel, setSel] = useState<string[]>(d.driver_products.map((x: any) => x.product_id)); const [err, setErr] = useState('');
  async function save() {
    if (!all && !sel.length) return setErr('Cochez au moins un produit.');
    const { error } = await sb().rpc('set_driver_products', { p_member: d.id, p_products: all ? null : sel });
    if (error) return setErr(String(error.message).includes('DELIVERY_IN_PROGRESS') ? 'Il a un colis en cours avec un produit retiré. Attendez la livraison.' : errText(error));
    onSaved();
  }
  return (
    <Sheet title={'Produits de ' + d.display_name.split(' ')[0]} onClose={onClose}>
      <p className="muted">Il ne recevra et ne verra que les commandes de ces produits.</p>
      <label className="check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /><span><strong>Tous les produits</strong></span></label>
      {!all && products.map((p: any) => <label key={p.id} className="check"><input type="checkbox" checked={sel.includes(p.id)} onChange={(e) => setSel(e.target.checked ? [...sel, p.id] : sel.filter((x) => x !== p.id))} /><span>{p.name}</span></label>)}
      {err && <p className="err">{err}</p>}
      <div style={{ marginTop: 14 }}><button className="btn primary wide" onClick={save}>Enregistrer</button></div>
    </Sheet>
  );
}
