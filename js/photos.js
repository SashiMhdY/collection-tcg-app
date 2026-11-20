// Photos des cartes : stockées dans le dépôt privé, lues avec la clé, gardées en cache sur l'appareil.
// Les vignettes ne se chargent qu'à l'approche de l'écran (la galerie peut compter des centaines de cartes).
import { useState, useEffect, useRef } from './vendor/htm-preact.js';
import { store } from './store.js';

const memoire = new Map(); // chemin -> URL d'objet
const enCours = new Map(); // chemin -> Promise
const CACHE = 'tcg-photos-v1';
const cleCache = (chemin) => `${location.origin}/__photos__/${chemin}`;

async function depuisCache(chemin) {
  try {
    const c = await caches.open(CACHE);
    const r = await c.match(cleCache(chemin));
    return r ? await r.blob() : null;
  } catch {
    return null;
  }
}

async function versCache(chemin, blob) {
  try {
    const c = await caches.open(CACHE);
    await c.put(cleCache(chemin), new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } }));
  } catch {
    /* pas de cache disponible : la photo sera relue au prochain affichage */
  }
}

function charger(chemin) {
  if (memoire.has(chemin)) return Promise.resolve(memoire.get(chemin));
  if (enCours.has(chemin)) return enCours.get(chemin);
  const p = (async () => {
    let blob = await depuisCache(chemin);
    if (!blob && store.connecte) {
      blob = await store.depot().lireBinaire(chemin);
      if (blob) await versCache(chemin, blob);
    }
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    memoire.set(chemin, url);
    return url;
  })().finally(() => enCours.delete(chemin));
  enCours.set(chemin, p);
  return p;
}

// Renvoie { url, echec, ref } : poser ref sur l'élément qui affiche la photo.
export function usePhoto(chemin) {
  const ref = useRef();
  const [visible, setVisible] = useState(() => !('IntersectionObserver' in window));
  const [url, setUrl] = useState(() => (chemin ? memoire.get(chemin) || null : null));
  const [echec, setEchec] = useState(false);
  useEffect(() => {
    if (visible || !ref.current) return;
    const io = new IntersectionObserver(
      (e) => {
        if (e.some((x) => x.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);
  useEffect(() => {
    if (!chemin || !visible) return;
    let actif = true;
    setEchec(false);
    if (memoire.has(chemin)) setUrl(memoire.get(chemin));
    else
      charger(chemin)
        .then((u) => actif && (u ? setUrl(u) : setEchec(true)))
        .catch(() => actif && setEchec(true));
    return () => {
      actif = false;
    };
  }, [chemin, visible]);
  return { url, echec, ref };
}

// ---------- Envoi d'une photo prise ou choisie sur l'appareil ----------
function lireImage(fichier) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => res({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error('Ce fichier n’est pas une image lisible.'));
    };
    img.src = url;
  });
}

function versJpeg(img, largeur, hauteur, sx, sy, sl, sh, qualite) {
  const c = document.createElement('canvas');
  c.width = largeur;
  c.height = hauteur;
  c.getContext('2d').drawImage(img, sx, sy, sl, sh, 0, 0, largeur, hauteur);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', qualite));
}

// Grande : image entière, 1 400 px au plus. Vignette : 300 × 420 (format d'une carte), recadrée au centre.
export async function preparer(fichier) {
  const { img, url } = await lireImage(fichier);
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const k = Math.min(1, 1400 / Math.max(w, h));
    const grande = await versJpeg(img, Math.round(w * k), Math.round(h * k), 0, 0, w, h, 0.8);
    const ratio = 300 / 420;
    let sl = w;
    let sh = w / ratio;
    if (sh > h) {
      sh = h;
      sl = h * ratio;
    }
    const mini = await versJpeg(img, 300, 420, (w - sl) / 2, (h - sh) / 2, sl, sh, 0.78);
    return { grande, mini };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function envoyerPhoto(carte, fichier) {
  if (!navigator.onLine) throw new Error('Il faut du réseau pour envoyer une photo.');
  const { grande, mini } = await preparer(fichier);
  const marque = Date.now().toString(36);
  const chemins = { grande: `photos/${carte.id}-${marque}.jpg`, mini: `photos/${carte.id}-${marque}-mini.jpg` };
  const depot = store.depot();
  for (const [k, blob] of [['grande', grande], ['mini', mini]]) {
    const octets = new Uint8Array(await blob.arrayBuffer());
    await depot.creerBinaire(chemins[k], octets, `Photos : ${carte.nom}`);
    await versCache(chemins[k], blob);
    memoire.set(chemins[k], URL.createObjectURL(blob));
  }
  store.faire('cartes', 'carte.photo', { id: carte.id, photo: chemins });
}
