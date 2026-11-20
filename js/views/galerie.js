// Galerie : toutes les cartes, avec filtres (jeu, série, langue), recherche et tri.
import { html, useState, useMemo } from '../vendor/htm-preact.js';
import { useStore, Barre, Visuel, Ico } from '../ui.js';
import { valeur, variation, parCollection, nomCourt, total } from '../collection.js';
import { norm, parNom, euros, eurosSigne, pluriel } from '../util.js';

const TRIS = [
  ['prix', 'Prix'],
  ['prix-bas', 'Prix croissant'],
  ['nom', 'Nom'],
  ['ajout', 'Récentes'],
  ['hausse', 'En hausse'],
];
const VIDE = { q: '', collection: '', serie: '', langue: '', tri: 'prix' };
// Filtres gardés tant que l'app est ouverte (retour depuis une fiche), jamais d'une ouverture à l'autre.
let memo = { ...VIDE };

export function Galerie({ q: query }) {
  const s = useStore();
  const cartes = s.cartes;
  const prix = s.prix;
  const [f, setF] = useState(() => (query.c != null ? (memo = { ...memo, collection: query.c, serie: '' }) : memo));
  const maj = (x) => {
    memo = { ...f, ...x };
    setF(memo);
  };

  const groupes = useMemo(() => parCollection(cartes, prix), [cartes, prix]);
  const dansJeu = useMemo(() => (f.collection ? cartes.filter((c) => c.collection === f.collection) : cartes), [cartes, f.collection]);
  const series = useMemo(() => [...new Set(dansJeu.map((c) => c.serie))].sort(parNom), [dansJeu]);
  const langues = useMemo(() => [...new Set(cartes.map((c) => c.langue))].sort(parNom), [cartes]);

  const liste = useMemo(() => {
    const mots = norm(f.q).split(/\s+/).filter(Boolean);
    const l = dansJeu.filter((c) => {
      if (f.serie && c.serie !== f.serie) return false;
      if (f.langue && c.langue !== f.langue) return false;
      if (!mots.length) return true;
      const foin = norm([c.nom, c.numero, c.serie, c.collection, c.variante, c.langue].join(' '));
      return mots.every((m) => foin.includes(m));
    });
    const v = (c) => valeur(prix, c.id) ?? -1;
    const tri = {
      prix: (a, b) => v(b) - v(a) || parNom(a.nom, b.nom),
      'prix-bas': (a, b) => v(a) - v(b) || parNom(a.nom, b.nom),
      nom: (a, b) => parNom(a.nom, b.nom) || parNom(a.serie, b.serie),
      ajout: (a, b) => String(b.ajoutee_le || '').localeCompare(String(a.ajoutee_le || '')) || v(b) - v(a),
      hausse: (a, b) => (variation(prix, b.id) ?? -Infinity) - (variation(prix, a.id) ?? -Infinity) || v(b) - v(a),
    }[f.tri];
    return l.sort(tri);
  }, [dansJeu, f, prix]);

  const filtre = f.q || f.collection || f.serie || f.langue;
  const sousTotal = useMemo(() => total(liste, prix), [liste, prix]);

  return html`<main class="vue">
    <${Barre} />
    <h1 class="titre-vue">Galerie</h1>
    <label class="recherche">
      ${Ico.chercher()}
      <input type="search" placeholder="Nom, numéro, série" value=${f.q} onInput=${(e) => maj({ q: e.target.value })} aria-label="Chercher une carte" />
    </label>
    <div class="filtres" role="group" aria-label="Filtrer par jeu">
      <button class=${`filtre${!f.collection ? ' actif' : ''}`} aria-pressed=${!f.collection} onClick=${() => maj({ collection: '', serie: '' })}>Toutes</button>
      ${groupes.map(
        (g) => html`<button key=${g.collection} class=${`filtre${f.collection === g.collection ? ' actif' : ''}`} aria-pressed=${f.collection === g.collection}
          onClick=${() => maj({ collection: f.collection === g.collection ? '' : g.collection, serie: '' })}>
          ${nomCourt(g.collection)} <span class="filtre-n">${g.cartes}</span>
        </button>`,
      )}
    </div>
    <div class="selecteurs">
      <label><span>Série</span>
        <select value=${f.serie} onChange=${(e) => maj({ serie: e.target.value })}>
          <option value="">Toutes</option>
          ${series.map((x) => html`<option key=${x} value=${x}>${x}</option>`)}
        </select>
      </label>
      <label><span>Langue</span>
        <select value=${f.langue} onChange=${(e) => maj({ langue: e.target.value })}>
          <option value="">Toutes</option>
          ${langues.map((x) => html`<option key=${x} value=${x}>${x}</option>`)}
        </select>
      </label>
      <label><span>Tri</span>
        <select value=${f.tri} onChange=${(e) => maj({ tri: e.target.value })}>
          ${TRIS.map(([k, lib]) => html`<option key=${k} value=${k}>${lib}</option>`)}
        </select>
      </label>
    </div>
    <p class="resume" aria-live="polite">
      <span>${pluriel(liste.length, 'carte', 'cartes')}, ${euros(sousTotal)}</span>
      ${filtre && html`<button class="btn-lien" onClick=${() => maj({ ...VIDE, tri: f.tri })}>Tout afficher</button>`}
    </p>
    ${liste.length
      ? html`<ul class="grille">
          ${liste.map((c) => {
            const v = valeur(prix, c.id);
            const d = f.tri === 'hausse' ? variation(prix, c.id) : null;
            return html`<li key=${c.id}>
              <a href=${`#/carte/${c.id}`} class="tuile">
                <${Visuel} carte=${c} />
                <span class="tuile-nom">${c.nom}</span>
                <span class="tuile-prix">${v == null ? 'Sans prix' : euros(v)}${d != null && d !== 0 ? html` <span class=${d > 0 ? 'hausse' : 'baisse'}>${eurosSigne(d)}</span>` : ''}</span>
              </a>
            </li>`;
          })}
        </ul>`
      : html`<div class="vide"><p>Aucune carte ne correspond.</p><p>Change la recherche ou les filtres.</p></div>`}
  </main>`;
}
