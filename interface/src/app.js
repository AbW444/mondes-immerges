// Application principale pour Mondes Immergés
import { GlobeManager } from './modules/GlobeManager.js';
import { VisualEffects } from './modules/VisualEffects.js';
import { Interaction } from './modules/Interaction.js';
import { InterfaceUI } from './modules/InterfaceUI.js';
import { ContentPanel } from './modules/ContentPanel.js';
import { hotspots, getHotspotById } from './data/hotspots.js';


/**
 * Application principale Mondes Immergés
 * Classe singleton pour la gestion globale de l'application
 */
class MondesImmergesApp {
    constructor() {
        // Instances des modules
        this.globeManager = null;
        this.visualEffects = null;
        this.interaction = null;
        this.interfaceUI = null;
        this.contentPanel = null;
        
        // État de l'application
        this.isInitialized = false;
        this.isExploring = false;
        this.currentHotspot = null;
        this.explorationHistory = [];
        
        // Éléments DOM
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.mainContainer = document.getElementById('main-container');
        this.loadingScreen = document.getElementById('loading-screen');
    }
    
    /**
     * Initialise l'application complète
     */
    init() {
        console.log('Initialisation de l\'application Mondes Immergés');
        
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        // DÉSACTIVÉ: Fond étoilé supprimé pour éviter les particules blanches fixes
        // this.createStarryBackground();
        
        // Initialiser les effets visuels en premier
        this.visualEffects = new VisualEffects({
            container: this.mainContainer
        });
        
        // Initialiser le gestionnaire de globe
        this.globeManager = new GlobeManager({
            containerId: 'globe-container',
            videoPath: `${import.meta.env.BASE_URL}videos/globe-video.mp4`,
            skyTexturePath: `${import.meta.env.BASE_URL}images/night-sky.png`
        });
        
        // Initialiser la gestion des interactions
        this.interaction = new Interaction({
            globeManager: this.globeManager,
            visualEffects: this.visualEffects
        });
        
        // Initialiser l'interface utilisateur
        this.interfaceUI = new InterfaceUI({
            zoomInBtn: document.getElementById('zoom-in'),
            zoomOutBtn: document.getElementById('zoom-out'),
            resetViewBtn: document.getElementById('reset-view'),
            infoBtn: document.getElementById('info-button'),
            closeInfoBtn: document.getElementById('close-info'),
            infoOverlay: document.getElementById('info-overlay'),
            globeManager: this.globeManager
        });
        
        // Initialiser le panneau de contenu seulement si les éléments existent
        const contentPanelElements = {
            panel: document.getElementById('content-panel'),
            closeBtn: document.getElementById('close-panel'),
            titleElement: document.getElementById('hotspot-title'),
            descriptionElement: document.getElementById('hotspot-description'),
            videoElement: document.getElementById('hotspot-video'),
            globeManager: this.globeManager
        };
        
        // Vérifier si au moins les éléments essentiels existent
        if (contentPanelElements.panel && contentPanelElements.closeBtn && 
            contentPanelElements.titleElement && contentPanelElements.descriptionElement) {
            this.contentPanel = new ContentPanel(contentPanelElements);
        } else {
            console.warn('ContentPanel: Éléments DOM du panneau de contenu manquants, fonctionnalité désactivée');
            // Créer un objet mock pour éviter les erreurs
            this.contentPanel = {
                show: () => console.log('ContentPanel.show() appelé mais panneau désactivé'),
                hide: () => console.log('ContentPanel.hide() appelé mais panneau désactivé'),
                update: () => console.log('ContentPanel.update() appelé mais panneau désactivé')
            };
        }
        
        // Configurer les callbacks pour les événements de hotspot
        this.globeManager.setHotspotSelectCallback(this.handleHotspotSelect.bind(this));
        this.globeManager.setHotspotExitCallback(this.handleHotspotExit.bind(this));
        
        // Démarrer l'animation du globe
        this.globeManager.animate();
        
        // Ajouter les hotspots au globe
        this.globeManager.addHotspots(hotspots);
        
        // Initialiser l'interface satellite
        this.initSatelliteInterface();
        
        // Configurer les événements de l'application
        this.setupEventListeners();
        
        // Ajouter le logo National Geographic
        this.addNatGeoLogo();
        
        console.log('Initialisation terminée avec succès');
    }
    
    /**
     * Configure les écouteurs d'événements de l'application
     */
    setupEventListeners() {
        // Bouton Explorer
        const exploreBtn = document.getElementById('explore-btn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', () => {
                this.startExploration();
            });
        }
        
