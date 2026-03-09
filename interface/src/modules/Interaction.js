// Gestionnaire d'interactions pour Mondes Immergés
import { gsap } from 'gsap';

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
        this.lastPosition = { x: 0, y: 0 }; // Pour suivre les mouvements de la souris/touch
        
        // Variables pour gérer le scroll
        this.scrollTimerId = null;
        this.scrollSpeed = 0;
        this.lastScrollTime = 0;
        this.scrollAccumulator = 0;
        
        // Nouveaux paramètres pour l'inertie
        this.inertiaEnabled = true;
        this.velocityX = 0;
        this.velocityY = 0;
        this.inertiaAnimationId = null;
        this.zoomInertia = 0;
        
        // Paramètres pour le pinch-to-zoom
        this.initialDistance = 0;
        this.currentDistance = 0;
        this.isPinching = false;
        
        // Paramètres pour la détection de mouvement
        this.movementThreshold = 5; // pixels
        this.swipeThreshold = 80; // pixels
        this.hasMoved = false;
        
        // État de l'interface
        this.interfaceVisible = true;
        this.autoHideTimeout = null;
        
        this.init();
    }
    
    /**
     * Initialise les gestionnaires d'événements
     */
    init() {
        const container = this.globeManager.container;

        // Écouteur pour la molette (zoom)
        container.addEventListener('wheel', this.handleMouseWheel.bind(this), { passive: false });

        // Écouteurs pour le glissement souris (rotation du globe)
        container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Écouteurs tactiles (rotation du globe sur mobile)
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
     * Gère le début d'un clic souris pour le glissement
     * @param {MouseEvent} event
     */
    handleMouseDown(event) {
        this.isDragging = true;
        this.hasMoved = false;
        this.mouseStartX = event.clientX;
        this.mouseStartY = event.clientY;
        this.lastPosition = { x: event.clientX, y: event.clientY };
        this.velocityX = 0;
        this.velocityY = 0;

        // Stopper l'inertie en cours
        if (this.inertiaAnimationId) {
            cancelAnimationFrame(this.inertiaAnimationId);
            this.inertiaAnimationId = null;
        }
    }

    /**
     * Gère le mouvement de la souris pour rotation du globe
     * @param {MouseEvent} event
     */
    handleMouseMove(event) {
        if (!this.isDragging) return;

        const currentX = event.clientX;
        const currentY = event.clientY;
        const deltaX = currentX - this.lastPosition.x;
        const deltaY = currentY - this.lastPosition.y;

        if (Math.abs(deltaX) > this.movementThreshold || Math.abs(deltaY) > this.movementThreshold) {
            this.hasMoved = true;
        }

        // Calculer la vélocité pour l'inertie
        this.velocityX = 0.8 * this.velocityX + 0.2 * deltaX;
        this.velocityY = 0.8 * this.velocityY + 0.2 * deltaY;

        // Rotation du globe
        this.globeManager.orbitParams.orbitAngle -= deltaX * 0.005;

        // Inclinaison verticale
        const newInclination = this.globeManager.orbitParams.inclination + deltaY * 0.003;
        this.globeManager.orbitParams.inclination = Math.max(0.1, Math.min(Math.PI / 3, newInclination));

        this.lastPosition = { x: currentX, y: currentY };

        if (typeof this.globeManager._updateCameraPositionManual === 'function') {
            this.globeManager._updateCameraPositionManual();
        }
    }

    /**
     * Gère la fin d'un clic souris
     * @param {MouseEvent} event
     */
    handleMouseUp(event) {
        if (!this.isDragging) return;
        this.isDragging = false;

        // Lancer l'inertie si le mouvement était significatif
        if (this.inertiaEnabled && this.hasMoved && (Math.abs(this.velocityX) > 1 || Math.abs(this.velocityY) > 1)) {
            this.startInertia();
        }
    }

    /**
     * Démarre l'animation d'inertie après un glissement
     */
    startInertia() {
        const friction = 0.95;

        const animateInertia = () => {
            this.velocityX *= friction;
            this.velocityY *= friction;

            if (Math.abs(this.velocityX) < 0.1 && Math.abs(this.velocityY) < 0.1) {
                this.inertiaAnimationId = null;
                return;
            }

            this.globeManager.orbitParams.orbitAngle -= this.velocityX * 0.005;

            const newInclination = this.globeManager.orbitParams.inclination + this.velocityY * 0.003;
            this.globeManager.orbitParams.inclination = Math.max(0.1, Math.min(Math.PI / 3, newInclination));

            if (typeof this.globeManager._updateCameraPositionManual === 'function') {
                this.globeManager._updateCameraPositionManual();
            }

            this.inertiaAnimationId = requestAnimationFrame(animateInertia);
        };

        this.inertiaAnimationId = requestAnimationFrame(animateInertia);
    }

    /**
     * Gère le début d'un toucher
     * @param {TouchEvent} event
     */
    handleTouchStart(event) {
        if (event.touches.length === 1) {
            this.isDragging = true;
            this.hasMoved = false;
            this.mouseStartX = event.touches[0].clientX;
            this.mouseStartY = event.touches[0].clientY;
            this.lastPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            this.scrollAmount = 0;
            this.velocityX = 0;
            this.velocityY = 0;

            if (this.inertiaAnimationId) {
                cancelAnimationFrame(this.inertiaAnimationId);
                this.inertiaAnimationId = null;
            }
        } else if (event.touches.length === 2) {
            this.isPinching = true;
            this.initialDistance = this.getTouchDistance(event.touches);
        }
    }

    /**
     * Calcule la distance entre deux points de toucher
     * @param {TouchList} touches
     * @returns {number}
     */
    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Gère la fin d'un toucher
     * @param {TouchEvent} event
     */
    handleTouchEnd(event) {
        if (this.isPinching && event.touches.length < 2) {
            this.isPinching = false;
        }

        if (event.touches.length === 0) {
            this.isDragging = false;

            if (this.inertiaEnabled && this.hasMoved && (Math.abs(this.velocityX) > 1 || Math.abs(this.velocityY) > 1)) {
                this.startInertia();
            }
        }
    }

    /**
     * Gère le mouvement d'un toucher
     * @param {TouchEvent} event - Événement de toucher
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

        if (!this.isDragging || event.touches.length !== 1) return;

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
        // Rotation du globe
        else {
            const currentX = event.touches[0].clientX;
            const currentY = event.touches[0].clientY;

            const deltaX = currentX - this.lastPosition.x;
            const deltaY = currentY - this.lastPosition.y;

            if (Math.abs(deltaX) > this.movementThreshold || Math.abs(deltaY) > this.movementThreshold) {
                this.hasMoved = true;
            }

            this.velocityX = 0.8 * this.velocityX + 0.2 * deltaX;
            this.velocityY = 0.8 * this.velocityY + 0.2 * deltaY;

            this.globeManager.orbitParams.orbitAngle -= deltaX * 0.005;

            const newInclination = this.globeManager.orbitParams.inclination + deltaY * 0.003;
            this.globeManager.orbitParams.inclination = Math.max(0.1, Math.min(Math.PI / 3, newInclination));

            this.lastPosition = { x: currentX, y: currentY };

            if (typeof this.globeManager._updateCameraPositionManual === 'function') {
                this.globeManager._updateCameraPositionManual();
            }
        }
    }
    
    /**
     * Gère le défilement de la molette pour rotation orbitale fluide
     * @param {WheelEvent} event - Événement de défilement
     */
    handleMouseWheel(event) {
        event.preventDefault();

        // Afficher l'interface si elle est masquée
        this.showInterface();

        // Réinitialiser la détection d'inactivité
        this.resetInterfaceAutoHide();

        // Normaliser le delta (différents navigateurs/OS renvoient des valeurs très différentes)
        let delta = event.deltaY;
        if (event.deltaMode === 1) delta *= 40;   // lignes → pixels
        if (event.deltaMode === 2) delta *= 800;  // pages → pixels

        // Scroll vertical → rotation orbitale horizontale
        this.globeManager.orbitParams.orbitAngle += delta * 0.0008;

        // Scroll horizontal (shift+scroll ou trackpad) → inclinaison verticale
        if (event.deltaX !== 0) {
            let deltaX = event.deltaX;
            if (event.deltaMode === 1) deltaX *= 40;
            if (event.deltaMode === 2) deltaX *= 800;

            const newInclination = this.globeManager.orbitParams.inclination - deltaX * 0.0005;
            this.globeManager.orbitParams.inclination = Math.max(0.1, Math.min(Math.PI / 3, newInclination));
        }

        if (typeof this.globeManager._updateCameraPositionManual === 'function') {
            this.globeManager._updateCameraPositionManual();
        }
    }
    
    /**
     * Gère les événements du clavier avec améliorations pour les hotspots
     * MODIFICATION: Retrait de la gestion de la touche Entrée (maintenant gérée par GlobeManager)
     * @param {KeyboardEvent} event - Événement clavier
     */
    handleKeyDown(event) {
        // Afficher l'interface si elle est masquée
        this.showInterface();
        
        // Réinitialiser la détection d'inactivité
        this.resetInterfaceAutoHide();
        
        switch (event.key) {
            case 'Escape':
                // Si en mode hotspot, Escape pour revenir au globe
                if (this.globeManager.orbitParams.inHotspotMode) {
                    this.globeManager.exitHotspotModeExternal();
                    
                    // Effet visuel de retour
                    if (this.visualEffects) {
                        this.visualEffects.flashScreen('rgba(0, 0, 0, 0.4)');
                        this.visualEffects.showNotification("Retour à l'exploration globale", "info", 2000);
                    }
                }
                break;
                
            // SUPPRIMÉ: case 'Enter' - maintenant géré par GlobeManager pour le changement de vidéo
                
            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                // Empêcher le défilement de la page
                event.preventDefault();
                
                // Comportement différent selon le mode
                if (this.globeManager.orbitParams.inHotspotMode && event.key === 'ArrowDown') {
                    // Si en mode hotspot, flèche bas pour quitter
                    this.globeManager.exitHotspotModeExternal();
                    
                    if (this.visualEffects) {
                        this.visualEffects.flashScreen('rgba(0, 0, 0, 0.4)');
                        this.visualEffects.showNotification("Retour à l'exploration globale", "info", 2000);
                    }
                } else {
                    // Navigation standard pour les autres cas
                    this.handleArrowNavigation(event.key);
                }
                break;
                
            case '+':
            case '=': 
                // Zoomer
                this.globeManager.zoom(true);
                break;
                
            case '-':
            case '_': 
                // Dézoomer
                this.globeManager.zoom(false);
                break;
                
            case 'r':
            case 'R':
                // Réinitialiser la vue
                this.globeManager.resetView();
                
                // Effet visuel de réinitialisation
                if (this.visualEffects) {
                    this.visualEffects.flashScreen('rgba(255, 255, 255, 0.2)');
                    this.visualEffects.showNotification("Vue réinitialisée", "info", 2000);
                }
                break;
                
            case 'h':
            case 'H':
                // Basculer la visibilité de l'interface
                this.toggleInterface();
                break;
        }
    }
    
    /**
     * Gère la navigation par flèches avec protection améliorée
     * @param {string} key - Touche de direction ('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight')
     */
    handleArrowNavigation(key) {
        try {
            // Sauvegarde temporaire des paramètres actuels en cas d'erreur
            const backupAngle = this.globeManager.orbitParams.orbitAngle;
            
            // Désactiver temporairement l'orbite automatique
            const wasOrbiting = this.globeManager.orbitParams.isOrbiting;
            this.globeManager.orbitParams.isOrbiting = false;
            
            // Modifier la rotation en fonction de la touche
            switch (key) {
                case 'ArrowLeft':
                    this.globeManager.orbitParams.orbitAngle += 0.05;
                    break;
                case 'ArrowRight':
                    this.globeManager.orbitParams.orbitAngle -= 0.05;
                    break;
                case 'ArrowUp':
                    // Optionnellement utiliser pour augmenter l'inclinaison ou accélérer l'orbite
                    if (!this.globeManager.orbitParams.inHotspotMode) {
                        const prevIncl = this.globeManager.orbitParams.inclination;
                        this.globeManager.orbitParams.inclination = Math.min(
                            prevIncl + 0.03, 
                            Math.PI / 3 // Maximum 60 degrés
                        );
                    }
                    break;
                case 'ArrowDown':
                    // Optionnellement utiliser pour diminuer l'inclinaison ou ralentir l'orbite
                    if (!this.globeManager.orbitParams.inHotspotMode) {
                        const prevIncl = this.globeManager.orbitParams.inclination;
                        this.globeManager.orbitParams.inclination = Math.max(
                            prevIncl - 0.03,
                            0.1 // Minimum 5.7 degrés
                        );
                    }
                    break;
            }
            
            // Mettre à jour la caméra
            if (typeof this.globeManager._updateCameraPositionManual === 'function') {
                this.globeManager._updateCameraPositionManual();
            }
            
            // Réactiver l'orbite après un court délai
            setTimeout(() => {
                this.globeManager.orbitParams.isOrbiting = wasOrbiting;
            }, 500);
        } catch (e) {
            // Restaurer l'angle original en cas d'erreur
            if (this.globeManager && this.globeManager.orbitParams) {
                this.globeManager.orbitParams.orbitAngle = backupAngle;
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
        }, 10000); // 10 secondes d'inactivité
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
        
        // Obtenir les éléments d'interface
        const uiControls = document.getElementById('ui-controls');
        const huds = document.querySelectorAll('.satellite-hud, .coordinates-display');
        const crosshair = document.querySelector('.satellite-crosshair');
        
        // Animer la disparition progressive
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
        
        // Désactiver les interactions avec les éléments masqués
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
        
        // Obtenir les éléments d'interface
        const uiControls = document.getElementById('ui-controls');
        const huds = document.querySelectorAll('.satellite-hud, .coordinates-display');
        const crosshair = document.querySelector('.satellite-crosshair');
        
        // Réactiver les interactions
        uiControls.style.pointerEvents = 'auto';
        
        // Animer l'apparition progressive
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
            
            // Afficher une notification temporaire pour indiquer que 'H' peut réafficher l'interface
            // Notification désactivée volontairement

        } else {
            this.showInterface();
            this.startInterfaceAutoHide();
        }
    }
}