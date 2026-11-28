// Lieux du Mali pour le formulaire de commande : quartiers de Bamako (avec leurs autres appellations)
// et villes desservies par car, reliées à leur grande gare. Coordonnées approximatives.
export type Quartier = [string, number, number, string];
export type Town = [string, string, string, string];

export const Q: Quartier[] = [['Boulkassoumbougou',12.676,-7.979,'boulka|boulkassombougou|boulkasoumbougou'],['Djélibougou',12.665,-7.975,'djelibougou|djelibugu'],['Banconi',12.676,-7.995,'bankoni|banconi plateau|banconi salembougou'],['Korofina Nord',12.665,-7.985,'korofina'],['Korofina Sud',12.656,-7.987,''],['Fadjiguila',12.684,-7.966,'fadjiguila marché'],['Doumanzana',12.666,-7.955,'doumanzana'],['Sotuba',12.655,-7.935,'sotuba aci|sotuba'],['Sikoroni',12.672,-8.003,''],['Hippodrome',12.651,-7.990,'hipodrome|hippodrome 2'],['Médina Coura',12.647,-7.993,'medina koura|medine|medinacoura'],['Bagadadji',12.646,-7.998,'bagadaji'],['Niaréla',12.648,-7.983,'niarela'],['Quinzambougou',12.651,-7.978,'quinzanbougou'],['Bozola',12.646,-7.989,''],['Missira',12.654,-7.996,''],['Grand Marché',12.644,-8.000,'marché rose|centre ville|grand marche|dabanani'],['Dravéla',12.646,-8.012,'dravela'],['Bamako Coura',12.642,-8.008,'bamako koura'],['Dar Salam',12.645,-8.018,'darsalam|dar es salam'],['Ouolofobougou',12.652,-8.012,'wolofobougou|ouolofobougou bolibana|bolibana'],['Koulouba',12.660,-8.015,''],['Point G',12.665,-8.023,'pointg'],['Badialan',12.648,-8.020,'badialan 1|badialan 2'],['N’Tomikorobougou',12.638,-8.020,'ntomikorobougou|tomikorobougou'],['Quartier du Fleuve',12.634,-8.000,'quartier fleuve'],['Hamdallaye',12.638,-8.030,'hamdalaye|hamdallaye aci'],['ACI 2000',12.622,-8.035,'aci|aci2000'],['Lafiabougou',12.640,-8.045,'lafia|lafiabougou taliko|taliko'],['Djicoroni Para',12.632,-8.060,'djikoroni para|djicoroni'],['Samé',12.655,-8.040,'same'],['Sébénikoro',12.630,-8.085,'sebenikoro|sebeninkoro'],['Badalabougou',12.625,-7.990,'badala|badalabougou sema|sema'],['Quartier Mali',12.620,-8.000,''],['Torokorobougou',12.617,-7.995,'torokoro'],['Daoudabougou',12.600,-7.975,'daouda'],['Kalaban Coura',12.585,-7.990,'kalaban koura|kalabancoura|kalaban coura aci|kalaban'],['Sabalibougou',12.585,-7.985,''],['Magnambougou',12.605,-7.950,'magnambougou projet|magnanbougou'],['Faladié',12.590,-7.950,'faladie|faladje|faladie sokoro|faladie sema|faladié séma|faladie iniada'],['Sogoniko',12.590,-7.965,'sogoniko gare|gare routiere'],['Garantiguibougou',12.585,-7.975,'garantibougou'],['Banankabougou',12.595,-7.940,'banakabougou'],['Missabougou',12.600,-7.920,''],['Sokorodji',12.590,-7.925,'sokorodji dianeguela|dianeguela'],['Yirimadio',12.585,-7.910,'yirimadio zerny|zerny'],['Niamakoro',12.575,-7.960,'niamakoro cite unicef|cite unicef'],['Baco Djicoroni',12.580,-8.020,'bacodjicoroni|baco djikoroni|baco djicoroni golf|baco djicoroni aci|golf'],['Sénou',12.545,-7.950,'senou|aeroport'],['Kalaban Coro',12.560,-7.990,'kalabancoro|kalaban coro plateau'],['Niamana',12.565,-7.965,''],['Tiébani',12.560,-8.010,'tiebani'],['Sirakoro Méguétana',12.555,-7.920,'sirakoro'],['Moribabougou',12.690,-7.920,''],['Sangarébougou',12.680,-7.940,'sangarebougou'],['Titibougou',12.705,-7.905,''],['Djalakorodji',12.695,-8.010,'dialakorodji|djalakorobougou'],['Safo',12.720,-8.000,''],['Samaya',12.590,-8.120,''],['Kati',12.744,-8.071,'kati ville|kati camp'],['Kati Coco',12.748,-8.066,'kati koko|koko'],['Kati Malibougou',12.738,-8.080,'malibougou'],['Kati Farada',12.752,-8.080,'farada'],['Kati Noumorila',12.740,-8.060,'noumorila'],['Kati Sananfara',12.735,-8.068,'sananfara']];

