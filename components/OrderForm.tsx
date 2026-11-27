'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { sb, SHOP_SLUG } from '@/lib/supabase';
import { mlPhone, fmtPhone, waLink } from '@/lib/phone';
import { fmt, promise, zoneName, errText } from '@/lib/format';

export default function OrderForm({ product, zones, shop }: { product: any; zones: any[]; shop: any }) {
  const packs = useMemo(() => [{ quantity: 1, bundle_price: product.price, free_shipping: false, highlight: false }, ...(product.offers || [])]
    .filter((k) => k.quantity <= Math.max(1, product.stock)), [product]);
  const bamako = zones.filter((z) => z.city === 'Bamako'), others = zones.filter((z) => z.city !== 'Bamako');
  const [qty, setQty] = useState(1);
  const [opt, setOpt] = useState(product.options?.[0] || 'Standard');
  const [zoneId, setZoneId] = useState(zones[0]?.id || '');
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [lm, setLm] = useState('');
  const [ready, setReady] = useState(false); const [optout, setOptout] = useState(false);
  const [gps, setGps] = useState<[number, number] | null>(null); const [gpsMsg, setGpsMsg] = useState('Aide le livreur à vous trouver plus vite.');
  const [slot, setSlot] = useState('indifferent'); const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    // Origine de la visite (pub Facebook, TikTok…) : gardée pendant la visite pour mesurer la pub.
    try {
      const q = new URLSearchParams(location.search);
      const s = q.get('utm_source') || (q.get('fbclid') ? 'facebook' : q.get('ttclid') ? 'tiktok' : null);
      if (s) sessionStorage.setItem('zelvo-src', s.toLowerCase());
      setSource(s || sessionStorage.getItem('zelvo-src'));
    } catch {}
  }, []);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [fails, setFails] = useState(0);
  const [busy, setBusy] = useState(false); const [serverErr, setServerErr] = useState('');
  const [done, setDone] = useState<any>(null); const [upsellState, setUpsellState] = useState<'offer' | 'added' | 'no'>('offer');
  const nameRef = useRef<HTMLInputElement>(null), phoneRef = useRef<HTMLInputElement>(null), lmRef = useRef<HTMLInputElement>(null), readyRef = useRef<HTMLInputElement>(null);

  const zone = zones.find((z) => z.id === zoneId);
  const pack = packs.find((k) => k.quantity === qty) || packs[0];
  const fee = pack.free_shipping ? 0 : zone?.fee || 0;
  const total = pack.bundle_price + fee;
  const isBus = zone?.mode === 'bus';

  if (product.stock <= 0) return <p className="info-line t-bad">Ce produit est épuisé pour le moment.</p>;
  if (!zones.length) return <p className="info-line t-warn">Les zones de livraison ne sont pas encore configurées.</p>;

  function askGps() {
    setGpsMsg('Recherche de votre position…');
    if (!navigator.geolocation) { setGpsMsg('Position indisponible sur cet appareil.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setGps([p.coords.latitude, p.coords.longitude]); setGpsMsg('Position ajoutée. Le livreur vous trouvera plus vite.'); },
      () => setGpsMsg('Position refusée ou indisponible. Ce n’est pas obligatoire.'), { timeout: 8000, enableHighAccuracy: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setServerErr('');
    const ph = mlPhone(phone); const er: Record<string, string> = {};
    if (name.trim().length < 3) er.name = 'Entrez votre nom et prénom.';
    if (!ph.ok) er.phone = ph.foreign ? 'Seuls les numéros du Mali sont acceptés (+223).' : ph.empty ? 'Entrez votre numéro de téléphone.' : 'Numéro non valide : 8 chiffres d’un opérateur malien (ex. 76 12 34 56), ou avec l’indicatif +223.';
    if (lm.trim().length < 6) er.lm = 'Indiquez votre quartier et un repère que le livreur peut trouver.';
    if (!ready) er.ready = 'Cochez cette case pour confirmer que vous recevrez et paierez le colis.';
    if (!ph.ok) setFails((f) => f + 1);
    setErrs(er);
    if (er.name) return nameRef.current?.focus(); if (er.phone) return phoneRef.current?.focus();
    if (er.lm) return lmRef.current?.focus(); if (er.ready) return readyRef.current?.focus();
    setBusy(true);
    const { data, error } = await sb().rpc('place_order', {
      p_slug: SHOP_SLUG, p_product: product.id, p_quantity: qty, p_option: opt, p_name: name.trim(), p_phone: ph.digits,
      p_zone: zoneId, p_landmark: lm.trim(), p_optin: !optout, p_ready: true,
      p_lat: !isBus && gps ? gps[0] : null, p_lng: !isBus && gps ? gps[1] : null,
      p_slot: slot, p_source: source,
    });
    setBusy(false);
    if (error) { setServerErr(errText(error)); if (String(error.message).includes('BAD_PHONE')) setFails((f) => f + 1); return; }
    setDone({ ...data, phone: ph.digits, items: [qty + ' × ' + product.name + ' (' + opt + ')'] });
    try { (window as any).fbq?.('track', 'Purchase', { value: data.total, currency: 'XOF' }); (window as any).ttq?.track?.('CompletePayment', { value: data.total, currency: 'XOF' }); } catch {}
  }

  async function addUpsell() {
    const { data, error } = await sb().rpc('add_upsell', { p_slug: SHOP_SLUG, p_number: done.number, p_phone: done.phone });
    if (error) { setUpsellState('no'); return; }
    setDone({ ...done, total: data.total, items: [...done.items, '1 × ' + done.upsell.name] }); setUpsellState('added');
  }

  if (done) {
    return (
      <div className="codform done" role="status">
        <div className="okmark" aria-hidden="true">✓</div>
        <h2>Commande n° {done.number} enregistrée</h2>
        <p className="muted" style={{ display: 'block', margin: '6px 0 10px' }}>Nous vous appelons au +223 {fmtPhone(done.phone)} pour confirmer.</p>
        {done.upsell && upsellState === 'offer' && (
          <div className="offer">
            <strong>Ajoutez {done.upsell.name} dans le même colis</strong>
            <p className="muted">{fmt(done.upsell.price)} au lieu de {fmt(done.upsell.regular_price)}, sans frais de livraison en plus.</p>
            <div className="stack"><button className="btn cta" onClick={addUpsell}>Oui, ajouter</button><button className="btn" onClick={() => setUpsellState('no')}>Non merci</button></div>
          </div>
        )}
        <dl className="sum" style={{ textAlign: 'left' }}>
          {done.items.map((t: string) => <div key={t}><dt>{t}</dt><dd /></div>)}
          <div className="tot"><dt>À payer à la réception</dt><dd>{fmt(done.total)}</dd></div>
        </dl>
        <Link className="btn primary wide" href={'/suivi?n=' + done.number}>Suivre ma commande</Link>
      </div>
    );
  }

  const help = fails >= 2 ? waLink(shop.whatsapp, 'Bonjour, je veux commander ' + product.name + ' mais mon numéro n’est pas accepté sur le site. Pouvez-vous m’aider ?') : null;

  return (
    <>
      <div className="facts"><span className="fact t-info">{promise(zone)}</span></div>
      <form className="codform" onSubmit={submit} noValidate>
        <h2>Commander, payer à la livraison</h2>
        <p className="muted">Rien à payer maintenant. Nous vous appelons pour confirmer.</p>
        {packs.length > 1 && (
          <fieldset><legend>Quantité</legend><div className="packs">
            {packs.map((k) => (
              <label key={k.quantity} className={'pack' + (qty === k.quantity ? ' on' : '')}>
                {k.highlight && <span className="best">Meilleur prix</span>}
                <input type="radio" name="pack" checked={qty === k.quantity} onChange={() => setQty(k.quantity)} />
                <span className="lbl"><strong>{k.quantity} pièce{k.quantity > 1 ? 's' : ''}</strong>
                  {k.free_shipping ? <span className="free">Livraison offerte</span> : <span className="muted">+ livraison selon la zone</span>}</span>
                <span className="pr">{fmt(k.bundle_price)}</span>
              </label>))}
          </div></fieldset>
        )}
        {product.options?.length > 1 && (
          <fieldset><legend>{product.option_label}</legend><div className="chips" role="radiogroup">
            {product.options.map((o: string) => <button type="button" key={o} role="radio" aria-checked={opt === o} className={'chip' + (opt === o ? ' on' : '')} onClick={() => setOpt(o)}>{o}</button>)}
          </div></fieldset>
        )}
        <div className="field"><label htmlFor="f-name">Nom et prénom</label>
          <input id="f-name" ref={nameRef} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={errs.name ? 'bad' : ''} placeholder="Ex. Awa Traoré" />
          {errs.name && <p className="err">{errs.name}</p>}</div>
        <div className="field"><label htmlFor="f-phone">Téléphone ou WhatsApp</label>
          <div className={'phone' + (errs.phone ? ' bad' : '')}><span>+223</span><input id="f-phone" ref={phoneRef} type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="76 00 00 00" /></div>
          {errs.phone && <p className="err">{errs.phone}</p>}
          {help && errs.phone && <div className="help"><span><strong>Un souci avec votre numéro ?</strong> Écrivez-nous sur WhatsApp au <strong>+223 {fmtPhone(mlPhone(shop.whatsapp).digits || '')}</strong> : nous enregistrons votre commande avec vous.</span>
            <a className="btn sm wa" href={help} target="_blank" rel="noopener">Nous écrire sur WhatsApp</a></div>}
        </div>
        <div className="field"><label htmlFor="f-zone">Ville et commune</label>
          <select id="f-zone" value={zoneId} onChange={(e) => { setZoneId(e.target.value); setGps(null); }}>
            {bamako.length > 0 && <optgroup label="Bamako">{bamako.map((z) => <option key={z.id} value={z.id}>{z.label} · livraison {fmt(z.fee)}</option>)}</optgroup>}
            {others.length > 0 && <optgroup label="Autres villes">{others.map((z) => <option key={z.id} value={z.id}>{z.label} · {fmt(z.fee)}</option>)}</optgroup>}
          </select></div>
        <div className="field"><label htmlFor="f-lm">Quartier et point de repère</label>
          <input id="f-lm" ref={lmRef} value={lm} onChange={(e) => setLm(e.target.value)} className={errs.lm ? 'bad' : ''} placeholder="Ex. Hamdallaye, près de la station Total, portail noir" />
          {errs.lm && <p className="err">{errs.lm}</p>}
          {isBus ? <p className="info-line t-info">Envoi par car {zone.carrier || ''} : vous récupérez votre colis à la gare de {zone.city}. Nous vous appelons à son arrivée.</p>
            : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', alignItems: 'center', marginTop: 8 }}>
                <button type="button" className="btn sm" onClick={askGps}>Partager ma position (facultatif)</button><span className="muted">{gpsMsg}</span></div>}
        </div>
        <fieldset><legend>Quand pouvons-nous vous appeler ?</legend><div className="chips" role="radiogroup">
          {[['matin', 'Matin'], ['apres_midi', 'Après-midi'], ['soir', 'Soir'], ['indifferent', 'N’importe quand']].map(([k, l]) =>
            <button key={k} type="button" role="radio" aria-checked={slot === k} className={'chip' + (slot === k ? ' on' : '')} onClick={() => setSlot(k)}>{l}</button>)}
        </div></fieldset>
        <dl className="sum" aria-label="Récapitulatif">
          <div><dt>{qty} × {product.name}{product.options?.length > 1 ? ' (' + opt + ')' : ''}</dt><dd>{fmt(pack.bundle_price)}</dd></div>
          <div><dt>Livraison, {zoneName(zone)}</dt><dd>{fee ? fmt(fee) : 'Offerte'}</dd></div>
          <div className="tot"><dt>À payer à la réception</dt><dd>{fmt(total)}</dd></div>
        </dl>
        <p className="prequal"><strong>Avant de valider :</strong> commandez seulement si vous êtes joignable à ce numéro, présent à {zone?.city} dans les prochains jours et prêt à payer à la réception.</p>
        <label className="check"><input ref={readyRef} type="checkbox" checked={ready} onChange={(e) => setReady(e.target.checked)} /><span>Je serai disponible pour recevoir mon colis et je paierai {fmt(total)} à la livraison.</span></label>
        {errs.ready && <p className="err">{errs.ready}</p>}
        <label className="check"><input type="checkbox" checked={optout} onChange={(e) => setOptout(e.target.checked)} /><span>Je ne souhaite pas recevoir les offres de {shop.name} sur WhatsApp.</span></label>
        {serverErr && <p className="err" role="alert">{serverErr}</p>}
        <div style={{ marginTop: 14 }}><button className="btn cta wide" type="submit" disabled={busy}>{busy ? 'Envoi…' : 'Valider ma commande'}</button></div>
        <p className="legal">En validant, vous acceptez les <Link href="/conditions">conditions de vente</Link>. Vos coordonnées servent à livrer cette commande (<Link href="/confidentialite">vos données</Link>). Satisfait ou remboursé sous {shop.refund_days || 2} jours après réception.</p>
      </form>
    </>
  );
}
