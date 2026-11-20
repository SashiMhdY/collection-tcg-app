// Calculs sur la collection : valeur actuelle de chaque carte, totaux, historique.
// La valeur d'une carte est sa dernière cotation (data/prix.json) ; une carte sans cotation vaut 0 et est signalée « sans prix ».

// Teinte de chaque jeu, pour les cartes sans photo (le nom du jeu est toujours écrit à côté).
const TEINTES = {
  'Pokémon': '#C99A00',
  'Super Dragon Ball Heroes': '#D9622B',
  'Dragon Ball': '#D9622B',
  'Dragon Ball Carddass': '#C0465A',
  'Naruto Kayou': '#2E8C68',
  'Yu-Gi-Oh!': '#2F6BC4',
  'One Piece': '#B23A3A',
  'Lorcana': '#6A4FB3',
  'Magic': '#7A6A55',
  'Final Fantasy': '#3B7F9C',
};
export const teinte = (collection) => TEINTES[collection] || '#6E7288';

const COURTS = { 'Super Dragon Ball Heroes': 'SDBH', 'Dragon Ball Carddass': 'Carddass' };
export const nomCourt = (collection) => COURTS[collection] || collection;

export const cotations = (prix, id) => prix[id] || [];
export const derniere = (prix, id) => {
  const l = cotations(prix, id);
  return l.length ? l[l.length - 1] : null;
};
export const valeur = (prix, id) => derniere(prix, id)?.prix ?? null;

// Écart entre les deux dernières cotations, ou null.
export function variation(prix, id) {
  const l = cotations(prix, id);
  if (l.length < 2) return null;
  return Math.round((l[l.length - 1].prix - l[l.length - 2].prix) * 100) / 100;
}

export const total = (cartes, prix) => Math.round(cartes.reduce((s, c) => s + (valeur(prix, c.id) || 0), 0) * 100) / 100;

// Somme des variations des cartes cotées au moins deux fois : l'évolution des prix, sans les ajouts de cartes.
export function variationTotale(cartes, prix) {
  let v = 0;
  let n = 0;
  for (const c of cartes) {
    const d = variation(prix, c.id);
    if (d != null) {
      v += d;
      n++;
    }
  }
  return n ? { valeur: Math.round(v * 100) / 100, cartes: n } : null;
}

export function derniereMaj(cartes, prix) {
  let d = '';
  for (const c of cartes) {
    const x = derniere(prix, c.id)?.date;
    if (x && x > d) d = x;
  }
  return d || null;
}

// Valeur de la collection en fin de mois, pour chaque mois qui compte au moins une cotation.
// Regrouper par mois évite qu'une mise à jour étalée sur plusieurs jours dessine une fausse hausse.
export function historiqueMensuel(cartes, prix) {
  const mois = new Set();
  for (const c of cartes) for (const x of cotations(prix, c.id)) if (x.date) mois.add(x.date.slice(0, 7));
  return [...mois].sort().map((m) => {
    const fin = `${m}-31`;
    let v = 0;
    for (const c of cartes) {
      const l = cotations(prix, c.id).filter((x) => !x.date || x.date <= fin);
      if (l.length) v += l[l.length - 1].prix;
    }
    return { date: `${m}-01`, valeur: Math.round(v * 100) / 100 };
  });
}

export function parCollection(cartes, prix) {
  const m = new Map();
  for (const c of cartes) {
    const e = m.get(c.collection) || { collection: c.collection, cartes: 0, valeur: 0 };
    e.cartes++;
    e.valeur += valeur(prix, c.id) || 0;
    m.set(c.collection, e);
  }
  return [...m.values()].map((e) => ({ ...e, valeur: Math.round(e.valeur * 100) / 100 })).sort((a, b) => b.valeur - a.valeur);
}

// Source d'une cotation, écrite pour suivre une virgule (« Cote du 22 août 2026, hors Cardmarket »).
export const sourceLisible = (s) => {
  if (s === 'Cardmarket') return 'Cardmarket, prix moyen 30 jours';
  return /^eBay/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
};
