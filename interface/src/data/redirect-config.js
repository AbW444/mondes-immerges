// URLs de redirection pour les hotspots
// URLs des pages de collection dans le repo consolidé

export const REDIRECT_URLS = {
    'grande-barriere': '/mondes-immerges/interface/les-ombres-de-la-mer/',
    'abysses': '/mondes-immerges/interface/les-ombres-de-la-mer/',
    'arctique': '/mondes-immerges/interface/into-the-okavango/',
    'plastique': '/mondes-immerges/interface/into-the-okavango/',
    'triangle-corail': '/mondes-immerges/interface/les-ombres-de-la-mer/',
    'requins': '/mondes-immerges/interface/into-the-okavango/'
};

// URL par défaut si un hotspot n'est pas trouvé - retour à l'accueil
export const DEFAULT_URL = '/mondes-immerges/accueil/';

// Fonction utilitaire pour récupérer l'URL d'un hotspot
export function getRedirectUrl(hotspotId) {
    return REDIRECT_URLS[hotspotId] || DEFAULT_URL;
}