'use client';
import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { fmt, errText } from '@/lib/format';
import { Sheet } from './ui';

const BAMAKO = [['Commune I', 1000], ['Commune II', 1000], ['Commune III', 1000], ['Commune IV', 1000], ['Commune V', 1000], ['Commune VI', 1500]];
const REGIONS = [['Koulikoro', 2500, 2], ['Ségou', 3000, 2], ['Sikasso', 3500, 3], ['Mopti', 4000, 3], ['Kayes', 4000, 3]];

export default function Zones({ shop, toast }: { shop: any; toast: (m: string) => void }) {
  const [zones, setZones] = useState<any[] | null>(null); const [depots, setDepots] = useState<any[]>([]);
  const [editZ, setEditZ] = useState<any>(null); const [editD, setEditD] = useState<any>(null);
  const load = useCallback(async () => {
    const [z, d] = await Promise.all([
      sb().from('delivery_zones').select('*').eq('shop_id', shop.id).order('city').order('label'),
      sb().from('transport_depots').select('*').eq('shop_id', shop.id).order('company'),
    ]);
    if (z.error) return toast(errText(z.error)); setZones(z.data || []); setDepots(d.data || []);
  }, [shop.id, toast]);
  useEffect(() => { load(); }, [load]);

  async function quickSetup() {
    const depot = depots[0]?.id || null;
    const rows = [
      ...BAMAKO.map(([l, f]) => ({ shop_id: shop.id, city: 'Bamako', label: l, fee: f, delay_days: 1, mode: 'livreur', driver_cost: 1000 })),
      { shop_id: shop.id, city: 'Kati', label: 'Kati', fee: 2000, delay_days: 2, mode: 'livreur', driver_cost: 1500 },
      ...REGIONS.map(([l, f, d]) => ({ shop_id: shop.id, city: l, label: l, fee: f, delay_days: d, mode: depot ? 'bus' : 'livreur', depot_id: depot, driver_cost: 1000 })),
    ].filter((r) => !(zones || []).some((z) => z.city === r.city && z.label === r.label));
    if (!rows.length) return toast('Toutes ces zones existent déjà.');
    const { error } = await sb().from('delivery_zones').insert(rows);
    if (error) return toast(errText(error)); toast(rows.length + ' zones ajoutées'); load();
  }

  return (
    <>
      <h2 style={{ fontSize: 16, marginTop: 18 }}>Gares des compagnies de car</h2>
      <p className="muted">Pour les envois vers les régions. L’arrivée du livreur dans le rayon de la gare vous est signalée.</p>
      <ul className="rows">{depots.map((d) => (
        <li key={d.id}><div className="grow"><strong>{d.label}</strong><span className="muted">{d.company} · rayon {d.radius_m} m · {d.lat.toFixed(5)}, {d.lng.toFixed(5)}</span></div>
          <button className="btn sm" onClick={() => setEditD(d)}>Modifier</button></li>))}</ul>
      <div style={{ marginTop: 10 }}><button className="btn" onClick={() => setEditD({})}>+ Ajouter une gare</button></div>

      <div className="toolbar" style={{ marginTop: 24 }}><h2 style={{ fontSize: 16 }}>Zones de livraison</h2>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn" onClick={quickSetup}>Ajouter Bamako + régions</button><button className="btn primary" onClick={() => setEditZ({})}>+ Zone</button></span></div>
      {!depots.length && <p className="info-line t-warn">Ajoutez d’abord une gare : les régions seront alors livrées par car.</p>}
      {!zones ? <p className="muted">Chargement…</p> : !zones.length ? <p className="empty" style={{ marginTop: 12 }}>Aucune zone. Utilisez « Ajouter Bamako + régions ».</p> :
        <ul className="rows">{zones.map((z) => (
          <li key={z.id}><div className="grow"><strong>{z.city === 'Bamako' ? 'Bamako, ' + z.label : z.label}</strong>
            <span className="muted">{fmt(z.fee)} · {z.mode === 'bus' ? 'par car ' + (depots.find((d) => d.id === z.depot_id)?.company || '') : 'livreur'} · {z.delay_days} j{z.active ? '' : ' · désactivée'}</span></div>
            <button className="btn sm" onClick={() => setEditZ(z)}>Modifier</button></li>))}</ul>}
      {editZ && <ZoneForm shop={shop} z={editZ} depots={depots} onClose={() => setEditZ(null)} onSaved={() => { setEditZ(null); load(); toast('Zone enregistrée'); }} />}
      {editD && <DepotForm shop={shop} d={editD} onClose={() => setEditD(null)} onSaved={() => { setEditD(null); load(); toast('Gare enregistrée'); }} />}
    </>
  );
}

