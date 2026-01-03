// Point d'entrée principal de l'application Mondes Immergés - VERSION OPTIMISÉE
import './styles/main.css';
import { initApp, getAppInstance } from './app.js';
import { jelly } from 'ldrs';

// État global de l'application
const APP_STATE = {
    initialized: false,
    webGLChecked: false,
    domReady: false,
    appStarted: false,
    cleanupDone: false
};

/**
 * Vérifie la compatibilité WebGL de manière optimisée
 */
function checkWebGLCompatibility() {
    if (APP_STATE.webGLChecked) {
        return true;
    }

    console.log('🔍 Vérification WebGL...');

    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
            console.error('❌ WebGL non supporté');
            showWebGLError();
            APP_STATE.webGLChecked = false;
            return false;
        }

        console.log('✅ WebGL compatible');
        APP_STATE.webGLChecked = true;

        // Libérer les ressources immédiatement
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();

        return true;
    } catch (error) {
        console.error('❌ Erreur vérification WebGL:', error);
        return false;
    }
}

/**
 * Affiche une erreur WebGL de manière simple
 */
function showWebGLError() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div style="text-align: center; color: #ffcc00; font-family: 'Roboto Mono', monospace;">
                <div style="font-size: 3em; margin-bottom: 20px;">⚠️</div>
                <h2 style="margin-bottom: 20px;">WebGL Non Supporté</h2>
                <p style="margin-bottom: 20px;">Votre navigateur ne supporte pas WebGL.</p>
                <button onclick="location.reload()" style="background: #ffcc00; color: #000; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    🔄 Réessayer
                </button>
            </div>
        `;
    }
}

/**
 * Initialise le spinner de chargement
 */
function initLoadingSpinner() {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;

    // Supprimer l'ancien contenu
    const oldSpinner = loadingScreen.querySelector('.spinner');
    if (oldSpinner) {
        oldSpinner.remove();
    }

    try {
        jelly.register();

        const spinner = document.createElement('l-jelly');
        spinner.setAttribute('size', '60');
        spinner.setAttribute('speed', '0.9');
        spinner.setAttribute('color', '#ffcc00');

        loadingScreen.insertBefore(spinner, loadingScreen.firstChild);
        console.log('✅ Spinner initialisé');
    } catch (error) {
        console.warn('⚠️  Fallback spinner CSS');
        const fallbackSpinner = document.createElement('div');
        fallbackSpinner.className = 'spinner';
        loadingScreen.insertBefore(fallbackSpinner, loadingScreen.firstChild);
    }
}

/**
 * Initialise le curseur personnalisé de manière optimisée
 */
function initCustomCursor() {
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');

    if (!cursor || !follower) return;

    let mouseX = 0;
    let mouseY = 0;
    let followerX = 0;
    let followerY = 0;
    let rafId = null;

    // Un seul écouteur de mouvement
    const handleMouseMove = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Animation optimisée avec RAF
    function animate() {
        // Curseur principal
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';

        // Curseur suiveur avec interpolation
        followerX += (mouseX - followerX) * 0.1;
        followerY += (mouseY - followerY) * 0.1;
        follower.style.left = followerX + 'px';
        follower.style.top = followerY + 'px';

        rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);

    // Nettoyage
    window.addEventListener('beforeunload', () => {
        if (rafId) cancelAnimationFrame(rafId);
        document.removeEventListener('mousemove', handleMouseMove);
    });

    console.log('✅ Curseur initialisé');
}

/**
 * Démarre l'application de manière fluide
 */
async function startApplication() {
    if (APP_STATE.appStarted) {
        console.warn('⚠️  Application déjà démarrée');
        return;
    }

    console.log('🚀 Démarrage application...');
    APP_STATE.appStarted = true;

    try {
        // Initialiser l'app
        initApp();

        const app = getAppInstance();
        if (!app) {
            throw new Error('Instance application non disponible');
        }

        console.log('✅ Application initialisée');

        // NE PAS masquer l'écran de chargement encore
        // Juste cacher le spinner jelly
        hideJellySpinner();

        // Afficher le conteneur principal en arrière-plan (transparent pour l'instant)
        prepareMainContainer();

        // Démarrer la séquence qui va créer l'effet orbital
        // sur l'écran de chargement toujours visible
        setTimeout(() => {
            if (app.startupSequence && typeof app.startupSequence === 'function') {
                console.log('🎬 Séquence de démarrage...');
                // Passer la fonction de fin au startupSequence
                app.startupSequence(() => {
                    // Cette fonction sera appelée quand l'orbital loader apparaît
                    hideLoadingScreenGradually();

                    // CRITIQUE: Démarrer l'exploration APRÈS la fin complète de la transition (6s)
                    // pour éviter le freeze pendant la transition
                    setTimeout(() => {
                        console.log('🌊 Démarrage exploration...');
                        app.startExploration(true);
                    }, 6500);

                    // Faire apparaître les éléments UI 1 seconde APRÈS la fin de la transition (7s total)
                    setTimeout(() => {
                        showInterfaceElements();
                    }, 7000);
                });
            } else {
                console.log('🌊 Démarrage direct...');
                hideLoadingScreenGradually();
                setTimeout(() => {
                    app.startExploration(true);
                }, 6500);
                setTimeout(() => {
                    showInterfaceElements();
                }, 7000);
            }
        }, 300);

    } catch (error) {
        console.error('❌ Erreur application:', error);
        showError(error);
    }
}

/**
 * Cache uniquement le spinner jelly, garde l'écran de chargement
 */
function hideJellySpinner() {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;

    // Cacher juste le spinner jelly
    const jellySpinner = loadingScreen.querySelector('l-jelly');
    const fallbackSpinner = loadingScreen.querySelector('.spinner');

    if (jellySpinner) {
        jellySpinner.style.transition = 'opacity 0.3s ease';
        jellySpinner.style.opacity = '0';
        setTimeout(() => jellySpinner.remove(), 300);
    }
    if (fallbackSpinner) {
        fallbackSpinner.style.transition = 'opacity 0.3s ease';
        fallbackSpinner.style.opacity = '0';
        setTimeout(() => fallbackSpinner.remove(), 300);
    }

    console.log('✅ Spinner caché, fond noir conservé');
}

/**
 * Prépare le conteneur principal (invisible pour l'instant)
 * ET initialise l'interface en mode "clear" (tous les éléments UI cachés)
 */
function prepareMainContainer() {
    const mainContainer = document.getElementById('main-container');
    if (!mainContainer) return;

    mainContainer.classList.remove('hidden');
    // Le laisser à opacity 0 pour l'instant
    mainContainer.style.opacity = '0';
    mainContainer.style.transition = 'opacity 1s cubic-bezier(0.19, 1, 0.22, 1)';

    // Initialiser l'interface en mode "clear" - tous les éléments UI cachés
    const uiControls = document.getElementById('ui-controls');
    const huds = document.querySelectorAll('.satellite-hud, .coordinates-display');
    const crosshair = document.querySelector('.satellite-crosshair');

    if (uiControls) {
        uiControls.style.opacity = '0';
        uiControls.style.transform = 'translateY(20px)';
        uiControls.style.pointerEvents = 'none';
    }

    huds.forEach(hud => {
        hud.style.opacity = '0';
    });

    if (crosshair) {
        crosshair.style.opacity = '0';
    }

    console.log('✅ Interface initialisée en mode clear');
}

/**
 * Fait apparaître les éléments de l'interface avec animation
 * Appelé 1 seconde après la fin de la transition du fond noir
 */
function showInterfaceElements() {
    const uiControls = document.getElementById('ui-controls');
    const huds = document.querySelectorAll('.satellite-hud, .coordinates-display');
    const crosshair = document.querySelector('.satellite-crosshair');

    console.log('✨ Apparition des éléments UI');

    // Réactiver les interactions
    if (uiControls) {
        uiControls.style.pointerEvents = 'auto';
    }

    // Utiliser GSAP pour l'animation si disponible, sinon CSS
    if (window.gsap) {
        if (uiControls) {
            gsap.to(uiControls, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power2.out"
            });
        }

        gsap.to([...huds, crosshair].filter(Boolean), {
            opacity: 1,
            duration: 0.8,
            ease: "power2.out"
        });
    } else {
        // Fallback CSS
        if (uiControls) {
            uiControls.style.transition = 'all 0.8s ease';
            uiControls.style.opacity = '1';
            uiControls.style.transform = 'translateY(0)';
        }

        huds.forEach(hud => {
            hud.style.transition = 'opacity 0.8s ease';
            hud.style.opacity = '1';
        });

        if (crosshair) {
            crosshair.style.transition = 'opacity 0.8s ease';
            crosshair.style.opacity = '1';
        }
    }
}

/**
 * Masque progressivement l'écran de chargement
 * La durée doit correspondre à toute la durée de l'orbital loader
 * (duration=4s + fade=2s = 6s total)
 */
function hideLoadingScreenGradually() {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;

    console.log('🌑 Début transition fond noir (100% → 0% sur 6s)');

    // Transition progressive sur 6 secondes pour synchroniser avec l'orbital loader
    loadingScreen.style.transition = 'opacity 6s cubic-bezier(0.19, 1, 0.22, 1)';
    loadingScreen.style.opacity = '0';

    // Afficher progressivement le conteneur principal pendant la transition
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) {
        setTimeout(() => {
            mainContainer.style.opacity = '1';
        }, 2000);
    }

    // Nettoyer après la transition complète
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        loadingScreen.classList.add('hidden');
        console.log('✅ Écran de chargement complètement masqué');
    }, 6000);
}

/**
 * Masque l'écran de chargement avec transition fluide (deprecated)
 */
function hideLoadingScreen() {
    // Cette fonction n'est plus utilisée mais conservée pour compatibilité
    return Promise.resolve();
}

/**
 * Affiche le conteneur principal
 */
function showMainContainer() {
    const mainContainer = document.getElementById('main-container');
    if (!mainContainer) return;

    mainContainer.classList.remove('hidden');
    mainContainer.style.transition = 'opacity 0.7s cubic-bezier(0.19, 1, 0.22, 1)';

    // Force reflow pour la transition
    mainContainer.offsetHeight;

    mainContainer.style.opacity = '1';
    console.log('✅ Conteneur principal visible');
}

/**
 * Affiche une erreur
 */
function showError(error) {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;

    loadingScreen.innerHTML = `
        <div style="text-align: center; color: #ff6b6b; font-family: 'Roboto Mono', monospace; padding: 40px;">
            <div style="font-size: 2em; margin-bottom: 20px;">💥</div>
            <h2 style="margin-bottom: 20px;">Erreur</h2>
            <p style="margin-bottom: 20px;">Une erreur s'est produite.</p>
            <button onclick="location.reload()" style="background: #ff6b6b; color: #fff; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
                🔄 Recharger
            </button>
        </div>
    `;
}

/**
 * Préparation initiale de l'environnement
 */
function prepareEnvironment() {
    // Masquer l'écran d'accueil
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
        welcomeScreen.classList.add('hidden');
    }

    // Préparer le conteneur principal (caché au départ)
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) {
        mainContainer.classList.add('hidden');
        mainContainer.style.opacity = '0';
    }

    // Style pour désactiver la sélection et le drag
    const style = document.createElement('style');
    style.textContent = `
        #main-container, #globe-container, canvas {
            user-select: none !important;
            touch-action: none !important;
            -webkit-user-drag: none !important;
            pointer-events: auto !important;
            cursor: none !important;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Initialisation principale
 */
