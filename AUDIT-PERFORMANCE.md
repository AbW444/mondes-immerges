# AUDIT DE PERFORMANCE EXHAUSTIF — Mondes Immergés

**Date** : 8 mars 2026
**Projet** : Mondes Immergés (Expérience immersive WebGL)
**Stack** : Vite 5.1 + Three.js 0.163 + GSAP 3.13 + Vanilla JS
**Taille totale du projet** : ~833 MB (hors node_modules/.git)

---

## TABLE DES MATIÈRES

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Inventaire des fichiers et architecture](#2-inventaire-des-fichiers-et-architecture)
3. [Assets problématiques](#3-assets-problématiques)
4. [Fuites mémoire (Memory Leaks)](#4-fuites-mémoire-memory-leaks)
5. [Boucles d'animation et performances](#5-boucles-danimation-et-performances)
6. [Problèmes de chargement et vidéo](#6-problèmes-de-chargement-et-vidéo)
7. [Problèmes CSS et rendu](#7-problèmes-css-et-rendu)
8. [Problèmes structurels et architecturaux](#8-problèmes-structurels-et-architecturaux)
9. [Plan de refactoring priorisé](#9-plan-de-refactoring-priorisé)
10. [Ce qui doit rester intact](#10-ce-qui-doit-rester-intact)

---

## 1. RÉSUMÉ EXÉCUTIF

### Diagnostic global : CRITIQUE

Le projet souffre de **problèmes systémiques de performance** qui s'accumulent en cascade :

| Catégorie | Sévérité | Impact |
|-----------|----------|--------|
| Fuites mémoire (setInterval sans clearInterval, rAF sans cancel, GSAP sans kill) | 🔴 Critique | Freezes progressifs, crash après 5-10 min |
| Assets démesurés (vidéos 64-100 MB, PNG 5.8 MB x4, fonts x7) | 🔴 Critique | Temps de chargement >30s, OOM mobile |
| Duplication massive d'assets (globe-video.webm x4 = 256 MB) | 🔴 Critique | Taille de déploiement absurde |
| backdrop-filter: blur() sur grandes surfaces | 🟠 Majeur | Chute FPS GPU, saccades animations |
| 50 particules GSAP `repeat: -1` sans cleanup | 🔴 Critique | Fuite mémoire GSAP cumulative |
| `setInterval` 100ms sans `clearInterval` (app.js:280) | 🔴 Critique | Fuite + charge CPU continue |
| Pas de `dispose()` global Three.js | 🟠 Majeur | VRAM non libérée |
| `<style>` injectés dans `<head>` sans nettoyage | 🟡 Modéré | Accumulation DOM |
| Erreurs silencieusement avalées | 🟡 Modéré | Bugs invisibles, debug impossible |
| Pas de tests, pas de linter | 🟡 Modéré | Régression facile |

### Chiffres clés

- **11 310 lignes** de JavaScript total
- **~833 MB** de taille projet (hors node_modules)
- **6+ vidéos > 30 MB** dont une à 100 MB
- **4 copies** de `globe-video.webm` (64 MB chacune)
- **7 copies** des polices Geograph (13 fichiers chacune)
- **4 copies** de `night-sky.png` (5.8 MB chacune)
- **0 tests**, **0 linter**, **0 monitoring**
- **3+ setInterval** sans cleanup
- **50 animations GSAP** en boucle infinie sans kill
- **12+ event listeners** jamais retirés

---

## 2. INVENTAIRE DES FICHIERS ET ARCHITECTURE

### Structure du projet

```
mondes-immerges/                   # Racine
├── accueil/                       # Page d'accueil (159 MB)
│   ├── index.html                 # HTML standalone avec CSS inline (~1400 lignes)
│   ├── css/styles.css
│   ├── fonts/                     # Copie #1 des polices
│   ├── images/
│   └── videos/                    # img-satellite.webm (100 MB!), satellite-video-chroma.webm (54 MB)
├── interface/                     # Application principale Vite (615 MB total)
│   ├── index.html                 # Point d'entrée (237 lignes, CSS inline + script inline)
│   ├── package.json
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.js                # Entry point (607 lignes)
│   │   ├── app.js                 # Orchestrateur (585 lignes)
│   │   ├── styles/main.css        # CSS principal (1099 lignes)
│   │   ├── modules/
│   │   │   ├── GlobeManager.js    # Three.js core (1308 lignes) ⚠️ PLUS GROS
│   │   │   ├── UIComponents.js    # Composants UI (1302 lignes)
│   │   │   ├── InterfaceUI.js     # UI Manager (911 lignes)
│   │   │   ├── Animations.js      # Utilitaires d'animation (773 lignes)
│   │   │   ├── VisualEffects.js   # Effets visuels (706 lignes)
│   │   │   ├── ContentPanel.js    # Panneau de contenu (694 lignes)
│   │   │   └── Interaction.js     # Gestion input (561 lignes)
│   │   ├── utils/
│   │   │   └── VideoManager.js    # Gestionnaire vidéo (142 lignes)
│   │   └── data/
│   │       ├── hotspots.js        # Données des points d'intérêt (395 lignes)
│   │       └── redirect-config.js # Config redirections (19 lignes)
│   ├── dist/                      # Build (71 MB) - contient globe-video.webm copie
│   ├── public/                    # Assets publics (70 MB) - contient globe-video.webm copie
│   ├── videos/                    # Vidéos interface (132 MB) - globe-video.webm + aberration
│   ├── fonts/                     # Copie #2 des polices
│   ├── into-the-okavango/         # Sous-application article (50 MB)
│   │   ├── index.html
│   │   ├── css/styles.css
│   │   ├── js/main.js             # 1214 lignes
│   │   ├── fonts/                 # Copie #3 des polices
│   │   └── videos/main.mp4        # 43 MB
│   └── les-ombres-de-la-mer/      # Sous-application article (229 MB)
│       ├── index.html
│       ├── css/styles.css
│       ├── js/main.js             # 1716 lignes (plus gros fichier JS)
│       ├── fonts/                 # Copie #4 des polices
│       └── videos/                # globe.webm (98 MB) + globe.mp4 (96 MB) + main.mp4 (32 MB)
├── fonts/                         # Copie #5 des polices (racine)
├── css/                           # Copie racine CSS
├── images/                        # Copie racine images (night-sky.png 5.8 MB)
├── videos/                        # Copie racine vidéos (globe-video.webm 64 MB)
└── assets/                        # Copie racine assets
```

### Fichiers JS par taille (lignes)

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `les-ombres-de-la-mer/js/main.js` | 1716 | Article standalone |
| `GlobeManager.js` | 1308 | WebGL core |
| `UIComponents.js` | 1302 | Composants UI |
| `into-the-okavango/js/main.js` | 1214 | Article standalone |
| `InterfaceUI.js` | 911 | Interface UI |
| `Animations.js` | 773 | Utilitaires animation |
| `VisualEffects.js` | 706 | Effets visuels |
| `ContentPanel.js` | 694 | Panneau contenu |
| `main.js` | 607 | Entry point |
| `app.js` | 585 | Orchestrateur |
| `Interaction.js` | 561 | Input handler |
| `hotspots.js` | 395 | Données |
| `VideoManager.js` | 142 | Gestionnaire vidéo |
| **TOTAL** | **~11 310** | |

### Dépendances (package.json)

```json
{
  "dependencies": {
    "gsap": "^3.13.0",      // Animation (lourd mais nécessaire)
    "ldrs": "^1.1.7",       // Loader component (poids léger)
    "three": "^0.163.0"     // WebGL (très lourd ~600KB min)
  },
  "devDependencies": {
    "gh-pages": "^6.1.1",
    "rimraf": "^5.0.5",
    "terser": "^5.44.1",    // Jamais utilisé (esbuild dans config)
    "vite": "^5.1.4"
  }
}
```

**Problèmes** :
- `terser` est déclaré mais jamais utilisé (vite.config.js utilise `esbuild`)
- Pas de `eslint`, `prettier`, `vitest`, ou tout autre outil de qualité
- Pas de `.browserslistrc` cohérent (dans package.json mais non utilisé par Vite)

---

## 3. ASSETS PROBLÉMATIQUES

### Vidéos — CRITIQUE

| Fichier | Taille | Problème |
|---------|--------|----------|
| `accueil/videos/img-satellite.webm` | **100 MB** | Vidéo d'arrière-plan, absurdement lourde |
| `les-ombres-de-la-mer/videos/globe.webm` | **98 MB** | Vidéo globe dupliquée |
| `les-ombres-de-la-mer/videos/globe.mp4` | **96 MB** | Doublé MP4 du même globe |
| `interface/videos/globe-video-aberration.webm` | **68 MB** | Effet d'aberration |
| `globe-video.webm` | **64 MB x4** | 4 copies identiques = **256 MB** |
| `accueil/videos/satellite-video-chroma.webm` | **54 MB** | Vidéo chroma key |
| `into-the-okavango/videos/main.mp4` | **43 MB** | Vidéo principale article |
| `les-ombres-de-la-mer/videos/main.mp4` | **32 MB** | Vidéo principale article |
| `videos/map-video-poisson.webm` | **23 MB** | Vidéo carte |
| `videos/video-arriereplan.webm` | **20 MB** | Vidéo arrière-plan |

**Recommandations** :
- Réencoder toutes les vidéos en **H.264/H.265** avec un bitrate cible de **2-4 Mbps** (vs 15-30 Mbps actuels estimés)
- Utiliser **des résolutions adaptatives** (720p max pour les textures globe, 1080p max pour les vidéos fullscreen)
- Supprimer toutes les duplications (une seule source, liens symboliques ou chemins partagés)
- Pour les vidéos de texture Three.js : format **WebM VP9** à **1-2 Mbps** suffit
- Objectif : réduire de ~700 MB à ~50-80 MB total

### Images — CRITIQUE

| Fichier | Taille | Copies | Total |
|---------|--------|--------|-------|
| `night-sky.png` | **5.8 MB** | 4 | **23.2 MB** |
| Diverses images | Variable | Multiples | ~30 MB |

**Recommandations** :
- `night-sky.png` : Convertir en **WebP** ou **AVIF** (réduction ~80%), ou réduire résolution (8192x4096 est excessif pour un cubemap limité à 1024px dans le code)
- Une seule copie, référencée par chemin

### Polices — DUPLICATION MASSIVE

**13 fichiers Geograph** (Regular, Medium, Bold, Italic, etc.) + Abyss, dupliqués **7 fois** :

1. `/fonts/` (racine)
2. `/accueil/fonts/`
3. `/interface/fonts/`
4. `/interface/public/fonts/`
5. `/interface/dist/assets/`
6. `/interface/into-the-okavango/fonts/`
7. `/interface/les-ombres-de-la-mer/fonts/`

**Impact estimé** : ~15 MB x 7 = **~105 MB** de polices dupliquées.

**Recommandation** : Un seul répertoire `/fonts/` à la racine, chargé via un chemin absolu partagé. Ou mieux : sous-ensembles WOFF2 uniquement.

---

## 4. FUITES MÉMOIRE (MEMORY LEAKS)

### 4.1 — `setInterval` sans `clearInterval`

#### `app.js:280-354` — CRITIQUE 🔴

```javascript
// setInterval de 100ms pour mise à jour du HUD satellite
setInterval(() => {
    // Met à jour altitude, coordonnées, vitesse, statut système
    // ... 74 lignes de code exécutées 10 fois par seconde
}, 100);
```

**Problème** : Ce `setInterval` n'est **jamais nettoyé**. Il tourne à 10 Hz en permanence, même quand l'interface n'est pas visible. Il effectue des calculs trigonométriques et des manipulations DOM à chaque tick.

**Impact** : Charge CPU continue, empêche le garbage collector de libérer l'instance `MondesImmergesApp`.

#### `VideoManager.js:97` — Modéré 🟡

```javascript
this.checkInterval = setInterval(() => { ... }, interval);
```

Celui-ci a un `clearInterval` dans `stopMonitoring()`, mais `stopMonitoring()` n'est appelé que sur `destroy()` ou `contextLost`. En navigation normale, il tourne indéfiniment à 10s.

### 4.2 — Event listeners jamais retirés

| Fichier | Ligne | Listener | Cible |
|---------|-------|----------|-------|
| `app.js` | 148 | `resize` | `window` |
| `app.js` | 128 | `keydown` | `document` |
| `main.js` | 116 | `mousemove` (cursor) | `document` |
| `main.js` | 600-603 | `pageshow` | `window` |
| `main.js` | 583-593 | `error` + `unhandledrejection` | `window` |
| `GlobeManager.js` | 140 | `resize` | `window` |
| `GlobeManager.js` | 141 | `click` | `container` |
| `GlobeManager.js` | 109-118 | `webglcontextlost/restored` | `canvas` |
| `Interaction.js` | 60-78 | `wheel`, `mousedown`, `mousemove`, `mouseup`, `touchstart`, `touchmove`, `touchend`, `keydown`, `mousemove` (autohide) | `container`/`document` |
| `InterfaceUI.js` | 50-75 | `click` x5 (boutons) | buttons |
| `InterfaceUI.js` | 140-158 | `mouseenter`/`mouseleave` par bouton | buttons |
| `InterfaceUI.js` | 182-200 | `mouseenter`/`mouseleave` info btn | `infoBtn` |
| `ContentPanel.js` | 51-83 | `click`, `loadeddata`, `error` | panel/video |
| `index.html` | 88-95 | `keydown` (arrow block) | `document` |
| `index.html` | 209-234 | `DOMContentLoaded` + `setTimeout` recursif | `document` |

**Total** : **30+ event listeners** qui ne sont jamais retirés. Aucune classe n'a de méthode `destroy()` ou `dispose()`.

### 4.3 — requestAnimationFrame sans cancel

#### `GlobeManager.js:1241-1308` — CRITIQUE 🔴

```javascript
animate() {
    requestAnimationFrame(this.animate.bind(this));
    // ... rendu Three.js
}
```

**Problème** : `.bind(this)` crée une **nouvelle fonction** à chaque frame (60 fois/seconde). Cela empêche la collecte de l'objet `GlobeManager`. De plus, l'animation n'est **jamais arrêtée** — pas de `cancelAnimationFrame`.

#### `main.js:119-131` — Cursor rAF loop

```javascript
const moveCursor = () => {
    // ... déplace le curseur custom
    requestAnimationFrame(moveCursor);
};
requestAnimationFrame(moveCursor);
```

**Problème** : Boucle rAF permanente pour un curseur. Nettoyage seulement sur `beforeunload` (qui n'est pas fiable sur mobile/SPA).

#### `Interaction.js:155-176` — Inertia rAF

```javascript
startInertia() {
    const animateInertia = () => {
        // ...
        this.inertiaAnimationId = requestAnimationFrame(animateInertia);
    };
    this.inertiaAnimationId = requestAnimationFrame(animateInertia);
}
```

Celui-ci est correctement nettoyé dans `handleMouseDown` avec `cancelAnimationFrame`. ✅

### 4.4 — GSAP animations infinies sans kill

#### `VisualEffects.js:690-699` — CRITIQUE 🔴

```javascript
addBackgroundParticles() {
    // Crée 50 particules avec GSAP repeat: -1
    for (let i = 0; i < 50; i++) {
        gsap.to(particle, {
            x: ..., y: ...,
            duration: ...,
            repeat: -1,     // BOUCLE INFINIE
            yoyo: true,
            ease: "sine.inOut"
        });
    }
}
```

**Problème** : 50 tweens GSAP en boucle infinie, jamais `kill()`. Chaque tween consomme de la mémoire et du CPU. Pas de mécanisme d'arrêt.

#### `VisualEffects.js:686` — box-shadow animé sur particules

```javascript
box-shadow: 0 0 ${3 + Math.random() * 5}px rgba(255, 204, 0, ${0.3 + Math.random() * 0.4})
```

`box-shadow` est une propriété **très coûteuse** à animer, surtout x50 particules.

### 4.5 — `<style>` injectés dans `<head>` sans nettoyage

| Fichier | Ligne | Description |
|---------|-------|-------------|
| `VisualEffects.js` | ~290 | `createOrbitalLoaderEffect()` injecte `<style>` |
| `InterfaceUI.js` | 284-306 | `<style>` pour `#close-info::before` |
| `ContentPanel.js` | 201-221 | `<style>` pour scrollbar `.panel-content` |
| `ContentPanel.js` | 261-297 | `<style>` pour `#hotspot-description` |
| `ContentPanel.js` | 337-359 | `<style>` pour `.arrow` drawer |
| `Animations.js` | 291-300 | `<style>` pour cursor blink |

**Impact** : Chaque appel injecte un nouveau `<style>`. Certains sont potentiellement appelés plusieurs fois (ex: `createOrbitalLoaderEffect`), causant une accumulation de nœuds `<style>` dans le `<head>`.

### 4.6 — Arrays qui croissent sans limite

#### `app.js:413` — `explorationHistory`

```javascript
this.explorationHistory.push({ ... });
```

Aucune limite, aucun nettoyage. Croit indéfiniment pendant la session.

#### `GlobeManager.js:530` — `orbitHistory`

```javascript
this.orbitParams.orbitHistory.push(new THREE.Vector3(x, y, z));
if (this.orbitParams.orbitHistory.length > 100) {
    this.orbitParams.orbitHistory.shift();
}
```

Celui-ci est limité à 100 entrées. ✅ Mais crée un `new THREE.Vector3` à chaque frame (allocation mémoire dans la boucle de rendu).

### 4.7 — Three.js dispose manquant

**Aucune méthode `dispose()`** n'existe sur `GlobeManager`. Quand la page navigue (back/forward via `pageshow`), le contexte WebGL, les textures, géométries et matériaux ne sont **jamais libérés**.

Objets créés et jamais disposed :
- `this.renderer` (WebGLRenderer)
- `this.scene` (inclut toutes les géométries/matériaux)
- `this.videoTexture` (VideoTexture)
- `this.globe.material`, `this.globe.geometry`
- `this.clouds.material`, `this.clouds.geometry`
- `this.depthSphere.material`, `this.depthSphere.geometry`
- Tous les `markerGeometry` / `markerMaterial` / `haloGeometry` / `haloMaterial` des hotspots
- Le cubemap render target (`WebGLCubeRenderTarget`)

---

## 5. BOUCLES D'ANIMATION ET PERFORMANCES

### 5.1 — Boucle de rendu Three.js (GlobeManager.js:1241-1308)

**Exécution** : 60 FPS, chaque frame fait :
1. `updateCameraPosition()` — calculs trigonométriques + `new THREE.Vector3()` allocation
2. Itération sur TOUS les hotspots pour animer les `waveRings` — et **recrée la géométrie** à chaque frame (`wave.geometry.dispose()` + `new THREE.RingGeometry()`)
3. `updateHotspotLabels()` — pour CHAQUE hotspot : `project()`, `new THREE.Vector3()`, `new THREE.Raycaster()` (allocation), `intersectObject()` (coûteux)
4. `renderer.render()` — rendu WebGL

**Problème critique à la ligne 1280-1281** :
```javascript
wave.geometry.dispose();
wave.geometry = new THREE.RingGeometry(currentRadius, currentRadius + 0.02, 32);
```
Création et destruction d'une géométrie **à chaque frame** pour chaque anneau d'onde. C'est une opération GPU très coûteuse.

**Problème à la ligne 1157-1158** :
```javascript
const direction = new THREE.Vector3().subVectors(worldPos, this.camera.position).normalize();
const raycaster = new THREE.Raycaster(this.camera.position, direction);
```
Création d'un nouveau `Vector3` et d'un nouveau `Raycaster` **à chaque frame, pour chaque hotspot** (6 hotspots = 12 allocations/frame = 720 allocations/seconde).

### 5.2 — Cursor rAF loop (main.js:119-131)

Boucle rAF séparée du rendu Three.js, uniquement pour déplacer 2 divs CSS (`cursor` et `cursor-follower`). Coût faible mais inutile si le curseur n'a pas bougé.

### 5.3 — setInterval 100ms HUD (app.js:280-354)

Met à jour le texte de 6+ éléments DOM toutes les 100ms :
- Altitude, coordonnées (avec calculs trigonométriques)
- Vitesse de l'orbite, nom de zone
- Statut système, signal

**Impact** : 10 écritures DOM/seconde, forçant des reflows à chaque tick.

### 5.4 — setTimeout recursif pour l'heure (index.html:210-231)

```javascript
function updateTime() {
    // ... mise à jour de l'heure
    setTimeout(updateTime, 1000);
}
```

Léger mais ne se nettoie jamais. Dupliqué fonctionnellement avec le `setInterval` de `app.js`.

### 5.5 — CSS animations permanentes

| Animation | Fichier | Impact |
|-----------|---------|--------|
| `starsMovement` (200s linear infinite) | `main.css:271-278` | Background-position change sur 9 gradients radiaux = repaints |
| `scanline` (8s linear infinite) | `main.css:497-500` | Animation de position absolue (OK, compositable) |
| `rotate` (20s linear infinite) | `main.css:403-406` | Transform rotate (OK, compositable) |
| `pulse` (2s infinite alternate) | `main.css:375-386` | Transform + opacity (OK) |
| `statusPulse` (2s infinite) | `main.css:545-549` | Transform + opacity (OK) |
| `pulseConnector` (2s infinite alternate) | `main.css:925-928` | Opacity seulement (OK) |
| `cursorBlink` (1s step-end infinite) | `Animations.js:295-299` | Injecté dynamiquement |

L'animation `starsMovement` est la plus coûteuse car elle anime `background-position` sur un élément fullscreen avec 9 radial-gradients.

---

## 6. PROBLÈMES DE CHARGEMENT ET VIDÉO

### 6.1 — Vidéos de transition

**`index.html:194-200`** : Deux vidéos de transition sont déclarées dans le HTML :
```html
<video id="transition-video-in" muted playsinline>
    <source src="/mondes-immerges/videos/logo_transi_alpha_inverser.webm">
</video>
<video id="transition-video-out" muted playsinline>
    <source src="/mondes-immerges/videos/logo_transi_alpha.webm">
</video>
```

**Problèmes** :
- Pas de `preload="none"` → le navigateur commence à télécharger immédiatement
- Elles sont dans le `#loading-screen` et sont chargées en même temps que la vidéo du globe
- Aucun fallback MP4 (WebM seulement)

### 6.2 — Vidéo du globe (GlobeManager.js:249-371)

La vidéo du globe (64 MB WebM) est chargée via `video.preload = 'auto'` et `video.load()`. Un timeout de 10 secondes laisse passer même si la vidéo n'est pas chargée.

**Problème** : Sur une connexion lente, la vidéo commence avant d'être bufferisée → saccades.

### 6.3 — Night-sky.png (5.8 MB PNG) comme cubemap

**`GlobeManager.js:416-474`** : L'image de 8192x4096 pixels est chargée, puis convertie en cubemap WebGL. Le code limite la taille à 1024px, mais l'image entière est d'abord téléchargée et décodée en mémoire.

**Impact** : ~130 MB de mémoire pour décoder le PNG original, avant de le réduire à 1024px.

### 6.4 — Simulation de chargement (main.js:540)

```javascript
// Simulated loading progress
const progressInterval = setInterval(() => {
    // ... faux pourcentage de chargement
}, ...);
```

Le chargement est **simulé** et non basé sur la progression réelle des assets. L'utilisateur voit 100% alors que des vidéos sont encore en cours de téléchargement.

### 6.5 — Force-reload sur back navigation (main.js:600-603)

```javascript
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        window.location.reload();
    }
});
```

Force un rechargement complet quand l'utilisateur revient en arrière, au lieu de restaurer l'état. Cela masque les fuites mémoire mais détruit l'expérience UX.

### 6.6 — Erreurs silencieuses (main.js:583-593)

```javascript
window.addEventListener('error', (event) => {
    event.preventDefault(); // Avalé silencieusement
});
window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault(); // Avalé silencieusement
});
```

**Impact** : Toutes les erreurs JavaScript sont masquées. Impossible de diagnostiquer les problèmes en production.

### 6.7 — Article pages : vidéo hero avec globe.webm (98 MB)

**`into-the-okavango/index.html:58-63`** :
```html
<video class="globe-video" muted loop preload="auto" playsinline>
    <source src="../les-ombres-de-la-mer/videos/globe.webm">
    <source src="../les-ombres-de-la-mer/videos/globe.mp4">
</video>
```

**Problème** : Charge une vidéo de **98 MB** comme arrière-plan hero de l'article. `preload="auto"` force le téléchargement complet.

**`les-ombres-de-la-mer/index.html:63-66`** : Doublon source identique pour le même fichier :
```html
<source src="videos/globe.webm" type="video/webm">
<source src="videos/globe.webm" type="video/webm">  <!-- DOUBLON -->
```

---

## 7. PROBLÈMES CSS ET RENDU

### 7.1 — `backdrop-filter: blur()` sur grandes surfaces — MAJEUR 🟠

| Fichier | Ligne | Élément | Taille estimée |
|---------|-------|---------|----------------|
| `main.css:310-311` | `.satellite-hud` | `blur(16px) saturate(180%)` | ~200x100px x2 |
| `main.css:440-441` | `.coordinates-display` | `blur(16px) saturate(180%)` | ~300x40px |
| `main.css:577-578` | `#navigation-controls button` | `blur(12px)` | ~48x48px x3 |
| `main.css:615-616` | `#info-button` | `blur(16px)` | ~48x48px |
| `main.css:672-673` | `#info-overlay` | `blur(20px)` | **100% viewport** |
| `main.css:698-699` | `.overlay-content` | `blur(12px)` | ~1120xVariable |
| `main.css:754-755` | `#close-info` | `blur(12px)` | ~120x40px |
| `main.css:874-875` | `.hotspot-label` | `blur(16px) saturate(180%)` | ~150x30px x6 |
| `main.css:962-963` | `.notification` | `blur(16px) saturate(180%)` | ~400x50px |
| `index.html:55-56` | `.overlay-content` | `blur(12px)` (doublon!) | Override |
| `VisualEffects.js:165` | Transition container | `blur(5px)` | **100% viewport** |
| `VisualEffects.js:527` | Notification | `blur(5px)` | Variable |
| `InterfaceUI.js:211-212` | Info overlay | `blur(10px)` | **100% viewport** |
| `InterfaceUI.js:534` | Notification | `blur(5px)` | Variable |
| `ContentPanel.js:385` | Drawer | `blur(10px)` | 100% width, 70% height |

**Impact** : `backdrop-filter: blur()` est l'une des propriétés CSS **les plus coûteuses** pour le GPU. Elle force le navigateur à :
1. Rasteriser tout le contenu derrière l'élément
2. Appliquer un flou gaussien en temps réel
3. Recomposer avec l'élément au-dessus

Quand c'est sur un élément fullscreen (`#info-overlay`) au-dessus d'un canvas WebGL Three.js, c'est **catastrophique** pour les performances. Le GPU doit blurer le canvas complet + tous les éléments.

**Avec 15+ éléments utilisant blur simultanément**, le GPU est constamment en train de recomposer.

### 7.2 — `cursor: none !important` global

**`main.css:67`** :
```css
* { cursor: none !important; }
```

Le `!important` sur `*` est redondant avec le sélecteur spécifique en dessous. Plus problématique : il est aussi dupliqué dans `index.html` inline styles (ligne 11).

### 7.3 — Inline styles massifs via JavaScript

Quasiment **tout le styling interactif** est fait en `style.cssText` dans le JS :
- `InterfaceUI.js` : ~300 lignes de styles inline
- `ContentPanel.js` : ~100 lignes de styles inline
- `VisualEffects.js` : ~200 lignes de styles inline
- `GlobeManager.js` : ~50 lignes de styles inline

Cela rend les styles :
1. Impossibles à overrider sans `!important`
2. Non cachables/réutilisables
3. Cause des reflows à chaque modification

### 7.4 — CSS conflits entre inline HTML et CSS fichier

`index.html` contient 85 lignes de `<style>` inline qui overrident les styles de `main.css`. Certains avec `!important`, créant une guerre de spécificité.

### 7.5 — `starsMovement` animation sur 9 radial-gradients

**`main.css:271-278`** :
L'animation `starsMovement` (200s infinite) anime `background-position` sur un élément fullscreen avec 9 `radial-gradient`. C'est un repaint complet à chaque frame.

### 7.6 — Font loading sans optimisation

Les polices Geograph sont en format `.otf` (OpenType) au lieu de `.woff2` (Web Open Font Format). La conversion en WOFF2 réduirait la taille de **~60-70%**.

Le chemin des fonts dans `main.css` pointe vers `/fonts/` (chemin absolu) qui ne fonctionne pas en production GitHub Pages où le base path est `/mondes-immerges/interface/`.

---

## 8. PROBLÈMES STRUCTURELS ET ARCHITECTURAUX

### 8.1 — Pas de séparation entre les sous-applications

Les 3 applications (`accueil`, `interface`, articles) sont **totalement indépendantes** :
- Chacune a sa propre copie des fonts, images, CSS
- Navigation par `window.location.href` (rechargement complet)
- Aucun partage de code, state, ou cache
- Chaque page recharge Three.js, GSAP, etc. de zéro

### 8.2 — Pas de routing SPA

La navigation entre pages fait des **hard navigations** :
- Globe → Article : `window.location.href = redirectUrl` (`GlobeManager.js:909`)
- Article → Globe : Lien vers `/mondes-immerges/interface/`
- Chaque navigation recharge 100% des assets

### 8.3 — Pas de state management

L'état de l'application est éparpillé dans des propriétés de classe :
- `MondesImmergesApp` (app.js) : état global
- `GlobeManager` : état de la caméra, orbite, hotspots
- `Interaction` : état du drag, inertie
- `InterfaceUI` : état de l'overlay
- `ContentPanel` : état du panneau, drawer

Aucune sérialisation/restauration d'état. Chaque navigation repart de zéro.

### 8.4 — Code mort et commenté

- `GlobeManager.js:134` : `createCelestialBodies()` commenté mais le code existe toujours (90 lignes)
- `GlobeManager.js:352` : `createAtmosphere()` commenté
- `GlobeManager.js:803` : `createScanEffect()` commenté
- `GlobeManager.js:938-1020` : `createScanEffect()` implémentation complète jamais appelée
- `ContentPanel.js:36-39` : Méthodes vides comme fallback
- `UIComponents.js` : Classe `OrbitalLoader` de 1302 lignes, utilisée uniquement pour le loader initial

### 8.5 — Pas de lazy loading

Tous les modules sont importés de manière **synchrone** au démarrage :
```javascript
import { GlobeManager } from './modules/GlobeManager.js';
import { VisualEffects } from './modules/VisualEffects.js';
// etc.
```

Les articles `into-the-okavango` et `les-ombres-de-la-mer` sont des pages HTML séparées avec des scripts `<script src="js/main.js">` non-modulaires.

### 8.6 — Double event handling

- `keydown` est écouté dans `Interaction.js:73` ET dans `index.html:88-95` (bloquer les flèches)
- `resize` est écouté dans `GlobeManager.js:140` ET dans `app.js:148`
- Les styles du `#close-info` sont définis dans `main.css`, overridés dans `index.html` inline `<style>`, puis à nouveau overridés dans `InterfaceUI.js:265-306`

### 8.7 — articles JS : monolithes standalone

Les fichiers `les-ombres-de-la-mer/js/main.js` (1716 lignes) et `into-the-okavango/js/main.js` (1214 lignes) sont des fichiers JS monolithiques qui :
- Réimplémentent les mêmes patterns (scroll observer, gallery, animations)
- Ne sont pas modulaires
- Chargés via `<script src>` non-module (pas d'ES modules)
- `les-ombres-de-la-mer` charge `ldrs` via CDN (`<script src="https://cdn.jsdelivr.net/npm/ldrs@1.0.1/dist/index.js">`) tandis que `into-the-okavango` ne le charge pas du tout

### 8.8 — Vite config issues

- `optimizeDeps.force: true` force le re-bundling à chaque démarrage dev
- `assetsInclude` inclut des formats jamais utilisés (`.ktx`, `.ktx2`, `.basis`, `.hdr`, `.exr`, `.glsl`)
- `resolve.extensions` inclut `.vue` et `.glsl` qui ne sont pas utilisés
- `test` config présente mais aucun framework de test installé

---

## 9. PLAN DE REFACTORING PRIORISÉ

### Phase 1 — Urgences (Semaine 1) : Stopper les fuites

| # | Action | Fichier | Impact |
|---|--------|---------|--------|
| 1.1 | Ajouter `clearInterval` pour le HUD 100ms | `app.js:280` | 🔴 Stop CPU leak |
| 1.2 | Kill les 50 tweens GSAP particles | `VisualEffects.js:690` | 🔴 Stop GSAP leak |
| 1.3 | Stocker le rAF ID de `animate()` et utiliser `cancelAnimationFrame` | `GlobeManager.js:1241` | 🔴 Stop rAF leak |
| 1.4 | Arrêter de recréer géométries à chaque frame | `GlobeManager.js:1280` | 🔴 Stop GPU thrash |
| 1.5 | Réutiliser `Raycaster` et `Vector3` dans `updateHotspotLabels` | `GlobeManager.js:1157` | 🟠 Stop GC pressure |
| 1.6 | Ajouter `destroy()` à toutes les classes | Tous | 🟠 Lifecycle cleanup |

### Phase 2 — Assets (Semaine 2) : Réduire la taille

| # | Action | Impact estimé |
|---|--------|---------------|
| 2.1 | Supprimer les 3 copies redondantes de `globe-video.webm` | -192 MB |
| 2.2 | Réencoder les vidéos en H.264 2-4 Mbps | -500 MB estimé |
| 2.3 | Convertir `night-sky.png` en WebP + réduire résolution | -20 MB |
| 2.4 | Centraliser les polices en WOFF2 dans un seul répertoire | -100 MB |
| 2.5 | Ajouter `preload="none"` aux vidéos de transition | Chargement initial |

### Phase 3 — CSS/GPU (Semaine 3) : Éliminer les bottlenecks

| # | Action | Impact |
|---|--------|--------|
| 3.1 | Remplacer `backdrop-filter: blur()` par des fonds semi-opaques | FPS doublé |
| 3.2 | Déplacer tous les styles inline JS vers des classes CSS | Maintenabilité |
| 3.3 | Nettoyer les `<style>` injectés dynamiquement | DOM propre |
| 3.4 | Convertir `starsMovement` en animation CSS `will-change: transform` | GPU compositing |
| 3.5 | Remplacer `box-shadow` animé sur particules par `opacity` | GPU cost |

### Phase 4 — Architecture (Semaine 4+) : Restructurer

| # | Action | Impact |
|---|--------|--------|
| 4.1 | Créer un `Lifecycle` manager centralisé (init/destroy) | Cleanup fiable |
| 4.2 | Implémenter un `EventBus` ou pattern observer | Découplage modules |
| 4.3 | Ajouter `dispose()` complet pour Three.js | VRAM libérée |
| 4.4 | Réactiver les error handlers avec logging propre | Debug possible |
| 4.5 | Ajouter ESLint + Prettier | Qualité code |
| 4.6 | Ajouter Vitest avec tests minimaux | Non-régression |
| 4.7 | Évaluer migration vers SPA routing (shared shell) | UX + perf navigation |

---

## 10. CE QUI DOIT RESTER INTACT

### HTML Structure
- La structure DOM de `index.html` (éléments `#app`, `#main-container`, `#globe-container`, etc.)
- Les éléments HUD (`.satellite-hud`, `.coordinates-display`, `.satellite-crosshair`)
- Les éléments UI (`#ui-controls`, `#navigation-controls`, `#info-overlay`)
- La structure des articles (`into-the-okavango/index.html`, `les-ombres-de-la-mer/index.html`)

### CSS Visual Layer
- Toutes les classes CSS visuelles dans `main.css` (couleurs, typographie, layout)
- Le système de variables CSS `:root` (couleurs, fonts, shadows)
- Le design glassmorphisme des éléments HUD
- Le thème jaune/noir National Geographic
- Les animations CSS purement visuelles (`fadeIn`, `textReveal`, `pulse`, `rotate`)
- Le design responsive (`@media` queries)
- Les styles des hotspot labels et connectors
- Les articles CSS (`into-the-okavango/css/styles.css`, `les-ombres-de-la-mer/css/styles.css`)

### Content
- Tous les textes et données de `hotspots.js`
- Le contenu HTML des articles (sections, textes, images)
- Les crédits et informations de copyright

### Fonctionnalités
- Le globe Three.js avec texture vidéo
- L'orbite ellipsoïdale de la caméra
- Le système de hotspots cliquables avec labels
- Les animations de transition vers les hotspots
- L'interaction drag/zoom/inertie
- Les vidéos de transition
- La navigation entre globe et articles
- Le curseur personnalisé
- L'auto-hide de l'interface

### What CAN be changed (infrastructure only)
- Comment les modules sont importés/initialisés (lifecycle)
- Comment les event listeners sont gérés (ajout de cleanup)
- Comment les animations GSAP sont créées (ajout de kill/cleanup)
- Comment les assets sont chargés (lazy loading, compression)
- Comment les styles inline JS sont appliqués (migration vers classes CSS)
- Comment Three.js est géré (dispose, allocation pooling)
- Comment les erreurs sont gérées (logging vs swallowing)
- La structure des dossiers et la déduplication des assets
- Le format des fichiers media (encodage, résolution)
- Les outils de build et de qualité

---

*Rapport généré le 8 mars 2026 — Audit exhaustif de performance pour Mondes Immergés*
