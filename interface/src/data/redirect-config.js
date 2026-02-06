// URLs de redirection pour les hotspots
// URLs des pages de collection dans le repo consolidé

export const REDIRECT_URLS = {
    'grande-barriere': '/mondes-immerges/les-ombres-de-la-mer/',
    'abysses': '/mondes-immerges/les-ombres-de-la-mer/',
    'arctique': '/mondes-immerges/les-ombres-de-la-mer/',
    'plastique': '/mondes-immerges/into-the-okavango/',
    'triangle-corail': '/mondes-immerges/les-ombres-de-la-mer/',
    'requins': '/mondes-immerges/les-ombres-de-la-mer/'
};

// URL par défaut si un hotspot n'est pas trouvé - retour à l'accueil
export const DEFAULT_URL = '/mondes-immerges/accueil/';

// Fonction utilitaire pour récupérer l'URL d'un hotspot
export function getRedirectUrl(hotspotId) {
    return REDIRECT_URLS[hotspotId] || DEFAULT_URL;
}