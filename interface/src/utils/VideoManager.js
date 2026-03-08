/**
 * Gestionnaire professionnel de vidéos pour assurer la lecture continue
 * Gère les problèmes d'autoplay, de pause automatique et de stalling
 */
export class VideoManager {
    constructor() {
        this.videos = new Map(); // Map<HTMLVideoElement, config>
        this.retryAttempts = new Map(); // Map<HTMLVideoElement, number>
        this.maxRetries = 5;
        this.checkInterval = null;
        this.isActive = true;
        this._contextLost = false; // Flag WebGL context lost - stop all retries
        this._lastPlayAttempt = new Map(); // Cooldown pour éviter le spam de play()
        this._playInProgress = new Map(); // Flag pour éviter les play() simultanés
    }

    /**
     * Signal que le contexte WebGL est perdu - arrêter toute tentative de relance
     */
    onContextLost() {
        this._contextLost = true;
        this.stopMonitoring();
    }

    /**
     * Signal que le contexte WebGL est restauré - reprendre la surveillance
     */
    onContextRestored() {
        this._contextLost = false;
        // Relancer les vidéos
        this.videos.forEach((config, video) => {
            this.playVideo(video, config);
        });
        this.startMonitoring(2000);
    }

    /**
     * Enregistre une vidéo pour surveillance automatique
     * @param {HTMLVideoElement} video - Élément vidéo à surveiller
     * @param {Object} options - Options de configuration
     */
    register(video, options = {}) {
        if (!video || !(video instanceof HTMLVideoElement)) {
            return;
        }

        const config = {
            shouldLoop: options.loop !== false, // true par défaut
            shouldMute: options.muted !== false, // true par défaut
            autoRetry: options.autoRetry !== false, // true par défaut
            onError: options.onError || null,
            onPlay: options.onPlay || null,
            onStall: options.onStall || null,
            name: options.name || 'video-' + this.videos.size
        };

        // Configurer les attributs de la vidéo
        video.loop = config.shouldLoop;
        video.muted = config.shouldMute;
        video.playsInline = true; // CRUCIAL pour iOS
        video.preload = 'auto';

        // Ajouter l'attribut playsinline directement (nécessaire pour certains navigateurs)
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');

        // Enregistrer la vidéo
        this.videos.set(video, config);
        this.retryAttempts.set(video, 0);

        // Attacher les event listeners
        this.attachListeners(video, config);
    }

    /**
     * Attache les event listeners à une vidéo
     * @param {HTMLVideoElement} video
     * @param {Object} config
     */
    attachListeners(video, config) {
        // Gestion de la fin de vidéo (si loop échoue)
        video.addEventListener('ended', () => {
            if (config.shouldLoop && this.isActive) {
                this.playVideo(video, config);
            }
        });

        // Gestion des pauses non désirées - avec cooldown pour éviter le spam
        video.addEventListener('pause', () => {
            if (video.ended) return;
            if (video.dataset.intentionalPause === 'true') return;
            if (this._contextLost) return;

            if (this.isActive) {
                // Cooldown de 1s minimum entre deux tentatives de relance sur pause
                const now = performance.now();
                const lastAttempt = this._lastPlayAttempt.get(video) || 0;
                if (now - lastAttempt < 1000) return;

                setTimeout(() => {
                    if (this.isActive && !this._contextLost) {
                        this.playVideo(video, config);
                    }
                }, 500);
            }
        });

        // Gestion du stalling (buffering) - avec cooldown
        video.addEventListener('stalled', () => {
            if (config.onStall) {
                config.onStall(video);
            }

            // Essayer de relancer après un délai, mais pas si on vient déjà de tenter
            setTimeout(() => {
                const now = performance.now();
                const lastAttempt = this._lastPlayAttempt.get(video) || 0;
                if (now - lastAttempt < 2000) return;

                if (video.readyState >= 2 && this.isActive && !this._contextLost) {
                    this.playVideo(video, config);
                }
            }, 1000);
        });

        // Gestion du waiting (attente de données)
        video.addEventListener('waiting', () => {
            /* Production: waiting event silenced */
        });

        // Gestion de la suspension (économie de ressources)
        video.addEventListener('suspend', () => {
            /* Production: suspend event silenced */
        });

        // Gestion des erreurs
        video.addEventListener('error', (e) => {
            if (config.onError) {
                config.onError(e);
            }

            // Réessayer après un délai (sauf si context WebGL perdu)
            const attempts = this.retryAttempts.get(video) || 0;
            if (attempts < this.maxRetries && config.autoRetry && this.isActive && !this._contextLost) {
                this.retryAttempts.set(video, attempts + 1);

                setTimeout(() => {
                    video.load();
                    this.playVideo(video, config);
                }, 2000 * (attempts + 1)); // Délai exponentiel
            }
        });

        // Gestion du chargement réussi
        video.addEventListener('loadeddata', () => {
            /* Production: loadeddata event silenced */
        });

        // Gestion du play réussi
        video.addEventListener('play', () => {
            // Réinitialiser le compteur de tentatives
            this.retryAttempts.set(video, 0);

            if (config.onPlay) {
                config.onPlay(video);
            }
        });
    }