function initialize() {
    if (APP_STATE.initialized) {
        console.warn('⚠️  Déjà initialisé');
        return;
    }

    console.log('🌊 Initialisation Mondes Immergés...');
    APP_STATE.initialized = true;

    // Vérifier WebGL
    if (!checkWebGLCompatibility()) {
        return;
    }

    // Préparer l'environnement
    prepareEnvironment();

    // Initialiser le spinner
    initLoadingSpinner();

    // Simulation de chargement simplifiée
    let progress = 0;
    const interval = setInterval(() => {
        progress += 12.5;

        if (progress >= 100) {
            clearInterval(interval);
            console.log('✅ Chargement terminé');

            // Petit délai avant de démarrer l'app
            setTimeout(() => {
                startApplication();
            }, 300);
        }
    }, 200);
}

/**
 * Nettoyage des ressources à la fermeture
 */
function cleanup() {
    if (APP_STATE.cleanupDone) return;

    console.log('🧹 Nettoyage des ressources...');
    APP_STATE.cleanupDone = true;

    // Le nettoyage spécifique se fait dans les écouteurs individuels
}

// Point d'entrée principal - UN SEUL écouteur DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    if (APP_STATE.domReady) {
        console.warn('⚠️  DOM déjà prêt');
        return;
    }

    console.log('📄 DOM chargé');
    APP_STATE.domReady = true;

    // Initialiser le curseur
    initCustomCursor();

    // Démarrer l'initialisation
    setTimeout(() => {
        initialize();
    }, 100);
});

// UN SEUL écouteur d'erreurs global
window.addEventListener('error', (e) => {
    // Ignorer les erreurs de ressources externes
    if (e.target !== window && (e.target.tagName === 'IMG' || e.target.tagName === 'SCRIPT')) {
        console.warn('⚠️  Ressource non chargée:', e.target.src || e.target.href);
        return;
    }

    console.error('❌ Erreur:', e.message);
}, { once: false, capture: true });

// UN SEUL écouteur pour les promesses rejetées
window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Promesse rejetée:', e.reason);
    e.preventDefault();
}, { once: false });

// Nettoyage avant déchargement
window.addEventListener('beforeunload', cleanup, { once: true });

// Export
export { initialize, initCustomCursor };
