// Point d'entrée principal de l'application Mondes Immergés - VERSION CORRIGÉE
import './styles/main.css';
import { initApp, getAppInstance } from './app.js';
import { jelly } from 'ldrs';

/**
 * Vérifie la compatibilité WebGL et configure les fallbacks
 */
function checkWebGLCompatibility() {
    console.log('🔍 Vérification de la compatibilité WebGL...');
    
    // Créer un canvas de test
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        console.error('❌ WebGL non supporté');
        showWebGLError();
        return false;
    }
    
    console.log('✅ Contexte WebGL créé avec succès');
    
    // Vérifier les informations WebGL
    console.log('📊 Informations WebGL:');
    console.log('  - Version:', gl.getParameter(gl.VERSION));
    console.log('  - Vendor:', gl.getParameter(gl.VENDOR));
    console.log('  - Renderer:', gl.getParameter(gl.RENDERER));
    console.log('  - Max Texture Size:', gl.getParameter(gl.MAX_TEXTURE_SIZE));
    console.log('  - Max Vertex Textures:', gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS));
    console.log('  - Max Fragment Textures:', gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS));
    
    // Vérifier les extensions nécessaires
    const supportedExtensions = gl.getSupportedExtensions();
    console.log('🔌 Extensions WebGL supportées:', supportedExtensions.length);
    
    const recommendedExtensions = [
        'OES_texture_float',
        'OES_texture_float_linear',
        'OES_standard_derivatives',
        'WEBGL_depth_texture'
    ];
    
    recommendedExtensions.forEach(ext => {
        if (supportedExtensions.includes(ext)) {
            console.log(`  ✅ ${ext}`);
        } else {
            console.warn(`  ⚠️  ${ext} non supportée (optionnelle)`);
        }
    });
    
    // Tester la compilation de shaders de base
    try {
        console.log('🎨 Test de compilation des shaders...');
        
        const testVertexShader = gl.createShader(gl.VERTEX_SHADER);
        const testFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        
        const vertexShaderSource = `
            attribute vec4 position;
            void main() {
                gl_Position = position;
            }
        `;
        
        const fragmentShaderSource = `
            #ifdef GL_ES
            precision mediump float;
            #endif
            void main() {
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
            }
        `;
        
        gl.shaderSource(testVertexShader, vertexShaderSource);
        gl.shaderSource(testFragmentShader, fragmentShaderSource);
        
        gl.compileShader(testVertexShader);
        gl.compileShader(testFragmentShader);
        
        if (!gl.getShaderParameter(testVertexShader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(testVertexShader);
            console.error('❌ Erreur vertex shader test:', error);
            return false;
        }
        
        if (!gl.getShaderParameter(testFragmentShader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(testFragmentShader);
            console.error('❌ Erreur fragment shader test:', error);
            return false;
        }
        
        console.log('✅ Compilation des shaders réussie');
        
        // Test de création d'un programme shader
        const testProgram = gl.createProgram();
        gl.attachShader(testProgram, testVertexShader);
        gl.attachShader(testProgram, testFragmentShader);
        gl.linkProgram(testProgram);
        
        if (!gl.getProgramParameter(testProgram, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(testProgram);
            console.error('❌ Erreur linkage programme test:', error);
            return false;
        }
        
        console.log('✅ Linkage du programme shader réussi');
        
        // Nettoyer les ressources de test
        gl.deleteShader(testVertexShader);
        gl.deleteShader(testFragmentShader);
        gl.deleteProgram(testProgram);
        
    } catch (error) {
        console.error('❌ Erreur lors du test de compilation des shaders:', error);
        return false;
    }
    
    // Vérifier les limites importantes
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (maxTextureSize < 2048) {
        console.warn('⚠️  Taille de texture limitée détectée:', maxTextureSize);
    }
    
    const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    if (maxVertexAttribs < 16) {
        console.warn('⚠️  Nombre d\'attributs vertex limité:', maxVertexAttribs);
    }
    
    console.log('🚀 WebGL compatible - Initialisation 3D possible');
    return true;
}

/**
 * Affiche un message d'erreur si WebGL n'est pas supporté
 */
function showWebGLError() {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.95);
        color: #ffcc00;
        padding: 40px;
        border-radius: 12px;
        text-align: center;
        font-family: 'Roboto Mono', monospace;
        z-index: 10000;
        border: 2px solid #ffcc00;
        max-width: 600px;
        box-shadow: 0 0 30px rgba(255, 204, 0, 0.3);
        backdrop-filter: blur(10px);
    `;
    
    errorDiv.innerHTML = `
        <div style="font-size: 3em; margin-bottom: 20px;">⚠️</div>
        <h2 style="margin-bottom: 20px; color: #ffcc00;">WebGL Non Supporté</h2>
        <p style="margin-bottom: 20px; line-height: 1.6; color: #e0e0e0;">
            Votre navigateur ne supporte pas WebGL ou l'accélération matérielle, 
            requis pour cette expérience immersive 3D.
        </p>
        <div style="text-align: left; margin: 25px 0; padding: 20px; background: rgba(255, 204, 0, 0.1); border-radius: 8px;">
            <h3 style="margin-bottom: 15px; color: #ffcc00;">Solutions recommandées:</h3>
            <ul style="color: #e0e0e0; line-height: 1.8;">
                <li>🔄 Mettre à jour votre navigateur vers la dernière version</li>
                <li>⚙️ Activer l'accélération matérielle dans les paramètres</li>
                <li>🌐 Utiliser Chrome, Firefox, Safari ou Edge récent</li>
                <li>🖥️ Vérifier que vos pilotes graphiques sont à jour</li>
                <li>🔌 Désactiver temporairement les extensions bloquant WebGL</li>
            </ul>
        </div>
        <div style="margin-top: 30px;">
            <button onclick="location.reload()" style="background: #ffcc00; color: #000; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-family: inherit; margin-right: 10px; font-weight: bold;">
                🔄 Réessayer
            </button>
            <button onclick="window.open('https://get.webgl.org/', '_blank')" style="background: transparent; color: #ffcc00; border: 2px solid #ffcc00; padding: 10px 22px; border-radius: 6px; cursor: pointer; font-family: inherit;">
                ℹ️ Test WebGL
            </button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
}

/**
 * Fonction principale d'initialisation
 * Gère le chargement des ressources et le démarrage de l'application
 */
function initialize() {
    console.log('🌊 Application Mondes Immergés en cours de chargement...');
    
    // NOUVEAU: Vérifier la compatibilité WebGL avant de continuer
    if (!checkWebGLCompatibility()) {
        console.error('❌ Initialisation interrompue - WebGL incompatible');
        return;
    }
    
    // Désactiver complètement toutes les interactions de glissement
    const style = document.createElement('style');
    style.textContent = `
        #main-container, #globe-container, canvas {
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            touch-action: none !important;
            -webkit-user-drag: none !important;
            -khtml-user-drag: none !important;
            -moz-user-drag: none !important;
            -o-user-drag: none !important;
            user-drag: none !important;
            -webkit-touch-callout: none !important;
            pointer-events: auto !important;
            cursor: none !important;
        }
    `;
    document.head.appendChild(style);
    
    // Masquer l'écran d'accueil dès le début
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
        welcomeScreen.classList.add('hidden');
    }
    
    // S'assurer que le conteneur principal est caché jusqu'à la fin de l'initialisation
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) {
        mainContainer.classList.add('hidden');
        mainContainer.style.opacity = '0';
    }
    
    // Variables pour suivre le chargement des ressources
    let resourcesLoaded = 0;
    const totalResources = 8;
    
    // Fonction de mise à jour de la progression
    const updateProgress = () => {
        resourcesLoaded++;
        const progress = Math.round((resourcesLoaded / totalResources) * 100);
        
        console.log(`📦 Ressource ${resourcesLoaded}/${totalResources} chargée (${progress}%)`);
        
        // Récupérer les éléments de progression
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.querySelector('.progress-text');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${progress}%`;
        }
        
        // Si toutes les ressources sont chargées, démarrer l'application
        if (resourcesLoaded >= totalResources) {
            console.log('✅ Toutes les ressources chargées - Démarrage de l\'application');
            startApplication();
        }
    };
    
    // Simuler le chargement des ressources
    const resourceTypes = [
        'Configuration système',
        'Textures globe',
        'Vidéos des zones',
        'Données géographiques',
        'Interfaces utilisateur',
        'Modèles 3D',
        'Données scientifiques',
        'Effets visuels'
    ];
    
    // Simuler le chargement progressif avec vérifications
    resourceTypes.forEach((resource, index) => {
        const delay = 150 + Math.random() * 250;
        setTimeout(() => {
            console.log(`📦 Ressource chargée: ${resource}`);
            updateProgress();
        }, delay * (index + 1));
    });
    
    // Créer un arrière-plan étoilé pour le conteneur principal
    createStarfieldAnimation();
}

/**
 * Crée une animation d'étoiles en arrière-plan
 */
function createStarfieldAnimation() {
    const mainContainer = document.getElementById('main-container');
    
    if (!mainContainer) return;
    
    // Vérifier si l'élément étoilé existe déjà
    if (mainContainer.querySelector('.starry-background')) {
        return;
    }
    
    // Créer un élément pour l'arrière-plan étoilé
    const starryBg = document.createElement('div');
    starryBg.className = 'starry-background';
    starryBg.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
    `;
    mainContainer.appendChild(starryBg);
    
    // Ajouter des étoiles animées
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // Propriétés aléatoires
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 2 + 1;
        const opacity = Math.random() * 0.7 + 0.3;
        const duration = Math.random() * 5 + 3;
        const delay = Math.random() * 3;
        
        star.style.cssText = `
            position: absolute;
            left: ${x}%;
            top: ${y}%;
            width: ${size}px;
            height: ${size}px;
            background-color: rgba(255, 255, 255, ${opacity});
            border-radius: 50%;
            animation: starTwinkle ${duration}s ease-in-out ${delay}s infinite;
            pointer-events: none;
        `;
        
        starryBg.appendChild(star);
    }
}