    /**
     * Lance la lecture d'une vidéo de manière sécurisée
     * @param {HTMLVideoElement} video
     * @param {Object} config
     */
    playVideo(video, config) {
        if (!video || !this.isActive || this._contextLost) return;

        // Éviter les play() simultanés sur la même vidéo (cause de freeze)
        if (this._playInProgress.get(video)) return;

        // Cooldown global par vidéo
        const now = performance.now();
        const lastAttempt = this._lastPlayAttempt.get(video) || 0;
        if (now - lastAttempt < 500) return;

        this._lastPlayAttempt.set(video, now);
        this._playInProgress.set(video, true);

        const playPromise = video.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    this._playInProgress.set(video, false);
                })
                .catch(error => {
                    this._playInProgress.set(video, false);
                    if (error.name === 'NotAllowedError') {
                        const retryOnClick = () => {
                            this.playVideo(video, config);
                            document.removeEventListener('click', retryOnClick);
                        };
                        document.addEventListener('click', retryOnClick, { once: true });
                    }
                });
        } else {
            this._playInProgress.set(video, false);
        }
    }

    /**
     * Démarre la surveillance périodique de toutes les vidéos
     */
    startMonitoring(interval = 3000) {
        if (this.checkInterval) {
            return;
        }

        this.checkInterval = setInterval(() => {
            if (!this.isActive || this._contextLost) return;

            this.videos.forEach((config, video) => {
                // Vérifier si la vidéo devrait jouer mais est en pause
                // playVideo() gère déjà le cooldown et la protection contre le spam
                if (video.paused && !video.ended && config.shouldLoop) {
                    this.playVideo(video, config);
                }
            });
        }, interval);
    }

    /**
     * Arrête la surveillance périodique
     */
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Désenregistre une vidéo
     * @param {HTMLVideoElement} video
     */
    unregister(video) {
        if (this.videos.has(video)) {
            this.videos.delete(video);
            this.retryAttempts.delete(video);
        }
    }

    /**
     * Désenregistre toutes les vidéos
     */
    unregisterAll() {
        this.videos.clear();
        this.retryAttempts.clear();
    }

    /**
     * Désactive le gestionnaire
     */
    disable() {
        this.isActive = false;
        this.stopMonitoring();
    }

    /**
     * Active le gestionnaire
     */
    enable() {
        this.isActive = true;
        this.startMonitoring();
    }

    /**
     * Nettoie toutes les ressources
     */
    destroy() {
        this.disable();
        this.unregisterAll();
    }
}

// Instance singleton
export const videoManager = new VideoManager();
