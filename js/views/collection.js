// Écran d'accueil : valeur de la collection, répartition par jeu, cartes les plus chères, évolution.
import { html, useMemo } from '../vendor/htm-preact.js';
import { useStore, Barre, Visuel } from '../ui.js';
import { total, variationTotale, derniereMaj, parCollection, valeur, historiqueMensuel, nomCourt } from '../collection.js';
import { euros, eurosSigne, dateLongue, moisCourt, pluriel } from '../util.js';
import { Courbe } from '../graphique.js';

export function Collection() {
  const s = useStore();
  const cartes = s.cartes;
  const prix = s.prix;
  const calc = useMemo(() => {
    const cotees = cartes.filter((c) => valeur(prix, c.id) != null);
    return {
      total: total(cartes, prix),
      variation: variationTotale(cartes, prix),
      maj: derniereMaj(cartes, prix),
      groupes: parCollection(cartes, prix),
      top: [...cotees].sort((a, b) => valeur(prix, b.id) - valeur(prix, a.id)).slice(0, 10),
      histo: historiqueMensuel(cartes, prix),
      sansPrix: cartes.length - cotees.length,
    };
  }, [cartes, prix]);
  const maxGroupe = Math.max(1, ...calc.groupes.map((g) => g.valeur));

  if (!cartes.length)
    return html`<main class="vue">
      <${Barre} />
      <h1 class="titre-app">Cartes TCG</h1>
      ${s.charge && html`<div class="vide"><p>La collection est vide.</p><p>Envoie à Claude la photo de tes cartes pour les ajouter.</p></div>`}
    </main>`;

  return html`<main class="vue">
    <${Barre} />
    <h1 class="titre-app">Cartes TCG</h1>

    <section class="plaque-valeur" aria-label="Valeur de la collection">
      <p class="valeur-montant">${euros(calc.total)}</p>
      <p class="valeur-detail">${pluriel(cartes.length, 'carte', 'cartes')}${calc.maj ? `, dernière cotation le ${dateLongue(calc.maj)}` : ''}</p>
      ${calc.variation &&
      html`<p class=${`valeur-variation ${calc.variation.valeur >= 0 ? 'hausse' : 'baisse'}`}>
        ${eurosSigne(calc.variation.valeur)} sur ${pluriel(calc.variation.cartes, 'carte recotée', 'cartes recotées')}
      </p>`}
      ${calc.sansPrix > 0 && html`<p class="valeur-detail">${pluriel(calc.sansPrix, 'carte sans prix', 'cartes sans prix')}</p>`}
    </section>

    <section class="bloc">
      <h2>Par collection</h2>
      <ul class="repartition">
        ${calc.groupes.map(
          (g) => html`<li key=${g.collection}>
            <a href=${`#/galerie?c=${encodeURIComponent(g.collection)}`}>
              <span class="rep-tete">
                <span class="rep-nom">${g.collection}</span>
                <span class="rep-valeur">${euros(g.valeur)}</span>
              </span>
              <span class="rep-barre" aria-hidden="true"><span style=${`width:${(g.valeur / maxGroupe) * 100}%`}></span></span>
              <span class="rep-detail">${pluriel(g.cartes, 'carte', 'cartes')}, ${Math.round((g.valeur / (calc.total || 1)) * 100)} % de la valeur</span>
            </a>
          </li>`,
        )}
      </ul>
    </section>

    <section class="bloc">
      <h2>Les plus chères</h2>
      <ol class="podium">
        ${calc.top.map(
          (c, i) => html`<li key=${c.id}>
            <a href=${`#/carte/${c.id}`} class="tuile">
              <span class="podium-rang">${i + 1}</span>
              <${Visuel} carte=${c} />
              <span class="tuile-nom">${c.nom}</span>
              <span class="tuile-jeu">${nomCourt(c.collection)}</span>
              <span class="tuile-prix">${euros(valeur(prix, c.id))}</span>
            </a>
          </li>`,
        )}
      </ol>
    </section>

    <section class="bloc">
      <h2>Évolution de la valeur</h2>
      ${calc.histo.length >= 2
        ? html`<${Courbe} points=${calc.histo} etiquette=${moisCourt} titre="Valeur de la collection en fin de mois" />
            <p class="aide">Valeur en fin de mois, ajouts de cartes compris.</p>`
        : html`<p class="aide">La courbe apparaîtra après la prochaine mise à jour des prix${calc.histo.length ? ` : toutes les cotations datent de ${moisCourt(calc.histo[0].date)}` : ''}.</p>`}
    </section>
  </main>`;
}
