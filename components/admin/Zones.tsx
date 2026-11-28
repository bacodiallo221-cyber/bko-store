'use client';
import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { fmt, num, errText } from '@/lib/format';
import { Q, HUBS, norm } from '@/lib/places';
import { Sheet } from './ui';

const COMPANIES = ['Diarra Transport', 'Bani Transport', 'Nour Transport', 'Sonef', 'Somatra', 'Binké Transport', 'Gana Transport'];
// Lignes habituelles par grande gare (prix d'envoi d'un colis : EXEMPLES à vérifier au guichet)
const SUGGEST: [string, string, number, number][] = [
  ['Ségou', 'Diarra Transport', 2000, 1], ['Ségou', 'Bani Transport', 2000, 1], ['Ségou', 'Sonef', 2500, 1], ['San', 'Diarra Transport', 2500, 1], ['San', 'Bani Transport', 2500, 1],
  ['Sikasso', 'Diarra Transport', 2500, 1], ['Sikasso', 'Bani Transport', 2500, 1], ['Sikasso', 'Nour Transport', 2000, 1], ['Koutiala', 'Diarra Transport', 2500, 1], ['Bougouni', 'Diarra Transport', 2000, 1],
  ['Mopti', 'Bani Transport', 3000, 1], ['Mopti', 'Sonef', 3000, 1], ['Douentza', 'Bani Transport', 3500, 2], ['Kayes', 'Diarra Transport', 3000, 1], ['Kayes', 'Binké Transport', 3000, 1],
  ['Kita', 'Binké Transport', 2500, 1], ['Nioro', 'Binké Transport', 3500, 2], ['Koulikoro', 'Diarra Transport', 1500, 1], ['Dioïla', 'Diarra Transport', 2000, 1], ['Tombouctou', 'Gana Transport', 5000, 3], ['Gao', 'Gana Transport', 5000, 2],
];

