import { html, render, useState, useEffect, useLayoutEffect } from './vendor/htm-preact.js';
import { store } from './store.js';
import { useStore, Onglets, Toast, BanniereMaj, nav } from './ui.js';
import { Collection } from './views/collection.js';
import { Galerie } from './views/galerie.js';
import { Carte } from './views/carte.js';
import { Reglages, Accueil } from './views/reglages.js';

function lireRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const [chemin, qs = ''] = h.split('?');
  const q = Object.fromEntries(new URLSearchParams(qs));
  const p = chemin.split('/').filter(Boolean).map(decodeURIComponent);
  return { p, q, cle: chemin };
}

// Position de défilement de chaque liste, retrouvée au retour depuis une fiche.
const positions = new Map();
let routeAffichee = '';

function App() {
  const s = useStore();
  const [route, setRoute] = useState(lireRoute);
  useEffect(() => {
    const f = () => {
      positions.set(routeAffichee, window.scrollY);
      nav.interne = true;
      setRoute(lireRoute());
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  useLayoutEffect(() => {
    routeAffichee = route.cle;
    const garde = route.p[0] !== 'carte' && positions.get(route.cle);
    window.scrollTo(0, garde || 0);
  }, [route.cle]);

  if (!s.connecte) return html`<${Accueil} /><${Toast} />`;

  const { p, q } = route;
  let vue;
  let onglet = p[0] || 'collection';
  if (onglet === 'carte') vue = html`<${Carte} key=${p[1]} id=${p[1]} />`;
  else if (onglet === 'galerie') vue = html`<${Galerie} key=${q.c ?? ''} q=${q} />`;
  else if (onglet === 'reglages') vue = html`<${Reglages} />`;
  else {
    onglet = 'collection';
    vue = html`<${Collection} />`;
  }
  const actif = onglet === 'carte' ? 'galerie' : onglet;

  return html`
    <${BanniereMaj} />
    ${!s.charge && html`<p class="chargement" role="status">Chargement de la collection…</p>`}
    ${vue}
    <${Onglets} actif=${actif} />
    <${Toast} />
  `;
}

store.init();
render(html`<${App} />`, document.getElementById('app'));

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const avait = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update());
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => avait && store.signalerMaj());
}
