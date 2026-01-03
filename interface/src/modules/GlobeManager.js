// Gestionnaire de globe pour Mondes Immergés - VERSION CORRIGÉE
import * as THREE from 'three';
import { gsap } from 'gsap';
// Import corrigé pour la redirection
import { getRedirectUrl } from '../data/redirect-config.js';


export class GlobeManager {
    constructor(options) {
        this.options = options;
        this.container = document.getElementById(options.containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.globe = null;
        this.videoElement = null;
        this.videoTexture = null;
        this.hotspotObjects = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.clock = new THREE.Clock();
        
        // NOUVEAU: Variables pour la gestion des vidéos
        this.currentVideoPath = `${import.meta.env.BASE_URL}videos/globe-video.webm`;
        this.alternateVideoPath = `${import.meta.env.BASE_URL}videos/globe-video-aberration.webm`;
        this.isAlternateVideo = false;
        
        // Paramètres pour l'orbite ellipsoïdale
        this.orbitParams = {
            isOrbiting: true,
            baseSpeed: 0.0004,
            currentSpeed: 0.0004,
            maxSpeed: 0.002,
            accelerationFactor: 1.3,
            decelerationFactor: 0.9,
            ellipseMajorAxis: 12,
            ellipseMinorAxis: 8,
            inclination: Math.PI / 6,
            orbitAngle: 0,
            zoomLevel: 1,
            maxZoomLevel: 1.1,
            minZoomLevel: 0.6,
            inHotspotMode: false,
            orbitHistory: []
        };
        
        this.celestialParams = {
            sunPosition: new THREE.Vector3(100, 20, 100),
            moonPosition: new THREE.Vector3(-70, 30, -50)
        };
        
        this._savedState = null;
        
        this.init();
    }
    
    init() {
        // Créer la scène
        this.scene = new THREE.Scene();
        
        // Ajouter une lumière ambiante blanche
        const ambient = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambient);
        
        // Ajouter une lumière directionnelle douce
        const directional = new THREE.DirectionalLight(0xffffff, 0.5);
        directional.position.set(5, 10, 7);
        this.scene.add(directional);
        
        this.scene.fog = new THREE.FogExp2(0x000000, 0.00015);
        
        // Créer la caméra
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        this.updateCameraPosition();
        
        // Créer le renderer avec vérifications WebGL
        try {
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true, 
                alpha: true,
                logarithmicDepthBuffer: true,
                powerPreference: "high-performance"
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limiter pour les performances
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Vérifier les capacités WebGL
            const gl = this.renderer.getContext();
            console.log('WebGL Version:', gl.getParameter(gl.VERSION));
            console.log('WebGL Vendor:', gl.getParameter(gl.VENDOR));
            console.log('Max Texture Size:', gl.getParameter(gl.MAX_TEXTURE_SIZE));
            
            this.container.appendChild(this.renderer.domElement);
        } catch (error) {
            console.error('Erreur lors de la création du renderer WebGL:', error);
            this.handleWebGLError();
            return;
        }
        
        // Créer l'arrière-plan étoilé
        this.createSkybox();
        
        // Créer l'éclairage
        this.setupLighting();
        
        // Créer le globe
        this.createGlobe();
        
        // Créer le soleil et la lune
        this.createCelestialBodies();
        
        // Créer la trajectoire de la caméra
        this.createOrbitPath();
        
        // Ajouter les écouteurs d'événements
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.container.addEventListener('click', this.onMouseClick.bind(this));
        
        // NOUVEAU: Ajouter l'écouteur pour la touche Entrée
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // Ajouter le logo
        this.addLogo();
    }
    
