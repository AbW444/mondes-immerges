# National Geographic - Mondes Immergés

Projet consolidé regroupant toutes les pages du site National Geographic Mondes Immergés.

## Structure du projet

```
mondes-immerges/
├── accueil/                    # Page d'accueil principale
├── interface/                  # Globe interactif (interface principale)
├── les-ombres-de-la-mer/      # Collection : Les Ombres De La Mer
└── into-the-okavango/         # Collection : Into The Okavango
```

## Pages

### Accueil
Page d'accueil du site avec présentation du projet.

### Interface
Globe interactif principal permettant de naviguer entre les différentes collections.
- Technologies : Vite, Three.js, GSAP
- Build : `npm install && npm run build`

### Les Ombres De La Mer
Page collection documentaire sur les ombres de la mer.

### Into The Okavango
Page collection documentaire sur le delta de l'Okavango.

## Développement

Chaque dossier contient une page indépendante avec son propre index.html et ses assets.

Pour l'interface (globe), installer les dépendances :
```bash
cd interface
npm install
npm run dev
```

## Historique

Ce projet consolide les anciens dépôts suivants :
- `-nationalgeographic.fr-mondesimmerges-accueil` → `accueil/`
- `interface_globe` → `interface/`
- `Page-collection-LesOmbresDeLaMer` → `les-ombres-de-la-mer/`
- `Page-collection-IntoTheOkavango` → `into-the-okavango/`
