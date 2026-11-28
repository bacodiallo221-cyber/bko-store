'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from '@/lib/supabase';
import { fmt, zoneName, errText } from '@/lib/format';
import { fmtPhone, waLink } from '@/lib/phone';
import { playSound, getPref } from '@/lib/sounds';
import { Sheet, copy, when } from './ui';

const CALL = ['a_appeler', 'pas_reponse', 'a_rappeler'];
const LABEL: Record<string, string> = { a_appeler: 'À appeler', pas_reponse: 'Pas de réponse', a_rappeler: 'À rappeler', confirmee: 'Confirmée', en_route: 'Chez le livreur', livree: 'Livrée', refusee: 'Refusée', annulee: 'Annulée' };
const TONE: Record<string, string> = { a_appeler: 'warn', pas_reponse: 'warn', a_rappeler: 'info', confirmee: 'info', en_route: 'ship', livree: 'ok', refusee: 'bad', annulee: 'mute' };
const total = (o: any) => (o.order_items || []).reduce((a: number, i: any) => a + i.amount, 0) + o.shipping_fee - (o.discount || 0);
const itemsText = (o: any) => (o.order_items || []).map((i: any) => i.product_name + ' × ' + i.quantity).join(', ');
const stLabel = (o: any) => o.status === 'en_route' && o.depot_id ? (o.handed_at ? 'Dans le car' : o.at_depot_at ? 'À la gare' : 'Vers la gare') : o.status === 'livree' && o.depot_id ? 'Récupérée' : LABEL[o.status];
const hm = (t: string) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function Orders({ shop, toast }: { shop: any; toast: (m: string) => void }) {
  const [orders, setOrders] = useState<any[]>([]); const [loaded, setLoaded] = useState(false);
  const [show, setShow] = useState<'todo' | 'done'>('todo');
  const [sheet, setSheet] = useState<any>(null);
  const [banner, setBanner] = useState<any>(null);
  const seen = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const { data, error } = await sb().from('orders')
      .select('*, order_items(*), delivery_zones(city,label,mode), driver:shop_members!orders_driver_id_fkey(display_name), depot:transport_depots(company,label)')
      .eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(400);
    if (error) { toast(errText(error)); return; }
    setOrders(data || []); setLoaded(true);
  }, [shop.id, toast]);

  useEffect(() => {
    load();
    const ch = sb().channel('orders-' + shop.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: 'shop_id=eq.' + shop.id }, (p: any) => {
        seen.current.add(p.new.id);
        // le son, la vibration et la notification sont gérés par l'espace vendeur (Admin.tsx)
        setBanner({ n: p.new.number, name: p.new.customer_name });
        setTimeout(() => setBanner(null), 8000);
        setTimeout(load, 600);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: 'shop_id=eq.' + shop.id }, (p: any) => {
        if (p.new.at_depot_at && !p.old?.at_depot_at) { playSound(getPref('snd', 'tching'), 1); toast('Livreur arrivé à la gare · n° ' + p.new.number); }
        load();
      })
      .subscribe();
    return () => { sb().removeChannel(ch); };
  }, [shop.id, load, toast]);

  async function update(o: any, patch: any, msg: string) {
    const { error } = await sb().from('orders').update(patch).eq('id', o.id);
    if (error) { toast(errText(error)); return false; }
    setSheet(null); toast(msg); load(); return true;
  }
  async function noAnswer(o: any) {
    const { data, error } = await sb().rpc('record_no_answer', { p_order: o.id });
    if (error) return toast(errText(error));
    setSheet(null); toast(data === 'annulee' ? 'n° ' + o.number + ' annulée après 3 appels sans réponse' : 'n° ' + o.number + ' : à rappeler (' + (o.call_attempts + 1) + '/3)'); load();
  }

  const byPhone = (ph: string, self: string) => {
    let d = 0, r = 0; orders.forEach((x) => { if (x.id !== self && x.customer_phone === ph) { if (x.status === 'livree') d++; if (x.status === 'refusee') r++; } });
    return r >= 2 ? ['bad', r + ' refus chez vous'] : r === 1 ? ['warn', d + ' livrée(s), 1 refus'] : d ? ['ok', 'Fidèle : ' + d + ' livrée(s)'] : ['mute', 'Nouveau client'];
  };
  const badges = (o: any) => {
    const h = byPhone(o.customer_phone, o.id), b: [string, string][] = [h as [string, string]];
    if (o.whatsapp === 'oui') b.push(['ok', 'WhatsApp ✓']); else if (o.whatsapp === 'non') b.push(['warn', 'Pas sur WhatsApp · appeler']);
    if ((o.landmark || '').length < 14) b.push(['bad', 'Repère imprécis']);
    if (CALL.includes(o.status) && orders.some((x) => x.id !== o.id && x.customer_phone === o.customer_phone && CALL.includes(x.status))) b.push(['bad', 'En double']);
    if (o.customer_lat) b.push(['info', 'Position GPS']);
    if (!o.marketing_optin) b.push(['mute', 'Refuse les offres']);
    if (o.unreachable_count) b.push(['bad', 'Injoignable ×' + o.unreachable_count + ' (livreur)']);
    if (o.at_depot_at) b.push(['ok', 'Livreur à la gare à ' + hm(o.at_depot_at)]);
    if (o.handed_at && !o.at_depot_at) b.push(['warn', 'Remis sans passage détecté à la gare']);
    return <div className="badges">{b.map(([t, l]) => <span key={l} className={'badge t-' + t}>{l}</span>)}</div>;
  };
  const action = (o: any) => {
    if (CALL.includes(o.status)) return <div className="oc-2"><button className="btn cta wide" onClick={() => setSheet({ k: 'call', o })}>Appeler{o.call_attempts ? ' (essai ' + (o.call_attempts + 1) + '/3)' : ''}</button><button className="btn wide" onClick={() => setSheet({ k: 'hand', list: [o] })}>{o.driver ? 'Relancer ' + o.driver.display_name.split(' ')[0] : 'Confier au livreur'}</button></div>;
    if (o.status === 'confirmee') return <button className="btn primary wide" onClick={() => setSheet({ k: 'ship', o })}>{o.depot_id ? 'Envoyer par car' : 'Envoyer au livreur'}</button>;
    if (o.status === 'en_route' && o.depot_id && o.handed_at) return <button className="btn primary wide" onClick={() => setSheet({ k: 'pickup', o })}>Le client a-t-il récupéré ?</button>;
    if (o.status === 'en_route') return <button className="btn wide" onClick={() => setSheet({ k: 'result', o })}>{o.depot_id ? 'Suivre le dépôt à la gare' : 'Résultat de la livraison'}</button>;
    return null;
  };
  async function invoice(o: any) {
    const kind = o.status === 'livree' ? 'facture' : 'proforma';
    const { data, error } = await sb().rpc('invoice_from_order', { p_order: o.id, p_kind: kind });
    if (error) return toast(errText(error));
    location.href = '/admin/facture/' + data.id;
  }
  const Card = (o: any) => (
    <li key={o.id} className={'oc' + (seen.current.has(o.id) && CALL.includes(o.status) ? ' fresh' : '')}>
      <div className="oc-top"><span className={'pill t-' + TONE[o.status]}>{stLabel(o)}</span><span className="amt">{fmt(total(o))}</span></div>
      <div><strong>{o.customer_name}</strong><span className="muted">{zoneName(o.delivery_zones)} · <span className="mono">n° {o.number}</span> · {when(o.created_at)}</span></div>
      <div style={{ fontSize: 14 }}>{itemsText(o)}
        {o.driver && <span className="muted">Livreur : {o.driver.display_name}</span>}
        {o.depot && <span className="muted">Car {o.depot.company}{o.bus_ticket ? ' · ticket ' + o.bus_ticket : ''}</span>}</div>
      {badges(o)}{action(o)}
      {!CALL.includes(o.status) && o.status !== 'annulee' && <button className="btn sm" onClick={() => invoice(o)}>{o.status === 'livree' ? 'Facture' : 'Proforma'}</button>}
    </li>
  );
  const group = (title: string, list: any[], why = '') => (
    <section className="group"><h2>{title} <span className="badge t-mute">{list.length}</span>{why && <span className="muted" style={{ display: 'inline', fontWeight: 400 }}>{why}</span>}</h2>
      {list.length ? <ul className="cards">{list.map(Card)}</ul> : <p className="empty">Rien à faire ici.</p>}</section>
  );
  const asc = (a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at);
  const calls = orders.filter((o) => CALL.includes(o.status)).sort(asc);
  const toShip = orders.filter((o) => o.status === 'confirmee').sort(asc);
  const road = orders.filter((o) => o.status === 'en_route' && !o.handed_at).sort(asc);
  const bus = orders.filter((o) => o.status === 'en_route' && o.handed_at).sort(asc);
  const done = orders.filter((o) => ['livree', 'refusee', 'annulee'].includes(o.status));

  return (
    <>
      <div className="kpis">
        <div className={'k' + (calls.length ? ' hot' : '')}><div className="l">À appeler</div><div className="v">{calls.length}</div></div>
        <div className="k"><div className="l">À livrer</div><div className="v">{toShip.length + road.length}</div></div>
        <div className="k"><div className="l">Dans le car</div><div className="v">{bus.length}</div></div>
      </div>
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={'btn sm' + (show === 'todo' ? ' primary' : '')} onClick={() => setShow('todo')}>À faire</button>
          <button className={'btn sm' + (show === 'done' ? ' primary' : '')} onClick={() => setShow('done')}>Terminées</button>
        </div>
        <NotifButton toast={toast} />
      </div>
      {!loaded ? <p className="muted">Chargement…</p> : show === 'done' ? group('Terminées', done) : <>
        {calls.length > 0 && <div className="hand-bar"><div><b>Pas le temps d’appeler ?</b><span className="muted">Envoyez les {calls.length} client{calls.length > 1 ? 's' : ''} à appeler à un livreur sur WhatsApp : nom, numéro, quartier, produit et montant. Il appelle, confirme et livre.</span></div>
          <button className="btn primary" onClick={() => setSheet({ k: 'hand', list: calls })}>📲 Confier les {calls.length} appels à un livreur</button></div>}
        {group('1. Appeler', calls, 'du plus ancien au plus récent')}
        {group('2. Envoyer', toShip)}
        {group('3. Chez le livreur', road)}
        {group('4. Dans le car', bus, 'envois vers les régions')}
      </>}
      {banner && <div className="notif" role="status"><span style={{ flex: 1 }}><strong>Tching ! Nouvelle commande n° {banner.n}</strong>{banner.name}</span><button className="btn sm cta" onClick={() => setBanner(null)}>OK</button></div>}
      {sheet?.k === 'call' && <CallSheet o={sheet.o} shop={shop} onClose={() => setSheet(null)} toast={toast}
        confirm={() => update(sheet.o, { status: 'confirmee' }, 'n° ' + sheet.o.number + ' confirmée')}
        later={() => update(sheet.o, { status: 'a_rappeler' }, 'n° ' + sheet.o.number + ' à rappeler')}
        cancel={() => update(sheet.o, { status: 'annulee' }, 'n° ' + sheet.o.number + ' annulée, stock remis')}
        noAnswer={() => noAnswer(sheet.o)} badges={badges(sheet.o)} />}
      {sheet?.k === 'ship' && <ShipSheet o={sheet.o} shop={shop} onClose={() => setSheet(null)}
        assign={(id: string, name: string) => update(sheet.o, { driver_id: id, status: 'en_route' }, 'Colis confié à ' + name)} />}
      {sheet?.k === 'hand' && <HandSheet list={sheet.list} shop={shop} toast={toast} onClose={() => setSheet(null)} onDone={() => { setSheet(null); load(); }} />}
      {sheet?.k === 'result' && <ResultSheet o={sheet.o} onClose={() => setSheet(null)} update={update} />}
      {sheet?.k === 'pickup' && <PickupSheet o={sheet.o} onClose={() => setSheet(null)} update={update} toast={toast} />}
    </>
  );
}

