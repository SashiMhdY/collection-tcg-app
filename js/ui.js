// Composants partagés.
import { html, useState, useEffect } from './vendor/htm-preact.js';
import { store } from './store.js';
import { usePhoto, envoyerPhoto } from './photos.js';
import { teinte, nomCourt } from './collection.js';

export function useStore() {
  const [, set] = useState(0);
  useEffect(() => store.abonner(() => set((x) => x + 1)), []);
  return store;
}

const svg = (d) => html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" dangerouslySetInnerHTML=${{ __html: d }}></svg>`;

export const Ico = {
  collection: () => svg('<rect x="3.5" y="6.5" width="10" height="14" rx="1.6"/><path d="M8.5 6.5V4.8a1.3 1.3 0 0 1 1.5-1.3l8.4 1.4a1.3 1.3 0 0 1 1.1 1.5l-2 12.2a1.3 1.3 0 0 1-1.1 1.1"/>'),
  galerie: () => svg('<rect x="3.5" y="3.5" width="5" height="7" rx="1"/><rect x="9.5" y="3.5" width="5" height="7" rx="1"/><rect x="15.5" y="3.5" width="5" height="7" rx="1"/><rect x="3.5" y="13.5" width="5" height="7" rx="1"/><rect x="9.5" y="13.5" width="5" height="7" rx="1"/><rect x="15.5" y="13.5" width="5" height="7" rx="1"/>'),
  reglages: () => svg('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  gauche: () => svg('<path d="M14.5 5.5 8 12l6.5 6.5"/>'),
  chercher: () => svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
  photo: () => svg('<path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4z"/><circle cx="12" cy="13.2" r="3.3"/>'),
  plus: () => svg('<path d="M12 5v14M5 12h14"/>'),
  croix: () => svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  externe: () => svg('<path d="M14 4.5h5.5V10M19.5 4.5 11 13M17 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1H10"/>'),
};

export function EtatSync() {
  const s = useStore();
  const n = s.file.length;
  let txt = '';
  let cls = 'sync';
  if (s.sync.etat === 'envoi') txt = 'Envoi…';
  else if (s.sync.etat === 'attente') {
    txt = n ? `${n} en attente` : 'Hors ligne';
    cls += ' sync-attente';
  } else if (s.sync.etat === 'erreur') {
    txt = 'Synchro en échec';
    cls += ' sync-erreur';
  } else if (n) txt = 'Envoi…';
  if (!txt) return null;
  return html`<a class=${cls} href="#/reglages" title=${s.sync.message}>${txt}</a>`;
}

// interne : vrai dès qu'on a navigué dans l'app ; le bouton Retour revient alors à l'écran précédent.
export const nav = { interne: false };
const revenir = (e) => {
  if (!nav.interne) return;
  e.preventDefault();
  history.back();
};

export function Barre({ retour, retourLabel = 'Retour', children }) {
  return html`<div class="barre">
    ${retour ? html`<a class="barre-retour" href=${retour} onClick=${revenir}>${Ico.gauche()}<span>${retourLabel}</span></a>` : html`<span></span>`}
    <div class="barre-actions"><${EtatSync} />${children}</div>
  </div>`;
}

const ONGLETS = [
  ['collection', 'Collection', Ico.collection],
  ['galerie', 'Galerie', Ico.galerie],
  ['reglages', 'Réglages', Ico.reglages],
];

export function Onglets({ actif }) {
  return html`<nav class="onglets" aria-label="Navigation principale">
    ${ONGLETS.map(
      ([id, label, ico]) => html`<a href=${`#/${id}`} class=${`onglet${actif === id ? ' actif' : ''}`} aria-current=${actif === id ? 'page' : undefined}>
        ${ico()}<span>${label}</span>
      </a>`,
    )}
  </nav>`;
}

export function Toast() {
  const s = useStore();
  if (!s.toast) return null;
  return html`<div class="toast" role="status" key=${s.toast.id}>${s.toast.message}</div>`;
}

export function BanniereMaj() {
  const s = useStore();
  if (!s.majDisponible) return null;
  return html`<button class="banniere-maj" onClick=${() => location.reload()}>Nouvelle version disponible. Recharger</button>`;
}

// Visuel d'une carte : sa photo, ou une carte vierge aux couleurs de son jeu.
export function Visuel({ carte, grande = false }) {
  const chemin = carte.photo ? (grande ? carte.photo.grande : carte.photo.mini) : null;
  const { url, echec, ref } = usePhoto(chemin);
  if (chemin && !echec)
    return html`<span class=${`visuel${url ? ' pret' : ''}`} ref=${ref}>
      ${url && html`<img src=${url} alt=${grande ? `Photo de la carte ${carte.nom}` : ''} decoding="async" />`}
    </span>`;
  return html`<span class="visuel vierge" ref=${ref} style=${`--teinte:${teinte(carte.collection)}`} aria-hidden=${grande ? undefined : 'true'}>
    <span class="vierge-jeu">${nomCourt(carte.collection)}</span>
    <span class="vierge-nom">${carte.nom}</span>
    <span class="vierge-num">${carte.numero || carte.serie}</span>
  </span>`;
}

export function BoutonPhoto({ carte, classe, label, children }) {
  const [envoi, setEnvoi] = useState(false);
  const choisir = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setEnvoi(true);
    try {
      await envoyerPhoto(carte, f);
      store.afficher('Photo ajoutée');
    } catch (err) {
      store.afficher(err.message || 'La photo n’a pas pu être envoyée.');
    } finally {
      setEnvoi(false);
    }
  };
  return html`<label class=${`${classe}${envoi ? ' envoi' : ''}`}>
    <input type="file" accept="image/*" class="masque" onChange=${choisir} disabled=${envoi} aria-label=${label} />
    ${envoi ? html`<span>Envoi…</span>` : children}
  </label>`;
}
