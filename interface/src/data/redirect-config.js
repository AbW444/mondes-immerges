// URLs de redirection pour les hotspots
// Remplacer par vos vraies URLs ou utiliser une URL par défaut

export const REDIRECT_URLS = {
    'grande-barriere': 'https://page-collection-les-ombres-de-la-mer.vercel.app/',
    'abysses': 'https://page-collection-les-ombres-de-la-mer.vercel.app/',
    'arctique': 'https://page-collection-les-ombres-de-la-mer.vercel.app/',
    'plastique': 'https://page-collection-les-ombres-de-la-mer.vercel.app/',
    'triangle-corail': 'https://page-collection-les-ombres-de-la-mer.vercel.app/',
    'requins': 'https://page-collection-les-ombres-de-la-mer.vercel.app/'
};

// URL par défaut si un hotspot n'est pas trouvé
export const DEFAULT_URL = 'https://page-collection-les-ombres-de-la-mer.vercel.app/';

// Fonction utilitaire pour récupérer l'URL d'un hotspot
export function getRedirectUrl(hotspotId) {
    return REDIRECT_URLS[hotspotId] || DEFAULT_URL;
}