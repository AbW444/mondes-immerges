/**
 * TransitionManager - Gestionnaire centralisé des transitions de chargement
 * Gère de manière professionnelle toutes les transitions IN/OUT du site
 *
 * @author National Geographic - Mondes Immergés
 * @version 2.0.0
 */

import { jelly } from 'ldrs';

export class TransitionManager {
    constructor() {
        this.video = null;
        this.loadingScreen = null;
        this.jellySpinner = null;
        this.isTransitioning = false;

        // Configuration
        this.config = {
            videoPath: 'videos/anim-logo-transition.webm',
            jellySize: 120,
            jellyColor: '#ffcc00',
            transitionDuration: 500,
            videoFadeDuration: 300
        };

        this.initialize();
    }

    /**
     * Initialise le gestionnaire de transitions
     */
    initialize() {
        console.log('🎬 Initialisation du TransitionManager');

        // Enregistrer le composant jelly
        try {
            jelly.register();
        } catch (e) {
            console.warn('⚠️ Jelly déjà enregistré');
        }

        // Créer les éléments nécessaires
        this.createTransitionElements();

        console.log('✅ TransitionManager initialisé');
    }

    /**
     * Crée les éléments HTML pour les transitions
     */
    createTransitionElements() {
        // Créer l'écran de chargement s'il n'existe pas
        this.loadingScreen = document.getElementById('transition-loading-screen');
        if (!this.loadingScreen) {
            this.loadingScreen = document.createElement('div');
            this.loadingScreen.id = 'transition-loading-screen';
            this.loadingScreen.className = 'transition-loading-screen';
            this.loadingScreen.innerHTML = `
                <div class="loading-content">
                    <div class="jelly-container"></div>
                    <p class="loading-text">CHARGEMENT EN COURS...</p>
                </div>
            `;
            document.body.appendChild(this.loadingScreen);
        }

        // Créer le spinner jelly
        const jellyContainer = this.loadingScreen.querySelector('.jelly-container');
        if (jellyContainer && !jellyContainer.querySelector('l-jelly')) {
            this.jellySpinner = document.createElement('l-jelly');
            this.jellySpinner.setAttribute('size', this.config.jellySize);
            this.jellySpinner.setAttribute('speed', '0.9');
            this.jellySpinner.setAttribute('color', this.config.jellyColor);
            jellyContainer.appendChild(this.jellySpinner);
        }

        // Créer l'élément vidéo s'il n'existe pas
        this.video = document.getElementById('transition-video');
        if (!this.video) {
            this.video = document.createElement('video');
            this.video.id = 'transition-video';
            this.video.className = 'transition-video';
            this.video.muted = true;
            this.video.playsInline = true;
            this.video.preload = 'auto';
            this.video.innerHTML = `<source src="${this.config.videoPath}" type="video/webm">`;
            document.body.appendChild(this.video);
        }
    }

    /**
     * Affiche l'écran de chargement avec le jelly
     * @param {string} text - Texte à afficher
     */
    showLoadingScreen(text = 'CHARGEMENT EN COURS...') {
        if (!this.loadingScreen) return;

        const loadingText = this.loadingScreen.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = text;
        }

