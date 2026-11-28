// Catalogue complet proposé lors de l'ajout d'un produit (une catégorie n'est créée
// dans la boutique qu'au moment où on y range un produit).
export const CATEGORY_GROUPS: [string, string[]][] = [
  ['Électronique', ['Téléphones et tablettes', 'Accessoires téléphone', 'Montres connectées', 'Écouteurs et casques', 'Enceintes et audio', 'Informatique', 'TV et vidéo', 'Photo et caméras', 'Jeux vidéo et consoles', 'Gadgets et innovations']],
  ['Maison', ['Électroménager', 'Cuisine et ustensiles', 'Maison et décoration', 'Linge de maison', 'Rangement et organisation', 'Nettoyage et entretien', 'Éclairage', 'Énergie solaire', 'Batteries et powerbanks', 'Ventilation et climatisation', 'Eau et filtration']],
  ['Beauté et santé', ['Soins du visage', 'Soins du corps', 'Cheveux et perruques', 'Maquillage', 'Parfums', 'Rasage et épilation', 'Santé et bien-être', 'Minceur et forme', 'Massage et relaxation', 'Hygiène intime']],
  ['Mode', ['Mode femme', 'Mode homme', 'Mode enfant', 'Tenues traditionnelles', 'Chaussures', 'Sacs et maroquinerie', 'Bijoux', 'Montres classiques', 'Lunettes', 'Accessoires de mode']],
  ['Famille', ['Bébé et puériculture', 'Jouets et jeux', 'Fournitures scolaires', 'Animaux']],
  ['Sport et loisirs', ['Sport et fitness', 'Vélos et trottinettes', 'Camping et plein air', 'Instruments de musique', 'Livres']],
  ['Auto et outils', ['Auto et moto', 'Outils et bricolage', 'Sécurité et surveillance', 'Jardin et agriculture', 'Matériel professionnel']],
  ['Alimentation et religion', ['Épicerie', 'Boissons', 'Articles religieux']],
];

const ICONS: Record<string, string> = {
  'Électronique': '📱', 'Maison': '🏠', 'Beauté et santé': '💄', 'Mode': '👗', 'Famille': '🧸', 'Sport et loisirs': '⚽', 'Auto et outils': '🔧', 'Alimentation et religion': '🛒',
};
export const groupIcon = (g: string) => ICONS[g] || '🏷️';
export const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap(([, l]) => l);

const CAT_ICON: Record<string, string> = {
  'Téléphones et tablettes': '📱', 'Accessoires téléphone': '🔌', 'Montres connectées': '⌚', 'Écouteurs et casques': '🎧', 'Enceintes et audio': '🔊', 'Informatique': '💻', 'TV et vidéo': '📺', 'Photo et caméras': '📷', 'Jeux vidéo et consoles': '🎮', 'Gadgets et innovations': '✨',
  'Électroménager': '🧺', 'Cuisine et ustensiles': '🍳', 'Maison et décoration': '🛋️', 'Linge de maison': '🛏️', 'Rangement et organisation': '🗄️', 'Nettoyage et entretien': '🧽', 'Éclairage': '💡', 'Énergie solaire': '☀️', 'Batteries et powerbanks': '🔋', 'Ventilation et climatisation': '🌀', 'Eau et filtration': '🚿',
  'Soins du visage': '🧴', 'Soins du corps': '🧼', 'Cheveux et perruques': '💇🏾‍♀️', 'Maquillage': '💄', 'Parfums': '🌸', 'Rasage et épilation': '🪒', 'Santé et bien-être': '🩺', 'Minceur et forme': '🏃🏾', 'Massage et relaxation': '💆🏾', 'Hygiène intime': '🌿',
  'Mode femme': '👗', 'Mode homme': '👔', 'Mode enfant': '🧒🏾', 'Tenues traditionnelles': '🥻', 'Chaussures': '👟', 'Sacs et maroquinerie': '👜', 'Bijoux': '💍', 'Montres classiques': '🕰️', 'Lunettes': '🕶️', 'Accessoires de mode': '🧣',
  'Bébé et puériculture': '🍼', 'Jouets et jeux': '🧸', 'Fournitures scolaires': '🎒', 'Animaux': '🐾',
  'Sport et fitness': '🏋🏾', 'Vélos et trottinettes': '🛴', 'Camping et plein air': '⛺', 'Instruments de musique': '🎸', 'Livres': '📚',
  'Auto et moto': '🏍️', 'Outils et bricolage': '🔧', 'Sécurité et surveillance': '📹', 'Jardin et agriculture': '🌱', 'Matériel professionnel': '🧰',
  'Épicerie': '🛒', 'Boissons': '🥤', 'Articles religieux': '📿',
};
const key = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const BY_KEY = new Map(Object.entries(CAT_ICON).map(([k, v]) => [key(k), v]));
export const catIcon = (name: string) => BY_KEY.get(key(name)) || '🏷️';
// Range des catégories de la boutique par rayon (les noms libres vont dans « Autres »).
export function byGroup<T extends { name: string }>(cats: T[]): [string, string, T[]][] {
  const out: [string, string, T[]][] = CATEGORY_GROUPS.map(([g, l]) => [g, groupIcon(g), cats.filter((c) => l.some((n) => key(n) === key(c.name)))]);
  const rest = cats.filter((c) => !ALL_CATEGORIES.some((n) => key(n) === key(c.name)));
  if (rest.length) out.push(['Autres', '🏷️', rest]);
  return out.filter((g) => g[2].length > 0);
}