    // Méthode pour gérer les erreurs WebGL
    handleWebGLError() {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.9);
            color: #ffcc00;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            font-family: 'Roboto Mono', monospace;
            z-index: 10000;
            border: 2px solid #ffcc00;
            max-width: 500px;
        `;
        
        errorDiv.innerHTML = `
            <h2>Erreur d'initialisation 3D</h2>
            <p>Impossible d'initialiser le rendu WebGL.</p>
            <p>Veuillez vérifier que votre navigateur supporte WebGL.</p>
            <button onclick="location.reload()" style="background: #ffcc00; color: #000; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-family: inherit; margin-top: 10px;">
                Réessayer
            </button>
        `;
        
        this.container.appendChild(errorDiv);
    }
    
    // NOUVELLE MÉTHODE: Gestionnaire des événements clavier
    onKeyDown(event) {
        if (event.key === 'Enter') {
            this.switchVideoTexture();
        }
    }
    
    // NOUVELLE MÉTHODE: Changer la texture vidéo du globe
    switchVideoTexture() {
        if (!this.videoElement || !this.videoTexture) {
            console.warn('Vidéo ou texture non initialisée');
            return;
        }
        
        console.log('=== CHANGEMENT DE TEXTURE VIDÉO ===');
        
        // Basculer vers l'autre vidéo
        this.isAlternateVideo = !this.isAlternateVideo;
        const newVideoPath = this.isAlternateVideo ? this.alternateVideoPath : this.currentVideoPath;
        
        console.log(`Passage à: ${newVideoPath}`);
        
        // Créer un nouvel élément vidéo pour éviter les conflits
        const newVideo = document.createElement('video');
        newVideo.src = newVideoPath;
        newVideo.loop = true;
        newVideo.muted = true;
        newVideo.autoplay = true;
        newVideo.playsInline = true;
        newVideo.crossOrigin = 'anonymous';
        
        // Gérer le chargement de la nouvelle vidéo
        newVideo.addEventListener('canplaythrough', () => {
            console.log('Nouvelle vidéo prête');
            
            // Arrêter l'ancienne vidéo
            this.videoElement.pause();
            
            // Créer une nouvelle texture avec la nouvelle vidéo
            const newTexture = new THREE.VideoTexture(newVideo);
            newTexture.minFilter = THREE.LinearFilter;
            newTexture.magFilter = THREE.LinearFilter;
            newTexture.format = THREE.RGBAFormat;
            newTexture.colorSpace = THREE.SRGBColorSpace;
            
            // Remplacer la texture du matériau du globe
            if (this.globe && this.globe.material) {
                // Disposer de l'ancienne texture pour libérer la mémoire
                if (this.videoTexture) {
                    this.videoTexture.dispose();
                }
                
                // Appliquer la nouvelle texture
                this.globe.material.map = newTexture;
                this.globe.material.needsUpdate = true;
                
                // Mettre à jour les références
                this.videoElement = newVideo;
                this.videoTexture = newTexture;
                
                console.log('Texture du globe mise à jour avec succès');
                
                // Effet visuel pour indiquer le changement
                this.createVideoSwitchEffect();
            }
        });
        
        newVideo.addEventListener('error', (e) => {
            console.error('Erreur lors du chargement de la nouvelle vidéo:', e);
            console.log('Tentative de retour à la vidéo précédente...');
            // Revenir à l'état précédent en cas d'erreur
            this.isAlternateVideo = !this.isAlternateVideo;
        });
        
        // Commencer le chargement
        newVideo.load();
        
        // Démarrer la lecture une fois chargée
        newVideo.play().catch(e => {
            console.error('Erreur lors de la lecture de la nouvelle vidéo:', e);
        });
    }
    
    // NOUVELLE MÉTHODE: Effet visuel lors du changement de vidéo
    createVideoSwitchEffect() {
        // Créer un effet de flash subtil pour indiquer le changement
        const flashOverlay = document.createElement('div');
        flashOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(255, 204, 0, 0.3);
            pointer-events: none;
            z-index: 50;
            opacity: 0;
        `;
        
        this.container.appendChild(flashOverlay);
        
        // Animation du flash
        gsap.timeline()
            .to(flashOverlay, {
                opacity: 1,
                duration: 0.1,
                ease: "power2.out"
            })
            .to(flashOverlay, {
                opacity: 0,
                duration: 0.3,
                ease: "power2.out",
                onComplete: () => {
                    flashOverlay.remove();
                }
            });
        
