// État de l'app, cache local et synchronisation avec le dépôt de données (même principe que Yummy).
// L'app lit les cartes et les prix ; la seule écriture est la photo d'une carte, une « opération »
// appliquée tout de suite à l'écran, mise en file d'attente, puis envoyée à GitHub
// (rejouée sur la dernière version du fichier si Claude l'a modifié entre-temps).
import { Depot, ErreurGitHub } from './github.js';

const CHEMINS = { cartes: 'data/cartes.json', prix: 'data/prix.json' };
const VIDES = {
  cartes: () => ({ version: 1, cartes: [] }),
  prix: () => ({ version: 1, cotations: {} }),
};
const CONFIG_DEFAUT = { owner: 'SashiMhdY', repo: 'collection-tcg', token: '' };
const PREFIXE = 'tcg.';

const LS = {
  get(k, d) {
    try {
      const v = localStorage.getItem(PREFIXE + k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      if (v === undefined) localStorage.removeItem(PREFIXE + k);
      else localStorage.setItem(PREFIXE + k, JSON.stringify(v));
    } catch {
      /* stockage plein ou indisponible : l'app continue en mémoire */
    }
  },
};

const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- Opérations ----------
const OPS = {
  cartes: {
    'carte.photo'(d, { id, photo }) {
      const c = d.cartes.find((x) => x.id === id);
      if (c) c.photo = photo;
    },
  },
  prix: {},
};

const MESSAGES = {
  'carte.photo': 'Photos : photo de carte ajoutée',
};

function appliquer(doc, data, ops) {
  const d = clone(data);
  for (const o of ops) OPS[doc][o.type]?.(d, o);
  return d;
}

// ---------- Store ----------
const abonnes = new Set();
let notifPrevue = false;
function notifier() {
  if (notifPrevue) return;
  notifPrevue = true;
  queueMicrotask(() => {
    notifPrevue = false;
    abonnes.forEach((f) => f());
  });
}

export const store = {
  config: { ...CONFIG_DEFAUT, ...LS.get('config', {}) },
  serveur: {}, // { doc: { data, sha } }
  local: {}, // données affichées = serveur + opérations en attente
  file: LS.get('file', []),
  sync: { etat: 'ok', message: '' }, // ok | envoi | attente | erreur
  charge: false,
  toast: null,
  majDisponible: false,

  abonner(f) {
    abonnes.add(f);
    return () => abonnes.delete(f);
  },

  get connecte() {
    return Boolean(this.config.token);
  },

  depot() {
    return new Depot(this.config);
  },

  get cartes() {
    return this.local.cartes.cartes;
  },

  get prix() {
    return this.local.prix.cotations;
  },

  recalculer(doc) {
    const base = this.serveur[doc]?.data || VIDES[doc]();
    const ops = this.file.filter((o) => o.doc === doc);
    this.local[doc] = ops.length ? appliquer(doc, base, ops) : base;
  },

  init() {
    for (const doc of Object.keys(CHEMINS)) {
      const c = LS.get(`doc.${doc}`, null);
      if (c) this.serveur[doc] = c;
      this.recalculer(doc);
    }
    this.charge = Object.keys(CHEMINS).every((d) => this.serveur[d]);
    notifier();
    if (this.connecte) {
      this.rafraichir();
      this.envoyer();
    }
    window.addEventListener('online', () => this.envoyer());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.connecte) {
        this.rafraichir();
        this.envoyer();
      }
    });
  },

  async rafraichir(docs = Object.keys(CHEMINS)) {
    if (!this.connecte) return;
    const depot = this.depot();
    await Promise.all(
      docs.map(async (doc) => {
        try {
          const { texte, sha } = await depot.lire(CHEMINS[doc]);
          if (sha && this.serveur[doc]?.sha === sha) return;
          const data = texte ? JSON.parse(texte) : VIDES[doc]();
          this.serveur[doc] = { data, sha };
          LS.set(`doc.${doc}`, this.serveur[doc]);
          this.recalculer(doc);
        } catch (e) {
          this.erreur(e);
        }
      }),
    );
    this.charge = Object.keys(CHEMINS).every((d) => this.serveur[d]);
    if (this.sync.etat === 'erreur' && !this.file.length) this.sync = { etat: 'ok', message: '' };
    notifier();
  },

  erreur(e) {
    if (e instanceof ErreurGitHub && e.reseau) this.sync = { etat: 'attente', message: 'Hors ligne : les changements seront envoyés au retour du réseau.' };
    else this.sync = { etat: 'erreur', message: e.message || String(e) };
    notifier();
  },

  faire(doc, type, payload) {
    this.file.push({ doc, type, ...payload });
    LS.set('file', this.file);
    this.recalculer(doc);
    notifier();
    clearTimeout(this._minuteur);
    this._minuteur = setTimeout(() => this.envoyer(), 600);
  },

  async envoyer() {
    if (this.envoiEnCours || !this.file.length || !this.connecte) return;
    this.envoiEnCours = true;
    this.sync = { etat: 'envoi', message: '' };
    notifier();
    const depot = this.depot();
    try {
      for (const doc of Object.keys(CHEMINS)) {
        const ops = this.file.filter((o) => o.doc === doc);
        if (!ops.length) continue;
        for (let essai = 0; ; essai++) {
          const { texte, sha } = await depot.lire(CHEMINS[doc]);
          const base = texte ? JSON.parse(texte) : VIDES[doc]();
          const data = appliquer(doc, base, ops);
          // même mise en forme que les scripts de Claude (indentation d'un espace) : diffs lisibles
          const sortie = `${JSON.stringify(data, null, 1)}\n`;
          const msg = ops.length === 1 ? MESSAGES[ops[0].type] : `${MESSAGES[ops[0].type]} (+${ops.length - 1})`;
          try {
            const nouveauSha = await depot.ecrire(CHEMINS[doc], sortie, sha, msg);
            this.serveur[doc] = { data, sha: nouveauSha };
            LS.set(`doc.${doc}`, this.serveur[doc]);
            this.file = this.file.filter((o) => !ops.includes(o));
            LS.set('file', this.file);
            this.recalculer(doc);
            break;
          } catch (e) {
            if (e.conflit && essai < 4) {
              await new Promise((r) => setTimeout(r, 400 + Math.random() * 800));
              continue;
            }
            throw e;
          }
        }
      }
      this.sync = { etat: 'ok', message: '' };
    } catch (e) {
      this.erreur(e);
    } finally {
      this.envoiEnCours = false;
      notifier();
    }
    if (this.file.length && this.sync.etat === 'ok') this.envoyer();
  },

  async connecter({ owner, repo, token }) {
    const cle = String(token).replace(/[\s​-‍⁠﻿]/g, '');
    if (!/^[A-Za-z0-9_]+$/.test(cle)) throw new Error('La clé contient des caractères inattendus. Recopie-la depuis GitHub : elle ne contient que des lettres, des chiffres et des « _ ».');
    if (!/^(github_pat_|ghp_)/.test(cle)) throw new Error('Ce texte ne ressemble pas à une clé GitHub : une clé commence par « github_pat_ ».');
    const config = { ...this.config, owner: owner.trim(), repo: repo.trim(), token: cle };
    await new Depot(config).verifier();
    this.config = config;
    LS.set('config', config);
    this.sync = { etat: 'ok', message: '' };
    await this.rafraichir();
    this.envoyer();
  },

  deconnecter() {
    this.config = { ...CONFIG_DEFAUT, owner: this.config.owner, repo: this.config.repo };
    LS.set('config', this.config);
    for (const doc of Object.keys(CHEMINS)) {
      LS.set(`doc.${doc}`, undefined);
      delete this.serveur[doc];
      this.recalculer(doc);
    }
    this.file = [];
    LS.set('file', []);
    this.charge = false;
    notifier();
  },

  afficher(message) {
    this.toast = { message, id: Date.now() };
    notifier();
    clearTimeout(this._toast);
    this._toast = setTimeout(() => {
      this.toast = null;
      notifier();
    }, 2600);
  },

  signalerMaj() {
    this.majDisponible = true;
    notifier();
  },
};

// Pour les tests
export const _interne = { OPS, appliquer, VIDES };
