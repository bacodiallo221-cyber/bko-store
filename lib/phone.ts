// Numéros acceptés : 8 chiffres maliens, ou avec +223 / 00223 / 223. Indicatifs étrangers refusés.
// Même règle que normalize_ml_phone() dans la base. Préfixes : 20, 21, 44 ; 50-79 ; 81-99 (80 = services).
const ML_PREFIX = /^(20|21|44|5[0-9]|6[0-9]|7[0-9]|8[1-9]|9[0-9])[0-9]{6}$/;

export function mlPhone(raw: string) {
  const r = String(raw || '').replace(/[\s.()\/-]/g, '');
  let d: string | null = null;
  if (/^\+223\d{8}$/.test(r) || /^00223\d{8}$/.test(r) || /^223\d{8}$/.test(r)) d = r.slice(-8);
  else if (/^\d{8}$/.test(r)) d = r;
  const foreign = !d && /^(\+|00)/.test(r) && !/^(\+|00)223/.test(r);
  return { ok: !!(d && ML_PREFIX.test(d)), digits: d, foreign, empty: !r };
}

export const fmtPhone = (p: string) => String(p || '').replace(/(\d{2})(?=\d)/g, '$1 ');

export function waLink(phone: string | null | undefined, text: string) {
  const ph = mlPhone(phone || '');
  if (!ph.ok) return null;
  return 'https://wa.me/223' + ph.digits + '?text=' + encodeURIComponent(text);
}
