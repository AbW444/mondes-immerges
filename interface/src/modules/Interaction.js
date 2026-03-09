// Gestionnaire d'interactions pour Mondes Immergés
import { gsap } from 'gsap';

function ilog(...args) { console.log('[INTERACTION]', ...args); }

export class Interaction {
    /**
     * Crée une instance du gestionnaire d'interactions
     * @param {Object} options - Options de configuration
     * @param {Object} options.globeManager - Instance du GlobeManager
     * @param {Object} options.visualEffects - Instance de VisualEffects (optionnel)
     */
    constructor(options) {
        this.globeManager = options.globeManager;
        this.visualEffects = options.visualEffects;

        this.isDragging = false;
        this.lastTouchTime = 0;
        this.touchTimeout = null;
        this.mouseStartY = 0;
        this.mouseStartX = 0;
        this.scrollAmount = 0;
        this.lastPosition = { x: 0, y: 0 };

        // Variables pour gérer le scroll
        this.scrollTimerId = null;
        this.scrollSpeed = 0;
        this.lastScrollTime = 0;
        this.scrollAccumulator = 0;

        // Paramètres pour l'inertie (scroll orbit)
        this.orbitVelocity = 0;
        this.inclinationVelocity = 0;
        this.orbitAnimationId = null;

        // Paramètres pour le pinch-to-zoom
        this.initialDistance = 0;
        this.currentDistance = 0;
        this.isPinching = false;

        // Paramètres pour la détection de mouvement
        this.movementThreshold = 5;
        this.swipeThreshold = 80;
        this.hasMoved = false;

        // État de l'interface
        this.interfaceVisible = true;
        this.autoHideTimeout = null;

        ilog('Initialisation des interactions (drag désactivé, molette = orbite fluide)');
        this.init();
    }

    /**
     * Initialise les gestionnaires d'événements
     */
    init() {
        const container = this.globeManager.container;

        // Écouteur pour la molette (orbite fluide)
        container.addEventListener('wheel', this.handleMouseWheel.bind(this), { passive: false });

        // Écouteurs souris (drag désactivé — détection de clic uniquement)
        container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Écouteurs tactiles
        container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        container.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Écouteur pour le clavier
        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Écouteur pour masquer/afficher l'interface après inactivité
        document.addEventListener('mousemove', this.resetInterfaceAutoHide.bind(this));

        // Démarrer la détection d'inactivité
        this.startInterfaceAutoHide();
    }

    /**
     * Gère le début d'un clic souris — drag désactivé
     */
    handleMouseDown(event) {
        this.hasMoved = false;
        this.mouseStartX = event.clientX;
        this.mouseStartY = event.clientY;
    }

    /**
     * Gère le mouvement de la souris — drag désactivé, détection de mouvement uniquement
     */
    handleMouseMove(event) {
        const deltaX = event.clientX - this.mouseStartX;
        const deltaY = event.clientY - this.mouseStartY;
        if (Math.abs(deltaX) > this.movementThreshold || Math.abs(deltaY) > this.movementThreshold) {
            this.hasMoved = true;
        }
    }

    /**
     * Gère la fin d'un clic souris — drag désactivé
     */
    handleMouseUp(event) {
        // Pas d'action
    }

    /**
     * Animation d'inertie pour l'orbite (molette)
     * Applique la vélocité accumulée avec friction pour un mouvement fluide
     */
    animateOrbitInertia() {
        const friction = 0.92;

        this.orbitVelocity *= friction;
        this.inclinationVelocity *= friction;

        // Arrêter si la vitesse est négligeable
        if (Math.abs(this.orbitVelocity) < 0.00005 && Math.abs(this.inclinationVelocity) < 0.00005) {
            this.orbitAnimationId = null;
            return;
        }

        // Appliquer la vélocité aux paramètres d'orbite
        this.globeManager.orbitParams.orbitAngle += this.orbitVelocity;

        if (Math.abs(this.inclinationVelocity) > 0.00001) {
            const newInclination = this.globeManager.orbitParams.inclination + this.inclinationVelocity;
            this.globeManager.orbitParams.inclination = Math.max(0.1, Math.min(Math.PI / 3, newInclination));
        }

        if (typeof this.globeManager._updateCameraPositionManual === 'function') {
            this.globeManager._updateCameraPositionManual();
        }

        this.orbitAnimationId = requestAnimationFrame(() => this.animateOrbitInertia());
    }

