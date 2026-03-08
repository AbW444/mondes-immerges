# AUDIT DE PERFORMANCE EXHAUSTIF — Mondes Immergés

**Date** : 8 mars 2026
**Projet** : Mondes Immergés (Expérience immersive WebGL — Prototype National Geographic)
**Stack** : Vite 5.1.4 + Three.js 0.163.0 + GSAP 3.13.0 + Vanilla JS
**Déploiement** : GitHub Pages (gh-pages)
**Taille totale du projet** : ~1.6 Go

---

## TABLE DES MATIÈRES

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Inventaire complet des fichiers](#2-inventaire-complet-des-fichiers)
3. [Assets problématiques](#3-assets-problématiques)
4. [Fuites mémoire identifiées](#4-fuites-mémoire-identifiées)
5. [Boucles d'animation problématiques](#5-boucles-danimation-problématiques)
6. [Problèmes de chargement](#6-problèmes-de-chargement)
7. [Problèmes CSS / animations](#7-problèmes-css--animations)
8. [Architecture — Problèmes structurels](#8-architecture--problèmes-structurels)
9. [Plan de refonte recommandé](#9-plan-de-refonte-recommandé)
10. [Ce qui DOIT rester intact](#10-ce-qui-doit-rester-intact)

---

## 1. RÉSUMÉ EXÉCUTIF

### Stack technique
| Technologie | Version | Rôle |
|---|---|---|
| Vite | 5.1.4 | Bundler (dev + build) |
| Three.js | 0.163.0 | Globe WebGL 3D |
| GSAP | 3.13.0 | Animations UI |
| ldrs | 1.1.7 | Loader jelly animé |
| Vanilla JS | — | Pas de framework frontend |
| GitHub Pages | — | Hébergement statique |

### Poids total des assets : ~1.6 Go

### Indice de criticité : **9/10**

### Top 3 des problèmes critiques

1. **Assets vidéo massifs non optimisés** (~726 Mo de vidéos, dont ~192 Mo de duplications pures) — provoquent des temps de chargement extrêmes, un usage mémoire colossal, et des freezes systématiques sur connexions normales.

2. **Fuites mémoire multiples en JavaScript** — `setInterval` jamais nettoyé dans `app.js:280` (exécuté toutes les 100ms indéfiniment), aucun `dispose()` global pour les objets Three.js (textures, geometries, materials, renderer), event listeners jamais supprimés dans `Interaction.js`, tableau `explorationHistory` qui grandit sans limite, 50 tweens GSAP infinis non killés.

3. **Cascade de `backdrop-filter: blur()` sur le GPU** — 21 instances au total (19 dans `main.css` + 2 dans JS), empilées avec `saturate(180%)`, provoquent un effondrement du framerate sur GPU mobiles/intégrés et des stutters permanents sur l'interface globe.

### Chiffres clés

| Métrique | Valeur |
|---|---|
| Poids total du projet | 1.6 Go |
| Poids total des vidéos | ~726 Mo |
| Vidéos dupliquées | ~192 Mo gaspillés |
| Polices dupliquées | ×6 redondance (78 fichiers au lieu de 13) |
| `backdrop-filter: blur()` | 21 instances |
| `@keyframes infinite` simultanées | 6 animations |
| Event listeners sans cleanup | 12+ |
| `setInterval` sans `clearInterval` | 1 critique (`app.js:280` — 100ms) |
| Objets Three.js sans `dispose()` | Scene, Renderer, Camera, VideoTexture, Meshes, Materials, Geometries |
| `IntersectionObserver` sans `disconnect()` | 2 (sous-pages) |
| `<style>` injectés sans cleanup | 4 (`ContentPanel` + `InterfaceUI`) |
| Tweens GSAP infinis non killés | 50 (particules) |
| Scripts render-blocking | 2 (sous-pages) |
| Vidéos avec `preload="auto"` > 30 Mo | 3+ |
| Images sans `loading="lazy"` | ~20 (sous-pages) |
| Tests / linter configurés | 0 |

---

## 2. INVENTAIRE COMPLET DES FICHIERS

### Structure du projet

```
mondes-immerges/                    # Racine (~1.6 Go)
├── index.html                      # Page racine (~60 Ko, CSS inline massif)
├── accueil/                        # Page d'accueil (~159 Mo)
│   ├── index.html                  # HTML standalone avec CSS inline (~60 Ko)
│   ├── css/styles.css
│   ├── fonts/                      # Copie #1 des polices
│   ├── images/
│   └── videos/                     # img-satellite.webm (100 Mo!), satellite-video-chroma.webm (54 Mo)
├── interface/                      # Application principale Vite
│   ├── index.html                  # Entry point SPA globe (~8 Ko, scripts inline)
│   ├── package.json
│   ├── vite.config.js
│   ├── build.js
│   ├── src/
│   │   ├── main.js                 # Entry point (curseur custom, loading)
│   │   ├── app.js                  # Orchestrateur MondesImmergesApp
│   │   ├── styles/main.css         # CSS principal globe (~1100 lignes)
│   │   ├── modules/
│   │   │   ├── GlobeManager.js     # Three.js core (~1308 lignes, 56 Ko)
│   │   │   ├── UIComponents.js     # Composants UI (~1302 lignes, 51 Ko)
│   │   │   ├── InterfaceUI.js      # UI Manager (~911 lignes)
│   │   │   ├── Animations.js       # Utilitaires animation GSAP (~773 lignes)
│   │   │   ├── VisualEffects.js    # Transitions, particules, loaders (~706 lignes)
│   │   │   ├── ContentPanel.js     # Panneau contenu tiroir (~694 lignes)
│   │   │   └── Interaction.js      # Gestion souris/tactile/clavier (~561 lignes)
│   │   ├── utils/
│   │   │   └── VideoManager.js     # Gestionnaire vidéo singleton (~142 lignes)
│   │   └── data/
│   │       ├── hotspots.js         # Données statiques hotspots (~395 lignes)
│   │       └── redirect-config.js  # Mapping hotspot → URL (~19 lignes)
│   ├── public/                     # Assets publics (~70 Mo — globe-video.webm copie)
│   ├── videos/                     # Vidéos interface (~131 Mo)
│   ├── fonts/                      # Copie #2 des polices
│   ├── images/                     # Images interface
│   ├── assets/                     # Build output (chunks Vite)
│   ├── into-the-okavango/          # Sous-page article Okavango (~50 Mo)
│   │   ├── index.html
│   │   ├── css/styles.css          # ~77 Ko
│   │   ├── js/main.js              # Monolithe ~49 Ko (~1214 lignes)
│   │   ├── js/translations.js      # Système de traduction
│   │   ├── fonts/                  # Copie #3 des polices
│   │   ├── images/
│   │   └── videos/main.mp4         # 43 Mo
│   └── les-ombres-de-la-mer/       # Sous-page article Ombres (~225 Mo)
│       ├── index.html
│       ├── css/styles.css          # ~84 Ko
│       ├── js/main.js              # Monolithe ~78 Ko (~1716 lignes)
│       ├── fonts/                  # Copie #4 des polices
│       ├── images/
│       └── videos/                 # globe.webm (98 Mo) + globe.mp4 (96 Mo) + main.mp4 (32 Mo)
├── fonts/                          # Copie #5 des polices (racine)
├── css/styles.css                  # CSS racine
├── images/                         # Images racine (night-sky.png 5.8 Mo)
├── videos/                         # Vidéos racine (~110 Mo, globe-video.webm 64 Mo)
└── assets/                         # Build assets racine
```

### Fichiers de configuration

| Fichier | Rôle |
|---|---|
| `interface/package.json` | Dépendances : three ^0.163.0, gsap ^3.13.0, ldrs ^1.1.7, vite ^5.1.4, terser (inutilisé) |
| `interface/vite.config.js` | Chunks manuels (three, gsap, vendor/ldrs), base path GH Pages, `chunkSizeWarningLimit: 2000`, `optimizeDeps.force: true` |
| `interface/build.js` | Script de build custom |

**Problèmes config** :
- `terser` est déclaré en devDependency mais jamais utilisé (Vite utilise esbuild)
- `optimizeDeps.force: true` force le re-bundling à chaque démarrage dev
- `assetsInclude` inclut des formats jamais utilisés (`.ktx`, `.ktx2`, `.basis`, `.hdr`, `.exr`, `.glsl`)
- `resolve.extensions` inclut `.vue` et `.glsl` qui ne sont pas utilisés
- Seul `index.html` est configuré comme input Vite (sous-pages exclues du build)
- Pas de ESLint, Prettier, ni framework de test

### Fichiers JS par taille

| Fichier | Lignes | Rôle | Criticité perf |
|---|---|---|---|
| `les-ombres-de-la-mer/js/main.js` | ~1716 | Article standalone (monolithe) | HAUTE |
| `src/modules/GlobeManager.js` | ~1308 | WebGL core Three.js | CRITIQUE |
| `src/modules/UIComponents.js` | ~1302 | Composants UI | MOYENNE |
| `into-the-okavango/js/main.js` | ~1214 | Article standalone (monolithe) | HAUTE |
| `src/modules/InterfaceUI.js` | ~911 | Interface UI | MOYENNE |
| `src/modules/Animations.js` | ~773 | Utilitaires GSAP (stateless ✅) | FAIBLE |
| `src/modules/VisualEffects.js` | ~706 | Transitions, particules, loaders | HAUTE |
| `src/modules/ContentPanel.js` | ~694 | Panneau contenu tiroir | HAUTE |
| `src/main.js` | ~607 | Entry point, curseur, loading | HAUTE |
| `src/app.js` | ~585 | Orchestrateur singleton | CRITIQUE |
| `src/modules/Interaction.js` | ~561 | Input handler | HAUTE |
| `src/data/hotspots.js` | ~395 | Données statiques | FAIBLE |
| `src/utils/VideoManager.js` | ~142 | Gestionnaire vidéo | MOYENNE |
| `src/data/redirect-config.js` | ~19 | Config redirections | FAIBLE |
| `into-the-okavango/js/translations.js` | ~100 | Traduction | FAIBLE |
| **TOTAL** | **~11 033** | | |

---

## 3. ASSETS PROBLÉMATIQUES

### Vidéos critiques (> 5 Mo)

| Fichier | Taille | Problème |
|---|---|---|
| `accueil/videos/img-satellite.webm` | **100 Mo** | Vidéo arrière-plan, `preload="auto"`, démesurément lourde |
| `les-ombres-de-la-mer/videos/globe.webm` | **98 Mo** | Globe vidéo dupliqué, `preload="auto"` |
| `les-ombres-de-la-mer/videos/globe.mp4` | **96 Mo** | Doublon MP4 du même globe |
| `interface/videos/globe-video-aberration.webm` | **68 Mo** | Variante aberration chromatique |
| `interface/videos/globe-video.webm` | **64 Mo** | Globe vidéo (existe en **3 copies** identiques) |
| `interface/public/videos/globe-video.webm` | **64 Mo** | Copie identique dans public/ |
| `videos/globe-video.webm` (racine) | **64 Mo** | Copie identique à la racine |
| `accueil/videos/satellite-video-chroma.webm` | **54 Mo** | Vidéo chroma satellite |
| `into-the-okavango/videos/main.mp4` | **43 Mo** | Vidéo principale article |
| `les-ombres-de-la-mer/videos/main.mp4` | **32 Mo** | Vidéo principale article |
| `videos/map-video-poisson.webm` | **23 Mo** | Vidéo carte poisson |
| `videos/video-arriereplan.webm` | **20 Mo** | Vidéo arrière-plan |
| `videos/anim-logo.webm` | **3.7 Mo** | Animation logo (×2 copies) |
| `videos/logo_transi_alpha.webm` | **0.3 Mo** | Transition alpha |
| `videos/logo_transi_alpha_inverser.webm` | **0.25 Mo** | Transition alpha inversée |

**Total vidéos : ~726 Mo** dont **~192 Mo de duplications pures** (3 copies de globe-video.webm + 2 copies anim-logo.webm).

**Recommandations** :
- Dédupliquer : un seul fichier source par vidéo, chemins partagés
- Réencoder en VP9/AV1 avec bitrate cible 2-4 Mbps (vs 15-30 Mbps estimés actuellement)
- Résolution : 720p max pour textures globe, 1080p max pour vidéos fullscreen
- Objectif : réduire de ~726 Mo à ~100-150 Mo total

### Images critiques

| Fichier | Taille | Problème |
|---|---|---|
| `images/night-sky.png` | **5.8 Mo** | PNG non compressé, dupliqué ×3 (racine, interface/, interface/public/) |
| `images/mi-logo-grand-format.png` | 293 Ko | Dupliqué ×2 (racine, accueil/) |
| `images/mi-logo-grand-format-texte.png` | 212 Ko | Dupliqué ×2 |
| `into-the-okavango/images/vaquita.jpeg` | 1 Mo | JPEG non optimisé |
| `into-the-okavango/images/img-photo-gallerie-04.jpeg` | 1 Mo | JPEG non optimisé |

**Total images night-sky.png seul** : 5.8 Mo × 3 = **17.4 Mo** (devrait être ~500 Ko en WebP).

### Polices — Duplication massive

Les **13 fichiers** de police (1× Abyss.ttf + 12× TestGeograph-*.otf) sont dupliqués dans **6 répertoires** :

1. `/fonts/`
2. `/accueil/fonts/`
3. `/interface/fonts/`
4. `/interface/public/fonts/`
5. `/interface/les-ombres-de-la-mer/fonts/`
6. `/interface/into-the-okavango/fonts/`

**Total : 78 fichiers de polices** au lieu de 13.
**Format** : OTF/TTF au lieu de WOFF2 — les polices sont 2-3× plus lourdes que nécessaire.

---

## 4. FUITES MÉMOIRE IDENTIFIÉES

### 4.1 — `setInterval` jamais nettoyé — CRITIQUE

| Fichier | Ligne | Type | Description | Impact | Correction |
|---|---|---|---|---|---|
| `interface/src/app.js` | **280** | `setInterval` | `setInterval(() => {...}, 100)` dans `initSatelliteInterface()` — exécute du DOM read (`getElementById`) + calculs de position caméra Three.js toutes les 100ms, **jamais clearé** | Fuite CPU permanente (10 exécutions/seconde), empêche le GC de libérer l'instance | Stocker l'ID de l'interval dans `this.hudInterval`, le clear dans une méthode `destroy()` ou quand l'interface satellite n'est plus visible |

### 4.2 — Objets Three.js sans `dispose()` — CRITIQUE

| Fichier | Ligne(s) | Type | Description | Impact | Correction |
|---|---|---|---|---|---|
| `interface/src/modules/GlobeManager.js` | Tout le fichier | Three.js | `WebGLRenderer`, `Scene`, `PerspectiveCamera`, `SphereGeometry`, `MeshStandardMaterial`, `VideoTexture`, `Raycaster`, multiples `Mesh` pour hotspots — **AUCUN `dispose()` global** | Textures vidéo + geometries + materials restent en mémoire GPU indéfiniment. Sur navigation, chaque visite accumule des objets WebGL | Implémenter `destroy()` : `renderer.dispose()`, `scene.traverse(obj => { obj.geometry?.dispose(); obj.material?.dispose() })`, `videoTexture.dispose()`, `renderer.forceContextLoss()` |
| `interface/src/modules/GlobeManager.js` | 451, 998-999, 1280 | Three.js (partiel) | Seuls `dispose()` existants : quelques cas isolés (scan ring, wave geometry) — nettoyage partiel et incohérent | Impression de cleanup mais incomplet | Centraliser dans une méthode unique |

### 4.3 — Event listeners sans `removeEventListener` — HAUTE

| Fichier | Ligne(s) | Type | Description | Impact | Correction |
|---|---|---|---|---|---|
| `interface/src/modules/Interaction.js` | **60-76** | EventListener | 9 listeners ajoutés (`wheel`, `mousedown`, `mousemove`×2, `mouseup`, `touchstart`, `touchmove`, `touchend`, `keydown`) — **aucune méthode de cleanup** | Listeners empilés si module réinitialisé ; fuites sur navigation | Ajouter `destroy()` avec `removeEventListener` ; stocker les handlers bindés dans des propriétés |
| `interface/src/modules/Interaction.js` | **76** | EventListener doublé | `document.addEventListener('mousemove', this.resetInterfaceAutoHide.bind(this))` — 2ème listener mousemove sur `document` (en plus de ligne 64) | Double traitement de chaque mouvement de souris | Fusionner auto-hide dans le handler mousemove principal |
| `interface/src/app.js` | **148** | EventListener | `window.addEventListener('resize', ...)` sans cleanup | Listener persistant | Cleanup dans `destroy()` |
| `interface/src/app.js` | **128** | EventListener | `document.addEventListener('keydown', ...)` sans cleanup | Listener persistant | Idem |
| `interface/src/modules/InterfaceUI.js` | Multiples | EventListener | `mouseenter`/`mouseleave` sur boutons dynamiques, jamais supprimés | Fuite si boutons recréés | Stocker références, cleanup avant recréation |
| `interface/src/modules/ContentPanel.js` | 51-83 | EventListener | `click`, `loadeddata`, `error` sans cleanup | Listeners persistants | Idem |

**Total : 12+ event listeners** qui ne sont jamais retirés. Aucune classe n'a de méthode `destroy()`.

### 4.4 — Tableau qui grandit sans limite — HAUTE

| Fichier | Ligne | Type | Description | Impact | Correction |
|---|---|---|---|---|---|
| `interface/src/app.js` | **27** (déclaration) / **413** (push) | Array unbounded | `this.explorationHistory.push({...})` accumule un objet à chaque exploration sans limite ni nettoyage | Fuite mémoire lente (données + timestamps + références) | Limiter à N entrées max (ex: 50) avec `shift()` quand la limite est atteinte |

### 4.5 — DOM `<style>` injectés jamais supprimés — MOYENNE

| Fichier | Ligne(s) | Type | Description | Impact | Correction |
|---|---|---|---|---|---|
| `interface/src/modules/ContentPanel.js` | **221, 297, 360** | DOM leak | 3× `document.head.appendChild(style)` — éléments `<style>` ajoutés au `<head>` à chaque instanciation | Accumulation de nœuds DOM + règles CSS si le panel est recréé | Vérifier existence avant ajout, ou supprimer dans `destroy()` |
| `interface/src/modules/InterfaceUI.js` | **307** | DOM leak | `document.head.appendChild(closeInfoStyle)` | Accumulation | Idem |

### 4.6 — Particules GSAP infinies — CRITIQUE

| Fichier | Ligne(s) | Type | Description | Impact | Correction |
|---|---|---|---|---|---|
| `interface/src/modules/VisualEffects.js` | **643-696** | GSAP leak | `addBackgroundParticles()` crée 50 éléments DOM avec animations GSAP `repeat: -1` (infinies) — **jamais `kill()`** | 50 tweens GSAP permanents + 50 nœuds DOM inutiles si l'effet n'est plus visible, fuite cumulative | Stocker les tweens dans un tableau, appeler `tween.kill()` et retirer les éléments DOM quand la section n'est plus visible |

### 4.7 — IntersectionObserver jamais déconnectés — MOYENNE

| Fichier | Ligne(s) | Type | Description | Impact | Correction |
|---|---|---|---|---|---|
| `les-ombres-de-la-mer/js/main.js` | **796, 1540** | Observer leak | 2× `new IntersectionObserver(...)` créés, jamais `disconnect()` | Observers restent actifs même après que tous les éléments aient été animés | `observer.disconnect()` quand plus nécessaire, ou `observer.unobserve(entry.target)` après déclenchement |

---

## 5. BOUCLES D'ANIMATION PROBLÉMATIQUES

### 5.1 — Curseur custom : boucle rAF permanente — CRITIQUE

| Attribut | Détail |
|---|---|
| **Fichier** | `interface/src/main.js` |
| **Lignes** | **119-131** |
| **Description** | Boucle `requestAnimationFrame` permanente pour animer 2 éléments DOM (curseur + follower). Tourne à 60fps en continu, même quand la souris ne bouge pas. Nettoyage uniquement sur `beforeunload` (non fiable sur mobile/SPA). |
| **Impact** | Consomme un slot rAF permanent, force des repaints continus sans mouvement. Combiné avec `mix-blend-mode: difference` sur les curseurs, provoque une recomposition GPU à chaque frame. |
| **Correction** | N'animer que quand la souris bouge : démarrer la boucle rAF sur `mousemove`, l'arrêter après 100ms d'inactivité. Stocker le rAF ID pour `cancelAnimationFrame`. |

### 5.2 — `setInterval` 100ms dans app.js — CRITIQUE

| Attribut | Détail |
|---|---|
| **Fichier** | `interface/src/app.js` |
| **Ligne** | **280** |
| **Description** | `setInterval(() => {...}, 100)` — polling permanent pour détecter un état d'interface satellite. Fait des lectures DOM (`getElementById`) + calculs de position caméra Three.js. |
| **Impact** | 10 exécutions/seconde de lectures DOM + calculs trigonométriques, jamais arrêté. Force des reflows. |
| **Correction** | Remplacer par un pattern événementiel (callback/observer) déclenché uniquement quand l'état change. |

### 5.3 — Boucle d'animation Three.js — HAUTE

| Attribut | Détail |
|---|---|
| **Fichier** | `interface/src/modules/GlobeManager.js` |
| **Méthode** | `animate()` |
| **Description** | Boucle `requestAnimationFrame` pour le rendu Three.js. Tourne à 60fps en continu. Fait à chaque frame : (1) `updateCameraPosition()` avec calculs trigonométriques + `new THREE.Vector3()`, (2) itération sur tous les hotspots pour animer les `waveRings` avec **recréation de géométrie à chaque frame** (ligne ~1280 : `wave.geometry.dispose()` + `new THREE.RingGeometry()`), (3) `updateHotspotLabels()` avec `new THREE.Vector3()` + `new THREE.Raycaster()` **par hotspot par frame** (6 hotspots = 12 allocations/frame = 720/seconde). |
| **Impact** | Pression GC extrême (allocations mémoire à chaque frame), GPU thrashing (recréation de géométries). |
| **Correction** | (1) Réutiliser les objets `Vector3` et `Raycaster` (pré-allouer dans le constructeur). (2) Animer le scale des wave rings au lieu de recréer la géométrie. (3) Utiliser `document.visibilitychange` pour pauser en arrière-plan. (4) Stocker le rAF ID pour `cancelAnimationFrame`. |

### 5.4 — CSS `@keyframes` infinies — HAUTE

| Animation | Fichier | Ligne | Durée | Coût |
|---|---|---|---|---|
| `starsMovement` | `main.css` | 275 | 200s infinite | **ÉLEVÉ** — anime `background-position` sur 9 `radial-gradient` fullscreen = repaint complet |
| `scanline` | `main.css` | 497 | 8s infinite | Modéré — position absolue |
| `pulse` | `main.css` | 375 | 2s infinite | Faible — transform + opacity |
| `rotate` | `main.css` | 403 | 20s infinite | Faible — transform compositable |
| `statusPulse` | `main.css` | 545 | 2s infinite | Faible — transform + opacity |
| `pulseConnector` | `main.css` | 925 | 2s infinite | Faible — opacity seulement |

**6 animations CSS infinies** tournent simultanément sur la page globe. `starsMovement` est la plus coûteuse (repaint complet du fond).

**Correction** : Pauser les animations non visibles via `animation-play-state: paused` quand les éléments sortent du viewport. Remplacer `starsMovement` par une animation `transform: translate()` (compositable GPU).

### 5.5 — Sous-pages : scroll listeners multiples sans throttle — MOYENNE

| Fichier | Description |
|---|---|
| `les-ombres-de-la-mer/js/main.js` | Multiples `window.addEventListener('scroll', ...)` sans throttle/debounce — déclenchés à chaque pixel de scroll (60+ exécutions/seconde) |
| `into-the-okavango/js/main.js` | Idem |

**Correction** : Utiliser un pattern `requestAnimationFrame`-throttle ou `IntersectionObserver` au lieu de scroll listeners pour les animations de reveal.

---

## 6. PROBLÈMES DE CHARGEMENT

### 6.1 — Vidéos avec `preload="auto"` sur des fichiers de 100 Mo — CRITIQUE

| Fichier | Élément | Description |
|---|---|---|
| `les-ombres-de-la-mer/index.html` | `<video>` globe | `preload="auto"` sur `globe.webm` (**98 Mo**) — le navigateur télécharge l'intégralité du fichier dès le chargement de la page |
| `accueil/index.html` | `<video>` satellite | `preload="auto"` sur `img-satellite.webm` (**100 Mo**) |
| `accueil/index.html` | `<video>` chroma | `preload="auto"` sur `satellite-video-chroma.webm` (**54 Mo**) |

**Impact** : ~250 Mo téléchargés automatiquement avant toute interaction utilisateur.

**Correction** : `preload="none"` ou `preload="metadata"` + chargement déclenché par `IntersectionObserver` ou interaction.

### 6.2 — Scripts render-blocking dans les sous-pages — CRITIQUE

| Fichier | Description |
|---|---|
| `les-ombres-de-la-mer/index.html` | `<script src="js/main.js">` sans `defer` ni `async` — bloque le parsing HTML (78 Ko de JS) |
| `into-the-okavango/index.html` | Idem (49 Ko de JS) |

**Correction** : Ajouter `defer` sur toutes les balises `<script>`.

### 6.3 — Bibliothèque ldrs manquante sur Okavango — HAUTE (BUG)

| Fichier | Description |
|---|---|
| `into-the-okavango/index.html` | Utilise le custom element `<l-jelly>` mais **ne charge PAS** le script CDN ldrs. La balise ne sera jamais rendue → loader cassé. |
| `les-ombres-de-la-mer/index.html` | Charge correctement ldrs via `<script src="https://cdn.jsdelivr.net/npm/ldrs/dist/auto/jelly.js">` |

**Correction** : Ajouter le script CDN ldrs dans `into-the-okavango/index.html`.

### 6.4 — Vidéos de transition chargées immédiatement — HAUTE

| Fichier | Description |
|---|---|
| `interface/index.html` | 2 vidéos de transition (`logo_transi_alpha_inverser.webm`, `logo_transi_alpha.webm`) déclarées dans le HTML sans `preload="none"` — commencent à être téléchargées immédiatement alors qu'elles ne sont utilisées qu'à la transition |

**Correction** : Ajouter `preload="none"` ; ou créer les `<video>` dynamiquement quand nécessaire.

### 6.5 — Polices OTF/TTF au lieu de WOFF2 — HAUTE

Les 13 fichiers de polices sont en format OTF/TTF. La conversion en WOFF2 réduirait la taille de **30-50%** avec une meilleure compression.

### 6.6 — Pas de lazy loading sur les images — HAUTE

| Fichier | Description |
|---|---|
| `les-ombres-de-la-mer/index.html` | Galerie de ~10 images sans `loading="lazy"` — toutes téléchargées immédiatement |
| `into-the-okavango/index.html` | Idem |

**Correction** : Ajouter `loading="lazy"` sur toutes les images sous le fold.

### 6.7 — Google Fonts chargé de manière bloquante — MOYENNE

| Fichier | Description |
|---|---|
| `interface/index.html` | `<link href="https://fonts.googleapis.com/css2?family=Roboto+Mono..." rel="stylesheet">` — bloque le rendu |

**Correction** : Utiliser `rel="preload" as="style"` + `font-display: swap`, ou auto-héberger la police.

### 6.8 — Sous-page référence vidéo d'une autre sous-page — MOYENNE

| Fichier | Description |
|---|---|
| `into-the-okavango/index.html` | Référence `../les-ombres-de-la-mer/videos/globe.webm` (98 Mo) — couplage fragile entre sous-pages |

**Correction** : Centraliser les vidéos partagées dans un dossier commun `/interface/shared/videos/`.

### 6.9 — Simulation de chargement — MOYENNE

| Fichier | Ligne | Description |
|---|---|---|
| `interface/src/main.js` | ~540 | `setInterval` simule un faux pourcentage de chargement. L'utilisateur voit 100% alors que des vidéos sont encore en téléchargement. |

**Correction** : Baser la progression sur la charge réelle des assets (événements `loadeddata`, `canplaythrough`, etc.).

### 6.10 — Erreurs silencieusement avalées — MOYENNE

| Fichier | Lignes | Description |
|---|---|---|
| `interface/src/main.js` | ~583-593 | `window.addEventListener('error')` et `window.addEventListener('unhandledrejection')` interceptent les erreurs avec `event.preventDefault()` — les bugs sont masqués |

**Correction** : Logger les erreurs (console.error minimum) au lieu de les avaler.

### 6.11 — Force-reload sur back navigation — MOYENNE

| Fichier | Lignes | Description |
|---|---|---|
| `interface/src/main.js` | ~600-603 | `window.addEventListener('pageshow', (event) => { if (event.persisted) window.location.reload() })` — force un reload complet au retour navigateur |

**Impact** : Masque les fuites mémoire mais détruit l'expérience UX (rechargement de ~700 Mo d'assets).

### 6.12 — night-sky.png (5.8 Mo) comme texture cubemap — MOYENNE

| Fichier | Lignes | Description |
|---|---|---|
| `interface/src/modules/GlobeManager.js` | ~416-474 | Image 8192×4096 pixels chargée et décodée en mémoire (~130 Mo de RAM) avant d'être réduite à 1024px pour le cubemap WebGL |

**Correction** : Pré-redimensionner l'image à 1024×512 (taille finale utilisée). Convertir en WebP.

---

## 7. PROBLÈMES CSS / ANIMATIONS

### 7.1 — Cascade de `backdrop-filter: blur()` — CRITIQUE

| Fichier | Lignes | Élément | Blur |
|---|---|---|---|
| `main.css` | 164 | loader | `blur(5px)` |
| `main.css` | 310-311 | `.satellite-hud` | `blur(16px) saturate(180%)` |
| `main.css` | 440-441 | `.coordinates-display` | `blur(16px) saturate(180%)` |
| `main.css` | 578-579 | `#navigation-controls button` | `blur(12px)` |
| `main.css` | 615-616 | `#info-button` | `blur(16px)` |
| `main.css` | 672-673 | `#info-overlay` | `blur(20px)` — **100% viewport** |
| `main.css` | 698-699 | `.overlay-content` | `blur(12px)` |
| `main.css` | 753-754 | `#close-info` | `blur(12px)` |
| `main.css` | 874-875 | `.hotspot-label` | `blur(16px) saturate(180%)` — **×6 hotspots** |
| `main.css` | 962-963 | `.notification` | `blur(16px) saturate(180%)` |
| `ContentPanel.js` | 385 | drawer | `blur(10px)` — **100% width, 70% height** |
| `index.html` | inline | overlay-content | `blur(12px)` |

**Total : ~21 instances de `backdrop-filter: blur()`.**

**Impact** : `backdrop-filter: blur()` est l'une des propriétés CSS les plus coûteuses pour le GPU. Elle force le navigateur à rasteriser tout le contenu derrière l'élément, appliquer un flou gaussien en temps réel, puis recomposer. Quand un `#info-overlay` fullscreen avec `blur(20px)` est au-dessus d'un canvas WebGL Three.js, c'est catastrophique. L'empilement (HUD + coordonnées + boutons + notifications + hotspots) crée une cascade de couches de composition qui écrase le GPU, surtout sur GPU intégrés Intel/mobile. **C'est la cause principale des stutters visuels.**

**Correction** : Remplacer par `background: rgba(0,0,20,0.85)` (fond semi-opaque) pour tous les éléments non-critiques. Garder `backdrop-filter` uniquement sur 1-2 éléments de premier plan maximum.

### 7.2 — `filter: blur()` sur tous les enfants — HAUTE

| Fichier | Ligne | Description |
|---|---|---|
| `interface/src/modules/ContentPanel.js` | **645** | `gsap.to(mainContainer.querySelectorAll(':not(#content-panel)'), { filter: 'blur(2px)' })` — applique un flou CSS à **tous les enfants** du conteneur principal quand le panel s'ouvre |

**Impact** : Force le rendu de chaque élément dans une couche séparée + application du filtre blur. Avec le globe Three.js + HUD + boutons, c'est extrêmement coûteux.

**Correction** : Appliquer le blur sur un **seul overlay** positionné entre le contenu et le panel.

### 7.3 — `mix-blend-mode: difference` sur les curseurs — HAUTE

**Fichier** : `interface/src/styles/main.css`
**Description** : `mix-blend-mode: difference` sur `.custom-cursor` et `.cursor-follower`.

**Impact** : Force une composition GPU séparée pour les curseurs ET leurs éléments environnants. Combiné avec la boucle rAF permanente du curseur, provoque un recalcul de composition à chaque frame (60 recompositions/seconde).

**Correction** : Supprimer `mix-blend-mode` ou le remplacer par un simple changement de couleur du curseur.

### 7.4 — Fichiers CSS monolithiques des sous-pages — MOYENNE

| Fichier | Taille |
|---|---|
| `les-ombres-de-la-mer/css/styles.css` | **84 Ko** |
| `into-the-okavango/css/styles.css` | **77 Ko** |

**Impact** : Tout le CSS est parsé et appliqué d'un coup, bloquant le premier rendu.

**Correction** : Extraire le CSS critique (above-the-fold) en inline ; charger le reste en async.

### 7.5 — Styles inline massifs via JavaScript — MOYENNE

~650 lignes de `style.cssText` dans le JS (`InterfaceUI.js` ~300, `VisualEffects.js` ~200, `ContentPanel.js` ~100, `GlobeManager.js` ~50). Rend les styles impossibles à overrider sans `!important`, non cachables, et cause des reflows à chaque modification.

### 7.6 — `starsMovement` — animation repaint sur 9 gradients — MOYENNE

`main.css:275` : L'animation `starsMovement` (200s infinite) anime `background-position` sur un élément fullscreen avec 9 `radial-gradient`. C'est un repaint complet à chaque frame d'animation.

**Correction** : Remplacer par une animation `transform: translate()` sur un pseudo-element (compositable GPU).

---

## 8. ARCHITECTURE — PROBLÈMES STRUCTURELS

### 8.1 — Pas de pipeline d'assets partagé — CRITIQUE

L'architecture est un patchwork de pages indépendantes :
- **Interface globe** : SPA Vite avec bundling (`interface/src/`)
- **Sous-pages articles** : Pages statiques HTML **en dehors de Vite** avec JS/CSS monolithique
- **Page d'accueil** : Page statique indépendante (`accueil/`)

**Résultat** : pas de tree-shaking, pas de code splitting, pas de partage de code/assets entre pages. Chaque page recharge Three.js, GSAP, etc. de zéro.

### 8.2 — Duplication massive des assets — CRITIQUE

| Asset | Copies | Espace gaspillé |
|---|---|---|
| `globe-video.webm` (64 Mo) | 3 copies identiques | **128 Mo** gaspillés |
| `night-sky.png` (5.8 Mo) | 3 copies identiques | **11.6 Mo** gaspillés |
| Polices (13 fichiers) | 6 dossiers | **~5× redondance** |
| `anim-logo.webm` (3.7 Mo) | 2 copies | **3.7 Mo** gaspillés |
| Logos PNG | 2 copies chacun | Multiples Mo |

### 8.3 — Fichiers JS monolithiques des sous-pages — HAUTE

Les sous-pages utilisent des fichiers JS monolithiques (`78 Ko` et `49 Ko`) qui contiennent TOUT le code dans un seul `DOMContentLoaded` handler : loader custom, IntersectionObserver, slider galerie, scroll-based navigation, contrôles vidéo, bouton partage, back-to-top, menu mobile, indicateur de scroll, parallax souris. Aucune modularisation, aucune possibilité de lazy-loading par feature.

### 8.4 — Vite configuré uniquement pour `index.html` — HAUTE

`interface/vite.config.js` ne déclare que `index.html` comme input. Les sous-pages ne bénéficient d'aucun traitement Vite (pas de minification, pas de chunk splitting, pas d'optimisation d'imports).

### 8.5 — Pas de Service Worker / stratégie de cache — MOYENNE

Aucun Service Worker, aucun cache manifest. Chaque visite re-télécharge potentiellement ~700 Mo de vidéos.

### 8.6 — Navigation par rechargement complet — MOYENNE

Navigation entre pages par `window.location.href` (hard navigation). Chaque transition globe → article → globe recharge 100% des assets.

### 8.7 — Double event handling — MOYENNE

- `keydown` : écouté dans `Interaction.js:73` ET dans `index.html` inline script (bloquer les flèches)
- `resize` : écouté dans `GlobeManager.js` ET dans `app.js:148`
- Styles `#close-info` : définis dans `main.css`, overridés dans `index.html` inline, puis re-overridés dans `InterfaceUI.js`

### 8.8 — Code mort et commenté — FAIBLE

- `GlobeManager.js` : `createCelestialBodies()`, `createAtmosphere()`, `createScanEffect()` — implémentations complètes jamais appelées (~200 lignes de code mort)
- `ContentPanel.js:36-39` : méthodes vides comme fallback

---

## 9. PLAN DE REFONTE RECOMMANDÉ

> **Contrainte absolue** : NE PAS toucher au rendu visuel (structure HTML + CSS + contenu).
> Les corrections portent sur le JS, l'architecture des assets, et les attributs de performance HTML.

### Phase 1 — Quick wins critiques (Effort : **S** — 1-2 jours)

| # | Action | Fichier(s) | Impact attendu |
|---|---|---|---|
| 1.1 | Ajouter `clearInterval()` pour le setInterval de `initSatelliteInterface()` | `app.js:280` | Élimine 10 appels DOM/seconde inutiles |
| 1.2 | Ajouter `preload="none"` sur toutes les `<video>` avec fichiers > 5 Mo | Tous les HTML | Économise ~250 Mo de téléchargement initial |
| 1.3 | Ajouter `defer` sur les `<script>` des sous-pages | `les-ombres-de-la-mer/index.html`, `into-the-okavango/index.html` | Débloque le parsing HTML |
| 1.4 | Ajouter `loading="lazy"` sur les images sous le fold | Sous-pages HTML | Réduit le chargement initial |
| 1.5 | Ajouter le script CDN ldrs manquant | `into-the-okavango/index.html` | Corrige le loader cassé |
| 1.6 | Throttler le curseur custom (animer uniquement sur `mousemove`) | `main.js:119-131` | Élimine la boucle rAF permanente |
| 1.7 | Pauser l'animation Three.js quand l'onglet est caché | `GlobeManager.js` | Économise 100% GPU en arrière-plan |
| 1.8 | Logger les erreurs au lieu de les avaler silencieusement | `main.js:583-593` | Rend le debug possible |

### Phase 2 — Nettoyage mémoire (Effort : **M** — 3-5 jours)

| # | Action | Fichier(s) | Impact attendu |
|---|---|---|---|
| 2.1 | Implémenter `destroy()` dans `GlobeManager.js` avec `dispose()` complet de toute la scène Three.js | `GlobeManager.js` | Libère mémoire GPU (textures, geometries, materials, renderer) |
| 2.2 | Ajouter `destroy()` dans `Interaction.js` avec `removeEventListener` pour les 9 listeners | `Interaction.js:60-76` | Élimine les fuites de listeners |
| 2.3 | Limiter `explorationHistory` à 50 entrées max | `app.js:413` | Empêche la fuite mémoire lente |
| 2.4 | Nettoyer les `<style>` injectés dans `ContentPanel.js` et `InterfaceUI.js` | `ContentPanel.js:221,297,360`, `InterfaceUI.js:307` | Empêche l'accumulation DOM |
| 2.5 | Ajouter `kill()` sur les tweens GSAP infinis des particules | `VisualEffects.js:643-696` | Libère 50 tweens + 50 nœuds DOM |
| 2.6 | Appeler `disconnect()` sur les `IntersectionObserver` des sous-pages | `les-ombres-de-la-mer/js/main.js:796,1540` | Nettoyage observateurs |
| 2.7 | Fusionner les 2 listeners `mousemove` sur `document` | `Interaction.js:64,76` | Réduit le traitement événementiel |
| 2.8 | Pré-allouer et réutiliser `Vector3`/`Raycaster` dans la boucle de rendu | `GlobeManager.js` | Élimine ~720 allocations/seconde |
| 2.9 | Animer le scale des wave rings au lieu de recréer la géométrie | `GlobeManager.js:~1280` | Élimine le GPU thrashing |

### Phase 3 — Optimisation des assets (Effort : **M** — 3-5 jours)

| # | Action | Impact attendu |
|---|---|---|
| 3.1 | Dédupliquer les vidéos : un seul fichier source par vidéo dans un dossier partagé | Économise ~192 Mo |
| 3.2 | Réencoder les vidéos en VP9/AV1 avec bitrate cible 2-4 Mbps | Réduit de ~726 Mo à ~100-150 Mo |
| 3.3 | Convertir `night-sky.png` (5.8 Mo × 3) en WebP + réduire résolution à 1024×512 | Réduit à ~500 Ko × 1 |
| 3.4 | Convertir toutes les polices OTF/TTF en WOFF2 | Réduit ~30-50% le poids |
| 3.5 | Centraliser les polices dans un seul dossier + chemins partagés | Élimine ×5 duplication |
| 3.6 | Optimiser les JPEG de galerie (compression, redimensionnement) | Réduit ~30-50% |

### Phase 4 — Optimisation CSS/GPU (Effort : **S** — 1-2 jours)

| # | Action | Fichier(s) | Impact attendu |
|---|---|---|---|
| 4.1 | Remplacer ~19 des 21 `backdrop-filter: blur()` par `background: rgba()` semi-opaque | `main.css`, `ContentPanel.js` | Réduit drastiquement les couches de composition GPU |
| 4.2 | Remplacer `filter: blur(2px)` sur tous les enfants par un overlay unique | `ContentPanel.js:645` | Élimine N recompositions → 1 seule |
| 4.3 | Supprimer `mix-blend-mode: difference` des curseurs | `main.css` | Élimine une couche de composition permanente |
| 4.4 | Ajouter `animation-play-state: paused` sur les `@keyframes` hors viewport | `main.css` | Réduit les animations simultanées |
| 4.5 | Convertir `starsMovement` en animation `transform` compositable | `main.css:275` | Élimine les repaints fullscreen |
| 4.6 | Throttler les scroll listeners des sous-pages avec rAF | Sous-pages `main.js` | Réduit de 60+ à 1 calcul/frame |

### Phase 5 — Architecture (Effort : **L** — 5-10 jours)

| # | Action | Impact attendu |
|---|---|---|
| 5.1 | Intégrer les sous-pages dans le build Vite (multi-page setup) | Minification, tree-shaking, chunk splitting automatiques |
| 5.2 | Découper les JS monolithiques des sous-pages en modules ES | Permet le lazy-loading par feature |
| 5.3 | Implémenter un Service Worker avec stratégie cache-first pour les assets statiques | Élimine le re-téléchargement des vidéos entre visites |
| 5.4 | Extraire le CSS critique (above-the-fold) des sous-pages | Améliore le First Contentful Paint |
| 5.5 | Ajouter un `LifecycleManager` centralisé (init/destroy) | Cleanup fiable de toutes les ressources |
| 5.6 | Ajouter ESLint + Prettier | Qualité code et détection de problèmes |
| 5.7 | Supprimer le code mort (fonctions commentées dans GlobeManager.js) | ~200 lignes en moins à maintenir |

---

## 10. CE QUI DOIT RESTER INTACT

### Structure HTML (NE PAS MODIFIER)
- **Toute la structure sémantique HTML** : `<section>`, `<header>`, `<nav>`, `<article>`, `<footer>` et leur imbrication
- **Les classes et IDs CSS** utilisés pour le styling (`.hud-panel`, `#globe-container`, `.hotspot-label`, `.satellite-hud`, `.coordinates-display`, `#navigation-controls`, `#info-overlay`, `#content-panel`, etc.)
- **Les attributs `data-*`** sur les éléments HTML
- **L'ordre des sections** dans chaque page
- **La structure des sous-pages** (`into-the-okavango/index.html`, `les-ombres-de-la-mer/index.html`)

### Contenu (NE PAS MODIFIER)
- **Tous les textes** : titres, paragraphes, légendes, données scientifiques
- **Toutes les images** (contenu visuel) — les galeries, posters vidéo, logos
- **Toutes les vidéos** (contenu visuel) — seule l'optimisation du format/poids est permise
- **Les données des hotspots** (`hotspots.js`) — coordonnées, textes, données scientifiques
- **Les crédits et informations de copyright**

### CSS / Rendu visuel (NE PAS MODIFIER)
- **Toutes les propriétés CSS visuelles** : couleurs, tailles, marges, typographies, layouts (flexbox/grid)
- **La palette de couleurs** : teintes bleu marine (`#0a0a2e`, etc.), accents jaune/or (`#ffcc00`), transparences
- **La typographie** : Roboto Mono, TestGeograph, Abyss — polices et tailles
- **Le design responsive** : breakpoints et adaptations mobile existants
- **Le design glassmorphisme des éléments HUD** (l'apparence — seul le mécanisme `backdrop-filter` peut être remplacé par un fond opaque visuellement similaire)
- **Les animations visuelles GSAP** : mouvements, transitions, effets — seuls les paramètres de performance peuvent être ajustés
- **Les animations CSS** visuelles (`fadeIn`, `textReveal`, `pulse`, `rotate`) — peuvent être pausées quand invisible mais pas supprimées
- **Les styles des hotspot labels et connectors**
- **Les CSS des articles** (`styles.css` des sous-pages)

### Fonctionnalités (NE PAS MODIFIER)
- **Le globe interactif Three.js** : rotation, zoom, click sur hotspots, texture vidéo
- **L'orbite ellipsoïdale de la caméra**
- **Le système de hotspots cliquables** avec labels et connecteurs SVG
- **Les animations de transition** vers les hotspots (flyTo)
- **L'interaction drag/zoom/inertie** du globe
- **Les vidéos de transition** (logo alpha)
- **La navigation** entre globe et articles (et retour)
- **Le curseur personnalisé** (apparence — la boucle d'animation peut être optimisée)
- **L'auto-hide de l'interface**
- **Le panneau de contenu coulissant** (ContentPanel)
- **Le HUD** : coordonnées, indicateurs de statut, minimap
- **Les galeries photo** des sous-pages
- **Les contrôles vidéo** des sous-pages
- **Le loader / écran de chargement** (apparence et séquence)
- **Le système de traduction** (`into-the-okavango`)

### Bibliothèques (NE PAS SUPPRIMER)
- **Three.js** — nécessaire pour le globe WebGL
- **GSAP** — utilisé intensivement pour les animations UI
- **ldrs** — loader jelly animé
- **Vite** — bundler (mais sa configuration peut/doit être améliorée)

### Ce qui PEUT être modifié (infrastructure uniquement)
- Comment les modules sont importés/initialisés (lifecycle)
- Comment les event listeners sont gérés (ajout de cleanup)
- Comment les animations GSAP sont créées (ajout de kill/cleanup)
- Comment les assets sont chargés (lazy loading, compression, déduplication)
- Comment les styles inline JS sont appliqués (migration vers classes CSS)
- Comment Three.js est géré (dispose, allocation pooling, pause)
- Comment les erreurs sont gérées (logging vs swallowing)
- La structure des dossiers et la déduplication des assets
- Le format des fichiers media (encodage, résolution, compression)
- Les attributs HTML de performance (`preload`, `defer`, `loading`)
- Les outils de build et de qualité
- Les mécanismes de cache (ajout de Service Worker)

---

*Rapport généré le 8 mars 2026 — Audit exhaustif de performance pour le projet Mondes Immergés*
*Contrainte : la refonte ne doit PAS toucher au frontend visuel (HTML structure + CSS + contenu)*
