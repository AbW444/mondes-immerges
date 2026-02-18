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
    }

    /**
     * Signal que le contexte WebGL est perdu - arrêter toute tentative de relance
     */
    onContextLost() {
        this._contextLost = true;
        this.stopMonitoring();
        console.warn('🛑 VideoManager: WebGL context lost - arrêt de toutes les relances');
    }

    /**
     * Signal que le contexte WebGL est restauré - reprendre la surveillance
     */
    onContextRestored() {
        this._contextLost = false;
        console.log('✅ VideoManager: WebGL context restored - reprise possible');
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
            console.error('VideoManager: Élément vidéo invalide');
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

        console.log(`✅ VideoManager: "${config.name}" enregistrée`);
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
                console.log(`🔄 VideoManager: "${config.name}" - Relance après ended`);
                this.playVideo(video, config);
            }
        });

        // Gestion des pauses non désirées
        video.addEventListener('pause', () => {
            // Ignorer si la vidéo est à la fin (normal)
            if (video.ended) return;

            // Ignorer si pause intentionnelle (via code)
            if (video.dataset.intentionalPause === 'true') return;

            // CRITICAL: Ne pas relancer si WebGL context est perdu
            // sinon boucle infinie pause->play->pause->play qui freeze le navigateur
            if (this._contextLost) return;

            if (this.isActive) {
                console.warn(`⚠️ VideoManager: "${config.name}" - Pause détectée, relance...`);
                setTimeout(() => {
                    if (this.isActive && !this._contextLost) {
                        this.playVideo(video, config);
                    }
                }, 100);
            }
        });

        // Gestion du stalling (buffering)
        video.addEventListener('stalled', () => {
            console.warn(`⚠️ VideoManager: "${config.name}" - Stalled (buffering)`);
            if (config.onStall) {
                config.onStall(video);
            }

            // Essayer de relancer après un court délai
            setTimeout(() => {
                if (video.readyState >= 2 && this.isActive && !this._contextLost) {
                    this.playVideo(video, config);
                }
            }, 500);
        });

        // Gestion du waiting (attente de données)
        video.addEventListener('waiting', () => {
            console.log(`⏳ VideoManager: "${config.name}" - Waiting for data...`);
        });

        // Gestion de la suspension (économie de ressources)
        video.addEventListener('suspend', () => {
            console.log(`💤 VideoManager: "${config.name}" - Suspended`);
        });

        // Gestion des erreurs
        video.addEventListener('error', (e) => {
            console.error(`❌ VideoManager: "${config.name}" - Erreur:`, e);
            if (config.onError) {
                config.onError(e);
            }

            // Réessayer après un délai (sauf si context WebGL perdu)
            const attempts = this.retryAttempts.get(video) || 0;
            if (attempts < this.maxRetries && config.autoRetry && this.isActive && !this._contextLost) {
                this.retryAttempts.set(video, attempts + 1);
                console.log(`🔄 VideoManager: "${config.name}" - Tentative ${attempts + 1}/${this.maxRetries}`);

                setTimeout(() => {
                    video.load();
                    this.playVideo(video, config);
                }, 2000 * (attempts + 1)); // Délai exponentiel
            }
        });

        // Gestion du chargement réussi
        video.addEventListener('loadeddata', () => {
            console.log(`✅ VideoManager: "${config.name}" - Données chargées`);
        });

        // Gestion du play réussi
        video.addEventListener('play', () => {
            console.log(`▶️ VideoManager: "${config.name}" - Lecture démarrée`);
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

        const playPromise = video.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log(`✅ VideoManager: "${config.name}" - Play() réussi`);
                })
                .catch(error => {
                    console.error(`❌ VideoManager: "${config.name}" - Play() échoué:`, error);

                    // Si c'est un problème d'interaction utilisateur (autoplay bloqué)
                    if (error.name === 'NotAllowedError') {
                        console.warn(`⚠️ VideoManager: "${config.name}" - Autoplay bloqué, en attente d'interaction...`);

                        // Essayer de rejouer au premier clic utilisateur
                        const retryOnClick = () => {
                            this.playVideo(video, config);
                            document.removeEventListener('click', retryOnClick);
                        };
                        document.addEventListener('click', retryOnClick, { once: true });
                    }
                });
        }
    }

    /**
     * Démarre la surveillance périodique de toutes les vidéos
     */
    startMonitoring(interval = 2000) {
        if (this.checkInterval) {
            console.warn('VideoManager: Surveillance déjà active');
            return;
        }

        console.log('🔍 VideoManager: Démarrage de la surveillance périodique');

        this.checkInterval = setInterval(() => {
            if (!this.isActive || this._contextLost) return;

            this.videos.forEach((config, video) => {
                // Vérifier si la vidéo devrait jouer mais est en pause
                if (video.paused && !video.ended && config.shouldLoop) {
                    console.warn(`⚠️ VideoManager: "${config.name}" - En pause (surveillance), relance...`);
                    this.playVideo(video, config);
                }

                // Vérifier le buffering
                if (video.readyState < 3 && !video.paused) { // HAVE_FUTURE_DATA ou moins
                    console.log(`⏳ VideoManager: "${config.name}" - Buffering...`);
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
            console.log('⏹️ VideoManager: Surveillance arrêtée');
        }
    }

    /**
     * Désenregistre une vidéo
     * @param {HTMLVideoElement} video
     */
    unregister(video) {
        if (this.videos.has(video)) {
            const config = this.videos.get(video);
            console.log(`🗑️ VideoManager: "${config.name}" désenregistrée`);
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
        console.log('🗑️ VideoManager: Toutes les vidéos désenregistrées');
    }

    /**
     * Désactive le gestionnaire
     */
    disable() {
        this.isActive = false;
        this.stopMonitoring();
        console.log('⏸️ VideoManager: Désactivé');
    }

    /**
     * Active le gestionnaire
     */
    enable() {
        this.isActive = true;
        this.startMonitoring();
        console.log('▶️ VideoManager: Activé');
    }

    /**
     * Nettoie toutes les ressources
     */
    destroy() {
        this.disable();
        this.unregisterAll();
        console.log('💥 VideoManager: Détruit');
    }
}

// Instance singleton
export const videoManager = new VideoManager();
