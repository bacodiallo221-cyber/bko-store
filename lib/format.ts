export const num = (n: number) => Number(n || 0).toLocaleString('fr-FR');
export const fmt = (n: number) => num(n) + ' FCFA';

export function promise(z: any) {
  if (!z) return '';
  if (z.mode === 'bus') return 'Envoi par car ' + (z.carrier || '') + ' · retrait à la gare de ' + z.city + ' sous ' + (z.delay_days <= 2 ? '24 à 48 h' : '48 à 72 h');
  if (z.delay_days <= 1) return 'Livré en moins de 24 h à ' + (z.city || 'Bamako');
  return 'Livré sous ' + (z.delay_days === 2 ? '24 à 48 h' : '48 à 72 h');
}

export const zoneName = (z: any) => (z ? (z.city === 'Bamako' ? 'Bamako, ' + z.label : z.label) : '');

// Codes d'erreur renvoyés par la base -> message pour le client
const ERR: Record<string, string> = {
  BLOCKED: 'Ce numéro ne peut plus commander en ligne. Contactez-nous sur WhatsApp.',
  CLIENT_REQUIRED: 'Entrez le nom du client.', ITEMS_REQUIRED: 'Ajoutez au moins une ligne.', BAD_ITEM: 'Vérifiez les lignes : désignation, quantité (au moins 1) et prix.',
  shops_accent_chk: 'Couleur invalide.',
  READY_REQUIRED: 'Cochez la case pour confirmer que vous recevrez et paierez le colis.',
  BAD_OPTION: 'Choisissez une option valide.',
  BAD_QUANTITY: 'Quantité non valide.',
  BAD_ZONE: 'Choisissez votre ville et commune.',
  BAD_PHONE: 'Numéro non valide : 8 chiffres d’un opérateur malien, ou avec +223.',
  BAD_NAME: 'Entrez votre nom et prénom.',
  BAD_LANDMARK: 'Indiquez votre quartier.',
  TOO_MANY_ORDERS: 'Trop de commandes avec ce numéro en peu de temps. Réessayez dans quelques minutes.',
  OUT_OF_STOCK: 'Désolé, ce produit vient d’être épuisé pour cette quantité.',
  PRODUCT_NOT_FOUND: 'Ce produit n’est plus disponible.',
  SHOP_NOT_FOUND: 'Boutique introuvable.',
  ORDER_NOT_FOUND: 'Commande introuvable.',
  UPSELL_ALREADY_ADDED: 'Cette offre est déjà ajoutée.',
  NO_UPSELL: 'Cette offre n’est plus disponible.',
  DRIVER_NOT_ALLOWED: 'Ce livreur n’est pas autorisé pour ces produits.',
  DRIVER_NOT_ACTIVE: 'Ce livreur n’est pas connecté à l’application.',
  DRIVER_REQUIRED: 'Choisissez un livreur.',
  ORDER_CLOSED: 'Cette commande est terminée.',
  NOT_HANDED_TO_CARRIER: 'Le colis n’a pas encore été remis au transporteur.',
  DELIVERY_IN_PROGRESS: 'Ce livreur a des colis en cours.',
  FORBIDDEN: 'Action non autorisée.',
};
export function errText(e: any) {
  const m = String(e?.message || e || '');
  const code = Object.keys(ERR).find((k) => m.includes(k));
  if (code) return ERR[code];
  if (m.includes('duplicate key') && m.includes('slug')) return 'Cet identifiant de boutique est déjà pris.';
  if (m.includes('Failed to fetch') || m.includes('NetworkError')) return 'Connexion impossible. Vérifiez votre internet et réessayez.';
  return 'Une erreur est survenue. Réessayez.';
}

// Montant en toutes lettres (factures) : 222000 -> « deux cent vingt-deux mille »
const U = ['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
const T = ['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];
function under100(n: number): string {
  if (n < 20) return U[n];
  const t = Math.floor(n / 10), u = n % 10;
  if (t === 7 || t === 9) return T[t] + (t === 7 && u === 1 ? '-et-' : '-') + U[10 + u];
  if (u === 0) return T[t] + (t === 8 ? 's' : '');
  return T[t] + (u === 1 && t < 8 ? '-et-' : '-') + U[u];
}
function under1000(n: number): string {
  const c = Math.floor(n / 100), r = n % 100;
  const head = c === 0 ? '' : c === 1 ? 'cent' : U[c] + ' cent' + (r === 0 ? 's' : '');
  return [head, r ? under100(r) : ''].filter(Boolean).join(' ');
}
export function enLettres(n: number): string {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return 'zéro';
  const parts: string[] = [];
  const b = Math.floor(n / 1e9), m = Math.floor((n % 1e9) / 1e6), k = Math.floor((n % 1e6) / 1000), r = n % 1000;
  if (b) parts.push(under1000(b) + ' milliard' + (b > 1 ? 's' : ''));
  if (m) parts.push(under1000(m) + ' million' + (m > 1 ? 's' : ''));
  if (k) parts.push(k === 1 ? 'mille' : under1000(k).replace(/(cent|vingt)s$/, '$1') + ' mille');
  if (r) parts.push(under1000(r));
  return parts.join(' ');
}
