// URLs de redirection pour les hotspots
// URLs des pages de collection dans le repo consolidé

export const REDIRECT_URLS = {
    'grande-barriere': '/nationalgeographic.fr-mondesimmerges/les-ombres-de-la-mer/',
    'abysses': '/nationalgeographic.fr-mondesimmerges/les-ombres-de-la-mer/',
    'arctique': '/nationalgeographic.fr-mondesimmerges/les-ombres-de-la-mer/',
    'plastique': '/nationalgeographic.fr-mondesimmerges/into-the-okavango/',
    'triangle-corail': '/nationalgeographic.fr-mondesimmerges/les-ombres-de-la-mer/',
    'requins': '/nationalgeographic.fr-mondesimmerges/les-ombres-de-la-mer/'
};

// URL par défaut si un hotspot n'est pas trouvé - retour à l'accueil
export const DEFAULT_URL = '/nationalgeographic.fr-mondesimmerges/accueil/';

// Fonction utilitaire pour récupérer l'URL d'un hotspot
export function getRedirectUrl(hotspotId) {
    return REDIRECT_URLS[hotspotId] || DEFAULT_URL;
}