export default function Zones({ shop, toast, onSaved }: { shop: any; toast: (m: string) => void; onSaved?: () => void }) {
  const [zones, setZones] = useState<any[] | null>(null); const [depots, setDepots] = useState<any[]>([]);
  const [editZ, setEditZ] = useState<any>(null); const [editD, setEditD] = useState<any>(null); const [base, setBase] = useState(false);
  const load = useCallback(async () => {
    const [z, d] = await Promise.all([
      sb().from('delivery_zones').select('*').eq('shop_id', shop.id).order('city').order('label'),
      sb().from('transport_depots').select('*').eq('shop_id', shop.id).order('company'),
    ]);
    if (z.error) return toast(errText(z.error)); setZones(z.data || []); setDepots(d.data || []);
  }, [shop.id, toast]);
  useEffect(() => { load(); }, [load]);

  const dist = (zones || []).find((z) => z.by_distance);
  const legacy = (zones || []).filter((z) => !z.by_distance && z.mode !== 'bus');
  const bus = (zones || []).filter((z) => z.mode === 'bus');
  const tiers: [number, number][] = Array.isArray(shop.fee_tiers) ? shop.fee_tiers : [];

  async function enableDistance() {
    const { error } = await sb().from('delivery_zones').insert({ shop_id: shop.id, city: 'Bamako', label: 'Selon la distance', fee: tiers[0]?.[1] || 1500, delay_days: 1, mode: 'livreur', by_distance: true, driver_cost: 1000 });
    if (error) return toast(errText(error));
    if (legacy.length) await sb().from('delivery_zones').update({ active: false }).in('id', legacy.map((z) => z.id));
    toast('Prix au kilomètre activé'); load();
  }
  async function suggestLines() {
    const rows = SUGGEST.filter(([c, co]) => !bus.some((z) => norm(z.city) === norm(c) && norm(z.label) === norm(co)))
      .map(([c, co, fee, d]) => ({ shop_id: shop.id, city: c, label: co, fee, delay_days: d, mode: 'bus', driver_cost: 1000, depot_id: depots.find((x) => norm(x.company) === norm(co))?.id || null }));
    if (!bus.some((z) => norm(z.city) === 'autreville')) rows.push({ shop_id: shop.id, city: 'Autre ville', label: 'Compagnie à confirmer', fee: 0, delay_days: 2, mode: 'bus', driver_cost: 1000, depot_id: null });
    if (!rows.length) return toast('Toutes ces lignes existent déjà.');
    const { error } = await sb().from('delivery_zones').insert(rows);
    if (error) return toast(errText(error)); toast(rows.length + ' lignes ajoutées : vérifiez les prix'); load();
  }
  const hubs = Array.from(new Set(bus.map((z) => z.city)));

  return (
    <>
      <h2 style={{ fontSize: 16, marginTop: 18 }}>📍 Bamako et environs : prix au kilomètre</h2>
      <div className="panel" style={{ marginTop: 10 }}>
        {!dist ? <>
          <p style={{ margin: 0 }}>Le client tape son quartier : le prix se calcule selon la distance depuis le point de départ de votre livreur.</p>
          <button className="btn primary" style={{ marginTop: 10 }} onClick={enableDistance}>Activer le prix au kilomètre</button>
          {legacy.length > 0 && <p className="muted" style={{ marginTop: 6 }}>Vos {legacy.length} anciennes zones par commune seront désactivées.</p>}
        </> : <>
          <p style={{ margin: 0 }}><span className="badge t-ok">Actif</span> Départ : <strong>{shop.base_label}</strong></p>
          <div className="tiers-adm">{tiers.map(([k, f], i) => <div key={i}><b>{num(f)} F</b>{i === 0 ? 'jusqu’à ' + k + ' km' : Number(k) >= 999 ? 'plus de ' + tiers[i - 1][0] + ' km' : tiers[i - 1][0] + ' à ' + k + ' km'}</div>)}</div>
          <button className="btn sm" onClick={() => setBase(true)}>Modifier le départ et les tarifs</button>
        </>}
      </div>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>🚉 Gares des compagnies</h2>
      <p className="muted">Votre livreur y est guidé (itinéraire, numéro, horaires) et son arrivée vous est signalée.</p>
      <ul className="rows">{depots.map((d) => (
        <li key={d.id}><div className="grow"><strong>{d.company} · {d.label}</strong><span className="muted">{d.phone ? '📞 ' + d.phone + ' · ' : ''}{d.hours || 'horaires ?'}{d.last_departure ? ' · dernier départ ' + d.last_departure : ''}</span></div>
          <button className="btn sm" onClick={() => setEditD(d)}>Modifier</button></li>))}</ul>
      <div style={{ marginTop: 10 }}><button className="btn" onClick={() => setEditD({})}>+ Ajouter une gare</button></div>

      <div className="toolbar" style={{ marginTop: 24 }}><h2 style={{ fontSize: 16 }}>🚌 Envois par car : prix par ville et par compagnie</h2>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn" onClick={suggestLines}>Préremplir les lignes habituelles</button><button className="btn primary" onClick={() => setEditZ({ mode: 'bus' })}>+ Ligne</button></span></div>
      <p className="muted">Le client tape sa ville (Kéniéba, Douentza…) : elle est reliée à sa grande gare et il choisit la compagnie. Les prix préremplis sont des exemples : mettez ceux de vos guichets.</p>
      {!zones ? <p className="muted">Chargement…</p> : !bus.length ? <p className="empty" style={{ marginTop: 12 }}>Aucune ligne. Utilisez « Préremplir les lignes habituelles ».</p> :
        hubs.map((h) => (
          <div key={h} style={{ marginTop: 12 }}><strong style={{ fontSize: 14 }}>{h}</strong>
            <ul className="rows">{bus.filter((z) => z.city === h).map((z) => (
              <li key={z.id}><div className="grow"><strong>{z.label}</strong><span className="muted">{fmt(z.fee)} · {z.delay_days <= 1 ? '24 h' : z.delay_days + ' j'}{z.depot_id ? ' · gare ' + (depots.find((d) => d.id === z.depot_id)?.label || '') : ' · gare non liée'}{z.active ? '' : ' · désactivée'}</span></div>
                <button className="btn sm" onClick={() => setEditZ(z)}>Modifier</button></li>))}</ul></div>))}

      {editZ && <LineForm shop={shop} z={editZ} depots={depots} onClose={() => setEditZ(null)} onSaved={() => { setEditZ(null); load(); toast('Ligne enregistrée'); }} />}
      {editD && <DepotForm shop={shop} d={editD} onClose={() => setEditD(null)} onSaved={() => { setEditD(null); load(); toast('Gare enregistrée'); }} />}
      {base && <BaseForm shop={shop} onClose={() => setBase(false)} onSaved={() => { setBase(false); toast('Tarifs enregistrés'); onSaved?.(); }} />}
    </>
  );
}