    /**
     * Gère le début d'un toucher
     */
    handleTouchStart(event) {
        if (event.touches.length === 1) {
            this.hasMoved = false;
            this.mouseStartX = event.touches[0].clientX;
            this.mouseStartY = event.touches[0].clientY;
            this.scrollAmount = 0;
        } else if (event.touches.length === 2) {
            this.isPinching = true;
            this.initialDistance = this.getTouchDistance(event.touches);
        }
    }

    /**
     * Calcule la distance entre deux points de toucher
     */
    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Gère la fin d'un toucher
     */
    handleTouchEnd(event) {
        if (this.isPinching && event.touches.length < 2) {
            this.isPinching = false;
        }
    }

    /**
     * Gère le mouvement d'un toucher
     */
    handleTouchMove(event) {
        event.preventDefault();

        // Pinch-to-zoom avec 2 doigts
        if (this.isPinching && event.touches.length === 2) {
            this.currentDistance = this.getTouchDistance(event.touches);
            const scale = this.currentDistance / this.initialDistance;

            if (scale > 1.05) {
                this.globeManager.zoom(true);
                this.initialDistance = this.currentDistance;
            } else if (scale < 0.95) {
                this.globeManager.zoom(false);
                this.initialDistance = this.currentDistance;
            }
            return;
        }

        if (event.touches.length !== 1) return;

        // Si en mode hotspot, détecter le scroll vertical pour quitter
        if (this.globeManager.orbitParams.inHotspotMode) {
            const currentY = event.touches[0].clientY;
            const diffY = currentY - this.mouseStartY;

            this.scrollAmount += diffY;

            if (this.scrollAmount > 150) {
                this.globeManager.exitHotspotModeExternal();
                this.scrollAmount = 0;
            }

            this.mouseStartY = currentY;
        }
    }

    /**
     * Gère le défilement de la molette — orbite fluide avec inertie
     * Accumule la vélocité et laisse l'animation RAF appliquer le mouvement progressivement
     */
    handleMouseWheel(event) {
        event.preventDefault();

        this.showInterface();
        this.resetInterfaceAutoHide();

        // Normaliser le delta
        let delta = event.deltaY;
        if (event.deltaMode === 1) delta *= 40;
        if (event.deltaMode === 2) delta *= 800;

        // Accumuler dans la vélocité (au lieu d'appliquer directement)
        this.orbitVelocity += delta * 0.00015;

        // Scroll horizontal (shift+scroll ou trackpad) → inclinaison
        if (event.deltaX !== 0) {
            let deltaX = event.deltaX;
            if (event.deltaMode === 1) deltaX *= 40;
            if (event.deltaMode === 2) deltaX *= 800;
            this.inclinationVelocity -= deltaX * 0.0001;
        }

        // Démarrer l'animation si pas déjà en cours
        if (!this.orbitAnimationId) {
            this.orbitAnimationId = requestAnimationFrame(() => this.animateOrbitInertia());
        }
    }

    /**
     * Gère les événements du clavier
     */
    handleKeyDown(event) {
        this.showInterface();
        this.resetInterfaceAutoHide();

        switch (event.key) {
            case 'Escape':
                if (this.globeManager.orbitParams.inHotspotMode) {
                    this.globeManager.exitHotspotModeExternal();

                    if (this.visualEffects) {
                        this.visualEffects.flashScreen('rgba(0, 0, 0, 0.4)');
                        this.visualEffects.showNotification("Retour à l'exploration globale", "info", 2000);
                    }
                }
                break;

            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                event.preventDefault();

                if (this.globeManager.orbitParams.inHotspotMode && event.key === 'ArrowDown') {
                    this.globeManager.exitHotspotModeExternal();

                    if (this.visualEffects) {
                        this.visualEffects.flashScreen('rgba(0, 0, 0, 0.4)');
                        this.visualEffects.showNotification("Retour à l'exploration globale", "info", 2000);
                    }
                } else {
                    this.handleArrowNavigation(event.key);
                }
                break;

            case '+':
            case '=':
                this.globeManager.zoom(true);
                break;

            case '-':
            case '_':
                this.globeManager.zoom(false);
                break;

            case 'r':
            case 'R':
                this.globeManager.resetView();
                if (this.visualEffects) {
                    this.visualEffects.flashScreen('rgba(255, 255, 255, 0.2)');
                    this.visualEffects.showNotification("Vue réinitialisée", "info", 2000);
                }
                break;

            case 'h':
            case 'H':
                this.toggleInterface();
                break;
        }
    }

