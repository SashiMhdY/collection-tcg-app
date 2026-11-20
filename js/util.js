// Outils partagés : texte, dates, montants.

export const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .trim();

export const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const parNom = (a, b) => String(a).localeCompare(String(b), 'fr', { sensitivity: 'base', numeric: true });

// ---------- Dates ----------
const fJourMoisAn = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const fJourMois = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
const fMoisCourt = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' });
const fDateCourte = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const dateLongue = (iso) => (iso ? fJourMoisAn.format(fromISO(iso)) : 'date inconnue'); // « 22 août 2026 »
export const dateSansAn = (iso) => (iso ? fJourMois.format(fromISO(iso)) : 'date inconnue'); // « 22 août »
export const dateCourte = (iso) => (iso ? fDateCourte.format(fromISO(iso)) : 'date inconnue'); // « 22 août 2026 » abrégé
export const moisCourt = (iso) => fMoisCourt.format(fromISO(iso)); // « août 2026 »

// ---------- Montants ----------
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const eurSigne = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', signDisplay: 'exceptZero' });
const eurRond = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const entier = new Intl.NumberFormat('fr-FR');

export const euros = (n) => (n == null || Number.isNaN(n) ? '' : eur.format(n));
export const eurosSigne = (n) => (n == null || Number.isNaN(n) ? '' : eurSigne.format(Math.round(n * 100) / 100));
export const eurosRond = (n) => (n == null || Number.isNaN(n) ? '' : eurRond.format(n));
export const nombre = (n) => entier.format(n);
export const pluriel = (n, un, plusieurs) => `${nombre(n)} ${n > 1 ? plusieurs : un}`;