function BaseForm({ shop, onClose, onSaved }: any) {
  const t0: [number, number][] = Array.isArray(shop.fee_tiers) && shop.fee_tiers.length ? shop.fee_tiers : [[10, 1500], [15, 2000], [20, 2500], [999, 3000]];
  const [label, setLabel] = useState(shop.base_label || 'Boulkassoumbougou'); const [lat, setLat] = useState(shop.base_lat); const [lng, setLng] = useState(shop.base_lng);
  const [tiers, setTiers] = useState(t0.map(([k, f]) => [String(k), String(f)])); const [freeBus, setFreeBus] = useState(!!shop.free_shipping_bus); const [pay, setPay] = useState(shop.region_payment || 'gare');
  const [err, setErr] = useState(''); const [msg, setMsg] = useState('');
  function pickQ(n: string) { const x = Q.find((q) => q[0] === n); if (x) { setLabel(x[0]); setLat(x[1]); setLng(x[2]); } }
  function here() { setMsg('Recherche…'); navigator.geolocation?.getCurrentPosition((p) => { setLat(+p.coords.latitude.toFixed(6)); setLng(+p.coords.longitude.toFixed(6)); setMsg('Position exacte enregistrée.'); }, () => setMsg('Position refusée.'), { enableHighAccuracy: true, timeout: 10000 }); }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const ft = tiers.map(([k, f], i) => [i === tiers.length - 1 ? 999 : Number(k), Number(f)]);
    if (ft.some(([k, f]) => !(k > 0) || !(f >= 0))) return setErr('Vérifiez les distances et les prix.');
    const { error } = await sb().from('shops').update({ base_label: label.trim(), base_lat: Number(lat), base_lng: Number(lng), fee_tiers: ft, free_shipping_bus: freeBus, region_payment: pay }).eq('id', shop.id);
    if (error) return setErr(errText(error)); onSaved();
  }
  return (
    <Sheet title="Départ du livreur et tarifs" onClose={onClose}>
      <form onSubmit={save}>
        <div className="field" style={{ marginTop: 0 }}><label htmlFor="bq">Quartier de départ du livreur</label>
          <select id="bq" value={Q.some((q) => q[0] === label) ? label : ''} onChange={(e) => pickQ(e.target.value)}><option value="">— choisir —</option>{Q.map((q) => <option key={q[0]} value={q[0]}>{q[0]}</option>)}</select></div>
        <div className="field"><button type="button" className="btn sm" onClick={here}>Je suis au point de départ : prendre ma position exacte</button>{msg && <span className="muted">{msg}</span>}</div>
        <p className="muted" style={{ marginTop: 10 }}>Prix de livraison selon la distance (par la route, estimée) :</p>
        {tiers.map(([k, f], i) => (
          <div className="two" key={i}><div className="field"><label>{i === tiers.length - 1 ? 'Au-delà' : 'Jusqu’à (km)'}</label><input inputMode="numeric" disabled={i === tiers.length - 1} value={i === tiers.length - 1 ? '∞' : k} onChange={(e) => setTiers(tiers.map((t, j) => (j === i ? [e.target.value, t[1]] : t)))} /></div>
            <div className="field"><label>Prix (FCFA)</label><input inputMode="numeric" value={f} onChange={(e) => setTiers(tiers.map((t, j) => (j === i ? [t[0], e.target.value] : t)))} /></div></div>))}
        <label className="check"><input type="checkbox" checked={freeBus} onChange={(e) => setFreeBus(e.target.checked)} /><span>« Livraison offerte » des packs aussi pour les envois par car</span></label>
        <div className="field"><label htmlFor="rp">Paiement des clients en région</label><select id="rp" value={pay} onChange={(e) => setPay(e.target.value)}><option value="gare">À la réception, à la gare</option><option value="avance">Avant l’envoi (Orange Money, Moov, Wave)</option></select></div>
        {err && <p className="err">{err}</p>}
        <div style={{ marginTop: 14 }}><button className="btn primary wide">Enregistrer</button></div>
      </form>
    </Sheet>
  );
}