    /**
     * Gère la navigation par flèches
     */
    handleArrowNavigation(key) {
        try {
            const backupAngle = this.globeManager.orbitParams.orbitAngle;
            const wasOrbiting = this.globeManager.orbitParams.isOrbiting;
            this.globeManager.orbitParams.isOrbiting = false;

            switch (key) {
                case 'ArrowLeft':
                    this.globeManager.orbitParams.orbitAngle += 0.05;
                    break;
                case 'ArrowRight':
                    this.globeManager.orbitParams.orbitAngle -= 0.05;
                    break;
                case 'ArrowUp':
                    if (!this.globeManager.orbitParams.inHotspotMode) {
                        this.globeManager.orbitParams.inclination = Math.min(
                            this.globeManager.orbitParams.inclination + 0.03,
                            Math.PI / 3
                        );
                    }
                    break;
                case 'ArrowDown':
                    if (!this.globeManager.orbitParams.inHotspotMode) {
                        this.globeManager.orbitParams.inclination = Math.max(
                            this.globeManager.orbitParams.inclination - 0.03,
                            0.1
                        );
                    }
                    break;
            }

            if (typeof this.globeManager._updateCameraPositionManual === 'function') {
                this.globeManager._updateCameraPositionManual();
            }

            setTimeout(() => {
                this.globeManager.orbitParams.isOrbiting = wasOrbiting;
            }, 500);
        } catch (e) {
            if (this.globeManager && this.globeManager.orbitParams) {
                this.globeManager.orbitParams.isOrbiting = true;
            }
        }
    }

    /**
     * Démarre le minuteur pour masquer l'interface après une période d'inactivité
     */
    startInterfaceAutoHide() {
        if (this.autoHideTimeout) {
            clearTimeout(this.autoHideTimeout);
        }

        this.autoHideTimeout = setTimeout(() => {
            this.hideInterface();
        }, 10000);
    }

    /**
     * Réinitialise le minuteur d'auto-masquage de l'interface
     */
    resetInterfaceAutoHide() {
        this.showInterface();
        this.startInterfaceAutoHide();
    }

    /**
     * Masque l'interface utilisateur
     */
    hideInterface() {
        if (!this.interfaceVisible) return;

        this.interfaceVisible = false;

        const uiControls = document.getElementById('ui-controls');
        const huds = document.querySelectorAll('.satellite-hud, .coordinates-display');
        const crosshair = document.querySelector('.satellite-crosshair');

        gsap.to(uiControls, {
            opacity: 0,
            y: 20,
            duration: 0.5,
            ease: "power2.inOut"
        });

        gsap.to([...huds, crosshair], {
            opacity: 0,
            duration: 0.5,
            ease: "power2.inOut"
        });

        setTimeout(() => {
            if (!this.interfaceVisible) {
                uiControls.style.pointerEvents = 'none';
            }
        }, 500);
    }

    /**
     * Affiche l'interface utilisateur
     */
    showInterface() {
        if (this.interfaceVisible) return;

        this.interfaceVisible = true;

        const uiControls = document.getElementById('ui-controls');
        const huds = document.querySelectorAll('.satellite-hud, .coordinates-display');
        const crosshair = document.querySelector('.satellite-crosshair');

        uiControls.style.pointerEvents = 'auto';

        gsap.to(uiControls, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out"
        });

        gsap.to([...huds, crosshair], {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out"
        });
    }

    /**
     * Bascule l'état de visibilité de l'interface
     */
    toggleInterface() {
        if (this.interfaceVisible) {
            this.hideInterface();
        } else {
            this.showInterface();
            this.startInterfaceAutoHide();
        }
    }
}