function ZoneForm({ shop, z, depots, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ city: z.city || '', label: z.label || '', fee: z.fee ?? 1000, delay_days: z.delay_days ?? 1, mode: z.mode || 'livreur', depot_id: z.depot_id || depots[0]?.id || '', driver_cost: z.driver_cost ?? 1000, active: z.active ?? true });
  const [err, setErr] = useState('');
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.city.trim() || !f.label.trim()) return setErr('Indiquez la ville et le nom de la zone.');
    if (f.mode === 'bus' && !f.depot_id) return setErr('Choisissez la gare pour un envoi par car.');
    const row = { shop_id: shop.id, city: f.city.trim(), label: f.label.trim(), fee: Number(f.fee) || 0, delay_days: Number(f.delay_days) || 1, mode: f.mode, depot_id: f.mode === 'bus' ? f.depot_id : null, driver_cost: Number(f.driver_cost) || 0, active: !!f.active };
    const { error } = z.id ? await sb().from('delivery_zones').update(row).eq('id', z.id) : await sb().from('delivery_zones').insert(row);
    if (error) return setErr(errText(error)); onSaved();
  }
  return (
    <Sheet title={z.id ? 'Modifier la zone' : 'Nouvelle zone'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="two"><div className="field" style={{ marginTop: 0 }}><label htmlFor="zc">Ville</label><input id="zc" value={f.city} onChange={set('city')} placeholder="Bamako" /></div>
          <div className="field" style={{ marginTop: 0 }}><label htmlFor="zl">Zone</label><input id="zl" value={f.label} onChange={set('label')} placeholder="Commune IV" /></div></div>
        <div className="two"><div className="field"><label htmlFor="zf">Frais payés par le client</label><input id="zf" inputMode="numeric" value={f.fee} onChange={set('fee')} /></div>
          <div className="field"><label htmlFor="zd">Coût d’une course (livreur)</label><input id="zd" inputMode="numeric" value={f.driver_cost} onChange={set('driver_cost')} /></div></div>
        <div className="two"><div className="field"><label htmlFor="zm">Mode</label><select id="zm" value={f.mode} onChange={set('mode')}><option value="livreur">Livreur</option><option value="bus">Envoi par car</option></select></div>
          <div className="field"><label htmlFor="zj">Délai (jours)</label><input id="zj" inputMode="numeric" value={f.delay_days} onChange={set('delay_days')} /></div></div>
        {f.mode === 'bus' && <div className="field"><label htmlFor="zg">Gare de départ</label><select id="zg" value={f.depot_id} onChange={set('depot_id')}>{depots.map((d: any) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>}
        <label className="check"><input type="checkbox" checked={f.active} onChange={set('active')} /><span>Zone active</span></label>
        {err && <p className="err">{err}</p>}
        <div style={{ marginTop: 14 }}><button className="btn primary wide">Enregistrer</button></div>
      </form>
    </Sheet>
  );
}

function DepotForm({ shop, d, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ company: d.company || 'Diarra Transport', label: d.label || 'Gare Diarra Transport', lat: d.lat ?? '', lng: d.lng ?? '', radius_m: d.radius_m ?? 150 });
  const [err, setErr] = useState(''); const [gpsMsg, setGpsMsg] = useState('');
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  function here() {
    setGpsMsg('Recherche de votre position…');
    navigator.geolocation?.getCurrentPosition((p) => { setF((x: any) => ({ ...x, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })); setGpsMsg('Position de la gare enregistrée (précision ± ' + Math.round(p.coords.accuracy) + ' m).'); },
      () => setGpsMsg('Position refusée. Autorisez la localisation ou saisissez-la.'), { enableHighAccuracy: true, timeout: 10000 });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const lat = Number(f.lat), lng = Number(f.lng);
    if (!f.company.trim() || !f.label.trim()) return setErr('Indiquez la compagnie et le nom de la gare.');
    if (!(lat >= 10 && lat <= 25.5 && lng >= -12.5 && lng <= 4.5)) return setErr('Position hors du Mali : utilisez « Je suis à la gare » sur place, ou copiez les coordonnées depuis Google Maps.');
    const row = { shop_id: shop.id, company: f.company.trim(), label: f.label.trim(), lat, lng, radius_m: Number(f.radius_m) || 150 };
    const { error } = d.id ? await sb().from('transport_depots').update(row).eq('id', d.id) : await sb().from('transport_depots').insert(row);
    if (error) return setErr(errText(error)); onSaved();
  }
  return (
    <Sheet title={d.id ? 'Modifier la gare' : 'Nouvelle gare'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="field" style={{ marginTop: 0 }}><label htmlFor="dc">Compagnie</label><input id="dc" value={f.company} onChange={set('company')} /></div>
        <div className="field"><label htmlFor="dl">Nom de la gare</label><input id="dl" value={f.label} onChange={set('label')} /></div>
        <div className="field"><button type="button" className="btn" onClick={here}>Je suis à la gare : prendre ma position</button>{gpsMsg && <span className="muted">{gpsMsg}</span>}</div>
        <div className="two"><div className="field"><label htmlFor="da">Latitude</label><input id="da" inputMode="decimal" value={f.lat} onChange={set('lat')} placeholder="12.60" /></div>
          <div className="field"><label htmlFor="dg">Longitude</label><input id="dg" inputMode="decimal" value={f.lng} onChange={set('lng')} placeholder="-7.97" /></div></div>
        <div className="field"><label htmlFor="dr">Rayon de détection (mètres)</label><input id="dr" inputMode="numeric" value={f.radius_m} onChange={set('radius_m')} /></div>
        {err && <p className="err">{err}</p>}
        <div style={{ marginTop: 14 }}><button className="btn primary wide">Enregistrer</button></div>
      </form>
    </Sheet>
  );
}