        // Raccourcis clavier globaux
        document.addEventListener('keydown', (event) => {
            // Désactiver les touches fléchées et empêcher leur comportement par défaut
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                event.preventDefault();
                console.log(`Touche ${event.key} désactivée`);
                return;
            }

            // Touche Espace pour démarrer l'exploration depuis l'écran d'accueil
            if (event.key === ' ' && !this.isExploring) {
                this.startExploration();
            }

            // Touche Échap pour quitter le mode hotspot ou revenir à l'écran d'accueil
            if (event.key === 'Escape') {
                if (this.currentHotspot) {
                    this.globeManager.exitHotspotModeExternal();
                    this.currentHotspot = null;
                } else if (this.isExploring) {
                    // Option pour revenir à l'écran d'accueil avec double échap
                    // Peut être désactivé selon les préférences
                    // this.returnToWelcomeScreen();
                }
            }
        });
        
        // Gérer le redimensionnement de la fenêtre
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    /**
     * Démarre l'exploration avec une animation d'entrée
     * @param {boolean} skipStartupAnimation - Si true, saute l'animation de démarrage fictive
     */
    startExploration(skipStartupAnimation = false) {
        if (this.isExploring) return;
        
        // Masquer l'écran d'accueil et afficher le conteneur principal
        if (this.welcomeScreen) {
            this.welcomeScreen.classList.add('hidden');
        }
        if (this.mainContainer) {
            this.mainContainer.classList.remove('hidden');
        }
        
        // Transition visuelle
        this.visualEffects.transitionIn();
        
        // Si skipStartupAnimation est true, on saute la séquence d'initialisation
        if (skipStartupAnimation) {
            console.log("Séquence de démarrage fictive ignorée");
            this.isExploring = true;
        } else {
            // Attendre la fin de la transition pour démarrer la séquence d'initialisation
            setTimeout(() => {
                this.startupSequence();
            }, 1000);
            
            this.isExploring = true;
        }
    }
    
    /**
     * Retourne à l'écran d'accueil
     */
    returnToWelcomeScreen() {
        if (!this.isExploring) return;
        
        // Transition de sortie
        this.visualEffects.transitionOut(() => {
            // Masquer le conteneur principal et afficher l'écran d'accueil
            if (this.mainContainer) {
                this.mainContainer.classList.add('hidden');
            }
            if (this.welcomeScreen) {
                this.welcomeScreen.classList.remove('hidden');
            }
            
            // Réinitialiser l'état
            this.isExploring = false;
            this.currentHotspot = null;
            
            // Réinitialiser les vues
            if (this.contentPanel && this.contentPanel.hide) {
                this.contentPanel.hide();
            }
            
            if (this.globeManager) {
                this.globeManager.resetView();
            }
        });
    }
    
    /**
     * Gère le redimensionnement de la fenêtre
     */
    handleResize() {
        // Mettre à jour les dimensions du renderer si nécessaire
        if (this.globeManager && this.globeManager.renderer) {
            this.globeManager.onWindowResize();
        }
        
        // Autres ajustements responsive si nécessaire
    }
    
    /**
     * Crée un arrière-plan étoilé
     */
    createStarryBackground() {
        const background = document.createElement('div');
        background.className = 'starry-background';
        this.mainContainer.appendChild(background);
    }
    
    /**
     * Ajoute le logo National Geographic en haut au centre
     */
    addNatGeoLogo() {
        // Créer le conteneur du logo
        const logoContainer = document.createElement('div');
        logoContainer.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 100;
        `;
        
        // Créer l'élément image du logo
        const logo = document.createElement('img');
        logo.src = `${import.meta.env.BASE_URL}images/nat-geo-logo.png`;
        logo.alt = 'National Geographic';
        logo.style.cssText = `
            max-height: 40px;
            width: auto;
            object-fit: contain;
            filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.7));
        `;
        
        // Ajouter le logo au conteneur puis au document
        logoContainer.appendChild(logo);
        this.mainContainer.appendChild(logoContainer);
    }
    
    /**
     * Initialise l'interface satellite avec les mises à jour en temps réel
     */
    initSatelliteInterface() {
        // Éléments d'interface
        const coordLatElement = document.getElementById('coord-lat');
        const coordLngElement = document.getElementById('coord-lng');
        const zoomLevelElement = document.getElementById('zoom-level');
        const orbitStatusElement = document.getElementById('orbit-status');
        const altitudeElement = document.getElementById('altitude-value');
        const currentDateElement = document.getElementById('current-date');
        const currentTimeElement = document.getElementById('current-time');
        
        // Mise à jour en temps réel
        setInterval(() => {
            // Mettre à jour l'heure et la date
            const now = new Date();
            
            // Formater la date
            const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
            if (currentDateElement) {
                currentDateElement.textContent = now.toLocaleDateString('fr-FR', dateOptions);
            }
            
            // Formater l'heure UTC
            const hours = String(now.getUTCHours()).padStart(2, '0');
            const minutes = String(now.getUTCMinutes()).padStart(2, '0');
            const seconds = String(now.getUTCSeconds()).padStart(2, '0');
            if (currentTimeElement) {
                currentTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
            }
            
            // Mise à jour des coordonnées et du statut si le globe est initialisé
            if (this.globeManager && this.globeManager.camera) {
                // Position de la caméra
                const cameraPosition = this.globeManager.camera.position;
                
                // Calculer les coordonnées géographiques approximatives
                const distance = Math.sqrt(
                    cameraPosition.x * cameraPosition.x + 
                    cameraPosition.z * cameraPosition.z
                );
                
                const lng = Math.atan2(cameraPosition.z, cameraPosition.x) * (180 / Math.PI);
                const lat = Math.atan2(cameraPosition.y, distance) * (180 / Math.PI);
                
                // Mettre à jour les valeurs d'interface
                if (coordLatElement) {
                    coordLatElement.textContent = Math.abs(lat).toFixed(4) + (lat >= 0 ? '' : '-');
                }
                
                if (coordLngElement) {
                    coordLngElement.textContent = Math.abs(lng).toFixed(4) + (lng >= 0 ? '' : '-');
                }
                
                // Calculer l'altitude (distance au centre)
                const altitude = cameraPosition.length();
                if (altitudeElement) {
                    altitudeElement.textContent = altitude.toFixed(3);
                }
                
                // Mettre à jour le niveau de zoom
                if (zoomLevelElement && this.globeManager.orbitParams) {
                    zoomLevelElement.textContent = this.globeManager.orbitParams.zoomLevel.toFixed(1);
                }
                
                // Mettre à jour le statut d'orbite
                if (orbitStatusElement && this.globeManager.orbitParams) {
                    if (this.globeManager.orbitParams.inHotspotMode) {
                        orbitStatusElement.textContent = "FIXÉE";
                        orbitStatusElement.style.color = "#ffcc00";
                    } else if (this.globeManager.orbitParams.currentSpeed > this.globeManager.orbitParams.baseSpeed * 1.5) {
                        orbitStatusElement.textContent = "ACCÉLÉRÉE";
                        orbitStatusElement.style.color = "#ff9900";
                    } else if (this.globeManager.orbitParams.currentSpeed < this.globeManager.orbitParams.baseSpeed) {
                        orbitStatusElement.textContent = "RALENTIE";
                        orbitStatusElement.style.color = "#66ccff";
                    } else {
                        orbitStatusElement.textContent = "NORMALE";
                        orbitStatusElement.style.color = "#ffffff";
                    }
                }
            }
        }, 100);
    }
    
    /**
     * Exécute une séquence de démarrage stylisée
     */
    startupSequence() {
        // Créer l'effet de chargement orbital seulement - pas de texte, pas de barre
        this.visualEffects.createOrbitalLoaderEffect(() => {
            // Cette fonction sera appelée une fois l'animation terminée
            this.finalizeStartup();
        }, 1.5);

        // Pas de messages - loader uniquement
    }
    
    /**
     * Finalise le démarrage après la séquence d'animation
     */
    finalizeStartup() {
        // Afficher des messages système après le chargement
        this.showSystemMessages();

        // DÉSACTIVÉ: Particules d'arrière-plan supprimées pour éviter le freeze
        // this.visualEffects.addBackgroundParticles({
        //     count: 30,
        //     container: this.mainContainer
        // });

        // Jouer la vidéo de transition inversée (entrée sur le site)
        this.playTransitionVideoReversed();

        // Afficher une notification de bienvenue
        setTimeout(() => {
            this.visualEffects.showNotification(
                "Bienvenue dans l'exploration des Mondes Immergés",
                "info",
                4000
            );
        }, 1000);
    }

    /**
     * Joue la vidéo de transition inversée (à l'entrée sur le site)
     */
    playTransitionVideoReversed() {
        const video = document.getElementById('transitionVideo');
        if (!video) {
            console.warn('Vidéo de transition non trouvée');
            return;
        }

        console.log('🎬 Lecture de la vidéo de transition (inversée)');

        // Afficher la vidéo
        video.classList.add('active');

        // Attendre que les métadonnées soient chargées
        video.addEventListener('loadedmetadata', () => {
            // Démarrer à la fin pour jouer à l'envers
            video.currentTime = video.duration;
            video.playbackRate = -1; // Jouer à l'envers

            // Lancer la vidéo
            video.play().then(() => {
                console.log('✅ Vidéo de transition inversée lancée');

                // Écouter la fin (début en fait, car inversée)
                const checkEnded = setInterval(() => {
                    if (video.currentTime <= 0.1) {
                        clearInterval(checkEnded);
                        console.log('✅ Vidéo de transition inversée terminée');

                        // Masquer la vidéo
                        video.classList.remove('active');
                        video.pause();
                    }
                }, 100);
            }).catch(e => {
                console.error('Erreur lors de la lecture de la vidéo:', e);
                video.classList.remove('active');
            });
        }, { once: true });

        // Charger la vidéo si nécessaire
        if (video.readyState < 2) {
            video.load();
        } else {
            // Si déjà chargée, déclencher l'événement
            video.dispatchEvent(new Event('loadedmetadata'));
        }
    }
    
    /**
     * Affiche des messages système après le chargement
     */
    showSystemMessages() {
        // Cette méthode peut être utilisée pour afficher des messages informatifs
        // après le chargement de l'application
        
        // Vous pouvez implémenter cette fonction selon vos besoins
    }
    
    /**
     * Gère la sélection d'un point d'intérêt
     * @param {Object} hotspot - Le point d'intérêt sélectionné
     */
    handleHotspotSelect(hotspot) {
        console.log(`Point d'intérêt sélectionné: ${hotspot.title}`);
        
        // Mettre à jour l'état actuel
        this.currentHotspot = hotspot;
        
        // Ajouter à l'historique d'exploration
        this.explorationHistory.push({
            id: hotspot.id,
            title: hotspot.title,
            timestamp: Date.now()
        });
        
        // Appliquer des effets visuels pour mettre en évidence la sélection
        this.visualEffects.highlightSelection(hotspot.position);
        this.visualEffects.flashScreen('rgba(255, 204, 0, 0.2)');
        
        // Modifier l'interface pour le mode "zone sensible"
        const coordDisplay = document.querySelector('.coordinates-display');
        if (coordDisplay) {
            coordDisplay.style.backgroundColor = 'rgba(255, 204, 0, 0.2)';
            coordDisplay.style.borderColor = 'rgba(255, 204, 0, 0.8)';
        }
        
        // Récupérer les données complètes du hotspot
        const fullHotspotData = getHotspotById(hotspot.id);
        
        // Préparer les informations détaillées pour le panneau de contenu
        const detailedInfo = this.generateDetailedInfoHTML(fullHotspotData);
        
        // Préparer les liens externes
        const links = fullHotspotData.sources || [
            {
                title: "Étude scientifique de référence (National Geographic)",
                url: "https://www.nationalgeographic.com/environment/oceans"
            },
            {
                title: "Base de données océanographiques (NOAA)",
                url: "https://www.noaa.gov/oceans-coasts"
            },
            {
                title: "Conservation marine (UNESCO)",
                url: "https://en.unesco.org/themes/ocean"
            }
        ];
        
        // Mettre à jour le panneau de contenu avec les informations du hotspot
        if (this.contentPanel && this.contentPanel.update) {
            this.contentPanel.update({
                title: hotspot.title,
                description: hotspot.description,
                videoSrc: hotspot.videoSrc,
                coordinates: hotspot.position,
                detailedInfo: detailedInfo,
                links: links
            });
            
            // Afficher le panneau
            this.contentPanel.show();
        } else {
            console.log('ContentPanel non disponible, affichage des informations dans la console:');
            console.log('Titre:', hotspot.title);
            console.log('Description:', hotspot.description);
            console.log('Coordonnées:', hotspot.position);
        }
        
        // Masquer les contrôles de l'interface utilisateur
        if (this.interfaceUI && this.interfaceUI.setUIVisibility) {
            this.interfaceUI.setUIVisibility(false);
        }
        
        // Afficher une notification
        this.visualEffects.showNotification(`Exploration de: ${hotspot.title}`, 'info', 3000);
    }
    
    /**
     * Génère le HTML pour les informations détaillées d'un hotspot
     * @param {Object} hotspot - Données complètes du hotspot
     * @returns {string} - HTML formaté
     */
    generateDetailedInfoHTML(hotspot) {
        if (!hotspot || !hotspot.scientificData) {
            return '<p>Informations détaillées non disponibles pour cette zone.</p>';
        }
        
        // Formater les données scientifiques
        const data = hotspot.scientificData;
        
        let scientificHTML = `
            <div class="scientific-data">
                <strong>Profondeur moyenne:</strong> ${
                    data.depth ? 
                    (typeof data.depth === 'object' ? 
                     `${data.depth.min}-${data.depth.max} m (moy. ${data.depth.avg} m)` : 
                     data.depth) : 
                    'Non disponible'
                }<br>
                <strong>Température de l'eau:</strong> ${
                    data.temperature ? 
                    (typeof data.temperature === 'object' ? 
                     `${data.temperature.min}-${data.temperature.max}°C (moy. ${data.temperature.avg}°C)` : 
                     data.temperature) : 
                    'Non disponible'
                }<br>
                <strong>Biodiversité:</strong> ${data.biodiversity || 'Non classifiée'}<br>
                <strong>Statut de conservation:</strong> ${data.conservationStatus || 'Non déterminé'}<br>
        `;
        
        // Ajouter d'autres données spécifiques si disponibles
        if (data.area) scientificHTML += `<strong>Superficie:</strong> ${data.area}<br>`;
        if (data.iceExtent) scientificHTML += `<strong>Étendue de glace:</strong> ${typeof data.iceExtent === 'object' ? `Hiver: ${data.iceExtent.winter}, Été: ${data.iceExtent.summer}` : data.iceExtent}<br>`;
        if (data.annualInput) scientificHTML += `<strong>Apport annuel:</strong> ${data.annualInput}<br>`;
        if (data.economicValue) scientificHTML += `<strong>Valeur économique:</strong> ${data.economicValue}<br>`;
        
        scientificHTML += `</div>`;
        
        // Ajouter la description détaillée
        let detailedHTML = '';
        if (hotspot.detailedInfo) {
            detailedHTML = `
                <div class="detailed-text">
                    ${hotspot.detailedInfo}
                </div>
            `;
        }
        
        // Ajouter une visualisation des données d'évolution si disponible
        let evolutionHTML = '';
        if (hotspot.evolutionData && hotspot.evolutionData.length > 0) {
            evolutionHTML = `
                <div class="data-visualization">
                    <h4>Évolution sur ${hotspot.evolutionData[hotspot.evolutionData.length-1].year - hotspot.evolutionData[0].year} ans</h4>
                    <div class="chart-placeholder" style="width: 100%; height: 200px; background-color: rgba(0, 30, 60, 0.5); border-radius: 5px; display: flex; justify-content: center; align-items: center;">
                        <span>Graphique de tendance (à implémenter)</span>
                    </div>
                </div>
            `;
        }
        
        // Assembler le tout
        return `
            ${scientificHTML}
            ${detailedHTML}
            ${evolutionHTML}
        `;
    }
    
    /**
     * Gère la sortie du mode hotspot
     */
    handleHotspotExit() {
        // Masquer le panneau de contenu
        if (this.contentPanel && this.contentPanel.hide) {
            this.contentPanel.hide();
        }
        
        // Réinitialiser l'interface de coordonnées
        const coordDisplay = document.querySelector('.coordinates-display');
        if (coordDisplay) {
            coordDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            coordDisplay.style.borderColor = 'rgba(255, 204, 0, 0.3)';
        }
        
        // Réafficher les contrôles de l'interface utilisateur
        if (this.interfaceUI && this.interfaceUI.setUIVisibility) {
            this.interfaceUI.setUIVisibility(true);
        }
        
        // Afficher une notification
        if (this.visualEffects) {
            this.visualEffects.showNotification("Retour à l'exploration globale", "info", 3000);
        }
        
        // Réinitialiser l'état actuel
        this.currentHotspot = null;
    }
}

// Instance unique de l'application
const app = new MondesImmergesApp();

/**
 * Initialise l'application
 */
export function initApp() {
    app.init();
}

/**
 * Donne accès à l'instance de l'application (pour le débogage)
 */
export function getAppInstance() {
    return app;
}