function LineForm({ shop, z, depots, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ city: z.city || 'Ségou', label: z.label || COMPANIES[0], fee: z.fee ?? 2500, delay_days: z.delay_days ?? 1, depot_id: z.depot_id || '', active: z.active ?? true });
  const [err, setErr] = useState('');
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.city.trim() || !f.label.trim()) return setErr('Indiquez la gare de destination et la compagnie.');
    const row = { shop_id: shop.id, city: f.city.trim(), label: f.label.trim(), fee: Number(f.fee) || 0, delay_days: Number(f.delay_days) || 1, mode: 'bus', depot_id: f.depot_id || depots.find((d: any) => norm(d.company) === norm(f.label))?.id || null, driver_cost: 1000, active: !!f.active };
    const { error } = z.id ? await sb().from('delivery_zones').update(row).eq('id', z.id) : await sb().from('delivery_zones').insert(row);
    if (error) return setErr(String(error.message).includes('duplicate') ? 'Cette compagnie existe déjà pour cette ville.' : errText(error)); onSaved();
  }
  async function remove() { const { error } = await sb().from('delivery_zones').update({ active: false }).eq('id', z.id); if (error) return setErr(errText(error)); onSaved(); }
  return (
    <Sheet title={z.id ? 'Modifier la ligne' : 'Nouvelle ligne de car'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="field" style={{ marginTop: 0 }}><label htmlFor="lc">Grande gare de destination</label>
          <select id="lc" value={f.city} onChange={set('city')}>{[...Object.values(HUBS), 'Autre ville'].map((h) => <option key={h}>{h}</option>)}</select>
          <span className="muted">Les petites villes de la région y sont reliées automatiquement (ex. Kéniéba → Kayes).</span></div>
        <div className="field"><label htmlFor="ll">Compagnie</label><input id="ll" list="cos" value={f.label} onChange={set('label')} /><datalist id="cos">{COMPANIES.map((c) => <option key={c} value={c} />)}</datalist></div>
        <div className="two"><div className="field"><label htmlFor="lf">Prix d’envoi d’un colis (FCFA)</label><input id="lf" inputMode="numeric" value={f.fee} onChange={set('fee')} /></div>
          <div className="field"><label htmlFor="ld">Délai (jours)</label><input id="ld" inputMode="numeric" value={f.delay_days} onChange={set('delay_days')} /></div></div>
        <div className="field"><label htmlFor="lg">Gare de départ à Bamako</label><select id="lg" value={f.depot_id} onChange={set('depot_id')}><option value="">Automatique (même compagnie)</option>{depots.map((d: any) => <option key={d.id} value={d.id}>{d.company} · {d.label}</option>)}</select></div>
        <label className="check"><input type="checkbox" checked={f.active} onChange={set('active')} /><span>Proposée aux clients</span></label>
        {err && <p className="err">{err}</p>}
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}><button className="btn primary" style={{ flex: 1 }}>Enregistrer</button>{z.id && <button type="button" className="btn danger" onClick={remove}>Retirer</button>}</div>
      </form>
    </Sheet>
  );
}

