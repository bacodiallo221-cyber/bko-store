'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { sb, SHOP_SLUG } from '@/lib/supabase';
import { mlPhone } from '@/lib/phone';
import { fmt } from '@/lib/format';

const STEP: Record<string, number> = { a_appeler: 0, pas_reponse: 0, a_rappeler: 0, confirmee: 1, en_route: 2, livree: 3 };

function Track() {
  const qs = useSearchParams();
  const [num, setNum] = useState(qs.get('n') || ''); const [phone, setPhone] = useState('');
  const [res, setRes] = useState<any>(null); const [msg, setMsg] = useState('');
  useEffect(() => { if (qs.get('n')) document.getElementById('t-phone')?.focus(); }, [qs]);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setRes(null);
    const ph = mlPhone(phone);
    if (!/^\d{3,6}$/.test(num.trim()) || !ph.ok) { setMsg('Entrez le n° de commande et le téléphone utilisé pour commander.'); return; }
    const { data, error } = await sb().rpc('track_order', { p_slug: SHOP_SLUG, p_number: Number(num), p_phone: ph.digits });
    if (error || !data) { setMsg('Aucune commande trouvée avec ces informations.'); return; }
    setRes(data);
  }
  const k = res ? STEP[res.status] : -1;
  return (
    <div style={{ maxWidth: 560 }}>
      <section className="hero"><span className="kicker">Suivi</span><h1>Suivre ma commande</h1><p>Entrez le numéro reçu après votre commande et votre téléphone.</p></section>
      <form className="panel" style={{ marginTop: 14 }} onSubmit={go}>
        <div className="field" style={{ marginTop: 0 }}><label htmlFor="t-num">N° de commande</label><input id="t-num" inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value)} placeholder="Ex. 1024" /></div>
        <div className="field"><label htmlFor="t-phone">Téléphone</label><input id="t-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="76 00 00 00" /></div>
        {msg && <p className="err">{msg}</p>}
        <div style={{ marginTop: 12 }}><button className="btn primary wide">Voir le suivi</button></div>
      </form>
      {res && (
        <div className="panel" style={{ marginTop: 12 }}>
          <strong>Commande n° {res.number}</strong> · {fmt(res.total)}
          <span className="muted">{(res.items || []).map((i: any) => i.quantity + ' × ' + i.name).join(', ')}</span>
          {res.status === 'refusee' || res.status === 'annulee'
            ? <p className="info-line t-bad">Commande {res.status === 'refusee' ? 'refusée' : 'annulée'}.</p>
            : <ol className="steps">{['Reçue', 'Confirmée', 'En route', 'Livrée'].map((s, i) => <li key={s} className={i <= k ? 'on' : ''}>{s}</li>)}</ol>}
        </div>
      )}
    </div>
  );
}
export default function TrackBox() { return <Suspense><Track /></Suspense>; }