        this.loadingScreen.classList.add('active');
        this.loadingScreen.style.opacity = '1';
        this.loadingScreen.style.pointerEvents = 'all';
    }

    /**
     * Masque l'écran de chargement
     */
    hideLoadingScreen() {
        if (!this.loadingScreen) return;

        return new Promise(resolve => {
            this.loadingScreen.style.opacity = '0';

            setTimeout(() => {
                this.loadingScreen.classList.remove('active');
                this.loadingScreen.style.pointerEvents = 'none';
                resolve();
            }, this.config.transitionDuration);
        });
    }

    /**
     * Joue la vidéo de transition en mode INVERSÉ (pour les IN - entrées)
     * @param {Function} onComplete - Callback appelé à la fin
     */
    async playTransitionVideoReverse(onComplete) {
        if (!this.video || this.isTransitioning) return;

        this.isTransitioning = true;
        console.log('🎬 Lecture vidéo de transition (INVERSÉE - IN)');

        try {
            // Afficher la vidéo
            this.video.classList.add('active');
            this.video.style.opacity = '1';

            // Attendre que les métadonnées soient chargées
            await this.ensureVideoLoaded();

            // Configurer pour lecture inversée
            this.video.currentTime = this.video.duration;
            this.video.playbackRate = -1;

            // Lancer la lecture
            await this.video.play();

            // Surveiller la fin (début en inversé)
            const checkEnd = setInterval(() => {
                if (this.video.currentTime <= 0.1) {
                    clearInterval(checkEnd);
                    this.hideVideo();
                    this.isTransitioning = false;

                    console.log('✅ Vidéo de transition (IN) terminée');

                    if (onComplete) {
                        onComplete();
                    }
                }
            }, 50);

        } catch (error) {
            console.error('❌ Erreur lecture vidéo (IN):', error);
            this.hideVideo();
            this.isTransitioning = false;
            if (onComplete) onComplete();
        }
    }

    /**
     * Joue la vidéo de transition en mode NORMAL (pour les OUT - sorties)
     * @param {Function} onComplete - Callback appelé à la fin
     */
    async playTransitionVideoNormal(onComplete) {
        if (!this.video || this.isTransitioning) return;

        this.isTransitioning = true;
        console.log('🎬 Lecture vidéo de transition (NORMALE - OUT)');

        try {
            // Afficher la vidéo
            this.video.classList.add('active');
            this.video.style.opacity = '1';

            // Attendre que les métadonnées soient chargées
            await this.ensureVideoLoaded();

            // Configurer pour lecture normale
            this.video.currentTime = 0;
            this.video.playbackRate = 1;

            // Lancer la lecture
            await this.video.play();

            // Écouter la fin
            const onEnded = () => {
                this.video.removeEventListener('ended', onEnded);
                this.hideVideo();
                this.isTransitioning = false;

                console.log('✅ Vidéo de transition (OUT) terminée');

                if (onComplete) {
                    onComplete();
                }
            };

            this.video.addEventListener('ended', onEnded);

        } catch (error) {
            console.error('❌ Erreur lecture vidéo (OUT):', error);
            this.hideVideo();
            this.isTransitioning = false;
            if (onComplete) onComplete();
        }
    }

    /**
     * S'assure que la vidéo est chargée
     */
    ensureVideoLoaded() {
        return new Promise((resolve) => {
            if (this.video.readyState >= 2) {
                resolve();
            } else {
                const onLoaded = () => {
                    this.video.removeEventListener('loadeddata', onLoaded);
                    resolve();
                };
                this.video.addEventListener('loadeddata', onLoaded);
                this.video.load();
            }
        });
    }

    /**
     * Masque la vidéo
     */
    hideVideo() {
        if (!this.video) return;

        this.video.style.opacity = '0';

        setTimeout(() => {
            this.video.classList.remove('active');
            this.video.pause();
        }, this.config.videoFadeDuration);
    }

    /**
     * Séquence complète d'entrée (IN) : Loading → Vidéo inversée → Contenu
     * @param {Function} onComplete - Callback appelé à la fin
     */
    async transitionIn(onComplete) {
        console.log('🚀 Début de la transition IN');

        // 1. Afficher l'écran de chargement avec jelly
        this.showLoadingScreen('INITIALISATION...');

        // Petit délai pour montrer le jelly
        await new Promise(resolve => setTimeout(resolve, 800));

        // 2. Masquer progressivement le loading
        await this.hideLoadingScreen();

        // 3. Jouer la vidéo en inversé
        await this.playTransitionVideoReverse(() => {
            console.log('✅ Transition IN terminée');
            if (onComplete) onComplete();
        });
    }

    /**
     * Séquence complète de sortie (OUT) : Vidéo normale → Loading → Redirection
     * @param {Function} onComplete - Callback appelé à la fin
     */
    async transitionOut(onComplete) {
        console.log('🚀 Début de la transition OUT');

        // 1. Jouer la vidéo normale
        await this.playTransitionVideoNormal(async () => {

            // 2. Afficher l'écran de chargement avec jelly
            this.showLoadingScreen('CHARGEMENT...');

            // Petit délai pour éviter les freeze
            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('✅ Transition OUT terminée');

            // 3. Callback (redirection ou autre)
            if (onComplete) onComplete();
        });
    }

    /**
     * Nettoie et réinitialise l'état
     */
    reset() {
        this.isTransitioning = false;
        this.hideVideo();
        this.hideLoadingScreen();
    }
}

// Instance singleton
let transitionManagerInstance = null;

/**
 * Retourne l'instance unique du TransitionManager
 */
export function getTransitionManager() {
    if (!transitionManagerInstance) {
        transitionManagerInstance = new TransitionManager();
    }
    return transitionManagerInstance;
}
