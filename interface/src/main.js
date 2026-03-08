// Point d'entrée principal de l'application Mondes Immergés - VERSION OPTIMISÉE
import './styles/main.css';
import { initApp, getAppInstance } from './app.js';
import { videoManager } from './utils/VideoManager.js';
// ldrs (jelly loader) est chargé via script tag dans index.html

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

    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
            showWebGLError();
            APP_STATE.webGLChecked = false;
            return false;
        }

        APP_STATE.webGLChecked = true;

        // Libérer les ressources immédiatement
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();

        return true;
    } catch (error) {
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
 * NOTE: Le jelly loader est déjà dans le HTML, cette fonction n'est plus utilisée
 */
function initLoadingSpinner() {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;

    // Supprimer l'ancien contenu
    const oldSpinner = loadingScreen.querySelector('.spinner');
    if (oldSpinner) {
        oldSpinner.remove();
    }

    // Le jelly loader est déjà dans le HTML via <l-jelly>
}

/**
 * Initialise le curseur personnalisé de manière optimisée - VERSION PROFESSIONNELLE
 */
function initCustomCursor() {
    // Désactiver sur mobile pour économiser ressources
    const isMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
        return;
    }

    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');

    if (!cursor || !follower) return;

    let mouseX = 0;
    let mouseY = 0;
    let followerX = 0;
    let followerY = 0;
    let rafId = null;

    // Throttle pour mousemove (60fps max)
    let lastMoveTime = 0;
    const moveThrottle = 16; // ~60fps

    const handleMouseMove = (e) => {
        const now = performance.now();
        if (now - lastMoveTime < moveThrottle) return;
        lastMoveTime = now;

        mouseX = e.clientX;
        mouseY = e.clientY;
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Animation optimisée avec RAF et transform (plus performant)
    function animate() {
        // Curseur principal - utiliser transform au lieu de left/top
        cursor.style.transform = `translate(${mouseX}px, ${mouseY}px)`;

        // Curseur suiveur avec interpolation
        followerX += (mouseX - followerX) * 0.1;
        followerY += (mouseY - followerY) * 0.1;
        follower.style.transform = `translate(${followerX}px, ${followerY}px)`;

        rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);

    // Nettoyage
    window.addEventListener('beforeunload', () => {
        if (rafId) cancelAnimationFrame(rafId);
        document.removeEventListener('mousemove', handleMouseMove);
    }, { once: true });
}

/**
 * Joue la vidéo de transition après le préchargement
 */
async function playTransitionVideo() {
    return new Promise((resolve) => {
        const jellyLoader = document.querySelector('l-jelly');
        const transitionVideo = document.getElementById('transition-video-in');
        const loadingScreen = document.getElementById('loading-screen');
        const mainContainer = document.getElementById('main-container');

        if (!transitionVideo) {
            resolve();
            return;
        }

        // Cacher le jelly loader
        if (jellyLoader) {
            jellyLoader.style.transition = 'opacity 0.3s ease';
            jellyLoader.style.opacity = '0';
            setTimeout(() => jellyLoader.remove(), 300);
        }

        // IMPORTANT: Afficher le globe IMMÉDIATEMENT
        if (mainContainer) {
            mainContainer.style.opacity = '1';
        }

        // IMPORTANT: Rendre le loading-screen transparent (garder la vidéo visible)
        if (loadingScreen) {
            loadingScreen.style.background = 'transparent';
        }

        // Enregistrer la vidéo de transition avec le VideoManager
        videoManager.register(transitionVideo, {
            loop: false, // Ne pas boucler les transitions
            muted: true,
            autoRetry: true,
            name: 'transition-video-in'
        });

        // Activer la vidéo de transition - EXACTEMENT comme accueil
        transitionVideo.classList.add('active');
        transitionVideo.currentTime = 0;

        // Lancer la vidéo
        transitionVideo.play().then(() => {
            // Écouter la fin de la vidéo pour terminer la transition
            transitionVideo.addEventListener('ended', function() {
                transitionVideo.classList.remove('active');

                // Cacher le loading-screen APRÈS la vidéo
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                    loadingScreen.classList.add('hidden');
                }

                setTimeout(() => resolve(), 300);
            }, { once: true });

        }).catch(e => {
            transitionVideo.classList.remove('active');
            resolve();
        });

        // Timeout de sécurité basé sur la durée de la vidéo
        transitionVideo.addEventListener('loadedmetadata', function() {
            const videoDuration = transitionVideo.duration;

            // Timeout = durée vidéo + 2 secondes de sécurité
            setTimeout(() => {
                if (transitionVideo.classList.contains('active')) {
                    transitionVideo.classList.remove('active');
                    resolve();
                }
            }, (videoDuration + 2) * 1000);
        }, { once: true });

        // Fallback ultime : 15 secondes
        setTimeout(() => {
            if (transitionVideo.classList.contains('active')) {
                transitionVideo.classList.remove('active');
                resolve();
            }
        }, 15000);
    });
}

/**
 * Démarre l'application de manière fluide
 */
