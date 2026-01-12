/**
 * Transition Manager pour la page d'accueil
 * Gère les transitions IN (entrée) et OUT (sortie) avec jelly loading icon
 * Version standalone sans modules ES6 pour compatibilité avec inclusion HTML simple
 *
 * @author National Geographic - Mondes Immergés
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        videoPath: './videos/anim-logo-transition.webm',
        jellySize: 120,
        jellyColor: '#ffcc00',
        loadingDelay: 800, // Durée d'affichage du jelly lors des transitions
        interfaceUrl: './interface/'
    };

    /**
     * Classe principale de gestion des transitions
     */
    class AccueilTransitionManager {
        constructor() {
            this.isTransitioning = false;
            this.loadingScreen = null;
            this.video = null;

            this.init();
        }

        /**
         * Initialise le gestionnaire
         */
        init() {
            console.log('🎬 Initialisation du Transition Manager (Accueil)');

            // Créer les éléments nécessaires
            this.createElements();

            // Effectuer la transition IN au chargement de la page
            this.performInitialTransitionIn();
        }

        /**
         * Crée les éléments HTML nécessaires
         */
        createElements() {
            // Créer l'écran de chargement avec jelly
            this.loadingScreen = document.createElement('div');
            this.loadingScreen.id = 'accueil-loading-screen';
            this.loadingScreen.className = 'accueil-loading-screen';
            this.loadingScreen.innerHTML = `
                <div class="loading-content">
                    <script type="module" src="https://cdn.jsdelivr.net/npm/ldrs/dist/auto/jelly.js"></script>
                    <l-jelly size="${CONFIG.jellySize}" speed="0.9" color="${CONFIG.jellyColor}"></l-jelly>
                    <p class="loading-text">CHARGEMENT...</p>
                </div>
            `;
            document.body.appendChild(this.loadingScreen);

            // Obtenir la référence à la vidéo existante
            this.video = document.getElementById('transitionVideo');

            console.log('✅ Éléments de transition créés');
        }

        /**
         * Affiche l'écran de chargement
         */
        showLoadingScreen(text = 'CHARGEMENT...') {
            const loadingText = this.loadingScreen.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = text;
            }

            this.loadingScreen.classList.add('active');
            this.loadingScreen.style.opacity = '1';
        }

        /**
         * Masque l'écran de chargement
         */
        hideLoadingScreen() {
            return new Promise(resolve => {
                this.loadingScreen.style.opacity = '0';

                setTimeout(() => {
                    this.loadingScreen.classList.remove('active');
                    resolve();
                }, 500);
            });
        }

        /**
         * Joue la vidéo en sens inverse (pour les IN - entrées)
         */
        async playVideoReverse() {
            if (!this.video) return;

            console.log('🎬 Lecture vidéo (INVERSÉE - IN)');

            return new Promise((resolve) => {
                this.video.classList.add('active');

                // Attendre que la vidéo soit chargée
                const onLoaded = () => {
                    this.video.currentTime = this.video.duration;
                    this.video.playbackRate = -1;

                    this.video.play().then(() => {
                        // Surveiller la fin (début en inversé)
                        const checkEnd = setInterval(() => {
                            if (this.video.currentTime <= 0.1) {
                                clearInterval(checkEnd);
                                this.hideVideo();
                                resolve();
                            }
                        }, 50);
                    }).catch(e => {
                        console.error('Erreur lecture vidéo:', e);
                        this.hideVideo();
                        resolve();
                    });
                };

                if (this.video.readyState >= 2) {
                    onLoaded();
                } else {
                    this.video.addEventListener('loadeddata', onLoaded, { once: true });
                    this.video.load();
                }
            });
        }

        /**
         * Joue la vidéo en sens normal (pour les OUT - sorties)
         */
        async playVideoNormal() {
            if (!this.video) return;

            console.log('🎬 Lecture vidéo (NORMALE - OUT)');

            return new Promise((resolve) => {
                this.video.classList.add('active');

                // Attendre que la vidéo soit chargée
                const onLoaded = () => {
                    this.video.currentTime = 0;
                    this.video.playbackRate = 1;

                    this.video.play().then(() => {
                        const onEnded = () => {
                            this.video.removeEventListener('ended', onEnded);
                            this.hideVideo();
                            resolve();
                        };

                        this.video.addEventListener('ended', onEnded);
                    }).catch(e => {
                        console.error('Erreur lecture vidéo:', e);
                        this.hideVideo();
                        resolve();
                    });
                };

                if (this.video.readyState >= 2) {
                    onLoaded();
                } else {
                    this.video.addEventListener('loadeddata', onLoaded, { once: true });
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
            }, 300);
        }

        /**
         * Transition IN initiale (au chargement de la page)
         * Séquence: Jelly → Vidéo inversée → Contenu
         */
        async performInitialTransitionIn() {
            console.log('🚀 Transition IN (chargement initial)');

            // 1. Afficher l'écran de chargement
            this.showLoadingScreen('INITIALISATION...');

            // Attendre un peu pour montrer le jelly
            await new Promise(resolve => setTimeout(resolve, CONFIG.loadingDelay));

            // 2. Masquer l'écran de chargement
            await this.hideLoadingScreen();

            // 3. Jouer la vidéo en inversé
            await this.playVideoReverse();

            console.log('✅ Transition IN terminée');
        }

        /**
         * Transition OUT (sortie vers l'interface)
         * Séquence: Vidéo normale → Jelly → Redirection
         */
        async performTransitionOut(redirectUrl = CONFIG.interfaceUrl) {
            if (this.isTransitioning) return;

            this.isTransitioning = true;
            console.log('🚀 Transition OUT (sortie vers interface)');

            // 1. Jouer la vidéo normale
            await this.playVideoNormal();

            // 2. Afficher l'écran de chargement
            this.showLoadingScreen('CHARGEMENT...');

            // Attendre un peu pour éviter les freeze
            await new Promise(resolve => setTimeout(resolve, CONFIG.loadingDelay));

            console.log('✅ Transition OUT terminée - Redirection...');

            // 3. Redirection
            window.location.href = redirectUrl;
        }
    }

    // Instance globale
    let transitionManagerInstance = null;

    /**
     * Obtient ou crée l'instance du gestionnaire
     */
    function getTransitionManager() {
        if (!transitionManagerInstance) {
            transitionManagerInstance = new AccueilTransitionManager();
        }
        return transitionManagerInstance;
    }

    // Exposer globalement pour utilisation dans le HTML
    window.AccueilTransitionManager = {
        getInstance: getTransitionManager,
        performTransitionOut: function(url) {
            const manager = getTransitionManager();
            return manager.performTransitionOut(url);
        }
    };

    console.log('✅ Transition Manager (Accueil) chargé');

})();