        // Créer une notification pour informer du changement
        this.showVideoSwitchNotification();
    }
    
    // NOUVELLE MÉTHODE: Notification du changement de vidéo
    showVideoSwitchNotification() {
        // Créer une notification temporaire
        const notification = document.createElement('div');
        notification.textContent = this.isAlternateVideo ? 
            'Mode Aberration Activé' : 
            'Mode Normal Activé';
        
        notification.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 10, 30, 0.9);
            color: #ffcc00;
            padding: 15px 25px;
            border-radius: 8px;
            font-family: 'Roboto Mono', monospace;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            border: 2px solid #ffcc00;
            box-shadow: 0 0 20px rgba(255, 204, 0, 0.5);
            z-index: 100;
            pointer-events: none;
            opacity: 0;
            letter-spacing: 1px;
        `;
        
        this.container.appendChild(notification);
        
        // Animation de la notification
        gsap.timeline()
            .to(notification, {
                opacity: 1,
                scale: 1.1,
                duration: 0.3,
                ease: "back.out(1.7)"
            })
            .to(notification, {
                scale: 1,
                duration: 0.2
            })
            .to(notification, {
                opacity: 0,
                scale: 0.9,
                duration: 0.5,
                delay: 1.5,
                ease: "power2.in",
                onComplete: () => {
                    notification.remove();
                }
            });
    }
    
    addLogo() {
        const logoContainer = document.createElement('div');
        logoContainer.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 100;
        `;
        
        const logo = document.createElement('img');
        logo.src = `${import.meta.env.BASE_URL}images/nat-geo-logo.png`;
        logo.alt = 'National Geographic';
        logo.style.cssText = `
            height: 40px;
            width: auto;
            filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
        `;
        
        logoContainer.appendChild(logo);
        this.container.appendChild(logoContainer);
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404050, 0.5);
        this.scene.add(ambientLight);
        
        const sunLight = new THREE.DirectionalLight(0xffffff, 1);
        sunLight.position.copy(this.celestialParams.sunPosition);
        sunLight.castShadow = true;
        
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        
        this.scene.add(sunLight);
        this.sunLight = sunLight;
        
        const hemisphereLight = new THREE.HemisphereLight(0x0088ff, 0x00ff88, 0.6);
        this.scene.add(hemisphereLight);
    }
    
    createCelestialBodies() {
        const textureLoader = new THREE.TextureLoader();

        const sunTexture = textureLoader.load(`${import.meta.env.BASE_URL}images/sun-texture.jpg`);
        const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            map: sunTexture,
            transparent: true,
            opacity: 0.95
        });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.copy(this.celestialParams.sunPosition);
        this.scene.add(sun);

        const moonTexture = textureLoader.load(`${import.meta.env.BASE_URL}images/moon-texture.jpg`);
        const moonGeometry = new THREE.SphereGeometry(1.5, 32, 32);
        const moonMaterial = new THREE.MeshStandardMaterial({
            map: moonTexture,
        });
        const moon = new THREE.Mesh(moonGeometry, moonMaterial);
        moon.position.copy(this.celestialParams.moonPosition);
        this.scene.add(moon);

        this.sun = sun;
        this.moon = moon;
    }
    
    createOrbitPath() {
        const points = [];
        const segments = 100;
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const a = this.orbitParams.ellipseMajorAxis;
            const b = this.orbitParams.ellipseMinorAxis;
            const inclination = this.orbitParams.inclination;
            
            let x = a * Math.cos(angle);
            let z = b * Math.sin(angle);
            
            const y = z * Math.sin(inclination);
            z = z * Math.cos(inclination);
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        const pathGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const markerGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 0.9
        });
        
        this.cameraMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        this.scene.add(this.cameraMarker);
    }
    
    createGlobe() {
        const video = document.createElement('video');
        // Utiliser la vidéo par défaut au démarrage
        video.src = this.currentVideoPath;
        video.loop = true;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        this.videoElement = video;
        
        video.addEventListener('ended', () => {
            video.play();
        });
        
        setInterval(() => {
            if (video.paused && !video.ended) {
                console.log("Vidéo en pause, relance...");
                video.play().catch(e => {
                    console.error("Impossible de relancer la vidéo:", e);
                });
            }
        }, 1000);
        
        this.videoTexture = new THREE.VideoTexture(video);
        this.videoTexture.minFilter = THREE.LinearFilter;
        this.videoTexture.magFilter = THREE.LinearFilter;
        this.videoTexture.format = THREE.RGBAFormat;
        this.videoTexture.colorSpace = THREE.SRGBColorSpace;
        
        const depthGeometry = new THREE.SphereGeometry(1.99, 64, 64);
        const depthMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.0,
            colorWrite: false,
            depthWrite: true,
            side: THREE.FrontSide
        });
        
        const depthSphere = new THREE.Mesh(depthGeometry, depthMaterial);
        depthSphere.renderOrder = 0;
        this.scene.add(depthSphere);
        this.depthSphere = depthSphere;
        
        const globeGeometry = new THREE.SphereGeometry(2, 64, 64);
        
        const globeMaterial = new THREE.MeshBasicMaterial({
            map: this.videoTexture,
            transparent: true,
            opacity: 1,
            side: THREE.FrontSide,
            depthTest: true,
            depthWrite: false,
            color: 0xffffff,
            toneMapped: false
        });
        
        this.globe = new THREE.Mesh(globeGeometry, globeMaterial);
        this.globe.castShadow = true;
        this.globe.receiveShadow = true;
        this.globe.renderOrder = 1;
        this.scene.add(this.globe);
        
        this.createAtmosphere();
        
        const cloudsGeometry = new THREE.SphereGeometry(2.02, 64, 64);
        const cloudsMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4,
            alphaTest: 0.1,
            depthTest: true,
            depthWrite: false
        });
        
        this.clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
        this.clouds.renderOrder = 2;
        this.scene.add(this.clouds);
        
        video.play().catch(e => {
            console.error('Erreur lors de la lecture de la vidéo:', e);
            this.handleVideoError();
        });
    }
    
    // MÉTHODE CORRIGÉE: Atmosphère avec shader compatible
    createAtmosphere() {
        const atmosphereGeometry = new THREE.SphereGeometry(2.08, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vWorldPosition;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                #ifdef GL_ES
                precision mediump float;
                #endif
                
                uniform vec3 cameraPosition;
                varying vec3 vNormal;
                varying vec3 vWorldPosition;
                
                void main() {
                    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
                    float fresnel = 1.0 - abs(dot(viewDirection, vNormal));
                    
                    float distance = length(cameraPosition - vWorldPosition);
                    float attenuation = 1.0 / (1.0 + distance * 0.05);
                    
                    vec3 atmosphereColor = vec3(0.3, 0.6, 1.0);
                    
                    float intensity = pow(fresnel, 1.5) * attenuation;
                    
                    gl_FragColor = vec4(atmosphereColor, intensity * 0.3);
                }
            `,
            uniforms: {
                cameraPosition: { value: new THREE.Vector3() }
            },
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(atmosphere);
        this.atmosphere = atmosphere;
        
        this.updateAtmosphereUniforms = () => {
            if (this.atmosphere && this.atmosphere.material.uniforms) {
                this.atmosphere.material.uniforms.cameraPosition.value.copy(this.camera.position);
            }
        };
    }
    
    createSkybox() {
        const loader = new THREE.TextureLoader();
        const skyTexturePath = `${import.meta.env.BASE_URL}images/night-sky.png`;
        
        loader.load(skyTexturePath, (texture) => {
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 0.3;
            
            const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
            rt.fromEquirectangularTexture(this.renderer, texture);
            this.scene.background = rt.texture;
            
            this.scene.fog = new THREE.FogExp2(0x000011, 0.00008);
        }, 
        undefined, 
        (error) => {
            console.error('Erreur lors du chargement de la texture du ciel:', error);
            this.scene.background = new THREE.Color(0x000011);
        });
    }
    
    updateCameraPosition() {
        if (!this.orbitParams.isOrbiting) return;
        
        const a = this.orbitParams.ellipseMajorAxis * this.orbitParams.zoomLevel;
        const b = this.orbitParams.ellipseMinorAxis * this.orbitParams.zoomLevel;
        
        let x = a * Math.cos(this.orbitParams.orbitAngle);
        let z = b * Math.sin(this.orbitParams.orbitAngle);
        
        const inclination = this.orbitParams.inclination;
        const y = z * Math.sin(inclination);
        z = z * Math.cos(inclination);
        
        this.camera.position.set(x, y, z);
        
        this.camera.lookAt(0, 0, 0);
        
        if (this.cameraMarker) {
            this.cameraMarker.position.set(x, y, z);
        }
        
        this.orbitParams.orbitAngle += this.orbitParams.currentSpeed;
        
        this.orbitParams.orbitHistory.push(new THREE.Vector3(x, y, z));
        
        if (this.orbitParams.orbitHistory.length > 100) {
            this.orbitParams.orbitHistory.shift();
        }
    }
    
    _updateCameraPositionManual() {
        const a = this.orbitParams.ellipseMajorAxis * this.orbitParams.zoomLevel;
        const b = this.orbitParams.ellipseMinorAxis * this.orbitParams.zoomLevel;
        
        let x = a * Math.cos(this.orbitParams.orbitAngle);
        let z = b * Math.sin(this.orbitParams.orbitAngle);
        
        const inclination = this.orbitParams.inclination;
        const y = z * Math.sin(inclination);
        z = z * Math.cos(inclination);
        
        this.camera.position.set(x, y, z);
        
        this.camera.lookAt(0, 0, 0);
        
        if (this.cameraMarker) {
            this.cameraMarker.position.copy(this.camera.position);
        }
    }
    
    addHotspots(hotspots) {
        this.hotspotObjects.forEach(hotspot => {
            this.scene.remove(hotspot);
            
            if (hotspot.userData.labelContainer) {
                document.body.removeChild(hotspot.userData.labelContainer);
            }
        });
        this.hotspotObjects = [];
        
        hotspots.forEach(hotspot => {
            const { position, title } = hotspot;
            
            const lat = position.lat * (Math.PI / 180);
            const lon = position.lng * (Math.PI / 180);
            
            const radius = 2.1;
            const x = radius * Math.cos(lat) * Math.cos(lon);
            const y = radius * Math.sin(lat);
            const z = radius * Math.cos(lat) * Math.sin(lon);
            
            console.log(`Hotspot ${title}: GPS(${position.lat}, ${position.lng}) -> 3D(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
            
            const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: 0xffcc00,
                transparent: true,
                opacity: 0.8
            });
            
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(x, y, z);
            marker.userData = { hotspot };
            
            const haloGeometry = new THREE.SphereGeometry(0.08, 16, 16);
            const haloMaterial = new THREE.MeshBasicMaterial({
                color: 0xffcc00,
                transparent: true,
                opacity: 0.5,
                side: THREE.BackSide
            });
            
            const halo = new THREE.Mesh(haloGeometry, haloMaterial);
            marker.add(halo);
            
            this.addHotspotLabel(marker, title, new THREE.Vector3(x, y, z));
            
            this.scene.add(marker);
            this.hotspotObjects.push(marker);
        });
    }
    
    addHotspotLabel(marker, text, position) {
        const labelContainer = document.createElement('div');
        labelContainer.className = 'hotspot-label-container';
        labelContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
            z-index: 10;
        `;

        const labelDiv = document.createElement('div');
        labelDiv.className = 'hotspot-label';
        labelDiv.textContent = text;
        labelDiv.style.cssText = `
            position: absolute;
            background-color: rgba(0, 0, 0, 0.7);
            color: #ffcc00;
            padding: 5px 10px;
            border-radius: 4px;
            font-family: 'Roboto Mono', monospace;
            font-size: 12px;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.3s ease, background-color 0.3s ease, transform 0.2s ease;
            border: 1px solid rgba(255, 204, 0, 0.7);
            z-index: 11;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(2px);
            text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
            pointer-events: auto;
            cursor: pointer;
        `;

        // Ajouter les effets de survol
        labelDiv.addEventListener('mouseenter', () => {
            labelDiv.style.backgroundColor = 'rgba(255, 204, 0, 0.9)';
            labelDiv.style.color = '#000';
            labelDiv.style.transform = 'scale(1.05)';
        });

        labelDiv.addEventListener('mouseleave', () => {
            labelDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            labelDiv.style.color = '#ffcc00';
            labelDiv.style.transform = 'scale(1)';
        });

        // Rendre le label cliquable avec le même comportement que le hotspot
        labelDiv.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêcher la propagation au conteneur
            const hotspot = marker.userData.hotspot;
            if (hotspot) {
                console.log(`Label cliqué: ${hotspot.title}`);
                this.activateHotspot(hotspot);
            }
        });
        
        const connector = document.createElement('div');
        connector.className = 'connector-line';
        connector.style.cssText = `
            position: absolute;
            background: linear-gradient(to right, rgba(255, 204, 0, 0.9), rgba(255, 204, 0, 0.3));
            height: 1.5px;
            transform-origin: 0 0;
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 10;
            box-shadow: 0 0 4px rgba(255, 204, 0, 0.5);
        `;
        
        labelContainer.appendChild(labelDiv);
        labelContainer.appendChild(connector);
        document.body.appendChild(labelContainer);
        
        marker.userData.label = labelDiv;
        marker.userData.connector = connector;
        marker.userData.labelContainer = labelContainer;
        marker.userData.worldPosition = position.clone();
        
        const isPointVisibleToCamera = (pointPosition) => {
            const worldToLocal = new THREE.Vector3().copy(pointPosition).project(this.camera);
            
            if (worldToLocal.z > 1) return false;
            
            if (worldToLocal.x < -1 || worldToLocal.x > 1 || worldToLocal.y < -1 || worldToLocal.y > 1) return false;
            
            const direction = new THREE.Vector3().subVectors(pointPosition, this.camera.position).normalize();
            const raycaster = new THREE.Raycaster(this.camera.position, direction);
            const intersects = raycaster.intersectObject(this.globe);
            
            if (intersects.length > 0) {
                const distanceToIntersection = intersects[0].distance;
                const distanceToPoint = this.camera.position.distanceTo(pointPosition);
                
                return distanceToIntersection > distanceToPoint - 0.1;
            }
            
            return true;
        };
        
        marker.onBeforeRender = () => {
            if (!marker.userData.label || !marker.userData.connector) return;
            
            const isVisible = isPointVisibleToCamera(marker.userData.worldPosition);
            
            if (isVisible && !this.orbitParams.inHotspotMode) {
                const vector = marker.userData.worldPosition.clone();
                vector.project(this.camera);
                
                const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
                
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                
                const distFromCenter = Math.sqrt(
                    Math.pow(x - centerX, 2) + 
                    Math.pow(y - centerY, 2)
                );
                
                const angle = Math.atan2(y - centerY, x - centerX);
                
                const minDistance = Math.min(centerX, centerY) * 0.6;
                
                let labelX, labelY;
                if (distFromCenter < minDistance) {
                    const offsetDistance = minDistance + 60 + (Math.sin(angle * 5) * 20);
                    labelX = centerX + Math.cos(angle) * offsetDistance;
                    labelY = centerY + Math.sin(angle) * offsetDistance;
                    
                    const padding = 20;
                    if (labelX < padding) labelX = padding;
                    if (labelX > window.innerWidth - padding) labelX = window.innerWidth - padding;
                    if (labelY < padding) labelY = padding;
                    if (labelY > window.innerHeight - padding) labelY = window.innerHeight - padding;
                } else {
                    const textWidth = text.length * 8;
                    const offsetX = 25 + textWidth * 0.25;
                    const offsetY = 10;
                    
                    if (x + offsetX + textWidth > window.innerWidth - 20) {
                        labelX = x - offsetX - textWidth;
                    } else {
                        labelX = x + offsetX;
                    }
                    
                    if (y - offsetY - 30 < 20) {
                        labelY = y + offsetY;
                    } else {
                        labelY = y - offsetY;
                    }
                }
                
                marker.userData.label.style.left = `${labelX}px`;
                marker.userData.label.style.top = `${labelY}px`;
                marker.userData.label.style.opacity = '1';
                
                connector.style.left = `${x}px`;
                connector.style.top = `${y}px`;
                
                const lineLength = Math.sqrt(
                    Math.pow(labelX - x, 2) + 
                    Math.pow(labelY - y, 2)
                );
                
                const lineAngle = Math.atan2(labelY - y, labelX - x);
                
                connector.style.width = `${lineLength}px`;
                connector.style.transform = `rotate(${lineAngle}rad)`;
                connector.style.opacity = '1';
                
                connector.style.animation = "pulseConnector 2s infinite alternate";
            } else {
                marker.userData.label.style.opacity = '0';
                connector.style.opacity = '0';
            }
        };
    }
    
    onMouseClick(event) {
        if (this.orbitParams.inHotspotMode) return;
        
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const globeIntersects = this.raycaster.intersectObject(this.globe);
        
        if (globeIntersects.length > 0) {
            const intersectionPoint = globeIntersects[0].point;
            
            const globeRadius = 2.0;
            
            const phi = Math.acos(intersectionPoint.y / globeRadius);
            const theta = Math.atan2(intersectionPoint.z, intersectionPoint.x);
            
            const lat = 90 - (phi * 180 / Math.PI);
            const lng = (theta * 180 / Math.PI) - 180;
            
            console.log(`Clic sur le globe à lat: ${lat.toFixed(2)}, lng: ${lng.toFixed(2)}`);
            
            const clickedHotspot = this._findNearestHotspot(lat, lng, 10);
            
            if (clickedHotspot) {
                console.log(`Hotspot trouvé: ${clickedHotspot.title}`);
                this.activateHotspot(clickedHotspot);
                return;
            }
        }
        
        const hotspotIntersects = this.raycaster.intersectObjects(this.hotspotObjects);
        
        if (hotspotIntersects.length > 0) {
            const selectedHotspot = hotspotIntersects[0].object.userData.hotspot;
            console.log(`Hotspot sélectionné par raycasting: ${selectedHotspot.title}`);
            this.activateHotspot(selectedHotspot);
        }
    }
    
    _findNearestHotspot(lat, lng, maxDistance) {
        let nearestHotspot = null;
        let minDistance = maxDistance;
        
        const hotspots = this.hotspotObjects.map(obj => obj.userData.hotspot).filter(Boolean);
        
        for (const hotspot of hotspots) {
            const hotspotLat = hotspot.position.lat;
            const hotspotLng = hotspot.position.lng;
            
            const distance = Math.sqrt(
                Math.pow(hotspotLat - lat, 2) + 
                Math.pow(hotspotLng - lng, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestHotspot = hotspot;
            }
        }
        
        return nearestHotspot;
    }

    // Masquer tous les labels et connecteurs
    hideAllLabels() {
        console.log('🔒 Masquage de tous les labels et connecteurs');
        this.hotspotObjects.forEach(marker => {
            if (marker.userData.label) {
                marker.userData.label.style.opacity = '0';
                marker.userData.label.style.display = 'none';
            }
            if (marker.userData.connector) {
                marker.userData.connector.style.opacity = '0';
                marker.userData.connector.style.display = 'none';
            }
        });
    }

    // Réafficher tous les labels et connecteurs
    showAllLabels() {
        console.log('🔓 Réaffichage de tous les labels et connecteurs');
        this.hotspotObjects.forEach(marker => {
            if (marker.userData.label) {
                marker.userData.label.style.display = 'block';
                // L'opacité sera gérée par onBeforeRender
            }
            if (marker.userData.connector) {
                marker.userData.connector.style.display = 'block';
                // L'opacité sera gérée par onBeforeRender
            }
        });
    }

    // Vue verticale du hotspot
    activateHotspot(hotspot) {
        if (this.orbitParams.inHotspotMode) return;

        console.log(`=== ACTIVATION HOTSPOT: ${hotspot.title} ===`);

        // Masquer tous les labels et connecteurs immédiatement
        this.hideAllLabels();

        // Convertir coordonnées GPS vers 3D
        const lat = hotspot.position.lat * (Math.PI / 180);
        const lon = hotspot.position.lng * (Math.PI / 180);
        const radius = 2.1;
        
        const hotspotX = radius * Math.cos(lat) * Math.cos(lon);
        const hotspotY = radius * Math.sin(lat);
        const hotspotZ = radius * Math.cos(lat) * Math.sin(lon);
        const hotspotPos = new THREE.Vector3(hotspotX, hotspotY, hotspotZ);
        
        // Créer l'effet de scan
        this.createScanEffect(hotspot.position);
        
        // Arrêter l'orbite
        this.orbitParams.isOrbiting = false;
        
        // Calculer la position de la caméra - DIRECTEMENT AU-DESSUS
        const cameraDistance = 3.5; // Distance fixe au-dessus du hotspot
        const normalizedPos = hotspotPos.clone().normalize();
        const cameraPosition = normalizedPos.multiplyScalar(cameraDistance);
        
        // Animation de la caméra vers la position verticale
        gsap.to(this.camera.position, {
            x: cameraPosition.x,
            y: cameraPosition.y,
            z: cameraPosition.z,
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => {
                // Toujours regarder le centre du globe
                this.camera.lookAt(0, 0, 0);
            },
            onComplete: () => {
                // Une fois en position, rediriger vers la page externe
                this.orbitParams.inHotspotMode = true;
                this._redirectToExternalPage(hotspot);
            }
        });
        
        // Animer le zoom pour se rapprocher
        gsap.to(this.camera, {
            fov: 40, // Réduire le champ de vision pour un effet de zoom
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => {
                this.camera.updateProjectionMatrix();
            }
        });
    }
    
    // Fonction de redirection
   _redirectToExternalPage(hotspot) {
       console.log("=== REDIRECTION VERS PAGE EXTERNE ===");
       
       // Créer un overlay de transition
       const transitionOverlay = document.createElement('div');
       transitionOverlay.style.cssText = `
           position: fixed;
           top: 0;
           left: 0;
           width: 100%;
           height: 100%;
           background-color: rgba(0, 0, 0, 0);
           z-index: 9999;
           pointer-events: none;
       `;
       
       document.body.appendChild(transitionOverlay);
       
       // Animer l'overlay
       gsap.to(transitionOverlay, {
           backgroundColor: 'rgba(0, 0, 0, 1)',
           duration: 1,
           ease: "power2.inOut",
           onComplete: () => {
               // Utiliser la fonction getRedirectUrl pour obtenir l'URL
               const redirectUrl = getRedirectUrl(hotspot.id);
               console.log(`Redirection vers: ${redirectUrl}`);
               
               // Effectuer la redirection
               window.location.href = redirectUrl;
           }
       });
   }
   
   // MÉTHODE CORRIGÉE: Effet de scan avec shader compatible
   createScanEffect(position) {
       const phi = (90 - position.lat) * (Math.PI / 180);
       const theta = (position.lng + 180) * (Math.PI / 180);
       
       const x = -(2.1 * Math.sin(phi) * Math.cos(theta));
       const y = 2.1 * Math.cos(phi);
       const z = 2.1 * Math.sin(phi) * Math.sin(theta);
       
       const scanGeometry = new THREE.RingGeometry(0, 0.3, 32);
       const scanMaterial = new THREE.ShaderMaterial({
           uniforms: {
               color: { value: new THREE.Color(0xffcc00) },
               time: { value: 0 }
           },
           vertexShader: `
               varying vec2 vUv;
               void main() {
                   vUv = uv;
                   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
               }
           `,
           fragmentShader: `
               #ifdef GL_ES
               precision mediump float;
               #endif
               
               uniform vec3 color;
               uniform float time;
               varying vec2 vUv;
               
               void main() {
                   float distance = length(vUv - vec2(0.5, 0.5)) * 2.0;
                   float alpha = smoothstep(0.8, 1.0, distance) * 0.8;
                   
                   alpha *= (sin(time * 10.0) * 0.2 + 0.8);
                   
                   gl_FragColor = vec4(color, alpha);
               }
           `,
           side: THREE.DoubleSide,
           transparent: true,
           blending: THREE.AdditiveBlending,
           depthWrite: false
       });
       
       const scanRing = new THREE.Mesh(scanGeometry, scanMaterial);
       
       scanRing.position.set(x, y, z);
       scanRing.lookAt(0, 0, 0);
       
       this.scene.add(scanRing);
       
       let startTime = performance.now();
       const animate = () => {
           const elapsedTime = (performance.now() - startTime) / 1000;
           scanMaterial.uniforms.time.value = elapsedTime;
           
           if (elapsedTime < 2) {
               requestAnimationFrame(animate);
           } else {
               this.scene.remove(scanRing);
               scanRing.geometry.dispose();
               scanMaterial.dispose();
           }
       };
       
       animate();
       
       gsap.to(scanRing.scale, {
           x: 4,
           y: 4,
           z: 1,
           duration: 2,
           ease: "power1.out"
       });
       
       gsap.to(scanMaterial.uniforms.color.value, {
           r: 1.0,
           g: 0.8,
           b: 0.2,
           duration: 2,
           ease: "power1.out"
       });
   }
   
   exitHotspotMode() {
       if (!this.orbitParams.inHotspotMode) return;

       console.log("Sortie du mode hotspot");

       this.orbitParams.inHotspotMode = false;

       // Réafficher tous les labels et connecteurs
       this.showAllLabels();

       // Réinitialiser le champ de vision
       gsap.to(this.camera, {
           fov: 60,
           duration: 1,
           ease: "power2.out",
           onUpdate: () => {
               this.camera.updateProjectionMatrix();
           }
       });

       // Réactiver l'orbite
       setTimeout(() => {
           this.orbitParams.isOrbiting = true;
           this.orbitParams.currentSpeed = this.orbitParams.baseSpeed;
       }, 500);
   }
   
   exitHotspotModeExternal() {
       this.exitHotspotMode();
   }
   
   handleVideoError() {
       console.log("Tentative de résolution de l'erreur vidéo...");
       
       const textureLoader = new THREE.TextureLoader();
       textureLoader.load(`${import.meta.env.BASE_URL}images/video-placeholder.jpg`, (texture) => {
           if (this.globe && this.globe.material) {
               console.log("Application de la texture de secours");
               
               if (this.globe.material.uniforms && this.globe.material.uniforms.map) {
                   this.globe.material.uniforms.map.value = texture;
               } else {
                   this.globe.material.map = texture;
               }
               
               this.globe.material.needsUpdate = true;
           }
       });
   }
   
   zoom(zoomIn) {
       const zoomFactor = zoomIn ? 0.85 : 1.15;
       
       const newZoomLevel = this.orbitParams.zoomLevel * zoomFactor;
       
       this.orbitParams.zoomLevel = Math.min(
           Math.max(newZoomLevel, this.orbitParams.minZoomLevel),
           this.orbitParams.maxZoomLevel
       );
       
       gsap.to(this.camera.position, {
           x: this.camera.position.x * zoomFactor,
           y: this.camera.position.y * zoomFactor,
           z: this.camera.position.z * zoomFactor,
           duration: 0.5,
           ease: "back.out(1.2)",
           onUpdate: () => {
               this.camera.lookAt(0, 0, 0);
           }
       });
   }
   
   resetView() {
       this.orbitParams.zoomLevel = 1;
       
       this.orbitParams.currentSpeed = this.orbitParams.baseSpeed;
       
       const a = this.orbitParams.ellipseMajorAxis;
       const b = this.orbitParams.ellipseMinorAxis;
       const inclination = this.orbitParams.inclination;
       const currentAngle = this.orbitParams.orbitAngle;
       
       const targetX = a * Math.cos(currentAngle);
       const rawZ = b * Math.sin(currentAngle);
       const targetY = rawZ * Math.sin(inclination);
       const targetZ = rawZ * Math.cos(inclination);
       
       gsap.to(this.camera.position, {
           x: targetX,
           y: targetY,
           z: targetZ,
           duration: 1,
           ease: "elastic.out(1, 0.7)",
           onUpdate: () => {
               this.camera.lookAt(0, 0, 0);
           }
       });
   }
   
   onWindowResize() {
       this.camera.aspect = window.innerWidth / window.innerHeight;
       this.camera.updateProjectionMatrix();
       this.renderer.setSize(window.innerWidth, window.innerHeight);
   }
   
   setHotspotSelectCallback(callback) {
       this.onHotspotSelect = callback;
   }
   
   setHotspotExitCallback(callback) {
       this.onHotspotExit = callback;
   }
   
   animate() {
       requestAnimationFrame(this.animate.bind(this));
       
       const delta = this.clock.getDelta();
       const time = this.clock.getElapsedTime() * 1000;
       
       if (this.orbitParams.isOrbiting && !this.orbitParams.inHotspotMode) {
           this.updateCameraPosition();
       }
       
       if (this.updateSkyboxTime) {
           this.updateSkyboxTime(time);
       }
       
       // Mettre à jour l'atmosphère
       if (this.updateAtmosphereUniforms) {
           this.updateAtmosphereUniforms();
       }
       
       this.hotspotObjects.forEach(hotspot => {
           if (hotspot.children.length > 0) {
               const halo = hotspot.children[0];
               const scale = 1 + 0.2 * Math.sin(time * 0.003);
               halo.scale.set(scale, scale, scale);
           }
           
           if (hotspot.userData.label && hotspot.userData.worldPosition) {
               hotspot.onBeforeRender();
           }
       });
       
       if (this.clouds) {
           this.clouds.rotation.y += 0.0001;
       }
       
       if (this.globe && !this.orbitParams.inHotspotMode) {
           this.globe.rotation.y += 0.0002;
       }
       
       if (this.globe && this.globe.material.uniforms && this.globe.material.uniforms.time) {
           this.globe.material.uniforms.time.value = time;
       }
       
       if (this.videoElement && this.videoElement.paused && !this.videoElement.ended) {
           this.videoElement.play().catch(e => {
               console.error('Erreur lors de la reprise de la vidéo:', e);
           });
       }
       
       this.renderer.render(this.scene, this.camera);
   }
}