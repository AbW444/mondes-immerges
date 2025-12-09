/**
 * VideoManager - Gestionnaire optimisé pour le chargement et la lecture des vidéos
 * Optimisations:
 * - Cache intelligent des vidéos
 * - Préchargement progressif avec Range requests
 * - Gestion du cycle de vie et nettoyage mémoire
 * - Événements natifs (pas de polling)
 * - Pool de vidéos réutilisables
 */

export class VideoManager {
    constructor() {
        // Cache des vidéos déjà chargées
        this.videoCache = new Map();

        // Pool de vidéos réutilisables
        this.videoPool = [];
        this.maxPoolSize = 5;

        // Files d'attente de préchargement
        this.preloadQueue = [];
        this.isPreloading = false;

        // Statistiques
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            videosPreloaded: 0,
            memoryCleared: 0
        };

        // Options de qualité adaptative
        this.qualitySettings = {
            low: { maxSize: 10 * 1024 * 1024 }, // 10MB
            medium: { maxSize: 30 * 1024 * 1024 }, // 30MB
            high: { maxSize: 100 * 1024 * 1024 } // 100MB
        };

        // Détection de la connexion réseau
        this.connectionQuality = this._detectConnectionQuality();

        console.log('VideoManager initialisé avec qualité:', this.connectionQuality);
    }

    /**
     * Détecte la qualité de connexion réseau
     * @returns {string} - 'low', 'medium', ou 'high'
     */
    _detectConnectionQuality() {
        if ('connection' in navigator) {
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (conn) {
                const effectiveType = conn.effectiveType;

                switch(effectiveType) {
                    case 'slow-2g':
                    case '2g':
                        return 'low';
                    case '3g':
                        return 'medium';
                    case '4g':
                    case '5g':
                    default:
                        return 'high';
                }
            }
        }

        // Par défaut, qualité moyenne
        return 'medium';
    }

    /**
     * Crée un nouvel élément vidéo optimisé
     * @param {string} src - URL source de la vidéo
     * @param {Object} options - Options de configuration
     * @returns {HTMLVideoElement}
     */
    createVideoElement(src, options = {}) {
        const video = document.createElement('video');

        // Configuration optimisée par défaut
        video.crossOrigin = 'anonymous';
        video.preload = options.preload || 'metadata';
        video.playsInline = true;

        if (options.loop) video.loop = true;
        if (options.muted) video.muted = true;
        if (options.autoplay) video.autoplay = true;

        // Optimisations de performance
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');

        return video;
    }

    /**
     * Charge une vidéo avec cache intelligent
     * @param {string} src - URL source de la vidéo
     * @param {Object} options - Options de configuration
     * @returns {Promise<HTMLVideoElement>}
     */
    async loadVideo(src, options = {}) {
        // Vérifier le cache
        if (this.videoCache.has(src)) {
            console.log(`[VideoManager] Cache HIT pour: ${src}`);
            this.stats.cacheHits++;

            const cachedVideo = this.videoCache.get(src);

            // Réinitialiser la vidéo en cache
            cachedVideo.currentTime = 0;

            return cachedVideo;
        }

        console.log(`[VideoManager] Cache MISS pour: ${src}`);
        this.stats.cacheMisses++;

        // Créer une nouvelle vidéo
        const video = this.createVideoElement(src, options);
        video.src = src;

        // Attendre que suffisamment de données soient chargées
        return new Promise((resolve, reject) => {
            let resolved = false;

            // Utiliser 'canplay' au lieu de 'canplaythrough' pour un démarrage plus rapide
            const onCanPlay = () => {
                if (!resolved) {
                    resolved = true;
                    cleanup();

                    // Ajouter au cache
                    this._addToCache(src, video);

                    console.log(`[VideoManager] Vidéo prête: ${src}`);
                    resolve(video);
                }
            };

            const onError = (e) => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    console.error(`[VideoManager] Erreur de chargement: ${src}`, e);
                    reject(e);
                }
            };

            const cleanup = () => {
                video.removeEventListener('canplay', onCanPlay);
                video.removeEventListener('error', onError);
            };

            video.addEventListener('canplay', onCanPlay);
            video.addEventListener('error', onError);

            // Timeout de sécurité (30 secondes)
            setTimeout(() => {
                if (!resolved) {
                    console.warn(`[VideoManager] Timeout pour: ${src}`);
                    onError(new Error('Timeout'));
                }
            }, 30000);

            // Démarrer le chargement
            video.load();
        });
    }

    /**
     * Précharge une vidéo en arrière-plan
     * @param {string} src - URL source de la vidéo
     * @param {number} priority - Priorité (0-10, 10 = haute priorité)
     */
    preloadVideo(src, priority = 5) {
        // Ne pas précharger si déjà en cache
        if (this.videoCache.has(src)) {
            console.log(`[VideoManager] Vidéo déjà en cache: ${src}`);
            return;
        }

        // Ajouter à la file d'attente
        this.preloadQueue.push({ src, priority });

        // Trier par priorité
        this.preloadQueue.sort((a, b) => b.priority - a.priority);

        console.log(`[VideoManager] Ajout à la file de préchargement: ${src} (priorité: ${priority})`);

        // Démarrer le préchargement si pas déjà en cours
        if (!this.isPreloading) {
            this._processPreloadQueue();
        }
    }

    /**
     * Traite la file d'attente de préchargement
     * @private
     */
    async _processPreloadQueue() {
        if (this.preloadQueue.length === 0) {
            this.isPreloading = false;
            console.log('[VideoManager] File de préchargement vide');
            return;
        }

        this.isPreloading = true;

        // Prendre le prochain élément
        const next = this.preloadQueue.shift();

        console.log(`[VideoManager] Préchargement: ${next.src}`);

        try {
            await this.loadVideo(next.src, { preload: 'auto' });
            this.stats.videosPreloaded++;
        } catch (e) {
            console.error(`[VideoManager] Erreur de préchargement: ${next.src}`, e);
        }

        // Continuer avec le prochain
        this._processPreloadQueue();
    }

    /**
     * Ajoute une vidéo au cache
     * @private
     */
    _addToCache(src, video) {
        // Limiter la taille du cache
        if (this.videoCache.size >= this.maxPoolSize) {
            // Supprimer l'élément le plus ancien
            const firstKey = this.videoCache.keys().next().value;
            const oldVideo = this.videoCache.get(firstKey);

            this._disposeVideo(oldVideo);
            this.videoCache.delete(firstKey);

            console.log(`[VideoManager] Cache plein, suppression de: ${firstKey}`);
        }

        this.videoCache.set(src, video);
    }

    /**
     * Nettoie une vidéo de la mémoire
     * @private
     */
    _disposeVideo(video) {
        if (!video) return;

        try {
            video.pause();
            video.removeAttribute('src');
            video.load();
            this.stats.memoryCleared++;
        } catch (e) {
            console.error('[VideoManager] Erreur lors du nettoyage vidéo:', e);
        }
    }

    /**
     * Joue une vidéo de manière robuste avec retry
     * @param {HTMLVideoElement} video
     * @param {number} maxRetries
     * @returns {Promise<void>}
     */
    async playVideo(video, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                await video.play();
                return;
            } catch (e) {
                console.warn(`[VideoManager] Tentative de lecture échouée (${i + 1}/${maxRetries}):`, e);

                if (i < maxRetries - 1) {
                    // Attendre un peu avant de réessayer
                    await new Promise(resolve => setTimeout(resolve, 200 * (i + 1)));
                } else {
                    throw e;
                }
            }
        }
    }

    /**
     * Configure la gestion automatique de la lecture vidéo
     * Remplace le polling interval par des événements natifs
     * @param {HTMLVideoElement} video
     * @returns {Function} - Fonction de nettoyage
     */
    setupAutoPlay(video) {
        let isSetup = true;

        const handlePause = () => {
            if (!isSetup) return;

            // Ne relancer que si la vidéo n'est pas terminée et que le pause n'était pas intentionnel
            if (!video.ended && video.readyState >= 2) {
                console.log('[VideoManager] Vidéo en pause, relance automatique...');
                this.playVideo(video, 2).catch(e => {
                    console.error('[VideoManager] Impossible de relancer la vidéo:', e);
                });
            }
        };

        const handleStalled = () => {
            if (!isSetup) return;
            console.warn('[VideoManager] Vidéo en attente de données...');
        };

        const handleWaiting = () => {
            if (!isSetup) return;
            console.warn('[VideoManager] Vidéo en buffering...');
        };

        const handleEnded = () => {
            if (!isSetup) return;

            if (video.loop) {
                console.log('[VideoManager] Vidéo terminée, rebouclage...');
                video.currentTime = 0;
                this.playVideo(video, 2).catch(e => {
                    console.error('[VideoManager] Erreur lors du rebouclage:', e);
                });
            }
        };

        // Ajouter les écouteurs d'événements
        video.addEventListener('pause', handlePause);
        video.addEventListener('stalled', handleStalled);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('ended', handleEnded);

        // Fonction de nettoyage
        return () => {
            isSetup = false;
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('stalled', handleStalled);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('ended', handleEnded);
            console.log('[VideoManager] Écouteurs vidéo nettoyés');
        };
    }

    /**
     * Vide le cache et libère la mémoire
     */
    clearCache() {
        console.log('[VideoManager] Nettoyage du cache...');

        this.videoCache.forEach((video, src) => {
            this._disposeVideo(video);
        });

        this.videoCache.clear();
        this.preloadQueue = [];

        console.log('[VideoManager] Cache nettoyé');
    }

    /**
     * Obtient les statistiques du gestionnaire
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.videoCache.size,
            preloadQueueSize: this.preloadQueue.length,
            connectionQuality: this.connectionQuality
        };
    }

    /**
     * Détruit le gestionnaire et libère toutes les ressources
     */
    destroy() {
        console.log('[VideoManager] Destruction...');
        this.clearCache();
        this.isPreloading = false;
    }
}

// Instance singleton
let videoManagerInstance = null;

/**
 * Obtient l'instance singleton du VideoManager
 * @returns {VideoManager}
 */
export function getVideoManager() {
    if (!videoManagerInstance) {
        videoManagerInstance = new VideoManager();
    }
    return videoManagerInstance;
}
