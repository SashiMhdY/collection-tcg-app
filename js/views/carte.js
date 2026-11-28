// Fiche d'une carte : photo, propriétés, prix actuel, lien Cardmarket, historique des cotations, notes.
import { html } from '../vendor/htm-preact.js';
import { useStore, Barre, Visuel, BoutonPhoto, Ico } from '../ui.js';
import { cotations, sourceLisible } from '../collection.js';
import { euros, eurosSigne, dateLongue, dateSansAn, dateCourte, lienWeb } from '../util.js';
import { md } from '../md.js';
import { Courbe } from '../graphique.js';

export function Carte({ id }) {
  const s = useStore();
  const c = s.cartes.find((x) => x.id === id);
  if (!c)
    return html`<main class="vue">
      <${Barre} retour="#/galerie" retourLabel="Retour" />
      ${s.charge ? html`<div class="vide"><p>Cette carte n’est plus dans la collection.</p></div>` : null}
    </main>`;

  const l = cotations(s.prix, id);
  const d = l.length ? l[l.length - 1] : null;
  const p = l.length > 1 ? l[l.length - 2] : null;
  const ecart = p ? Math.round((d.prix - p.prix) * 100) / 100 : null;
  const datees = l.filter((x) => x.date);

  return html`<main class="vue vue-carte">
    <${Barre} retour="#/galerie" retourLabel="Retour" />

    <figure class="fiche-visuel">
      <${Visuel} carte=${c} grande />
      ${c.photo && html`<${BoutonPhoto} carte=${c} classe="photo-changer" label="Changer la photo">${Ico.photo()}<//>`}
    </figure>
    ${!c.photo && html`<p class="centre"><${BoutonPhoto} carte=${c} classe="btn btn-second btn-petit" label="Ajouter une photo de la carte">${Ico.photo()}<span>Ajouter une photo</span><//></p>`}

    <h1 class="fiche-nom">${c.nom}</h1>
    <p class="fiche-serie">${c.serie}</p>
    <dl class="faits">
      <div><dt>Jeu</dt><dd>${c.collection}</dd></div>
      ${c.numero && html`<div><dt>Numéro</dt><dd>${c.numero}</dd></div>`}
      <div><dt>Langue</dt><dd>${c.langue}</dd></div>
      ${c.variante && html`<div><dt>Version</dt><dd>${c.variante}</dd></div>`}
    </dl>

    <section class="prix-bloc" aria-label="Prix">
      ${d
        ? html`<p class="prix-montant">${euros(d.prix)}</p>
            <p class="prix-source">Cote du ${dateLongue(d.date)}, ${sourceLisible(d.source)}</p>
            ${ecart != null && html`<p class=${`variation ${ecart > 0 ? 'hausse' : ecart < 0 ? 'baisse' : ''}`}>${ecart ? eurosSigne(ecart) : 'Inchangé'} depuis le ${dateSansAn(p.date)}</p>`}`
        : html`<p class="prix-montant">Sans prix</p><p class="prix-source">Aucune cotation trouvée pour l’instant.</p>`}
      ${lienWeb(c.cardmarket)
        ? html`<a class="btn btn-large" href=${lienWeb(c.cardmarket)} target="_blank" rel="noopener">Voir sur Cardmarket ${Ico.externe()}</a>`
        : html`<p class="aide">Carte absente de Cardmarket : cotée d’après les ventes conclues et les boutiques spécialisées.</p>`}
    </section>

    <section class="bloc">
      <h2>Historique des prix</h2>
      ${datees.length >= 2 && html`<${Courbe} points=${datees.map((x) => ({ date: x.date, valeur: x.prix }))} etiquette=${dateCourte} titre=${`Prix de ${c.nom} dans le temps`} hauteur=${150} />`}
      ${l.length
        ? html`<ol class="historique">
            ${[...l].reverse().map(
              (x, i) => html`<li key=${i}>
                <div class="histo-ligne">
                  <span class="histo-date">${dateLongue(x.date)}</span>
                  <span class="histo-prix">${euros(x.prix)}</span>
                </div>
                <div class="histo-source">${sourceLisible(x.source)}</div>
                ${x.detail &&
                html`<details class="histo-detail">
                  <summary>Détail du calcul</summary>
                  <div class="texte" dangerouslySetInnerHTML=${{ __html: md(x.detail) }}></div>
                </details>`}
              </li>`,
            )}
          </ol>`
        : html`<p class="aide">Aucune cotation.</p>`}
    </section>

    ${c.notes &&
    html`<section class="bloc">
      <h2>Notes</h2>
      <div class="texte" dangerouslySetInnerHTML=${{ __html: md(c.notes) }}></div>
    </section>`}
  </main>`;
}
