'use client';
import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { fmt, num, errText } from '@/lib/format';
import { Sheet } from './ui';

type Line = { label: string; qty: string; price: string };

export default function Invoices({ shop, toast }: { shop: any; toast: (m: string) => void }) {
  const [list, setList] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'facture' | 'proforma'>('all');
  const [form, setForm] = useState<null | 'facture' | 'proforma'>(null);

  const load = useCallback(async () => {
    const { data, error } = await sb().from('invoices').select('id,kind,number,client_name,total,created_at,from_invoice')
      .eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(300);
    if (error) return toast(errText(error));
    setList(data || []);
  }, [shop.id, toast]);
  useEffect(() => { load(); }, [load]);

  async function convert(id: string) {
    const { data, error } = await sb().rpc('invoice_convert', { p_invoice: id });
    if (error) return toast(errText(error));
    location.href = '/admin/facture/' + data.id;
  }
  const converted = new Set((list || []).map((x) => x.from_invoice).filter(Boolean));
  const shown = (list || []).filter((x) => filter === 'all' || x.kind === filter);
  const month = (list || []).filter((x) => x.kind === 'facture' && new Date(x.created_at).getMonth() === new Date().getMonth() && new Date(x.created_at).getFullYear() === new Date().getFullYear());

  return (
    <>
      <div className="kpis">
        <div className="k"><div className="l">Factures ce mois</div><div className="v">{month.length}</div></div>
        <div className="k"><div className="l">Facturé ce mois</div><div className="v">{num(month.reduce((a, x) => a + x.total, 0))}</div></div>
        <div className="k"><div className="l">Proformas en attente</div><div className="v">{(list || []).filter((x) => x.kind === 'proforma' && !converted.has(x.id)).length}</div></div>
      </div>
      <div className="toolbar">
        <div className="chips">{([['all', 'Tout'], ['facture', 'Factures'], ['proforma', 'Proformas']] as const).map(([k, l]) =>
          <button key={k} type="button" className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{l}</button>)}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => setForm('proforma')}>+ Proforma</button>
          <button className="btn primary" onClick={() => setForm('facture')}>+ Facture</button>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>Astuce : depuis une commande, le bouton « Facture » ou « Proforma » remplit tout automatiquement.</p>
      {!list ? <p className="muted">Chargement…</p> : !shown.length ? <p className="empty" style={{ marginTop: 12 }}>Aucun document pour l’instant.</p> :
        <div className="tablewrap"><table className="inv-list">
          <thead><tr><th>N°</th><th>Client</th><th>Date</th><th style={{ textAlign: 'right' }}>Montant</th><th></th></tr></thead>
          <tbody>{shown.map((x) => (
            <tr key={x.id}>
              <td><a className="mono" href={'/admin/facture/' + x.id}>{x.number}</a></td>
              <td>{x.client_name}</td>
              <td className="muted" style={{ display: 'table-cell' }}>{new Date(x.created_at).toLocaleDateString('fr-FR')}</td>
              <td className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(x.total)}</td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                {x.kind === 'proforma' && !converted.has(x.id) && <button className="btn sm" onClick={() => convert(x.id)}>→ Facture</button>}{' '}
                <a className="btn sm" href={'/admin/facture/' + x.id}>Ouvrir</a>
              </td>
            </tr>))}</tbody>
        </table></div>}
      {form && <NewDoc shop={shop} kind={form} onClose={() => setForm(null)} />}
    </>
  );
}

function NewDoc({ shop, kind, onClose }: { shop: any; kind: 'facture' | 'proforma'; onClose: () => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [client, setClient] = useState(''); const [phone, setPhone] = useState(''); const [addr, setAddr] = useState('');
  const [lines, setLines] = useState<Line[]>([{ label: '', qty: '1', price: '' }]);
  const [ship, setShip] = useState(''); const [note, setNote] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { sb().from('products').select('id,name,price').eq('shop_id', shop.id).order('name').then(({ data }: any) => setProducts(data || [])); }, [shop.id]);

  const set = (i: number, k: keyof Line, v: string) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const addProduct = (id: string) => {
    const p = products.find((x) => x.id === id); if (!p) return;
    const blank = lines.findIndex((l) => !l.label && !l.price);
    const nl = { label: p.name, qty: '1', price: String(p.price) };
    setLines(blank >= 0 ? lines.map((l, j) => (j === blank ? nl : l)) : [...lines, nl]);
  };
  const total = lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.price) || 0), 0) + (Number(ship) || 0);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const items = lines.filter((l) => l.label.trim() || l.price).map((l) => ({ label: l.label.trim(), qty: Number(l.qty), price: Number(String(l.price).replace(/\s/g, '')) }));
    setBusy(true);
    const { data, error } = await sb().rpc('create_invoice', { p_shop: shop.id, p_kind: kind, p_client_name: client, p_client_phone: phone || null,
      p_client_address: addr || null, p_items: items, p_shipping: Number(ship) || 0, p_note: note || null, p_order: null, p_from: null });
    setBusy(false);
    if (error) return setErr(errText(error));
    location.href = '/admin/facture/' + data.id;
  }

  return (
    <Sheet title={kind === 'facture' ? 'Nouvelle facture' : 'Nouveau proforma'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="field" style={{ marginTop: 0 }}><label htmlFor="ic">Client (nom ou société)</label><input id="ic" value={client} onChange={(e) => setClient(e.target.value)} /></div>
        <div className="two">
          <div className="field"><label htmlFor="ip">Téléphone</label><input id="ip" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+223 …" /></div>
          <div className="field"><label htmlFor="ia">Adresse</label><input id="ia" value={addr} onChange={(e) => setAddr(e.target.value)} /></div>
        </div>
        <fieldset><legend>Lignes</legend>
          {products.length > 0 && <div className="field" style={{ marginTop: 0, marginBottom: 8 }}><select value="" onChange={(e) => addProduct(e.target.value)} aria-label="Ajouter un produit">
            <option value="">+ Ajouter un de vos produits…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmt(p.price)}</option>)}</select></div>}
          <div className="lines">{lines.map((l, i) => (
            <div className="line" key={i}>
              <input aria-label="Désignation" placeholder="Désignation" value={l.label} onChange={(e) => set(i, 'label', e.target.value)} />
              <input aria-label="Quantité" inputMode="numeric" placeholder="Qté" value={l.qty} onChange={(e) => set(i, 'qty', e.target.value.replace(/\D/g, ''))} />
              <input aria-label="Prix unitaire" inputMode="numeric" placeholder="Prix" value={l.price} onChange={(e) => set(i, 'price', e.target.value.replace(/\D/g, ''))} />
              <button type="button" className="btn sm" aria-label="Retirer la ligne" onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : [{ label: '', qty: '1', price: '' }])}>×</button>
            </div>))}</div>
          <button type="button" className="link" style={{ marginTop: 8 }} onClick={() => setLines([...lines, { label: '', qty: '1', price: '' }])}>+ Ligne libre</button>
        </fieldset>
        <div className="two">
          <div className="field"><label htmlFor="is">Livraison (FCFA)</label><input id="is" inputMode="numeric" value={ship} onChange={(e) => setShip(e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
          <div className="field"><label htmlFor="in">Note (facultatif)</label><input id="in" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <div className="sum"><div className="tot"><dt>Total</dt><dd>{fmt(total)}</dd></div></div>
        {err && <p className="err">{err}</p>}
        <button className="btn primary wide" disabled={busy}>{busy ? 'Création…' : 'Créer et ouvrir'}</button>
      </form>
    </Sheet>
  );
}
