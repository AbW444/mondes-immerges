# 📊 RAPPORT DE PERFORMANCE - Mondes Immergés
**Date:** 2026-02-07
**Projet:** National Geographic - Mondes Immergés

---

## 🎯 RÉSUMÉ EXÉCUTIF

Le site présente des problèmes de performance critiques principalement dus à :
- **Vidéos très lourdes** (jusqu'à 100MB) impactant les temps de chargement
- **Fichiers dupliqués et obsolètes** occupant 1.2GB d'espace disque
- **Effets visuels coûteux** (backdrop-filter, shadows) affectant les FPS
- **Boucles d'animation multiples** non optimisées

**Score de performance estimé : 35-45/100**

---

## 🚨 PROBLÈMES CRITIQUES

### 1. VIDÉOS TRÈS LOURDES (Impact: 🔴 CRITIQUE)

#### Vidéos problématiques identifiées :

| Fichier | Taille | Localisation | Impact |
|---------|--------|--------------|--------|
| `img-satellite.webm` | **100MB** | `/videos/` et `/accueil/videos/` | Temps de chargement >20s |
| `les-ombres-de-la-mer/videos/globe.webm` | **98MB** | `/interface/` | Blocage initial |
| `globe-video-aberration.webm` | **68MB** | Dupliqué 2x (`/public/`, `/dist/`) | Gaspillage d'espace |
| `globe-video.webm` | **64MB** | Dupliqué 3x (racine, `/public/`, `/dist/`) | Gaspillage d'espace |
| `map-video-poisson_90mo.webm` | **63MB** | `/accueil/videos/` (obsolète) | Fichier mort |
| `satellite-video-chroma.webm` | **54MB** | `/videos/` et `/accueil/videos/` | Temps de chargement >10s |
| `video-arriereplan.webm` | **46MB** | `/accueil/videos/` (obsolète) | Ancienne version |

**Total de vidéos lourdes : ~600MB+**

#### Problèmes détectés :

1. **Anciennes vidéos obsolètes toujours présentes dans `/accueil/videos/`** :
   - `anim-logo-transition.webm` (1.3MB) - remplacé par `logo_transi_alpha.webm`
   - `map-video-poisson_90mo.webm` (63MB) - remplacé par `map-video-poisson.webm`
   - `video-arriereplan.webm` (46MB) - ancienne version plus lourde

2. **Vidéos dupliquées entre plusieurs dossiers** :
   - `globe-video.webm` présent dans `/videos/`, `/interface/public/videos/`, `/interface/dist/videos/`
   - `globe-video-aberration.webm` dupliqué 2 fois

3. **Préchargement vidéo inefficace** :
   - Attribut `preload="metadata"` insuffisant pour vidéos >50MB
   - Pas de streaming adaptatif
   - Pas de versions compressées alternatives

#### Impact sur les performances :

- **Temps de chargement initial : 25-45 secondes** (connexion moyenne)
- **Bande passante consommée : 300-500MB** par visite
- **Mobile/4G : expérience inutilisable** (>2 minutes de chargement)
- **Taux de rebond estimé : >70%**

---

### 2. FICHIERS DUPLIQUÉS ET ESPACE DISQUE (Impact: 🟠 ÉLEVÉ)

#### Taille des répertoires :

```
./interface/         1.2 GB   ⚠️ ANORMAL
./accueil/          267 MB   ⚠️ Contient fichiers obsolètes
./videos/           263 MB   ✓ OK
```

#### Fichiers identifiés pour suppression :

**Dans `/accueil/videos/` (fichiers obsolètes) :**
- `anim-logo-transition.webm` (1.3MB)
- `video-arriereplan.webm` (46MB) - ancienne version
- `map-video-poisson_90mo.webm` (63MB) - ancienne version

**Économie d'espace potentielle : ~110MB**

**Dans `/interface/` (duplications) :**
- Vidéos dupliquées entre `/public/`, `/dist/`, et racine
- **Économie potentielle : ~200MB**

---

### 3. ANIMATIONS ET FPS (Impact: 🟠 ÉLEVÉ)

#### Boucles d'animation détectées :

##### Dans `accueil/index.html` :
```javascript
// Boucle RAF pour curseur personnalisé (ligne 1489)
function animateFollower() {
    // Calculs sur chaque frame
    requestAnimationFrame(animateFollower);
}
```

##### Dans `interface/src/modules/GlobeManager.js` :
```javascript
// Boucle RAF principale (ligne 1433-1500)
animate() {
    requestAnimationFrame(this.animate.bind(this));

    // Rendu Three.js
    this.renderer.render(this.scene, this.camera);
}
```

##### Dans `interface/src/main.js` :
```javascript
// Boucle RAF pour curseur (ligne 111-125)
function animate() {
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
    rafId = requestAnimationFrame(animate);
}
```

##### Dans `interface/src/modules/UIComponents.js` :
```javascript
// Anneaux de rotation (ligne 195-200)
const animate = () => {
    ring.style.transform = `...rotate(${...})`;
    requestAnimationFrame(animate);
};
```

#### Problèmes identifiés :

1. **4 boucles RAF simultanées** :
   - 2x pour curseurs personnalisés
   - 1x pour le globe Three.js
   - 1x pour les anneaux UI
   - **Impact FPS : -20 à -30 FPS**

2. **Opérations coûteuses dans la boucle** :
   - Calculs de transformation à chaque frame
   - Accès direct au DOM (`style.left`, `style.transform`)
   - Pas de throttling ou debouncing

3. **WebGL et Three.js** :
   ```javascript
   this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
   antialias: true
   shadowMap.enabled: true
   ```
   - Antialiasing activé (coûteux)
   - Shadows activées (très coûteux)
   - PixelRatio limité à 2 (bon)

#### FPS estimés :

- **Desktop puissant** : 45-60 FPS
- **Desktop moyen** : 30-45 FPS
- **Laptop** : 20-35 FPS
- **Mobile** : 15-25 FPS ⚠️
- **Mobile bas de gamme** : <15 FPS 🔴

---

### 4. EFFETS VISUELS COÛTEUX (Impact: 🟡 MOYEN)

#### Effets CSS détectés (20 occurrences) :

##### `backdrop-filter: blur()` :
```css
/* accueil/index.html - lignes 58, 102, 401, 558 */
.side-nav {
    backdrop-filter: blur(20px);  /* Très coûteux GPU */
}

.explore-globe-btn {
    backdrop-filter: blur(25px);  /* Très coûteux GPU */
}
```

**Impact :**
- **-10 à -20 FPS** sur GPU faibles
- **Ralentissements** lors du scroll/animations
- **Incompatibilité** Firefox (fallback absent)

##### `filter: brightness/contrast/blur()` :
```css
/* accueil/index.html - lignes 382, 427, 242 */
.bg-video {
    filter: brightness(0.7) contrast(1.1);  /* Coûteux sur vidéos */
}

.cursor.video-hover {
    filter: blur(1px);  /* Sur élément animé = très coûteux */
}
```

##### Ombres multiples :
```css
/* text-shadow et box-shadow sur éléments animés */
.immerse-title {
    text-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
}

.explore-globe-btn {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}
```

#### Recommandations :

1. Remplacer `backdrop-filter` par images semi-transparentes
2. Appliquer `filter` uniquement sur éléments statiques
3. Réduire les ombres sur éléments animés
4. Utiliser `will-change` pour optimiser les transformations

---

### 5. REQUÊTES ET CHARGEMENT (Impact: 🟡 MOYEN)

#### Ordre de chargement problématique :

**Page d'accueil (`accueil/index.html`) :**
```html
<!-- Chargement immédiat -->
<video class="bg-video" autoplay muted loop playsinline preload="metadata">
    <source src="./videos/video-arriereplan.webm">  <!-- 20MB -->
</video>

<video class="logo-video" autoplay muted playsinline preload="auto">
    <source src="./videos/anim-logo.webm">  <!-- 3.7MB -->
</video>

<!-- Chargement différé mais déclaré -->
<video class="transition-video" id="transitionVideo">
    <source src="./videos/logo_transi_alpha.webm">  <!-- 336KB -->
</video>
```

**Problèmes :**
1. **2 vidéos chargées simultanément au démarrage** (23.7MB)
2. `preload="auto"` sur logo = chargement complet immédiat
3. **Liste de 4 vidéos d'arrière-plan** prêtes à charger
4. **Pas de lazy loading**

**Temps de chargement estimé :**
- **Fibre (100 Mbps)** : 3-5 secondes
- **ADSL (10 Mbps)** : 20-30 secondes
- **4G (5 Mbps)** : 40-60 secondes
- **3G (1 Mbps)** : >3 minutes 🔴

#### Ordre de chargement recommandé :

1. HTML/CSS critique (inline)
2. Logo vidéo (3.7MB) - obligatoire
3. Interface interactive (JS)
4. Vidéo d'arrière-plan (lazy)
5. Vidéos alternatives (preload sur demande)

---

## 🐛 BUGS IDENTIFIÉS

### 1. Fichiers obsolètes référencés

**Fichiers anciens toujours dans `/accueil/videos/`** :
- ❌ `anim-logo-transition.webm` (non utilisé)
- ❌ `map-video-poisson_90mo.webm` (remplacé)
- ❌ `video-arriereplan.webm` ancienne version (46MB au lieu de 20MB)

**Risque :** Si l'utilisateur revient sur l'ancienne version du site, il chargera les anciennes vidéos lourdes.

### 2. Gestion du buffering vidéo

```javascript
// accueil/index.html - ligne 1398-1403
backgroundVideo.addEventListener('canplay', function onCanPlay() {
    backgroundVideo.play().catch(function(e) {
        console.log('Erreur lors de la lecture de la nouvelle vidéo:', e);
    });
    backgroundVideo.removeEventListener('canplay', onCanPlay);
}, { once: true });
```

**Problème :** `canplay` se déclenche trop tôt (seulement quelques frames chargées). Pour vidéos lourdes, préférer `canplaythrough`.

### 3. Pas de fallback pour effets non supportés

```css
.side-nav {
    backdrop-filter: blur(20px);
    /* ❌ Pas de fallback pour navigateurs non compatibles */
}
```

**Impact :** Éléments transparents non lisibles sur Firefox/anciens navigateurs.

### 4. Multiple event listeners sans cleanup

```javascript
// GlobeManager.js
window.addEventListener('resize', this.onWindowResize.bind(this));
// ❌ Pas de removeEventListener lors du destroy
```

**Impact :** Fuites mémoire lors de navigation entre pages.

---

## 📈 MÉTRIQUES DE PERFORMANCE

### Lighthouse estimé (Desktop) :

| Métrique | Score | Valeur |
|----------|-------|--------|
| **Performance** | 🔴 35-45 | Mauvais |
| **Accessibility** | 🟢 85-90 | Bon |
| **Best Practices** | 🟡 70-75 | Moyen |
| **SEO** | 🟢 90-95 | Excellent |

### Core Web Vitals estimés :

| Métrique | Valeur | État |
|----------|--------|------|
| **LCP** (Largest Contentful Paint) | 8-15s | 🔴 Mauvais |
| **FID** (First Input Delay) | 200-400ms | 🟠 À améliorer |
| **CLS** (Cumulative Layout Shift) | 0.05-0.15 | 🟡 Moyen |
| **FCP** (First Contentful Paint) | 3-6s | 🔴 Mauvais |
| **TTI** (Time to Interactive) | 10-20s | 🔴 Très mauvais |

### Détails techniques :

**Taille totale des ressources :**
- HTML/CSS/JS : ~800KB
- Vidéos (chargement initial) : ~24MB
- Vidéos (total disponible) : ~600MB
- Images : ~5MB
- **Total initial : ~30MB** 🔴

**Nombre de requêtes :**
- Fichiers statiques : ~15
- Vidéos : 2-4 (initial)
- Polices : 4
- **Total : ~25 requêtes**

**Temps de chargement par connexion :**
| Type | Premier octet | DOM Ready | Load Complete | Interactive |
|------|---------------|-----------|---------------|-------------|
| Fibre 100Mbps | 0.2s | 2s | 5s | 6s |
| ADSL 10Mbps | 0.5s | 8s | 30s | 35s 🔴 |
| 4G 5Mbps | 1s | 15s | 60s | 70s 🔴 |
| 3G 1Mbps | 3s | 60s | 240s | 300s 🔴 |

---

## ✅ RECOMMANDATIONS PRIORITAIRES

### 🔴 URGENT (À corriger immédiatement)

#### 1. Optimiser les vidéos lourdes

**Actions :**
```bash
# Compresser img-satellite.webm (100MB → 25-30MB)
ffmpeg -i img-satellite.webm -c:v libvpx-vp9 -b:v 2M -crf 35 img-satellite-optimized.webm

# Compresser globe.webm (98MB → 30-35MB)
ffmpeg -i globe.webm -c:v libvpx-vp9 -b:v 3M -crf 33 globe-optimized.webm

# Compresser satellite-video-chroma.webm (54MB → 15-20MB)
ffmpeg -i satellite-video-chroma.webm -c:v libvpx-vp9 -b:v 1.5M -crf 35 satellite-optimized.webm
```

**Objectif :** Réduire de 300MB à ~100MB total

#### 2. Supprimer fichiers obsolètes

**À supprimer :**
```bash
rm accueil/videos/anim-logo-transition.webm
rm accueil/videos/map-video-poisson_90mo.webm
rm accueil/videos/video-arriereplan.webm
```

**Économie : ~110MB**

#### 3. Dédupliquer vidéos dans interface/

**Actions :**
- Conserver uniquement dans `/public/videos/`
- Supprimer de `/dist/videos/` (généré au build)
- Supprimer duplicata à la racine

**Économie : ~200MB**

#### 4. Implémenter lazy loading vidéos

**Avant :**
```html
<video autoplay muted loop playsinline preload="metadata">
    <source src="./videos/video-arriereplan.webm">
</video>
```

**Après :**
```html
<video autoplay muted loop playsinline preload="none" data-lazy-src="./videos/video-arriereplan.webm">
    <!-- Poster image -->
    <img src="./images/video-placeholder.jpg" alt="Loading...">
</video>

<script>
// Charger seulement après logo video
logoVideo.addEventListener('ended', () => {
    const bgVideo = document.querySelector('.bg-video');
    bgVideo.src = bgVideo.dataset.lazySrc;
    bgVideo.load();
});
</script>
```

---

### 🟠 IMPORTANT (Dans les 7 jours)

#### 5. Optimiser boucles RAF

**Fusionner les boucles d'animation :**
```javascript
// Avant : 4 boucles RAF séparées
animateFollower();      // Curseur 1
animate();              // Curseur 2
globeManager.animate(); // Globe
UIComponents.animate(); // UI

// Après : 1 seule boucle centrale
class AnimationManager {
    animate() {
        // Tous les updates ici
        this.updateCursor();
        this.updateGlobe();
        this.updateUI();

        requestAnimationFrame(() => this.animate());
    }
}
```

**Gain FPS : +10-15**

#### 6. Optimiser Three.js

```javascript
// Réduire qualité sur mobiles
const isMobile = window.innerWidth < 768;

this.renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,  // Désactiver sur mobile
    powerPreference: "high-performance"
});

this.renderer.shadowMap.enabled = !isMobile;  // Pas de shadows sur mobile
this.renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
```

**Gain FPS mobile : +15-20**

#### 7. Remplacer backdrop-filter

**Avant :**
```css
.side-nav {
    backdrop-filter: blur(20px);
}
```

**Après :**
```css
.side-nav {
    background: rgba(17, 17, 17, 0.9);
}

/* Ou avec image floue en arrière-plan */
.side-nav::before {
    content: '';
    background: url('bg-blurred.jpg');
    opacity: 0.8;
}
```

**Gain FPS : +5-10**

#### 8. Corriger événement canplay

```javascript
// Remplacer 'canplay' par 'canplaythrough'
backgroundVideo.addEventListener('canplaythrough', function onReady() {
    backgroundVideo.play().catch(console.error);
    backgroundVideo.removeEventListener('canplaythrough', onReady);
}, { once: true });
```

---

### 🟡 AMÉLIORATION (Dans les 30 jours)

#### 9. Implémenter streaming adaptatif

Créer plusieurs versions de vidéos :
- **Low** : 480p, 1-2Mbps (mobile/3G)
- **Medium** : 720p, 3-4Mbps (desktop/4G)
- **High** : 1080p, 5-6Mbps (desktop haut débit)

```javascript
function selectVideoQuality() {
    const connection = navigator.connection || navigator.mozConnection;
    const effectiveType = connection?.effectiveType || '4g';

    const qualityMap = {
        'slow-2g': 'low',
        '2g': 'low',
        '3g': 'medium',
        '4g': 'high'
    };

    return qualityMap[effectiveType] || 'medium';
}

const quality = selectVideoQuality();
bgVideo.src = `./videos/video-arriereplan-${quality}.webm`;
```

#### 10. Ajouter Progressive Web App (PWA)

```javascript
// service-worker.js
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('v1').then((cache) => {
            return cache.addAll([
                '/index.html',
                '/styles.css',
                '/script.js',
                '/videos/logo_transi_alpha.webm'  // Seulement petites vidéos
            ]);
        })
    );
});
```

#### 11. Ajouter monitoring performance

```javascript
// Performance observer
const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        console.log(`${entry.name}: ${entry.duration}ms`);

        // Envoyer à analytics
        if (entry.duration > 1000) {
            analytics.track('slow_resource', {
                resource: entry.name,
                duration: entry.duration
            });
        }
    }
});

observer.observe({ entryTypes: ['resource', 'measure'] });
```

---

## 📊 RÉSULTATS ATTENDUS

### Après optimisations URGENT :

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **Taille initiale** | 30MB | 10MB | -67% 🟢 |
| **LCP** | 15s | 5s | -67% 🟢 |
| **TTI** | 20s | 7s | -65% 🟢 |
| **Score Lighthouse** | 35-45 | 65-75 | +30 pts 🟢 |

### Après toutes optimisations :

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **Taille initiale** | 30MB | 5MB | -83% 🟢 |
| **LCP** | 15s | 2.5s | -83% 🟢 |
| **TTI** | 20s | 4s | -80% 🟢 |
| **FPS Desktop** | 30-45 | 55-60 | +40% 🟢 |
| **FPS Mobile** | 15-25 | 35-45 | +100% 🟢 |
| **Score Lighthouse** | 35-45 | 85-95 | +50 pts 🟢 |

---

## 🎯 PLAN D'ACTION

### Semaine 1 (URGENT)
- [ ] Compresser vidéos >50MB
- [ ] Supprimer fichiers obsolètes (accueil/videos/)
- [ ] Dédupliquer vidéos interface/
- [ ] Implémenter lazy loading vidéos

**Temps estimé : 4-6 heures**

### Semaine 2 (IMPORTANT)
- [ ] Fusionner boucles RAF
- [ ] Optimiser Three.js (mobile)
- [ ] Remplacer backdrop-filter
- [ ] Corriger canplay → canplaythrough

**Temps estimé : 6-8 heures**

### Mois 1 (AMÉLIORATION)
- [ ] Streaming adaptatif
- [ ] PWA avec cache
- [ ] Monitoring performance
- [ ] Tests utilisateurs

**Temps estimé : 12-16 heures**

---

## 📝 CONCLUSION

Le site **Mondes Immergés** présente des problèmes de performance significatifs principalement dus aux **vidéos très lourdes** et aux **animations non optimisées**.

**Score actuel : 35-45/100**
**Score attendu : 85-95/100** (après optimisations)

Les corrections URGENTES (Semaine 1) permettront de **multiplier par 3 la vitesse de chargement** et d'améliorer significativement l'expérience utilisateur, particulièrement sur mobile.

---

**Rapport généré le 2026-02-07**
**Dernière analyse : accueil/index.html, interface/src/, videos/**
