# Mondes Immergés — Analyse du processus de création

**Document préparé pour le dossier de candidature ENSAD Paris — Master Art Espace**
*Fil narratif : « Traduire des données environnementales brutes en présences volumétriques perceptibles »*

---

## Table des matières

1. [Chronologie des commits](#1-chronologie-des-commits)
2. [Étapes clés du processus](#2-étapes-clés-du-processus)
3. [Pistes abandonnées](#3-pistes-abandonnées)
4. [Stack technique](#4-stack-technique)
5. [Captures recommandées](#5-captures-recommandées)

---

## 1. Chronologie des commits

L'historique couvre **96 commits** sur **3 mois** (4 décembre 2025 → 8 mars 2026), répartis sur **16 branches**. La narration du projet se déploie en quatre phases distinctes.

### Phase 1 — Fondation et déploiement (4 décembre 2025)

| Commit | Date | Description | Changement visuel/fonctionnel |
|--------|------|-------------|-------------------------------|
| `05f68a9` | 04/12/2025 | **Version initiale propre** | Premier commit : globe Three.js avec texture vidéo, 6 hotspots géolocalisés (Grande Barrière de Corail, Fosse des Mariannes, Triangle de Corail, Méditerranée, Arctique, Vaquita), système de panneaux de contenu, effets visuels (particules, scanner, lignes de connexion), HUD satellite. ~11 300 lignes de code source. |
| `d8aad35` → `08f8669` | 04/12/2025 | Configuration GitHub Pages | 5 commits de configuration CI/CD — lutte avec les chemins d'assets Vite en production (BASE_URL, chemins relatifs vs absolus). |
| `09192ae` | 04/12/2025 | **Consolidation multi-repo** | Pivot architectural majeur : fusion de 3 repos séparés (interface globe, page accueil, pages expéditions) en un monorepo. Ajout de `accueil/` (page d'accueil cinématique), `into-the-okavango/` et `les-ombres-de-la-mer/` (pages articles). +27 500 lignes, +800 Mo d'assets vidéo. |
| `f32e94b` | 04/12/2025 | Fix navigation et déploiement | Liaison fonctionnelle entre les pages du site consolidé. |
| `4c5f331` | 05/12/2025 | Suppression loader texte | Choix esthétique : ne garder que l'animation jelly, supprimer la barre de progression et le texte — priorité à l'immersion. |
| `386f064` | 05/12/2025 | Labels de hotspots cliquables | Les labels textuels des points d'intérêt deviennent interactifs. |
| `9490405` | 09/12/2025 | **Optimisation radicale vidéo** | Élimination des saccades de la vidéo-texture du globe. Moment technique important : la fluidité de la vidéo plaquée sur la sphère 3D est essentielle à la sensation de « présence volumétrique ». |

### Phase 2 — Recherche d'identité visuelle (3 janvier – 18 janvier 2026)

Cette phase est la plus dense en expérimentation. **~50 commits** en 15 jours, dont beaucoup sont des itérations rapides sur l'UI/UX.

| Commit | Date | Description | Changement visuel/fonctionnel |
|--------|------|-------------|-------------------------------|
| `39bf075` | 03/01/2026 | Typographie sous-titre + bouton | Recherche de hiérarchie typographique pour la page d'accueil. |
| `7815ed3` → `f071ddc` | 03/01/2026 | Simplification écran de chargement | 3 commits itératifs pour trouver le bon équilibre : élimination du flash gris, simplification progressive. |
| `c7917c5` → `d140f87` | 03/01/2026 | **Branches parallèles de fix** | 5 branches créées simultanément pour résoudre les problèmes de chargement — témoigne d'une phase d'urgence et d'exploration multiple. |
| `6e3cfee` → `db04a24` | 03/01/2026 | **Réécriture des connector lines** | Refonte complète du système de lignes reliant les hotspots au globe. 334 lignes modifiées dans GlobeManager.js — passage d'un système de traits simples à des lignes dynamiques réactives. |
| `9c3af59` → `c261f52` | 04/01/2026 | Texte de chargement + mode « clear » | Ajout puis retrait de textes pendant le chargement. Exploration du rapport entre attente et immersion. |
| `7ba0a0f` → `4d6c9dd` | 04/01/2026 | **Refonte glassmorphisme scientifique** | Pivot esthétique majeur : +346 lignes CSS modifiées, introduction du glassmorphisme (effets de verre dépoli, transparences) pour l'interface satellite. L'UI passe d'un style « flat » à un langage visuel évoquant un instrument d'observation sous-marin. |
| `9c52e98` | 04/01/2026 | **Refonte hotspots + caméra parabolique** | +200 lignes modifiées dans GlobeManager.js. Les hotspots passent de points simples à des géométries 3D. Animation de caméra parabolique pour les transitions entre hotspots — le mouvement de la caméra elle-même devient une expérience spatiale. |
| `4956f6d` | 04/01/2026 | Retour géométries 3D jaune pur | Correction de zoom, retour aux géométries 3D avec une couleur jaune pur pour les hotspots — la lisibilité prime sur la subtilité. |
| `f3f1099` | 04/01/2026 | Hotspots aplatis + jaune pur | Nouvelle tentative : hotspots aplatis au lieu de sphériques. Oscillation entre volume et planéité. |
| `f546833` | 04/01/2026 | **Hotspots sphériques + vidéo transition** | Retour aux hotspots sphériques, ajout d'une vidéo de transition entre les pages. La navigation devient cinématique. |
| `447cf39` → `20f6627` | 04/01/2026 | Améliorations UX interactions | Fix visibilité hotspots, focus boutons, logo, labels. Vidéo de transition ajoutée. |
| `3f9df28` | 18/01/2026 | **Suppression de l'effet volumétrique** | Revert significatif : un effet visuel expérimental (probablement lié au rendu volumétrique des données) est entièrement supprimé. Décision de recentrage sur la clarté plutôt que la surcharge visuelle. |

### Phase 3 — Stabilisation et déploiement (6 février – 7 février 2026)

| Commit | Date | Description | Changement visuel/fonctionnel |
|--------|------|-------------|-------------------------------|
| `d763525` | 06/02/2026 | Renommage du repo | Passage de `nationalgeographic.fr-mondesimmerges` à `mondes-immerges` — affirmation d'identité propre au projet. |
| `50c63ba` → `7ff22ee` | 06-07/02/2026 | **Refonte galerie photo** | 8 commits itératifs sur les flèches de navigation de galerie : visibilité, positionnement, recodage complet, suppression des contours de focus. Perfectionnement pixel-perfect de l'expérience éditoriale. |
| `7b14af5` | 06/02/2026 | Réorganisation URLs | Les collections passent sous `/interface/` — architecture de site multi-page mature. |
| `26f73e5` | 06/02/2026 | **Optimisations + purge vidéo massive** | Suppression de 18 fichiers vidéo redondants (~500 Mo éliminés). Nettoyage radical des assets : `globe-video-aberration.webm`, `globe-video-fluidite.mp4`, `satellite-video-chroma.webm`, `img-satellite.webm` — autant de pistes visuelles abandonnées. |
| `bb5d90d` | 07/02/2026 | Optimisations performance majeures | Optimisations professionnelles touchant le chargement et le rendu. |
| `7b1b937` | 07/02/2026 | Suppression admin/debug | Nettoyage de toutes les fonctionnalités de débogage — passage en mode production. |
| `272b8fa` | 07/02/2026 | **Fix CRITIQUE chemin vidéo globe** | Le chemin de la vidéo-texture du globe était `undefined` — bug bloquant résolu. La vidéo plaquée sur la sphère est le cœur du projet. |
| `7f40047` | 07/02/2026 | **Fond spatial assombri + écran chargement** | Assombrissement du fond de l'interface globe + ajout d'un écran de chargement pour l'accueil. Le noir profond renforce la sensation d'immersion abyssale. |

### Phase 4 — Polissage et lutte technique (17 février – 8 mars 2026)

| Commit | Date | Description | Changement visuel/fonctionnel |
|--------|------|-------------|-------------------------------|
| `21e2a62` | 17/02/2026 | Changement username GitHub | Passage de `AbW444` à `Holosene` — construction d'une identité professionnelle. |
| `9addb4b` | 17/02/2026 | Remplacement index.html racine | La page d'accueil devient le point d'entrée principal du site. |
| `9a45544` | 18/02/2026 | **Fix crash WebGL GL_OUT_OF_MEMORY** | Résolution d'un crash mémoire GPU — le projet pousse les limites du WebGL avec des vidéos haute définition en texture. |
| `76a3a8f` | 18/02/2026 | Stop boucle infinie vidéo + réduction VRAM | Arrêt d'une boucle de retry infinie sur perte de contexte WebGL. Réduction de l'empreinte VRAM — négociation entre ambition visuelle et contraintes matérielles. |
| `967529a` → `9e9f640` | 18/02/2026 | Restauration qualité + scale UI -20% | 2 itérations : restaurer la qualité visuelle tout en réduisant la taille de l'interface de 20%. Recherche d'un équilibre entre densité informationnelle et respiration visuelle. |
| `f88aca5` | 18/02/2026 | Remplacement loading par fade noir | L'écran de chargement complexe est remplacé par un simple fondu noir — le minimalisme l'emporte. |
| `88835b4` | 18/02/2026 | **Refonte responsive mobile-first** | Tentative de rendre l'ensemble du site responsive. Modifie 10 fichiers, +484/-494 lignes. |
| `c4ccb30` | 18/02/2026 | **↩ Revert complet du responsive** | La refonte responsive est entièrement annulée — le projet est conçu comme une expérience desktop immersive, pas un site mobile. Décision assumée. |
| `a5beeec` → `730a16a` | 18/02/2026 | Mobile overlay → revert | Tentative de bloquer l'accès mobile avec un overlay, puis revert. L'approche finale reste à définir. |
| `4bcce64` | 18/02/2026 | Suppression tous console.log | Nettoyage production : suppression de tous les logs de debug. |
| `29f96ea` → `06e1419` | 08/03/2026 | **Fix freeze vidéo + contrôles globe** | Résolution du gel vidéo sur les pages expéditions et élimination de systèmes vidéo concurrents. Derniers commits fonctionnels. |

---

## 2. Étapes clés du processus

### Étape 1 — Le Globe comme Matière Première
**Commit : `05f68a9` — 4 décembre 2025**

> *Premier commit. Le globe Three.js existe déjà avec sa vidéo-texture, ses 6 hotspots géolocalisés, son HUD satellite et ses effets visuels (particules, scanner, lignes de connexion). Ce n'est pas un « hello world » — c'est une vision déjà formée, un prototype dense de 11 300 lignes.*

**Écran à capturer :** Le globe en rotation avec la vidéo-texture océanique, les 6 points jaunes des hotspots visibles, le HUD satellite en surimpression. L'interface est brute mais fonctionnelle — la donnée environnementale (textures océaniques, coordonnées géographiques réelles) est déjà traduite en présence visuelle.

**Pourquoi c'est important :** Ce commit montre que le projet ne part pas du code mais d'une intention spatiale — cartographier visuellement des zones de crise environnementale sur un globe interactif. La donnée (coordonnées GPS, indices de santé écologique, profondeurs, températures) est embarquée directement dans le code source (`hotspots.js` : Grande Barrière de Corail à -18.2871°/147.6992°, profondeur 15-45m, index santé passé de 0.85 en 2000 à 0.43 en 2025).

---

### Étape 2 — La Consolidation comme Geste Architectural
**Commit : `09192ae` — 4 décembre 2025**

> *Fusion de trois repositories séparés en un monorepo : le globe interactif (interface), la page d'accueil cinématique (accueil), et les pages de récits d'expédition (Into the Okavango, Les Ombres de la Mer). +27 500 lignes, +800 Mo d'assets vidéo.*

**Écran à capturer :** Structure de fichiers montrant les trois univers réunis — `accueil/` (page cinématique avec animation logo, vidéo satellite), `interface/` (globe 3D), `into-the-okavango/` et `les-ombres-de-la-mer/` (récits éditoriaux avec galeries photo, vidéo documentaire, système de traduction FR/EN).

**Pourquoi c'est important :** Ce commit révèle l'ambition du projet — ce n'est pas un exercice technique mais un dispositif éditorial complet. L'accueil utilise des vidéos satellite (104 Mo), des animations de logo, un fond marin animé. Les pages expéditions comportent des galeries photo, des systèmes de lecture vidéo, des indicateurs de données environnementales. Le geste de consolidation montre la volonté de penser le projet comme un espace cohérent, pas comme des pages isolées.

---

### Étape 3 — La Recherche du Langage Visuel (« Aha Moment »)
**Commits : `7ba0a0f` → `f546833` — 4 janvier 2026**

> *En une seule journée, 15 commits transforment radicalement l'identité visuelle du projet. Introduction du glassmorphisme scientifique (+346 lignes CSS), refonte des hotspots (4 itérations : simples → géométries 3D → aplatis → sphériques), animation de caméra parabolique, système de connector lines dynamiques.*

**Écrans à capturer (3 états successifs) :**
1. **`7ba0a0f`** — Glassmorphisme scientifique : l'interface passe du flat design à des panneaux translucides évoquant un instrument d'observation sous-marin. Effets de verre dépoli, transparences multicouches.
2. **`9c52e98`** — Hotspots géométriques 3D + mouvement de caméra parabolique : les points d'intérêt deviennent des volumes dans l'espace, la caméra ne coupe plus mais voyage entre eux.
3. **`f546833`** — Hotspots sphériques finaux + vidéo de transition : la forme sphérique est retenue, la navigation devient cinématique avec une vidéo reliant les pages.

**Pourquoi c'est important :** Cette journée est le moment pivotal du projet — le passage d'une interface fonctionnelle à un langage visuel propre. Les 4 itérations sur la forme des hotspots (simples → 3D → aplatis → sphériques) montrent un processus de design par élimination. Le glassmorphisme n'est pas décoratif — il crée une sensation de profondeur et d'immersion, comme observer le fond marin à travers un hublot. L'animation parabolique de la caméra transforme la navigation en expérience spatiale.

---

### Étape 4 — La Purge et le Choix du Noir
**Commits : `26f73e5` + `7f40047` — 6-7 février 2026**

> *Suppression massive de 18 fichiers vidéo (~500 Mo). Parmi eux : `globe-video-aberration.webm` (effet d'aberration chromatique), `globe-video-fluidite.mp4` (test de fluidité alternative), `satellite-video-chroma.webm` (vidéo satellite avec chroma key), `img-satellite.webm` (imagerie satellite brute). Assombrissement du fond spatial de l'interface.*

**Écran à capturer :** Le globe après assombrissement — la sphère luminescente flotte dans un noir profond. Les hotspots jaunes brillent comme des signaux. L'interface glassmorphique est presque invisible, laissant le globe dominer l'espace visuel.

**Pourquoi c'est important :** Ce moment de purge est une décision artistique fondamentale. Les fichiers supprimés représentent des pistes visuelles explorées puis rejetées — l'aberration chromatique (trop psychédélique), le chroma key satellite (trop littéral), la fluidité alternative (pas assez organique). Le choix du noir n'est pas un appauvrissement mais un recentrage : le fond sombre crée un espace de type « deep sea », cohérent avec la thématique des mondes immergés. La donnée environnementale n'est plus illustrée mais incarnée dans la lumière qui perce l'obscurité.

---

### Étape 5 — Le Corps-à-Corps avec la Machine
**Commits : `9a45544` → `76a3a8f` — 18 février 2026**

> *Crash WebGL GL_OUT_OF_MEMORY. Boucle infinie de retry vidéo. La carte graphique refuse les textures haute définition. Le projet atteint les limites physiques du navigateur web.*

**Écran à capturer :** La console de développement montrant l'erreur `GL_OUT_OF_MEMORY` et les tentatives de recovery — ou mieux, le globe juste après la résolution, fonctionnant à la limite du possible.

**Pourquoi c'est important :** Ce moment de crise technique est révélateur de la tension au cœur du projet — pousser le navigateur web (un outil normalement destiné à afficher des pages statiques) à devenir un espace volumétrique immersif. La résolution passe par une réduction de l'empreinte VRAM (mémoire vidéo), un compromis entre ambition visuelle et contraintes matérielles. C'est exactement le dialogue entre l'intention artistique et la résistance du medium qui caractérise le processus de création en Art Espace.

---

### Étape 6 — Le Refus du Mobile
**Commits : `88835b4` → `c4ccb30` — 18 février 2026**

> *Une refonte responsive mobile-first complète est développée (+484 lignes), puis entièrement annulée dans le commit suivant. Le projet revendique son statut d'expérience desktop immersive.*

**Écran à capturer :** Le diff du revert — la suppression nette de tout le code responsive. Ou la version desktop plein écran, affirmée comme la seule manière valide d'expérimenter le projet.

**Pourquoi c'est important :** Ce revert est une prise de position artistique. En refusant le mobile, le projet affirme que certaines expériences spatiales nécessitent un rapport physique au grand écran — de la même manière qu'une installation Art Espace nécessite un corps dans l'espace. La donnée environnementale traduite en présence volumétrique ne se réduit pas à un écran de 6 pouces.

---

## 3. Pistes abandonnées

### 3.1 — Branches orphelines (expérimentations parallèles)

Le repo contient **14 branches** au-delà de `master`, dont la majorité sont des tentatives parallèles pour résoudre les mêmes problèmes — témoignant d'un processus d'exploration par essais multiples :

| Branche | Commits | Thème | Sort |
|---------|---------|-------|------|
| `claude/fix-loading-consolidate-HFpJy` | 9 | Système de chargement professionnel | Partiellement mergée. Tentative la plus aboutie de loading screen avec transitions. |
| `claude/fix-interface-issues-HFpJy` | 2 | Vidéo transition + UX | Abandonnée. Travail parallèle sur les mêmes problèmes que la branche principale. |
| `claude/fix-loading-background-HFpJy` | 1 | Loading screen | Abandonnée au profit de la branche consolidate. |
| `claude/fix-loading-background-9anZ8` | 5 | Chargement + typographie | Abandonnée. 5 commits explorant le même problème par un angle différent. |
| `claude/fix-loading-icon-animation-EH7kY` | 1 | Animation icône loader | Abandonnée. |
| `claude/fix-loading-icon-animation-S8t8f` | 1 | Loader + particules | Abandonnée. |
| `claude/fix-interface-all-issues-EH7kY` | 1 | Fix interface global | Abandonnée. |
| `claude/fix-interface-loading-EH7kY` | 1 | Loading animation | Abandonnée. |
| `claude/optimizations-and-fixes-dIIrS` | 1 | Optimisations UX | Abandonnée. |
| `claude/consolidate-git-repos-dIIrS` | 1 | Fond spatial + chargement | Fusionnée dans master. |
| `claude/consolidate-git-repos-012v...` | 3 | Upload vidéos alternatives | Abandonnée. |
| `claude/optimize-video-performance-01F1...` | 1 | Performance vidéo radicale | Abandonnée (branche isolée). |
| `claude/push-globe-video-project-01LW...` | 1 | Restructuration multi-page | Abandonnée au profit de la consolidation manuelle. |

**Lecture pour le dossier :** 8 branches créées en un seul jour (3 janvier 2026) pour résoudre le problème du chargement — c'est un moment de crise créative où l'expérimentation se fait par embranchements multiples, comme un sculpteur qui travaillerait simultanément plusieurs maquettes pour trouver la bonne forme.

### 3.2 — Fichiers vidéo supprimés (pistes visuelles)

| Fichier supprimé | Poids estimé | Ce qu'il représentait |
|------------------|-------------|----------------------|
| `globe-video-aberration.webm` | ~70 Mo | Vidéo-texture du globe avec effet d'aberration chromatique — déformation visuelle des données océaniques. Abandonné : trop « effet spécial », pas assez organique. |
| `globe-video-fluidite.mp4` | ~80 Mo | Version alternative de la vidéo-texture optimisée pour la fluidité. Remplacée par une version mieux compressée. |
| `satellite-video-chroma.webm` | ~56 Mo | Vidéo satellite avec chroma key (fond vert remplaçable). Abandonné : approche trop littérale de l'imagerie satellite. |
| `img-satellite.webm` | ~105 Mo | Imagerie satellite brute en vidéo. Supprimée : trop lourde, remplacée par des assets plus légers. |
| `globe-video QSDF.mp4` | ~29 Mo | Fichier de test (nom « QSDF » = frappe clavier aléatoire). Nettoyé. |
| `anim-logo-transition-inverse.webm` | ~1.3 Mo | Animation de logo inversée — piste abandonnée pour les transitions. |
| `video-arriereplan.webm` | ~48 Mo | Vidéo d'arrière-plan (fond marin animé). Remplacée/optimisée. |
| `map-video-poisson_90mo.webm` | ~65 Mo | Vidéo de cartographie marine (bancs de poissons). Dupliquée dans plusieurs dossiers, nettoyée. |

**Total supprimé : ~500+ Mo de pistes visuelles abandonnées.**

### 3.3 — Approches techniques revertées

| Approche | Commits | Raison de l'abandon |
|----------|---------|-------------------|
| **Effet volumétrique** | `3f9df28` (revert) | Un effet de rendu volumétrique (probablement post-processing shader) est développé puis entièrement supprimé. Trop gourmand en ressources GPU ou visuellement encombrant. |
| **Responsive mobile-first** | `88835b4` → `c4ccb30` (revert) | +484 lignes de CSS responsive développées puis entièrement revertées. Décision de maintenir le projet comme expérience desktop-only. |
| **Overlay mobile** | `a5beeec` → `730a16a` (revert) | Tentative de bloquer l'accès mobile avec un message, revertée — l'approche finale reste la dégradation silencieuse. |
| **Jelly loader (ldrs)** | `e5821fa` → `3f9df28` | Import du loader jelly depuis unpkg, supprimé lors du revert volumétrique. Remplacé par un fondu noir minimaliste. |
| **Système de loading complexe** | `7f40047` → `f88aca5` | Écran de chargement avec indicateurs ajouté puis remplacé par un simple fondu noir — victoire du minimalisme. |

---

## 4. Stack technique

### Moteur 3D et rendu

| Technologie | Rôle dans le projet | Fichier(s) clé(s) |
|-------------|--------------------|--------------------|
| **Three.js** | Globe 3D (SphereGeometry + MeshBasicMaterial avec VideoTexture), hotspots sphériques, caméra orbitale, raycasting pour l'interaction, animation parabolique de caméra | `GlobeManager.js` (1308 lignes) |
| **WebGL** | Rendu GPU direct — le projet pousse WebGL à ses limites (crash GL_OUT_OF_MEMORY résolu) | Contexte Three.js |
| **Vidéo HTML5 comme texture** | Des fichiers `.webm`/`.mp4` de 30-80 Mo sont plaqués en temps réel sur la sphère 3D. C'est le mécanisme central de « traduction de données en présence » | `VideoManager.js` (142 lignes) |

### Animation et transitions

| Technologie | Rôle dans le projet | Fichier(s) clé(s) |
|-------------|--------------------|--------------------|
| **GSAP** (GreenSock) | Toutes les animations UI : apparition/disparition des panneaux, transitions de pages, timelines séquentielles, effets de parallaxe | `Animations.js` (773 lignes) |
| **requestAnimationFrame** | Boucle de rendu 60fps pour le globe, curseur custom, particules, scanner | `GlobeManager.js`, `VisualEffects.js` |
| **CSS Transitions/Keyframes** | Micro-animations UI, effets de hover glassmorphiques | `main.css` (1099 lignes) |

### Architecture front-end

| Technologie | Rôle dans le projet | Fichier(s) clé(s) |
|-------------|--------------------|--------------------|
| **Vite** | Bundler/dev server. Configuration complexe : multi-page build, aliasing de chemins, tree-shaking Three.js | `vite.config.js` (179 lignes) |
| **JavaScript ES Modules** | Architecture modulaire : 10 modules spécialisés (GlobeManager, Animations, Interaction, VisualEffects, UIComponents, ContentPanel, InterfaceUI, VideoManager, hotspots, redirect-config) | `interface/src/` |
| **HTML5 natif** | Pages d'accueil et d'expéditions en HTML/CSS/JS vanilla — pas de framework. Choix de légèreté et de contrôle total | `accueil/`, `into-the-okavango/`, `les-ombres-de-la-mer/` |

### Données environnementales

| Type de donnée | Format | Exemple |
|---------------|--------|---------|
| Coordonnées géographiques | `{ lat, lng }` | Grande Barrière : -18.2871°, 147.6992° |
| Données scientifiques | Objet JS structuré | Profondeur (15-45m), température (23.5-28.5°C), pH (8.1-8.4), salinité (34-35‰) |
| Séries temporelles | Tableaux `{ year, healthIndex }` | Index santé : 0.85 (2000) → 0.43 (2025) |
| Statuts de conservation | Chaînes descriptives | « En danger critique », « Vulnérable » |
| Textes éditoriaux | HTML inline | Descriptions scientifiques multilingues (FR/EN) |

### Typographie et identité

| Police | Usage |
|--------|-------|
| **Abyss** (custom TTF) | Titres principaux — police évoquant la profondeur océanique |
| **TestGeograph** (13 variantes OTF) | Corps de texte et données — police géographique/cartographique |
| **Roboto Mono** (Google Fonts) | Interface HUD satellite — esprit terminal/scientifique |

### Déploiement

| Technologie | Rôle |
|-------------|------|
| **GitHub Pages** | Hébergement statique |
| **GitHub Actions** | CI/CD automatisé (`deploy.yml`) |
| **build.js custom** | Script de build (486 lignes) pour la gestion multi-page |

---

## 5. Captures recommandées

### Capture 1 — « La Genèse : données brutes sur sphère »
**Checkout : `05f68a9`**

```bash
git checkout 05f68a9
cd interface && npm install && npm run dev
```

**Quoi capturer :** Le globe en rotation avec les 6 hotspots visibles. L'interface est brute, les panneaux de contenu sont fonctionnels mais pas encore stylisés en glassmorphisme. La vidéo-texture est plaquée sur la sphère. Les lignes de connexion relient les hotspots au globe.

**Angle portfolio :** *« Point de départ — la donnée environnementale existe déjà comme coordonnées, comme indices de santé, comme vidéo océanique. Le geste initial est de la cartographier sur un volume. »*

---

### Capture 2 — « La Consolidation : l'espace éditorial complet »
**Checkout : `09192ae`**

```bash
git checkout 09192ae
```

**Quoi capturer :** La structure de fichiers visible dans un éditeur de code — les trois univers (`accueil/`, `interface/`, `into-the-okavango/`, `les-ombres-de-la-mer/`) avec leurs assets respectifs. La page d'accueil avec l'animation du logo Mondes Immergés et le fond satellite.

**Angle portfolio :** *« L'architecture comme geste spatial — réunir trois espaces séparés en un dispositif cohérent. Le projet n'est pas une page web mais un territoire navigable. »*

---

### Capture 3 — « Le Pivot esthétique : glassmorphisme et caméra parabolique »
**Checkout : `f546833`**

```bash
git checkout f546833
cd interface && npm install && npm run dev
```

**Quoi capturer :**
- Le globe avec les panneaux glassmorphiques (effets de verre dépoli, transparences multicouches)
- Un hotspot sphérique jaune en gros plan
- Le mouvement de caméra parabolique pendant la transition entre deux hotspots (capture vidéo ou séquence d'images)
- Le panneau d'information ouvert avec les données scientifiques visibles

**Angle portfolio :** *« Le moment où l'interface cesse d'être un outil et devient un instrument d'observation. Le glassmorphisme crée une sensation de hublot sous-marin. La caméra parabolique transforme la navigation en déplacement physique. »*

---

### Capture 4 — « La Purge : le noir comme espace »
**Checkout : `7f40047`**

```bash
git checkout 7f40047
cd interface && npm install && npm run dev
```

**Quoi capturer :** Le globe flottant dans le noir profond. Le fond spatial assombri. Les hotspots jaunes brillants comme des signaux dans l'obscurité. L'interface quasi-invisible.

**Angle portfolio :** *« Le choix du noir — après avoir supprimé 500 Mo de pistes visuelles (aberrations, chroma key, imagerie satellite), l'espace se vide pour laisser la donnée devenir lumière. Le fond sombre est un espace de type deep sea. La présence volumétrique émerge du vide. »*

---

### Capture 5 — « Les Pistes Rejetées : archéologie du processus »
**Captures multiples — pas de checkout nécessaire**

**Quoi capturer :**
- Le git log avec `--graph` montrant les 14 branches divergentes
- Les noms des fichiers vidéo supprimés (`globe-video-aberration.webm`, `satellite-video-chroma.webm`, etc.)
- Le diff du revert responsive (`c4ccb30`) montrant 484 lignes supprimées
- Le diff du revert volumétrique (`3f9df28`)

**Angle portfolio :** *« Les traces de ce qui a été tenté puis rejeté. 14 branches orphelines, 500 Mo de vidéos supprimées, un effet volumétrique complet abandonné, une refonte responsive annulée. Le processus de création par soustraction — savoir ce qu'on ne veut pas est aussi important que savoir ce qu'on veut. »*

```bash
# Pour générer le graphe des branches
git log --all --oneline --graph --decorate > git-graph.txt

# Pour lister les fichiers supprimés
git log --all --diff-filter=D --name-only --format="" | sort -u > fichiers-supprimes.txt
```

---

### Capture 6 — « L'État final : le dispositif complet »
**Checkout : `06e1419` (dernier commit fonctionnel avant le rapport d'audit)**

```bash
git checkout 06e1419
cd interface && npm install && npm run dev
```

**Quoi capturer :**
- Le globe en pleine rotation avec la vidéo-texture fluide
- Un clic sur un hotspot avec la caméra parabolique en mouvement
- Le panneau d'information déployé avec les données scientifiques
- La transition vers une page d'expédition (vidéo de transition)
- La page d'expédition « Into the Okavango » ou « Les Ombres de la Mer » avec la galerie photo et le lecteur vidéo
- La page d'accueil avec l'animation du logo

**Angle portfolio :** *« Le dispositif achevé — un espace navigable où les données environnementales (coordonnées, températures, indices de biodiversité, vidéos documentaires) sont traduites en présences volumétriques : un globe luminescent dans le noir, des hotspots-signaux, des panneaux translucides, des transitions cinématiques. L'interface est un instrument d'observation, pas un site web. »*

---

## Annexe — Statistiques du projet

| Métrique | Valeur |
|----------|--------|
| Commits total (toutes branches) | 96 |
| Branches créées | 16 |
| Branches abandonnées | 12 |
| Durée du projet | 3 mois (déc. 2025 – mars 2026) |
| Lignes de code source (JS) | ~10 000 |
| Lignes CSS | ~8 000 |
| Lignes HTML | ~3 500 |
| Modules JavaScript | 10 |
| Hotspots géographiques | 6 sites de crise écologique |
| Fichiers vidéo supprimés | 18 |
| Volume d'assets supprimés | ~500 Mo |
| Reverts significatifs | 4 (volumétrique, responsive, mobile overlay, loading) |
| Crashs WebGL résolus | 2 (GL_OUT_OF_MEMORY, context loss) |
| Pages du site | 4 (accueil, interface globe, 2 expéditions) |

---

*Document généré par analyse exhaustive du dépôt Git `Holosene/mondes-immerges`*
*96 commits analysés sur 16 branches — mars 2026*