export const T: Town[] = [['Kayes','kayes','Kayes',''],['Kéniéba','kayes','Kayes','kenieba'],['Bafoulabé','kayes','Kayes','bafoulabe'],['Sadiola','kayes','Kayes',''],['Diboli','kayes','Kayes',''],['Ambidédi','kayes','Kayes','ambidedi'],['Aourou','kayes','Kayes',''],['Mahina','kayes','Kayes',''],['Kita','kita','Kita',''],['Toukoto','kita','Kita',''],['Sagabari','kita','Kita',''],['Kokofata','kita','Kita',''],['Sébékoro','kita','Kita','sebekoro'],['Nioro du Sahel','nioro','Nioro','nioro'],['Diéma','nioro','Nioro','diema'],['Yélimané','nioro','Nioro','yelimane'],
    ['Koulikoro','koulikoro','Koulikoro',''],['Kangaba','koulikoro','Koulikoro',''],['Kolokani','koulikoro','Koulikoro',''],['Banamba','koulikoro','Koulikoro',''],['Siby','koulikoro','Koulikoro',''],['Narena','koulikoro','Koulikoro',''],['Kassela','koulikoro','Koulikoro',''],['Baguinéda','koulikoro','Koulikoro','baguineda'],['Sanankoroba','koulikoro','Koulikoro',''],['Nara','nioro','Nara',''],['Dioïla','dioila','Dioïla','dioila'],['Fana','dioila','Dioïla',''],['Massigui','dioila','Dioïla',''],
    ['Ségou','segou','Ségou','segou'],['Markala','segou','Ségou',''],['Niono','segou','Ségou',''],['Macina','segou','Ségou',''],['Bla','segou','Ségou',''],['Barouéli','segou','Ségou','baroueli'],['Diabaly','segou','Ségou',''],['Sansanding','segou','Ségou',''],['Dioro','segou','Ségou',''],['Kirango','segou','Ségou',''],['Fatiné','segou','Ségou','fatine'],['Dandougou','segou','Ségou','dandougou fakala'],['San','san','San',''],['Tominian','san','San',''],['Yangasso','san','San',''],
    ['Sikasso','sikasso','Sikasso',''],['Kadiolo','sikasso','Sikasso',''],['Zégoua','sikasso','Sikasso','zegoua'],['Kignan','sikasso','Sikasso',''],['Niéna','sikasso','Sikasso','niena'],['Loulouni','sikasso','Sikasso',''],['Koutiala','koutiala','Koutiala',''],['Yorosso','koutiala','Koutiala',''],['Kimparana','koutiala','Koutiala',''],['M’Pessoba','koutiala','Koutiala','mpessoba'],['Bougouni','bougouni','Bougouni',''],['Kolondiéba','bougouni','Bougouni','kolondieba'],['Yanfolila','bougouni','Bougouni',''],['Garalo','bougouni','Bougouni',''],['Kalana','bougouni','Bougouni',''],['Ouéléssébougou','bougouni','Bougouni','ouelessebougou'],
    ['Mopti','mopti','Mopti',''],['Sévaré','mopti','Mopti','sevare'],['Djenné','mopti','Mopti','djenne'],['Konna','mopti','Mopti',''],['Ténenkou','mopti','Mopti','tenenkou'],['Youwarou','mopti','Mopti',''],['Bankass','mopti','Bandiagara',''],['Koro','mopti','Bandiagara',''],['Bandiagara','mopti','Bandiagara',''],['Douentza','douentza','Douentza',''],['Boni','douentza','Douentza',''],['Hombori','douentza','Douentza',''],
    ['Tombouctou','tombouctou','Tombouctou','tombouctu|timbuktu'],['Goundam','tombouctou','Tombouctou',''],['Diré','tombouctou','Tombouctou','dire'],['Niafunké','tombouctou','Tombouctou','niafunke'],['Léré','tombouctou','Tombouctou','lere'],['Gao','gao','Gao',''],['Ansongo','gao','Gao',''],['Bourem','gao','Gao',''],['Ménaka','gao','Ménaka','menaka'],['Kidal','gao','Kidal','']];

// Nom affiché de chaque grande gare (doit correspondre à la « ville » des zones par car du vendeur)
export const HUBS: Record<string, string> = { kayes: 'Kayes', kita: 'Kita', nioro: 'Nioro', koulikoro: 'Koulikoro', dioila: 'Dioïla', segou: 'Ségou', san: 'San', sikasso: 'Sikasso', koutiala: 'Koutiala', bougouni: 'Bougouni', mopti: 'Mopti', douentza: 'Douentza', tombouctou: 'Tombouctou', gao: 'Gao' };

export const norm = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

function lev(a: string, b: string) {
  const m = a.length, n = b.length; const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

// Recherche tolérante : nom officiel ou autre appellation, début, contenu, ou faute de frappe légère.
export function find<T extends any[]>(list: T[], input: string, nameIdx = 0, aliasIdx = 3): [number, T][] {
  const v = norm(input); if (v.length < 2) return [];
  return list.map((x): [number, T] => {
    const keys = [x[nameIdx], ...String(x[aliasIdx] || '').split('|').filter(Boolean)].map(norm); let sc = 0;
    for (const k of keys) { if (k === v) sc = Math.max(sc, 100); else if (k.startsWith(v)) sc = Math.max(sc, 80); else if (k.includes(v)) sc = Math.max(sc, 60); else if (v.length >= 3 && Math.min(lev(v, k), lev(v, k.slice(0, v.length)), lev(v, k.slice(0, v.length + 1))) <= (v.length >= 6 ? 2 : 1)) sc = Math.max(sc, 50); }
    return [sc, x];
  }).filter((a) => a[0] > 0).sort((a, b) => b[0] - a[0]);
}

// Distance par la route estimée : ligne droite × 1,3
export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (x: number) => (x * Math.PI) / 180, dl = r(b.lat - a.lat), dg = r(b.lng - a.lng);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dg / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h)) * 1.3;
}
export function tier(tiers: [number, number][], d: number) {
  const t = (tiers || []).find((x) => d <= Number(x[0])); return t ? Number(t[1]) : Number((tiers || []).slice(-1)[0]?.[1] || 0);
}