async function startApplication() {
    if (APP_STATE.appStarted) {
        return;
    }

    APP_STATE.appStarted = true;

    try {
        // Initialiser l'app
        initApp();

        const app = getAppInstance();
        if (!app) {
            throw new Error('Instance application non disponible');
        }

        // Afficher le conteneur principal en arrière-plan (transparent pour l'instant)
        prepareMainContainer();

        // CRITIQUE: Précharger TOUS les assets avant de continuer
        if (app.globeManager && app.globeManager.preloadAllAssets) {
            await app.globeManager.preloadAllAssets();
        }

        // Afficher et jouer la vidéo de transition
        // Le globe devient visible dès que la vidéo commence (géré dans playTransitionVideo)
        await playTransitionVideo();

        // Démarrer l'exploration et afficher l'interface immédiatement
        app.startExploration(true);

        // Afficher les éléments UI immédiatement
        showInterfaceElements(app);

    } catch (error) {
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
    const scannerEffect = document.querySelector('.scanner-effect');

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

    if (scannerEffect) {
        scannerEffect.style.opacity = '0';
    }

}

/**
 * Fait apparaître les éléments de l'interface avec animation
 * Appelé 0.25s après la fin de la transition du fond noir
 * Inclut les HUD, crosshair, contrôles, scanner, hotspots ET leurs traits jaunes (connector lines)
 * @param {Object} appInstance - L'instance de l'application pour accéder au GlobeManager
 */
function showInterfaceElements(appInstance) {
    const uiControls = document.getElementById('ui-controls');
    const huds = document.querySelectorAll('.satellite-hud, .coordinates-display');
    const crosshair = document.querySelector('.satellite-crosshair');
    const hotspotLabels = document.querySelectorAll('.hotspot-label');
    const connectorSvgs = document.querySelectorAll('svg'); // Tous les SVG sont des connector lines
    const scannerEffect = document.querySelector('.scanner-effect');

    // IMPORTANT: Activer l'affichage des labels dans le GlobeManager
    if (appInstance && appInstance.globeManager) {
        appInstance.globeManager.showLabels();
    }

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

        // Animer tous les éléments UI
        gsap.to([...huds, crosshair, scannerEffect].filter(Boolean), {
            opacity: 1,
            duration: 0.8,
            ease: "power2.out"
        });

        // Animer les hotspots ET leurs connector lines en même temps
        gsap.to([...hotspotLabels, ...connectorSvgs], {
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

        if (scannerEffect) {
            scannerEffect.style.transition = 'opacity 0.8s ease';
            scannerEffect.style.opacity = '1';
        }

        hotspotLabels.forEach(label => {
            label.style.transition = 'opacity 0.8s ease';
            label.style.opacity = '1';
        });

        connectorSvgs.forEach(svg => {
            svg.style.transition = 'opacity 0.8s ease';
            svg.style.opacity = '1';
        });
    }
}

/**
 * Masque progressivement l'écran de chargement
 * La durée correspond à la durée de l'orbital loader (4s)
 * L'interface (globe) est affichée IMMÉDIATEMENT derrière le fond noir
 */
function hideLoadingScreenGradually() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainContainer = document.getElementById('main-container');

    if (!loadingScreen) return;

    // IMPORTANT: Afficher l'interface (globe, espace) IMMÉDIATEMENT
    // Elle sera visible derrière le fond noir qui disparaît progressivement
    if (mainContainer) {
        mainContainer.style.opacity = '1';
    }

    // Transition progressive sur 2.5 secondes (durée réduite)
    loadingScreen.style.transition = 'opacity 2.5s cubic-bezier(0.19, 1, 0.22, 1)';
    loadingScreen.style.opacity = '0';

    // Nettoyer après la transition complète
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        loadingScreen.classList.add('hidden');
    }, 2500);
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

    // PERF FIX: Add id to <style> to prevent duplicate injections
    if (document.getElementById('env-no-select-style')) return;
    const style = document.createElement('style');
    style.id = 'env-no-select-style';
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
        return;
    }

    APP_STATE.initialized = true;

    // Vérifier WebGL
    if (!checkWebGLCompatibility()) {
        return;
    }

    // Préparer l'environnement
    prepareEnvironment();

    // Le spinner jelly est déjà dans le HTML - pas besoin de l'initialiser

    // Simulation de chargement simplifiée
    let progress = 0;
    const interval = setInterval(() => {
        progress += 12.5;

        if (progress >= 100) {
            clearInterval(interval);

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

    APP_STATE.cleanupDone = true;

    // PERF FIX: Call app.destroy() to clean up all intervals, rAF loops, and listeners
    const app = getAppInstance();
    if (app && app.destroy) {
        app.destroy();
    }
}

// Point d'entrée principal - UN SEUL écouteur DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    if (APP_STATE.domReady) {
        return;
    }

    APP_STATE.domReady = true;

    // Initialiser le curseur
    initCustomCursor();

    // Démarrer l'initialisation
    setTimeout(() => {
        initialize();
    }, 100);
});

// PERF FIX: Log errors instead of silently swallowing them — makes debugging possible
window.addEventListener('error', (e) => {
    // Ignorer les erreurs de ressources externes
    if (e.target !== window && (e.target.tagName === 'IMG' || e.target.tagName === 'SCRIPT')) {
        return;
    }
    console.warn('[MondesImmerges Error]', e.error || e.message);
}, { once: false, capture: true });

// PERF FIX: Log unhandled rejections instead of swallowing them
window.addEventListener('unhandledrejection', (e) => {
    console.warn('[MondesImmerges Rejection]', e.reason);
}, { once: false });

// Nettoyage avant déchargement
window.addEventListener('beforeunload', cleanup, { once: true });

// Corriger le bug de retour depuis les pages collection
// Recharger la page si elle vient du cache (bouton retour)
window.addEventListener('pageshow', (event) => {
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        window.location.reload();
    }
});

// Export
export { initialize, initCustomCursor };
