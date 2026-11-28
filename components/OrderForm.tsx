'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { sb, SHOP_SLUG } from '@/lib/supabase';
import { mlPhone, fmtPhone, waLink } from '@/lib/phone';
import { fmt, num, errText } from '@/lib/format';
import { Q, T, HUBS, find, km, tier, norm } from '@/lib/places';

type Pt = { name: string; lat: number; lng: number };
const SLOTS: [string, string][] = [['matin', '🌅 Matin'], ['apres_midi', '☀️ Midi'], ['soir', '🌙 Soir'], ['indifferent', '👍 Libre']];
const COLORS = ['#1F3A93', '#C9302C', '#0C7C59', '#B8860B', '#7A3EB1', '#D35400', '#3A3A3A'];
const initials = (s: string) => String(s || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function OrderForm({ product, zones, shop }: { product: any; zones: any[]; shop: any }) {
  const distZone = zones.find((z) => z.by_distance);
  const legacyBko = zones.filter((z) => z.mode !== 'bus' && !z.by_distance);
  const busZones = zones.filter((z) => z.mode === 'bus');
  const base = { lat: Number(shop.base_lat) || 12.676, lng: Number(shop.base_lng) || -7.979, name: shop.base_label || 'Boulkassoumbougou' };
  const tiers: [number, number][] = Array.isArray(shop.fee_tiers) ? shop.fee_tiers : [[10, 1500], [15, 2000], [20, 2500], [999, 3000]];

  const packs = useMemo(() => [{ quantity: 1, bundle_price: product.price, free_shipping: false, highlight: false }, ...(product.offers || [])]
    .filter((k: any) => k.quantity <= Math.max(1, product.stock)), [product]);
  const [step, setStep] = useState(0);
  const [qty, setQty] = useState(packs.find((k: any) => k.highlight)?.quantity || 1);
  const [qtyText, setQtyText] = useState('');
  const [opt, setOpt] = useState(product.options?.[0] || 'Standard');
  const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [mode, setMode] = useState<'bko' | 'bus'>(distZone || legacyBko.length ? 'bko' : 'bus');
  const [quart, setQuart] = useState(''); const [hit, setHit] = useState<Pt | null>(null); const [sug, setSug] = useState<any[]>([]);
  const [legacyId, setLegacyId] = useState(legacyBko[0]?.id || '');
  const [gps, setGps] = useState<[number, number] | null>(null); const [gpsMsg, setGpsMsg] = useState('');
  const [city, setCity] = useState(''); const [town, setTown] = useState<{ name: string; hub: string; region: string } | null>(null); const [csug, setCsug] = useState<any[]>([]);
  const [co, setCo] = useState(0);
  const [slot, setSlot] = useState('indifferent'); const [ready, setReady] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({}); const [fails, setFails] = useState(0);
  const [busy, setBusy] = useState(false); const [serverErr, setServerErr] = useState('');
  const [done, setDone] = useState<any>(null); const [upsellState, setUpsellState] = useState<'offer' | 'added' | 'no'>('offer');
  const [source, setSource] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search);
      const s = q.get('utm_source') || (q.get('fbclid') ? 'facebook' : q.get('ttclid') ? 'tiktok' : null);
      if (s) sessionStorage.setItem('zelvo-src', s.toLowerCase());
      setSource(s || sessionStorage.getItem('zelvo-src'));
    } catch {}
  }, []);

  // ---------- Calculs ----------
  const offer = (product.offers || []).find((k: any) => k.quantity === qty);
  const itemsPrice = offer ? offer.bundle_price : product.price * qty;
  const hubCompanies = town ? busZones.filter((z) => norm(z.city) === norm(HUBS[town.hub] || '')) : [];
  const otherCity = busZones.find((z) => norm(z.city) === 'autreville' || norm(z.city) === 'autre');
  const busZone = hubCompanies[co] || hubCompanies[0] || null;
  const dest: Pt | null = gps ? { name: hit?.name || 'Votre position', lat: gps[0], lng: gps[1] } : hit;
  const dist = mode === 'bko' && distZone && dest ? km(base, dest) : null;
  const zoneFee: number | null = mode === 'bus' ? (busZone ? busZone.fee : null)
    : distZone ? (dist != null ? tier(tiers, dist) : null) : (legacyBko.find((z) => z.id === legacyId)?.fee ?? null);
  const free = !!offer?.free_shipping && (mode === 'bko' || !!shop.free_shipping_bus);
  const fee = free ? 0 : zoneFee || 0;
  const total = itemsPrice + fee;
  const shopPhone = mlPhone(shop.whatsapp || '').digits;
  const loyalty = Number(shop.loyalty_percent) || 0;

  if (product.stock <= 0) return <p className="info-line t-bad">Ce produit est épuisé pour le moment.</p>;
  if (!zones.length) return <p className="info-line t-warn">Les zones de livraison ne sont pas encore configurées.</p>;

  // ---------- Saisie guidée ----------
  function onQuart(v: string) {
    setQuart(v); const r = find(Q as any[], v);
    const exact = r.find((x) => x[0] === 100);
    setHit(exact ? { name: exact[1][0], lat: exact[1][1], lng: exact[1][2] } : null);
    setSug(exact && r.length === 1 ? [] : r.slice(0, 6));
  }
  function pickQuart(n: string) { const x = Q.find((q) => q[0] === n)!; setQuart(n); setHit({ name: x[0], lat: x[1], lng: x[2] }); setSug([]); setErrs((e) => ({ ...e, lm: '' })); }
  function onCity(v: string) {
    setCity(v); setCo(0); const r = find(T as any[], v); const exact = r.find((x) => x[0] === 100);
    setTown(exact ? { name: exact[1][0], hub: exact[1][1], region: exact[1][2] } : null);
    setCsug(exact && r.length === 1 ? [] : r.slice(0, 6));
  }
  function pickCity(n: string) { const x = T.find((t) => t[0] === n)!; setCity(n); setTown({ name: x[0], hub: x[1], region: x[2] }); setCsug([]); setCo(0); setErrs((e) => ({ ...e, city: '' })); }
  const tap = (fn: () => void) => ({ onPointerDown: (e: any) => { e.preventDefault(); fn(); }, onClick: (e: any) => { e.preventDefault(); fn(); } });

  function askGps() {
    setGpsMsg('⏳ Recherche de votre position…');
    if (!navigator.geolocation) { setGpsMsg('Position indisponible sur cet appareil.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setGps([p.coords.latitude, p.coords.longitude]); setGpsMsg('✅ Position partagée : le livreur vient directement chez vous.'); },
      () => setGpsMsg('Position refusée ou indisponible. Ce n’est pas obligatoire.'), { timeout: 9000, enableHighAccuracy: true });
  }

  // ---------- Étapes ----------
  function check2(show = true) {
    const ph = mlPhone(phone); const er: Record<string, string> = {};
    if (name.trim().length < 3) er.name = 'Entrez votre nom et prénom.';
    if (!ph.ok) er.phone = ph.foreign ? 'Seuls les numéros du Mali sont acceptés (+223).' : 'Numéro malien à 8 chiffres (ex. 76 12 34 56).';
    if (mode === 'bko' && quart.trim().length < 2 && !gps) er.lm = 'Indiquez votre quartier.';
    if (mode === 'bus' && city.trim().length < 3) er.city = 'Indiquez votre ville.';
    if (mode === 'bus' && !busZone && !otherCity && !busZones.length) er.city = 'Les envois par car ne sont pas encore ouverts.';
    if (show) { setErrs(er); if (er.phone) setFails((f) => f + 1); }
    return !Object.keys(er).length;
  }
  function go(n: number) {
    if (n > step && n === 2 && !check2()) { setStep(1); return; }
    setStep(n); setTimeout(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  }

  async function submit() {
    setServerErr('');
    if (!check2()) return go(1);
    if (!ready) { setErrs((e) => ({ ...e, ready: 'Cochez cette case pour confirmer.' })); return; }
    const ph = mlPhone(phone);
    const zoneId = mode === 'bus' ? (busZone || otherCity || busZones[0])?.id : (distZone?.id || legacyId);
    const where = mode === 'bus' ? (town?.name || city.trim()) : (quart.trim() || 'Position partagée');
    setBusy(true);
    const { data, error } = await sb().rpc('place_order', {
      p_slug: SHOP_SLUG, p_product: product.id, p_quantity: qty, p_option: opt, p_name: name.trim(), p_phone: ph.digits,
      p_zone: zoneId, p_landmark: where, p_optin: true, p_ready: true,
      p_lat: mode === 'bko' && gps ? gps[0] : null, p_lng: mode === 'bko' && gps ? gps[1] : null,
      p_slot: slot, p_source: source,
      p_qlat: mode === 'bko' && hit ? hit.lat : null, p_qlng: mode === 'bko' && hit ? hit.lng : null,
      p_city: mode === 'bus' ? (town?.name || city.trim()) : null,
    });
    setBusy(false);
    if (error) {
      const m = String(error.message);
      if (m.includes('BAD_PHONE')) { setFails((f) => f + 1); setErrs((e) => ({ ...e, phone: 'Numéro non valide.' })); return go(1); }
      if (m.includes('BLOCKED')) return setServerErr('Ce numéro ne peut plus commander en ligne. Contactez-nous sur WhatsApp' + (shopPhone ? ' au +223 ' + fmtPhone(shopPhone) : '') + '.');
      return setServerErr(errText(error));
    }
    setDone({ ...data, phone: ph.digits, items: [qty + ' × ' + product.name + (product.options?.length > 1 ? ' (' + opt + ')' : '')] });
    try { (window as any).fbq?.('track', 'Purchase', { value: data.total, currency: 'XOF' }); (window as any).ttq?.track?.('CompletePayment', { value: data.total, currency: 'XOF' }); } catch {}
  }

  async function addUpsell() {
    const { data, error } = await sb().rpc('add_upsell', { p_slug: SHOP_SLUG, p_number: done.number, p_phone: done.phone });
    if (error) { setUpsellState('no'); return; }
    setDone({ ...done, total: data.total, items: [...done.items, '1 × ' + done.upsell.name] }); setUpsellState('added');
  }

  // ---------- Succès ----------
  if (done) {
    return (
      <div className="ck ck-done" role="status" ref={top}>
        <div className="ck-ok">✓</div>
        <h2>Merci, commande reçue !</h2>
        <span className="ck-num">COMMANDE N° {done.number}</span>
        {done.discount > 0 && <p className="ck-loyal">🎁 Client fidèle : −{fmt(done.discount)} appliqués</p>}
        {done.upsell && upsellState === 'offer' && (
          <div className="offer">
            <strong>Ajoutez {done.upsell.name} dans le même colis</strong>
            <p className="muted">{fmt(done.upsell.price)} au lieu de {fmt(done.upsell.regular_price)}, sans frais de livraison en plus.</p>
            <div className="stack"><button className="btn cta" onClick={addUpsell}>Oui, ajouter</button><button className="btn" onClick={() => setUpsellState('no')}>Non merci</button></div>
          </div>)}
        <div className="ck-recap" style={{ textAlign: 'left', width: '100%' }}>
          {done.items.map((t: string) => <div className="ln" key={t}><span>{t}</span></div>)}
          <div className="tot"><span>À payer à la livraison</span><b>{fmt(done.total)}</b></div>
        </div>
        <p className="ck-call">📲 Décrochez quand le <b>+223 {fmtPhone(shopPhone || '')}</b> vous appelle pour confirmer.</p>
        <Link className="btn primary wide" href={'/suivi?n=' + done.number}>Suivre ma commande</Link>
      </div>
    );
  }

  const help = fails >= 2 ? waLink(shop.whatsapp, 'Bonjour, je veux commander ' + product.name + ' mais mon numéro n’est pas accepté sur le site. Pouvez-vous m’aider ?') : null;
  const saveOf = (k: any) => (product.compare_price ? product.compare_price * k.quantity - k.bundle_price : product.price * k.quantity - k.bundle_price);
  const whereTxt = mode === 'bus' ? (town ? town.name + ' · ' + (busZone ? busZone.label : 'compagnie à confirmer') + ' (car)' : (city || '—') + ' · compagnie à confirmer') : (dest ? dest.name : quart || '—');

  return (
    <div className="ck" ref={top}>
      <div className="ck-prog" role="tablist" aria-label="Étapes de la commande">
        {['Offre', 'Livraison', 'Confirmer'].map((l, i) => (
          <span key={l} style={{ display: 'contents' }}>
            {i > 0 && <span className={'ck-lnk' + (i <= step ? ' dn' : '')}><i /></span>}
            <button type="button" role="tab" aria-selected={step === i} className={'ck-dot' + (i < step ? ' dn' : i === step ? ' on' : '')} onClick={() => go(i)}><b>{i + 1}</b>{l}</button>
          </span>))}
      </div>

      {step === 0 && (
        <section className="ck-step">
          <h3>Choisissez votre offre</h3>
          <p className="ck-sub">💵 Rien à payer maintenant : vous payez à la réception du colis.</p>
          <div className="ck-offers">{packs.map((k: any) => (
            <button type="button" key={k.quantity} className={'ck-of' + (qty === k.quantity ? ' on' : '')} onClick={() => { setQty(k.quantity); setQtyText(''); }}>
              {k.highlight && <span className="ck-rib">LE PLUS CHOISI</span>}
              <span className="rd" />
              <span><b>{k.quantity} pièce{k.quantity > 1 ? 's' : ''}</b>
                <small className={k.free_shipping ? '' : 'n'}>{k.free_shipping ? '🎁 Livraison offerte' + (saveOf(k) > 0 ? ' · −' + num(saveOf(k)) + ' F' : '') : '+ livraison selon le lieu'}</small></span>
              <span className="p">{num(k.bundle_price)}{(product.compare_price || k.quantity > 1) && <s>{num((product.compare_price || product.price) * k.quantity)}</s>}</span>
            </button>))}</div>
          <div className="ck-qty"><div><b>🔢 Autre quantité</b><small>Touchez le chiffre pour taper la quantité</small></div>
            <div className="stp"><button type="button" aria-label="Moins" disabled={qty <= 1} onClick={() => { setQty(Math.max(1, qty - 1)); setQtyText(''); }}>−</button>
              <input inputMode="numeric" aria-label="Quantité" value={qtyText !== '' ? qtyText : String(qty)} onChange={(e) => { const t = e.target.value.replace(/\D/g, ''); setQtyText(t); const v = parseInt(t, 10); if (v >= 1) setQty(Math.min(v, product.stock)); }} onBlur={() => setQtyText('')} />
              <button type="button" aria-label="Plus" disabled={qty >= product.stock} onClick={() => { setQty(Math.min(product.stock, qty + 1)); setQtyText(''); }}>+</button></div></div>
          {qty >= product.stock && product.stock < 1000 && <p className="ck-hint">Plus que {product.stock} en stock.</p>}
          {product.options?.length > 1 && (
            <div className="ck-fld"><span className="ck-lbl">{product.option_label || 'Variante'}</span>
              <div className="chips2">{product.options.map((o: string) => <button type="button" key={o} aria-pressed={opt === o} className={'c2' + (opt === o ? ' on' : '')} onClick={() => setOpt(o)}>{o}</button>)}</div></div>)}
        </section>)}

      {step === 1 && (
        <section className="ck-step">
          <h3>Où livrer votre colis ?</h3>
          <p className="ck-sub">{mode === 'bus' ? '🚌 Envoi par car : tapez votre ville et choisissez la compagnie.' : '🚚 À domicile en ' + (shop.delivery_promise || 'moins de 24 h') + '. Le prix s’affiche selon votre quartier.'}</p>
          <div className="ck-fld"><label className="ck-lbl" htmlFor="ck-name">👤 Nom et prénom</label>
            <div className={'ck-box' + (errs.name ? ' bad' : name.trim().length >= 3 ? ' ok' : '')}><span className="ic">👤</span><input id="ck-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Awa Traoré" /></div>
            {errs.name && <p className="err">{errs.name}</p>}</div>
          <div className="ck-fld"><label className="ck-lbl" htmlFor="ck-phone">📞 Téléphone</label>
            <div className={'ck-box' + (errs.phone ? ' bad' : mlPhone(phone).ok ? ' ok' : '')}><span className="ic">🇲🇱</span><span className="pre">+223</span><input id="ck-phone" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="76 00 00 00" /></div>
            {errs.phone && <p className="err">{errs.phone}</p>}
            {help && errs.phone && <div className="help"><span><strong>Un souci avec votre numéro ?</strong> Écrivez-nous sur WhatsApp au <strong>+223 {fmtPhone(shopPhone || '')}</strong> : nous commandons avec vous.</span><a className="btn sm wa" href={help} target="_blank" rel="noopener">WhatsApp</a></div>}
          </div>
          {(distZone || legacyBko.length > 0) && busZones.length > 0 && (
            <div className="ck-mode" role="tablist"><button type="button" className={mode === 'bko' ? 'on' : ''} onClick={() => setMode('bko')}>📍 Bamako et environs<small>Livreur à domicile</small></button>
              <button type="button" className={mode === 'bus' ? 'on' : ''} onClick={() => setMode('bus')}>🚌 Autre ville<small>Envoi par car</small></button></div>)}

          {mode === 'bko' && (distZone ? (
            <>
              <div className="ck-fld" style={{ position: 'relative' }}><label className="ck-lbl" htmlFor="ck-q">🏘️ Votre quartier</label>
                <div className={'ck-box' + (errs.lm ? ' bad' : hit ? ' ok' : '')}><span className="ic">📍</span><input id="ck-q" autoComplete="off" value={quart} onChange={(e) => onQuart(e.target.value)} onFocus={() => quart && !hit && onQuart(quart)} onBlur={() => setTimeout(() => setSug([]), 350)} placeholder="Ex. Médina Coura, Kati Coco…" /></div>
                {sug.length > 0 && <div className="ck-sug">{sug.map(([sc, x]: any) => { const d = km(base, { lat: x[1], lng: x[2] }); return <button type="button" key={x[0]} {...tap(() => pickQuart(x[0]))}>{x[0]}{sc < 60 && <em> vouliez-vous dire ?</em>}<small>{Math.round(d)} km · {num(tier(tiers, d))} F</small></button>; })}</div>}
                {errs.lm && <p className="err">{errs.lm}</p>}</div>
              {dest ? (
                <div className="ck-route"><div className="rt-top"><div><div className="rt-l">Trajet du livreur</div><div className="rt-d">≈ {dist!.toFixed(1).replace('.', ',')} km{gps ? ' · position exacte' : ''}</div></div>
                  <div className="rt-p"><b>{free ? 'Offerte' : num(zoneFee || 0) + ' F'}</b><small>{free ? 'grâce à votre pack 🎁' : 'frais de livraison'}</small></div></div>
                  <svg className="rt-svg" viewBox="0 0 300 58" preserveAspectRatio="none" aria-hidden="true"><path d="M12 44 C 80 6, 150 58, 210 22 S 280 18, 288 14" fill="none" stroke="#C8F031" strokeWidth="3" /><rect x="5" y="37" width="14" height="14" fill="#fff" /><circle cx="288" cy="14" r="8" fill="#C8F031" /><circle cx="288" cy="14" r="3" fill="#0C0C0E" /></svg>
                  <div className="rt-ends"><span><em>Départ</em><b>{base.name}</b></span><span style={{ textAlign: 'right' }}><em>Arrivée</em><b>{dest.name}</b></span></div></div>
              ) : quart.trim().length >= 3 && <div className="ck-unk"><b>Quartier non reconnu</b> Choisissez-le dans la liste ou partagez votre position. Sinon, le prix de livraison ({num(distZone.fee)} F de base) vous est confirmé par appel.</div>}
              <p className={'ck-geo' + (gps ? ' ok' : '')}>{gps ? gpsMsg : <>Pour un prix exact et une livraison plus rapide, <button type="button" className="mark" onClick={askGps}>partagez votre position 📍</button> (facultatif).{gpsMsg && <><br />{gpsMsg}</>}</>}</p>
            </>
          ) : (
            <div className="ck-fld"><label className="ck-lbl" htmlFor="ck-z">🏘️ Commune / quartier</label>
              <div className="ck-box ok"><span className="ic">🏙️</span><select id="ck-z" value={legacyId} onChange={(e) => setLegacyId(e.target.value)}>{legacyBko.map((z) => <option key={z.id} value={z.id}>{z.label} — {fmt(z.fee)}</option>)}</select></div>
              <div className="ck-box" style={{ marginTop: 8 }}><span className="ic">📍</span><input value={quart} onChange={(e) => setQuart(e.target.value)} placeholder="Votre quartier" /></div></div>
          ))}

          {mode === 'bus' && (
            <>
              <div className="ck-fld" style={{ position: 'relative' }}><label className="ck-lbl" htmlFor="ck-c">🏙️ Votre ville</label>
                <div className={'ck-box' + (errs.city ? ' bad' : town ? ' ok' : '')}><span className="ic">🏙️</span><input id="ck-c" autoComplete="off" value={city} onChange={(e) => onCity(e.target.value)} onFocus={() => city && !town && onCity(city)} onBlur={() => setTimeout(() => { if (!town && csug[0] && (csug.length === 1 || csug[0][0] > csug[1][0])) pickCity(csug[0][1][0]); setCsug([]); }, 350)} placeholder="Tapez votre ville : Kéniéba, Douentza…" /></div>
                {csug.length > 0 && <div className="ck-sug">{csug.map(([sc, x]: any) => <button type="button" key={x[0]} {...tap(() => pickCity(x[0]))}>{x[0]}{sc < 60 && <em> vouliez-vous dire ?</em>}<small>Région de {x[2]}</small></button>)}</div>}
                {errs.city && <p className="err">{errs.city}</p>}</div>
              <div className="ck-fld"><span className="ck-lbl">🚌 Compagnie de transport</span>
                {town && hubCompanies.length ? <div className="ck-cos">{hubCompanies.map((z, i) => (
                  <button type="button" key={z.id} className={'ck-co' + (i === co ? ' on' : '')} onClick={() => setCo(i)}>
                    <span className="lg" style={{ background: COLORS[i % COLORS.length] }}>{initials(z.carrier || z.label)}</span>
                    <span><b>{z.carrier || z.label}</b><small>📦 Colis pour {town.name}{norm(town.name) !== norm(z.city) ? ' (via ' + z.city + ')' : ''}</small></span>
                    <span className="p">{num(z.fee)} F<small>⏱ {z.delay_days <= 1 ? '24 h' : z.delay_days + ' jours'}</small></span></button>))}</div>
                  : city.trim().length >= 3 ? <div className="ck-unk"><b>{town ? 'Pas encore de compagnie enregistrée pour ' + town.name : 'Ville hors de notre liste'}</b> Pas de souci : nous vous appelons pour choisir la compagnie qui dessert votre ville et vous donner le prix d’envoi.</div>
                  : <p className="ck-hint">Tapez votre ville pour voir les compagnies et le prix d’envoi.</p>}
                <p className="ck-hint">{shop.region_payment === 'avance' ? 'Paiement avant l’envoi (Orange Money, Moov, Wave) : nous vous expliquons au téléphone.' : 'Vous récupérez et payez votre colis à la gare de votre ville ; nous vous appelons à son arrivée.'}</p></div>
            </>)}

          <div className="ck-fld"><span className="ck-lbl">🕐 Quand pouvons-nous vous appeler ?</span>
            <div className="ck-slots">{SLOTS.map(([k, l]) => <button key={k} type="button" aria-pressed={slot === k} className={'c2' + (slot === k ? ' on' : '')} onClick={() => setSlot(k)}>{l}</button>)}</div></div>
        </section>)}

      {step === 2 && (
        <section className="ck-step">
          <h3>Vérifiez et confirmez</h3>
          <p className="ck-sub">Dernière étape. Vous ne payez qu’à la réception.</p>
          <div className="ck-recap">
            <div className="ln"><span>{qty} × {product.name}{product.options?.length > 1 ? ' (' + opt + ')' : ''}</span><b>{fmt(itemsPrice)}</b></div>
            <div className="ln"><span>Livraison · {whereTxt}</span><b>{free ? 'Offerte 🎁' : zoneFee != null ? fmt(zoneFee) : 'Confirmée par appel'}</b></div>
            <div className="who"><span>👤 {name || '—'} · 📞 +223 {fmtPhone(mlPhone(phone).digits || '') || '—'}</span>
              <span>{mode === 'bus' ? '🚌 Retrait à la gare' : '📍 ' + whereTxt + (gps ? ' · position partagée' : '')} · 🕐 {SLOTS.find((s) => s[0] === slot)?.[1]}</span>
              <button type="button" className="link" onClick={() => go(1)}>✏️ Modifier mes informations</button></div>
            {loyalty > 0 && <div className="ln loy"><span>🎁 Déjà client ? −{loyalty} % appliqués automatiquement si votre numéro a déjà commandé</span></div>}
            <div className="tot"><span>Total à payer à la livraison</span><b>{fmt(total)}</b></div>
          </div>
          <div className="ck-warn" role="note"><b>⚠️ Commande sérieuse uniquement</b>Répondez à notre appel et ayez le montant prêt. Les numéros qui ne décrochent pas ou refusent le colis sans raison seront bloqués.</div>
          <label className={'ck-ready' + (ready ? ' on' : '') + (errs.ready ? ' bad' : '')}><input type="checkbox" checked={ready} onChange={(e) => { setReady(e.target.checked); setErrs((x) => ({ ...x, ready: '' })); }} /><span>✅ J’ai compris. Je suis disponible et je paierai <b>{fmt(total)}</b> à la livraison.</span></label>
          {errs.ready && <p className="err">{errs.ready}</p>}
          {serverErr && <p className="err" role="alert">{serverErr}</p>}
          <p className="legal">En validant, vous acceptez les <Link href="/conditions">conditions de vente</Link> et la <Link href="/confidentialite">politique de confidentialité</Link>. Offres WhatsApp : répondez STOP pour ne plus les recevoir.</p>
        </section>)}

      <div className="ck-dock">
        <div className="row"><span>{qty} pièce{qty > 1 ? 's' : ''}{free ? ' · livraison offerte 🎁' : zoneFee != null && step > 0 ? ' · livraison ' + num(zoneFee) + ' F' : ' · + livraison'}</span><b>{fmt(total)}</b></div>
        <div className="btns">
          {step > 0 && <button type="button" className="back" aria-label="Retour" onClick={() => go(step - 1)}>←</button>}
          {step < 2 ? <button type="button" className="go" onClick={() => go(step + 1)}>{step === 0 ? 'Continuer →' : 'Vérifier ma commande →'}</button>
            : <button type="button" className="go final" disabled={busy} onClick={submit}>{busy ? 'Envoi…' : 'Confirmer ma commande'}</button>}
        </div>
        {shopPhone && step === 2 && <p className="ck-call">📲 Nous vous appelons depuis le <b>+223 {fmtPhone(shopPhone)}</b> pour confirmer.</p>}
      </div>
    </div>
  );
}
