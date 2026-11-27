'use client';
import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { num, errText, enLettres } from '@/lib/format';
import { waLink, fmtPhone } from '@/lib/phone';
import { ThemeButton } from '../Brand';

const d8 = (p?: string | null) => String(p || '').replace(/\D/g, '').slice(-8);

export default function InvoiceDoc({ id }: { id: string }) {
  const [inv, setInv] = useState<any>(undefined); const [shop, setShop] = useState<any>(null); const [err, setErr] = useState('');
  useEffect(() => {
    (async () => {
      const { data: s } = await sb().auth.getSession();
      if (!s.session) { location.replace('/admin'); return; }
      const { data, error } = await sb().from('invoices').select('*').eq('id', id).maybeSingle();
      if (error || !data) { setErr(error ? errText(error) : 'Document introuvable.'); setInv(null); return; }
      const { data: sh } = await sb().from('shops').select('*').eq('id', data.shop_id).single();
      setShop(sh); setInv(data);
      document.title = data.number + ' · ' + (sh?.name || '');
    })();
  }, [id]);

  async function convert() {
    const { data, error } = await sb().rpc('invoice_convert', { p_invoice: inv.id });
    if (error) return setErr(errText(error));
    location.href = '/admin/facture/' + data.id;
  }

  if (inv === undefined) return <main className="wrap"><p className="muted" style={{ marginTop: 40 }}>Chargement…</p></main>;
  if (!inv) return <main className="wrap"><p className="err" style={{ marginTop: 40 }}>{err}</p><a href="/admin">Retour</a></main>;

  const isF = inv.kind === 'facture';
  const phones = [shop?.whatsapp, shop?.phone2, shop?.phone3].map(d8).filter((p) => p.length === 8);
  const sub = inv.items.reduce((a: number, l: any) => a + l.qty * l.price, 0);
  const waText = (isF ? 'Bonjour, voici votre facture ' : 'Bonjour, voici votre proforma ') + inv.number + ' de ' + shop?.name + ' : ' + num(inv.total) + ' FCFA.' +
    '\n' + inv.items.map((l: any) => '• ' + l.qty + ' × ' + l.label + ' — ' + num(l.qty * l.price) + ' FCFA').join('\n') +
    (inv.shipping ? '\n• Livraison — ' + num(inv.shipping) + ' FCFA' : '') + '\nMerci pour votre confiance.';
  const wa = waLink(inv.client_phone, waText);

  return (
    <main className="docpage">
      <div className="doc-tools noprint">
        <a className="btn sm" href="/admin">← Retour</a>
        <div className="right" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {!isF && <button className="btn sm" onClick={convert}>Transformer en facture</button>}
          {wa && <a className="btn sm wa" href={wa} target="_blank" rel="noopener">Envoyer sur WhatsApp</a>}
          <button className="btn sm primary" onClick={() => window.print()}>Imprimer / PDF</button>
          <ThemeButton />
        </div>
      </div>
      {err && <p className="err noprint">{err}</p>}
      <p className="muted noprint" style={{ margin: '0 0 12px' }}>Pour un PDF : « Imprimer / PDF », puis choisissez « Enregistrer en PDF » comme imprimante. Sur iPhone : Partager → Imprimer → pincez l’aperçu pour l’ouvrir en PDF.</p>

      <article className="paper">
        <header className="pp-top">
          <div>
            {shop?.logo_url ? <img src={shop.logo_url} alt={shop?.name} className="pp-logo" /> : <div className="pp-name">{shop?.name}</div>}
            <div className="pp-addr">
              {shop?.legal_name && <div>{shop.legal_name}</div>}
              {shop?.address && <div>{shop.address}</div>}
              {phones[0] && <div>+223 {fmtPhone(phones[0])} (WhatsApp)</div>}
              {phones.length > 1 && <div>+223 {phones.slice(1).map(fmtPhone).join(' · ')}</div>}
              {shop?.email && <div>{shop.email}</div>}
              {(shop?.rccm || shop?.nif) && <div>{shop.rccm ? 'RCCM ' + shop.rccm : ''}{shop.rccm && shop.nif ? ' · ' : ''}{shop.nif ? 'NIF ' + shop.nif : ''}</div>}
            </div>
          </div>
          <div className="pp-meta">
            <h1>{isF ? 'FACTURE' : 'PROFORMA'}</h1>
            <div>N° {inv.number}</div>
            <div>{new Date(inv.created_at).toLocaleDateString('fr-FR')}</div>
          </div>
        </header>
        <section className="pp-client">
          <span>{isF ? 'Facturé à' : 'Établi pour'}</span>
          <strong>{inv.client_name}</strong>
          {inv.client_phone && <div>{inv.client_phone}</div>}
          {inv.client_address && <div>{inv.client_address}</div>}
        </section>
        <table className="pp-table">
          <thead><tr><th>Désignation</th><th className="r">Qté</th><th className="r">P.U.</th><th className="r">Total</th></tr></thead>
          <tbody>
            {inv.items.map((l: any, i: number) => <tr key={i}><td>{l.label}</td><td className="r">{l.qty}</td><td className="r">{num(l.price)}</td><td className="r">{num(l.qty * l.price)}</td></tr>)}
            {inv.shipping > 0 && <tr><td>Livraison</td><td className="r">1</td><td className="r">{num(inv.shipping)}</td><td className="r">{num(inv.shipping)}</td></tr>}
          </tbody>
        </table>
        {inv.shipping > 0 && <div className="pp-sub"><span>Sous-total articles</span><span>{num(sub)} FCFA</span></div>}
        <div className="pp-total"><span>TOTAL</span><span>{num(inv.total)} FCFA</span></div>
        <p className="pp-words">Arrêté{isF ? 'e la présente facture' : ' le présent proforma'} à la somme de <b>{enLettres(inv.total)} francs CFA</b>.</p>
        {inv.note && <p className="pp-note">{inv.note}</p>}
        <footer className="pp-foot">
          <div><div>Paiement à la livraison</div>{inv.from_invoice && <div>Établie d’après le proforma accepté</div>}<div className="pp-sign">Signature et cachet</div></div>
          {shop?.stamp_url && <img src={shop.stamp_url} alt="" className="pp-stamp" />}
        </footer>
        <div className="pp-zelvo">Édité avec Zelvo</div>
      </article>
    </main>
  );
}