// Les livreurs appellent eux-mêmes les clients : la liste part sur leur WhatsApp et les commandes leur sont attribuées.
function HandSheet({ list, shop, toast, onClose, onDone }: any) {
  const [drivers, setDrivers] = useState<any[] | null>(null); const [pick, setPick] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { (async () => {
    const { data } = await sb().from('shop_members').select('id,display_name,phone,area,status').eq('shop_id', shop.id).eq('role', 'driver').neq('status', 'removed').order('display_name');
    setDrivers(data || []); if (data?.length === 1) setPick(data[0].id);
  })(); }, [shop.id]);
  const d = (drivers || []).find((x) => x.id === pick);
  const place = (o: any) => (o.delivery_zones?.mode === 'bus' ? (o.city || o.delivery_zones?.city) + ' (car ' + (o.delivery_zones?.label || '') + ')' : o.landmark);
  const text = d ? 'Bonjour ' + d.display_name.split(' ')[0] + ', voici ' + (list.length > 1 ? 'les ' + list.length + ' clients' : 'le client') + ' à appeler pour ' + shop.name + ' :\n\n'
    + list.map((o: any, i: number) => (i + 1) + ') N° ' + o.number + ' · ' + o.customer_name + ' · 📞 ' + fmtPhone(o.customer_phone)
      + '\n   📍 ' + place(o) + (o.customer_lat ? ' · https://maps.google.com/?q=' + o.customer_lat + ',' + o.customer_lng : '')
      + '\n   📦 ' + itemsText(o) + ' · 💵 ' + fmt(total(o)) + ' à encaisser' + (o.call_slot && o.call_slot !== 'indifferent' ? '\n   ⏰ préfère être appelé le ' + o.call_slot : '')).join('\n\n')
    + '\n\nAppelle chaque client, confirme l’adresse et l’heure, puis livre. Réponds-moi avec les numéros : ✅ confirmé · 📵 pas de réponse · ❌ annulé.' : '';
  async function send() {
    if (!d) return; setBusy(true);
    const href = waLink(d.phone, text); if (href) window.open(href, '_blank', 'noopener');
    let ok = 0, ko = 0;
    for (const o of list) { const { error } = await sb().from('orders').update({ driver_id: d.id }).eq('id', o.id); if (error) ko++; else ok++; }
    setBusy(false);
    toast(ok + ' commande' + (ok > 1 ? 's' : '') + ' confiée' + (ok > 1 ? 's' : '') + ' à ' + d.display_name + (ko ? ' · ' + ko + ' non autorisée' + (ko > 1 ? 's' : '') + ' (produits)' : ''));
    onDone();
  }
  return (
    <Sheet title={list.length > 1 ? 'Confier ' + list.length + ' appels à un livreur' : 'Confier n° ' + list[0].number + ' à un livreur'} onClose={onClose}>
      {!drivers ? <p className="muted">Chargement…</p> : !drivers.length ? <p className="info-line t-warn">Aucun livreur. Ajoutez-en un dans « Équipe et livreurs » avec son numéro WhatsApp.</p> : <>
        <div className="packs">{drivers.map((x) => (
          <label key={x.id} className={'pack' + (pick === x.id ? ' on' : '')}><input type="radio" name="hd" checked={pick === x.id} onChange={() => setPick(x.id)} />
            <span className="grow"><strong>{x.display_name}</strong><span className="muted">{x.phone ? '+223 ' + fmtPhone(x.phone) : 'pas de numéro'}{x.area ? ' · ' + x.area : ''}{x.status !== 'active' ? ' · pas encore connecté à l’app' : ''}</span></span></label>))}</div>
        {d && <><p className="muted" style={{ margin: '12px 0 6px' }}>Message envoyé sur son WhatsApp :</p><div className="msg" style={{ whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto' }}>{text}</div></>}
        <div className="stack" style={{ marginTop: 14 }}>
          <button className="btn primary wide" disabled={!d || busy || !waLink(d?.phone, 'x')} onClick={send}>{busy ? 'Envoi…' : 'Envoyer sur WhatsApp à ' + (d?.display_name.split(' ')[0] || 'livreur')}</button>
          {d && <button className="btn wide" onClick={() => copy(text, toast, 'Message copié')}>Copier le message</button>}
        </div>
        <p className="muted" style={{ marginTop: 10 }}>Quand il vous répond, ouvrez chaque commande et touchez « Le client confirme », « Pas de réponse » ou « Le client annule ». Le livreur reste choisi pour la livraison.</p></>}
    </Sheet>
  );
}

function NotifButton({ toast }: { toast: (m: string) => void }) {
  const [perm, setPerm] = useState<string>('default');
  useEffect(() => { try { setPerm(Notification.permission); } catch { setPerm('unsupported'); } }, []);
  if (perm === 'granted' || perm === 'unsupported') return <button className="btn sm" onClick={() => playSound(getPref('snd', 'tching'), 1)}>Tester le son</button>;
  return <button className="btn sm" onClick={async () => { try { const p = await Notification.requestPermission(); setPerm(p); toast(p === 'granted' ? 'Notifications activées' : 'Notifications refusées'); playSound(getPref('snd', 'tching'), 1); } catch {} }}>Activer les notifications</button>;
}

function CallSheet({ o, shop, onClose, toast, confirm, later, cancel, noAnswer, badges }: any) {
  const text = 'Bonjour ' + o.customer_name.split(' ')[0] + ', ici ' + shop.name + '. Vous avez commandé ' + itemsText(o) + ' pour ' + fmt(total(o)) + ', livraison à ' + zoneName(o.delivery_zones) + '.\nSerez-vous disponible pour recevoir le colis ? Répondez OUI pour confirmer.';
  return (
    <Sheet title={o.customer_name} onClose={onClose}>
      <p style={{ font: '600 20px var(--font-display)', margin: '0 0 8px' }}>+223 {fmtPhone(o.customer_phone)}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <a className="btn primary" href={'tel:+223' + o.customer_phone}>Appeler</a>
        {o.whatsapp !== 'non' && <a className="btn wa" href={'https://wa.me/223' + o.customer_phone + '?text=' + encodeURIComponent(text)} target="_blank" rel="noopener">WhatsApp</a>}
        <button className="btn" onClick={() => copy('+223' + o.customer_phone, toast, 'Numéro copié')}>Copier</button>
      </div>
      <dl className="sum"><div><dt>Commande</dt><dd>{itemsText(o)}</dd></div><div><dt>Adresse</dt><dd>{zoneName(o.delivery_zones)}, {o.landmark}</dd></div><div className="tot"><dt>À encaisser</dt><dd>{fmt(total(o))}</dd></div></dl>
      {badges}
      <div className="stack" style={{ marginTop: 14 }}>
        <button className="btn primary wide" onClick={confirm}>Le client confirme</button>
        <button className="btn wide" onClick={noAnswer}>Pas de réponse ({o.call_attempts + 1}/3)</button>
        <button className="btn wide" onClick={later}>Rappeler plus tard</button>
        <button className="btn danger wide" onClick={cancel}>Le client annule</button>
      </div>
    </Sheet>
  );
}

function ShipSheet({ o, shop, onClose, assign }: any) {
  const [drivers, setDrivers] = useState<any[] | null>(null); const [pick, setPick] = useState('');
  useEffect(() => { (async () => {
    const { data } = await sb().from('shop_members').select('id,display_name,area,status,all_products,driver_products(product_id)').eq('shop_id', shop.id).eq('role', 'driver').neq('status', 'removed');
    const ids = (o.order_items || []).map((i: any) => i.product_id);
    const list = (data || []).map((d: any) => { const allowed = d.all_products || ids.every((id: string) => d.driver_products.some((x: any) => x.product_id === id)); return { ...d, ok: d.status === 'active' && allowed, allowed }; });
    setDrivers(list); const first = list.find((d: any) => d.ok && !d.all_products) || list.find((d: any) => d.ok); if (first) setPick(first.id);
  })(); }, [o, shop.id]);
  return (
    <Sheet title={o.depot_id ? 'Envoyer par car' : 'Confier au livreur'} onClose={onClose}>
      <p className="muted">{o.customer_name} · {zoneName(o.delivery_zones)} · {fmt(total(o))}</p>
      {o.depot && <p className="info-line t-info">Le livreur apporte le colis à {o.depot.label}. Son arrivée dans l’enceinte de la gare vous sera signalée.</p>}
      {!drivers ? <p className="muted">Chargement…</p> : !drivers.length ? <p className="info-line t-warn">Aucun livreur. Ajoutez-en un dans l’onglet Équipe.</p> :
        <div className="packs" style={{ marginTop: 12 }}>{drivers.map((d) => (
          <label key={d.id} className={'pack' + (pick === d.id ? ' on' : '')} style={{ opacity: d.ok ? 1 : 0.5 }}>
            <input type="radio" name="drv" disabled={!d.ok} checked={pick === d.id} onChange={() => setPick(d.id)} />
            <span className="lbl"><strong>{d.display_name}</strong><span className="muted">{d.status !== 'active' ? 'Pas encore connecté à l’application' : !d.allowed ? 'Pas autorisé pour ces produits' : (d.area || '') + (d.all_products ? '' : ' · dédié à ces produits')}</span></span>
          </label>))}</div>}
      <div style={{ marginTop: 14 }}><button className="btn primary wide" disabled={!pick} onClick={() => { const d = drivers.find((x) => x.id === pick); assign(pick, d.display_name); }}>Confier le colis</button></div>
    </Sheet>
  );
}

function ResultSheet({ o, onClose, update }: any) {
  const [ticket, setTicket] = useState(''); const [err, setErr] = useState('');
  if (o.depot_id) return (
    <Sheet title="Dépôt à la gare" onClose={onClose}>
      <dl className="sum"><div><dt>Gare</dt><dd>{o.depot?.label}</dd></div><div><dt>Livreur</dt><dd>{o.driver?.display_name}</dd></div>
        <div><dt>Arrivée</dt><dd>{o.at_depot_at ? 'À la gare depuis ' + hm(o.at_depot_at) : 'Pas encore arrivé'}</dd></div></dl>
      <p className="muted">Normalement, le livreur saisit le n° de ticket dans son application. S’il vous l’a donné autrement :</p>
      <div className="field"><label htmlFor="vtk">N° de ticket du transporteur</label><input id="vtk" value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="Ex. DT-458712" /></div>
      {err && <p className="err">{err}</p>}
      <div className="stack" style={{ marginTop: 12 }}>
        <button className="btn primary wide" onClick={() => { if (ticket.trim().length < 2) return setErr('Saisissez le n° de ticket.'); update(o, { handed_at: new Date().toISOString(), bus_ticket: ticket.trim() }, 'Colis remis au car · ticket ' + ticket.trim()); }}>Enregistrer la remise au car</button>
        <button className="btn danger wide" onClick={() => update(o, { status: 'annulee' }, 'Envoi annulé, stock remis')}>Annuler l’envoi (retour en stock)</button>
      </div>
    </Sheet>
  );
  return (
    <Sheet title="Résultat de la livraison" onClose={onClose}>
      <p className="muted">Normalement, {o.driver?.display_name || 'le livreur'} le fait depuis son application. Utilisez ces boutons s’il vous a prévenu autrement.</p>
      <dl className="sum"><div><dt>Client</dt><dd>{o.customer_name}</dd></div><div className="tot"><dt>À encaisser</dt><dd>{fmt(total(o))}</dd></div></dl>
      <div className="stack"><button className="btn primary wide" onClick={() => update(o, { status: 'livree' }, 'n° ' + o.number + ' livrée')}>Livré, argent encaissé</button>
        <button className="btn danger wide" onClick={() => update(o, { status: 'refusee' }, 'n° ' + o.number + ' refusée, stock remis')}>Refusé par le client</button></div>
    </Sheet>
  );
}

function PickupSheet({ o, onClose, update, toast }: any) {
  const text = 'Bonjour ' + o.customer_name.split(' ')[0] + ', votre colis n° ' + o.number + ' (' + itemsText(o) + ') est parti par ' + (o.depot?.company || 'car') + ' vers la gare de ' + (o.delivery_zones?.city || '') + '. Ticket n° ' + o.bus_ticket + '. Montant à payer au retrait : ' + fmt(total(o)) + '.';
  return (
    <Sheet title={'Retrait à ' + (o.delivery_zones?.city || '')} onClose={onClose}>
      <p className="muted">Prévenez le client avec ce message, puis indiquez s’il a récupéré son colis.</p>
      <div className="msg">{text}</div>
      <div className="stack">
        <a className="btn wa wide" href={'https://wa.me/223' + o.customer_phone + '?text=' + encodeURIComponent(text)} target="_blank" rel="noopener">Envoyer sur WhatsApp</a>
        <button className="btn wide" onClick={() => copy(text, toast, 'Message copié')}>Copier le message</button>
        <button className="btn primary wide" onClick={() => update(o, { status: 'livree' }, 'n° ' + o.number + ' récupérée')}>Récupéré et payé</button>
        <button className="btn danger wide" onClick={() => update(o, { status: 'refusee' }, 'Retour du colis enregistré')}>Non récupéré, retour du colis</button>
      </div>
    </Sheet>
  );
}