function DepotForm({ shop, d, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ company: d.company || 'Diarra Transport', label: d.label || 'Sogoniko', lat: d.lat ?? '', lng: d.lng ?? '', radius_m: d.radius_m ?? 150, phone: d.phone || '', address: d.address || '', hours: d.hours || '6 h – 20 h', last_departure: d.last_departure || '' });
  const [err, setErr] = useState(''); const [gpsMsg, setGpsMsg] = useState('');
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  function here() {
    setGpsMsg('Recherche de votre position…');
    navigator.geolocation?.getCurrentPosition((p) => { setF((x: any) => ({ ...x, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })); setGpsMsg('Position de la gare enregistrée (± ' + Math.round(p.coords.accuracy) + ' m).'); },
      () => setGpsMsg('Position refusée. Autorisez la localisation ou saisissez-la.'), { enableHighAccuracy: true, timeout: 10000 });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const lat = Number(f.lat), lng = Number(f.lng);
    if (!f.company.trim() || !f.label.trim()) return setErr('Indiquez la compagnie et le nom de la gare.');
    if (!(lat >= 10 && lat <= 25.5 && lng >= -12.5 && lng <= 4.5)) return setErr('Position hors du Mali : utilisez « Je suis à la gare » sur place, ou copiez les coordonnées depuis Google Maps.');
    const row = { shop_id: shop.id, company: f.company.trim(), label: f.label.trim(), lat, lng, radius_m: Number(f.radius_m) || 150, phone: f.phone.trim() || null, address: f.address.trim() || null, hours: f.hours.trim() || null, last_departure: f.last_departure.trim() || null };
    const { error } = d.id ? await sb().from('transport_depots').update(row).eq('id', d.id) : await sb().from('transport_depots').insert(row);
    if (error) return setErr(errText(error)); onSaved();
  }
  return (
    <Sheet title={d.id ? 'Modifier la gare' : 'Nouvelle gare'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="two"><div className="field" style={{ marginTop: 0 }}><label htmlFor="dc">Compagnie</label><input id="dc" list="cos2" value={f.company} onChange={set('company')} /><datalist id="cos2">{COMPANIES.map((c) => <option key={c} value={c} />)}</datalist></div>
          <div className="field" style={{ marginTop: 0 }}><label htmlFor="dl">Nom de la gare</label><input id="dl" value={f.label} onChange={set('label')} placeholder="Sogoniko" /></div></div>
        <div className="two"><div className="field"><label htmlFor="dp">Numéro du guichet colis</label><input id="dp" type="tel" value={f.phone} onChange={set('phone')} placeholder="+223 …" /></div>
          <div className="field"><label htmlFor="dh">Horaires</label><input id="dh" value={f.hours} onChange={set('hours')} /></div></div>
        <div className="two"><div className="field"><label htmlFor="dd">Dernier départ</label><input id="dd" value={f.last_departure} onChange={set('last_departure')} placeholder="15 h 00" /></div>
          <div className="field"><label htmlFor="dad">Adresse / repère</label><input id="dad" value={f.address} onChange={set('address')} placeholder="Gare routière de Sogoniko" /></div></div>
        <div className="field"><button type="button" className="btn" onClick={here}>Je suis à la gare : prendre ma position</button>{gpsMsg && <span className="muted">{gpsMsg}</span>}</div>
        <div className="two"><div className="field"><label htmlFor="da">Latitude</label><input id="da" inputMode="decimal" value={f.lat} onChange={set('lat')} placeholder="12.59" /></div>
          <div className="field"><label htmlFor="dg">Longitude</label><input id="dg" inputMode="decimal" value={f.lng} onChange={set('lng')} placeholder="-7.96" /></div></div>
        <div className="field"><label htmlFor="dr">Rayon de détection (mètres)</label><input id="dr" inputMode="numeric" value={f.radius_m} onChange={set('radius_m')} /></div>
        {err && <p className="err">{err}</p>}
        <div style={{ marginTop: 14 }}><button className="btn primary wide">Enregistrer</button></div>
      </form>
    </Sheet>
  );
}
