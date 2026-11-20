// Courbe d'une seule série (valeur dans le temps) en SVG, avec repère et bulle au toucher ou au survol.
import { html, useState, useEffect, useRef } from './vendor/htm-preact.js';
import { euros, eurosRond } from './util.js';

function pasRond(etendue, n) {
  const brut = etendue / n;
  const p = 10 ** Math.floor(Math.log10(brut));
  const r = brut / p;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * p;
}

// points : [{ date: 'AAAA-MM-JJ', valeur }], dans l'ordre ; etiquette(date) : texte d'une date.
export function Courbe({ points, etiquette, titre, hauteur = 180 }) {
  const boite = useRef();
  const [largeur, setLargeur] = useState(340);
  const [actif, setActif] = useState(null);
  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const maj = () => setLargeur(Math.max(240, el.clientWidth));
    maj();
    if (!('ResizeObserver' in window)) return;
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const g = 52;
  const d = 14;
  const h = 12;
  const b = 26;
  const vals = points.map((p) => p.valeur);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max === min) {
    min = Math.max(0, min - 1);
    max += 1;
  }
  const pas = pasRond(max - min, 3);
  min = Math.floor(min / pas) * pas;
  max = Math.ceil(max / pas) * pas;
  const graduations = [];
  for (let v = min; v <= max + pas / 2; v += pas) graduations.push(Math.round(v * 100) / 100);
  const X = (i) => g + (points.length === 1 ? (largeur - g - d) / 2 : (i * (largeur - g - d)) / (points.length - 1));
  const Y = (v) => h + (1 - (v - min) / (max - min)) * (hauteur - h - b);
  const chemin = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.valeur).toFixed(1)}`).join('');
  const marques = points.length <= 24;

  const viser = (e) => {
    const r = boite.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(X(i) - x) < Math.abs(X(best) - x)) best = i;
    setActif(best);
  };
  const p = actif != null ? points[actif] : null;

  return html`<div class="courbe" ref=${boite} onPointerMove=${viser} onPointerDown=${viser} onPointerLeave=${() => setActif(null)}>
    <svg width=${largeur} height=${hauteur} viewBox=${`0 0 ${largeur} ${hauteur}`} role="img" aria-label=${titre}>
      ${graduations.map(
        (v) => html`<g key=${v}>
          <line x1=${g} x2=${largeur - d} y1=${Y(v)} y2=${Y(v)} class="courbe-grille" />
          <text x=${g - 8} y=${Y(v) + 4} text-anchor="end" class="courbe-axe">${eurosRond(v)}</text>
        </g>`,
      )}
      <text x=${X(0)} y=${hauteur - 6} text-anchor=${points.length === 1 ? 'middle' : 'start'} class="courbe-axe">${etiquette(points[0].date)}</text>
      ${points.length > 1 && html`<text x=${X(points.length - 1)} y=${hauteur - 6} text-anchor="end" class="courbe-axe">${etiquette(points[points.length - 1].date)}</text>`}
      ${p && html`<line x1=${X(actif)} x2=${X(actif)} y1=${h} y2=${hauteur - b} class="courbe-repere" />`}
      <path d=${chemin} class="courbe-ligne" />
      ${points.map((q, i) => (marques || i === points.length - 1 || i === actif) && html`<circle key=${i} cx=${X(i)} cy=${Y(q.valeur)} r=${i === actif ? 5.5 : 4} class="courbe-point" />`)}
    </svg>
    ${p &&
    html`<div class="courbe-bulle" style=${`left:${Math.min(Math.max(X(actif), 70), largeur - 70)}px;top:${Math.max(0, Y(p.valeur) - 58)}px`}>
      <strong>${euros(p.valeur)}</strong><span>${etiquette(p.date)}</span>
    </div>`}
  </div>`;
}