/**
 * Démarre l'application principale et masque l'écran de chargement
 */
function startApplication() {
    console.log('🚀 Démarrage de l\'application...');
    
    try {
        // Initialiser l'application
        initApp();
        
        // Récupérer l'instance de l'application
        const app = getAppInstance();
        
        if (!app) {
            throw new Error('Impossible de récupérer l\'instance de l\'application');
        }
        
        console.log('✅ Application initialisée avec succès');
        
        // Court délai avant la séquence d'initialisation
        setTimeout(() => {
            triggerStartupSequence(app);
        }, 300);
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de l\'application:', error);
        showApplicationError(error);
    }
}

/**
 * Affiche une erreur d'application
 */
function showApplicationError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.95);
        color: #ff6b6b;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        font-family: 'Roboto Mono', monospace;
        z-index: 10000;
        border: 2px solid #ff6b6b;
        max-width: 500px;
        box-shadow: 0 0 30px rgba(255, 107, 107, 0.3);
    `;
    
    errorDiv.innerHTML = `
        <div style="font-size: 2em; margin-bottom: 20px;">💥</div>
        <h2 style="margin-bottom: 20px;">Erreur d'Application</h2>
        <p style="margin-bottom: 20px; line-height: 1.6;">
            Une erreur s'est produite lors de l'initialisation de l'application.
        </p>
        <details style="margin: 20px 0; text-align: left;">
            <summary style="cursor: pointer; margin-bottom: 10px;">Détails techniques</summary>
            <code style="background: rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 5px; display: block; font-size: 12px; overflow-wrap: break-word;">
                ${error.message || error}
            </code>
        </details>
        <button onclick="location.reload()" style="background: #ff6b6b; color: #fff; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-family: inherit; margin-top: 10px;">
            🔄 Recharger la page
        </button>
    `;
    
    document.body.appendChild(errorDiv);
}

/**
 * Déclenche la séquence d'initialisation, puis démarre l'exploration
 * @param {Object} app - Instance de l'application
 */
function triggerStartupSequence(app) {
    console.log('🎬 Démarrage de la séquence d\'initialisation...');
    
    // Masquer l'écran de chargement
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            
            // Rendre le conteneur principal visible
            const mainContainer = document.getElementById('main-container');
            if (mainContainer) {
                mainContainer.classList.remove('hidden');
                mainContainer.style.opacity = '1';
            }
            
            console.log('🎭 Conteneur principal rendu visible');
            
            // Démarrer la séquence d'initialisation
            if (app.startupSequence && typeof app.startupSequence === 'function') {
                console.log('🚀 Lancement de la séquence de démarrage...');
                app.startupSequence();
                
                // Après la séquence, lancer l'exploration
                setTimeout(() => {
                    console.log('🌊 Démarrage de l\'exploration...');
                    app.startExploration(true);
                }, 5000);
            } else {
                // Fallback si la méthode n'existe pas
                console.log('⚠️  Méthode startupSequence non trouvée, démarrage direct');
                app.startExploration(true);
            }
        }, 500);
    } else {
        // Fallback si l'écran de chargement n'existe pas
        console.log('⚠️  Écran de chargement non trouvé, démarrage direct');
        app.startExploration(true);
    }
}

/**
 * Améliore l'écran de chargement avec un spinner moderne et une barre de progression
 */
function enhanceLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    
    if (!loadingScreen) {
        console.warn('⚠️  Écran de chargement non trouvé');
        return;
    }
    
    // Vérifier si déjà amélioré
    if (loadingScreen.querySelector('.progress-container')) {
        console.log('🔄 Écran de chargement déjà amélioré');
        return;
    }
    
    console.log('✨ Amélioration de l\'écran de chargement...');
    
    // Supprimer l'ancien spinner s'il existe
    const existingSpinner = loadingScreen.querySelector('.spinner');
    if (existingSpinner) {
        existingSpinner.remove();
    }
    
    // Enregistrer et créer l'icône Jelly
    try {
        jelly.register();
        
        const customSpinner = document.createElement('l-jelly');
        customSpinner.setAttribute('size', '60');
        customSpinner.setAttribute('speed', '0.9');
        customSpinner.setAttribute('color', '#ffcc00');
        customSpinner.style.cssText = `
            margin-bottom: 30px;
            display: block;
        `;

        // Insérer le spinner
        const loadingText = loadingScreen.querySelector('p');
        if (loadingText) {
            loadingScreen.insertBefore(customSpinner, loadingText);
        } else {
            loadingScreen.appendChild(customSpinner);
        }
        
        console.log('✅ Spinner Jelly ajouté avec succès');
    } catch (error) {
        console.warn('⚠️  Impossible de charger le spinner Jelly, utilisation du spinner CSS par défaut');
        console.error('Détails de l\'erreur Jelly:', error);
        
        // Créer un spinner CSS de fallback
        const fallbackSpinner = document.createElement('div');
        fallbackSpinner.className = 'spinner';
        const loadingText = loadingScreen.querySelector('p');
        if (loadingText) {
            loadingScreen.insertBefore(fallbackSpinner, loadingText);
        } else {
            loadingScreen.appendChild(fallbackSpinner);
        }
    }
    
    // Créer la barre de progression
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    const progressText = document.createElement('div');
    progressText.className = 'progress-text';
    progressText.textContent = '0%';
    
    // Assembler les éléments
    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);
    loadingScreen.appendChild(progressContainer);
    
    console.log('📊 Barre de progression ajoutée');
}

/**
 * Initialise le curseur personnalisé - VERSION SIMPLIFIÉE ET ROBUSTE
 */
function initCustomCursor() {
    console.log('🖱️  Initialisation curseur personnalisé...');
    
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');

    if (!cursor || !follower) {
        console.log('⚠️  Éléments curseur non trouvés');
        return;
    }

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let followerX = 0;
    let followerY = 0;

    // Suivre la position de la souris
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Animation fluide du curseur
    function animateCursor() {
        // Curseur principal - suit directement
        cursorX = mouseX;
        cursorY = mouseY;
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';

        // Curseur suiveur - avec un léger délai
        followerX += (mouseX - followerX) * 0.1;
        followerY += (mouseY - followerY) * 0.1;
        follower.style.left = followerX + 'px';
        follower.style.top = followerY + 'px';

        requestAnimationFrame(animateCursor);
    }

    // Gérer les effets de survol
    const interactiveElements = document.querySelectorAll('button, a, [data-interactive]');
    
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
            follower.classList.add('hover');
        });
        
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
            follower.classList.remove('hover');
        });
    });

    // Démarrer l'animation
    animateCursor();

    console.log('✅ Curseur personnalisé initialisé avec succès');
}

// Initialisation quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM chargé - Initialisation de l\'application');
    
    // Améliorer l'écran de chargement
    enhanceLoadingScreen();
    
    // Initialiser le curseur
    initCustomCursor();
    
    // Démarrer l'initialisation principale après un court délai
    setTimeout(() => {
        console.log('⏰ Début de l\'initialisation principale...');
        initialize();
    }, 100);
});

// Gérer les erreurs globales
window.addEventListener('error', (e) => {
    console.error('❌ Erreur globale capturée:', e.error);
    console.error('  - Message:', e.message);
    console.error('  - Fichier:', e.filename);
    console.error('  - Ligne:', e.lineno);
    console.error('  - Colonne:', e.colno);
});

// Gérer les erreurs de promesses non capturées
window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Promesse rejetée non gérée:', e.reason);
    e.preventDefault(); // Éviter que l'erreur apparaisse dans la console du navigateur
});

// Gérer les erreurs de ressources (images, scripts, etc.)
window.addEventListener('error', (e) => {
    if (e.target !== window) {
        console.error('❌ Erreur de ressource:', e.target.src || e.target.href);
    }
}, true);

// Export pour utilisation dans d'autres modules
export { initialize, createStarfieldAnimation, initCustomCursor };