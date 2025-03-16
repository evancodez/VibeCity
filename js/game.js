import * as THREE from 'three';
import { Car } from './car.js';
import { City } from './city.js';
import { InputHandler } from './input.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class Game {
    constructor() {
        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null; // Post-processing composer
        
        // Game objects
        this.car = null;
        this.city = null;
        
        // Game state
        this.lastTime = 0;
        this.inputHandler = null;
        this.speedometer = document.getElementById('speedometer');
        this.scoreDisplay = document.getElementById('score');
        this.score = 0;
        
        // Camera settings
        this.cameraOffset = new THREE.Vector3(0, 5, -10);
        this.cameraTarget = new THREE.Vector3();
        
        // Collision detection
        this.obstacles = [];
        this.ramps = [];
        this.physicsObjects = [];
        this.humans = [];
        
        // Debug mode
        this.debugMode = false;
        
        // Visual effects
        this.nightMode = false;
        this.particles = [];
        this.bloodStains = [];
    }
    
    init() {
        // Create the scene
        this.scene = new THREE.Scene();
        
        // Setup skybox (80s sunset gradient)
        this.setupSkybox();
        
        // Set up the camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 5, -10);
        this.camera.lookAt(0, 0, 0);
        
        // Set up the renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        document.body.appendChild(this.renderer.domElement);
        
        // Setup post-processing
        this.setupPostProcessing();
        
        // Add lighting
        this.setupLights();
        
        // Create the city first (so we can get obstacles before the car)
        this.city = new City(this.scene);
        
        // Get obstacles from the city
        this.obstacles = this.city.getObstacles();
        this.ramps = this.city.getRamps();
        this.physicsObjects = this.city.getPhysicsObjects();
        this.humans = this.city.getHumans();
        
        // Create the car and position it on a road
        this.car = new Car(this.scene);
        this.positionCarOnRoad();
        
        // Set up input handling
        this.inputHandler = new InputHandler();
        
        // Create game UI elements
        this.createGameUI();
        
        // Create speed boost mechanic
        this.setupSpeedBoost();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Add key listeners
        this.setupKeyListeners();
    }
    
    setupSkybox() {
        // Create a sunset gradient skybox
        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform vec3 horizonColor;
            uniform float offset;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition).y + offset;
                vec3 gradient = mix(bottomColor, horizonColor, max(0.0, min(1.0, (h + 0.2) * 5.0)));
                gradient = mix(gradient, topColor, max(0.0, min(1.0, h * 1.5 + 0.5)));
                gl_FragColor = vec4(gradient, 1.0);
            }
        `;
        
        // Set colors for 80s sunset
        const uniforms = {
            topColor: { value: new THREE.Color(0x051f3a) },       // Dark blue-purple at top
            horizonColor: { value: new THREE.Color(0xff1e6d) },   // Hot pink at horizon
            bottomColor: { value: new THREE.Color(0xff9e1c) },    // Orange near bottom
            offset: { value: 0.1 }
        };
        
        const skyGeo = new THREE.SphereGeometry(400, 32, 15);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
    }
    
    setupPostProcessing() {
        // Create a render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        
        // Calculate a reduced resolution for the bloom effect based on screen size
        // This significantly improves performance while maintaining visual quality
        const bloomResolution = new THREE.Vector2(
            Math.min(512, window.innerWidth / 2),
            Math.min(512, window.innerHeight / 2)
        );
        
        // Create a bloom pass for glow effects - stronger for neon effect
        const bloomPass = new UnrealBloomPass(
            bloomResolution,  // Use lower resolution for better performance
            1.0,    // strength - increased for more glow
            0.4,    // radius
            0.85    // threshold
        );
        
        // Create the composer
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderPass);
        this.composer.addPass(bloomPass);
        
        // Store the bloom pass for speed effects
        this.bloomPass = bloomPass;
    }
    
    setupLights() {
        // Add ambient light for global illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Increased intensity from default
        this.scene.add(ambientLight);
        
        // Add directional light for sun effect with shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increased intensity
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        
        // Improve shadow quality
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        
        // Increase shadow area coverage
        const d = 200;
        directionalLight.shadow.camera.left = -d;
        directionalLight.shadow.camera.right = d;
        directionalLight.shadow.camera.top = d;
        directionalLight.shadow.camera.bottom = -d;
        
        // Add a softer shadow
        directionalLight.shadow.radius = 2;
        
        this.scene.add(directionalLight);
        
        // Add a secondary fill light from the opposite direction
        const fillLight = new THREE.DirectionalLight(0xffffaa, 0.4); // Warm fill light
        fillLight.position.set(-100, 50, -50);
        this.scene.add(fillLight);
    }
    
    createGameUI() {
        // Create score display
        if (!this.scoreDisplay) {
            this.scoreDisplay = document.createElement('div');
            this.scoreDisplay.id = 'score';
            this.scoreDisplay.style.position = 'absolute';
            this.scoreDisplay.style.top = '20px';
            this.scoreDisplay.style.right = '20px';
            this.scoreDisplay.style.color = '#00ffff'; // Cyan text
            this.scoreDisplay.style.fontFamily = 'Arial, sans-serif';
            this.scoreDisplay.style.fontWeight = 'bold';
            this.scoreDisplay.style.textShadow = '0 0 5px #00ffff, 0 0 10px #00ffff';
            this.scoreDisplay.style.padding = '10px';
            this.scoreDisplay.style.fontSize = '24px';
            this.scoreDisplay.innerHTML = 'SCORE: 0';
            document.body.appendChild(this.scoreDisplay);
        }
        
        // Create speedometer
        if (!this.speedometer) {
            this.speedometer = document.createElement('div');
            this.speedometer.id = 'speedometer';
            this.speedometer.style.position = 'absolute';
            this.speedometer.style.bottom = '20px';
            this.speedometer.style.right = '20px';
            this.speedometer.style.color = '#ff00ff'; // Magenta text
            this.speedometer.style.fontFamily = 'Arial, sans-serif';
            this.speedometer.style.fontWeight = 'bold';
            this.speedometer.style.textShadow = '0 0 5px #ff00ff, 0 0 10px #ff00ff';
            this.speedometer.style.padding = '10px';
            this.speedometer.style.fontSize = '24px';
            this.speedometer.innerHTML = 'SPEED: 0 MPH';
            document.body.appendChild(this.speedometer);
        }
        
        // Create boost meter
        this.boostMeter = document.createElement('div');
        this.boostMeter.id = 'boost-meter';
        this.boostMeter.style.position = 'absolute';
        this.boostMeter.style.bottom = '60px';
        this.boostMeter.style.left = '20px';
        this.boostMeter.style.width = '200px';
        this.boostMeter.style.height = '20px';
        this.boostMeter.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.boostMeter.style.border = '2px solid #ff00ff';
        this.boostMeter.style.borderRadius = '10px';
        
        this.boostFill = document.createElement('div');
        this.boostFill.style.width = '100%';
        this.boostFill.style.height = '100%';
        this.boostFill.style.backgroundColor = '#ff00ff';
        this.boostFill.style.borderRadius = '8px';
        this.boostFill.style.transition = 'width 0.2s';
        
        this.boostMeter.appendChild(this.boostFill);
        document.body.appendChild(this.boostMeter);
        
        // Create boost label
        this.boostLabel = document.createElement('div');
        this.boostLabel.style.position = 'absolute';
        this.boostLabel.style.bottom = '85px';
        this.boostLabel.style.left = '20px';
        this.boostLabel.style.color = '#ff00ff';
        this.boostLabel.style.fontFamily = 'Arial, sans-serif';
        this.boostLabel.style.fontWeight = 'bold';
        this.boostLabel.style.textShadow = '0 0 5px #ff00ff';
        this.boostLabel.innerHTML = 'BOOST [SPACE]';
        document.body.appendChild(this.boostLabel);
    }
    
    setupSpeedBoost() {
        // Speed boost properties
        this.boost = {
            available: 100,
            max: 100,
            rechargeRate: 10, // Per second
            depleteRate: 30,  // Per second
            active: false,
            speedMultiplier: 1.8,
            trailParticles: [],
            // Add smooth transition for boost deactivation
            currentMultiplier: 1.0,
            transitionSpeed: 2.0 // How quickly boost fades in/out
        };
    }
    
    setupKeyListeners() {
        window.addEventListener('keydown', (event) => {
            // Toggle debug mode with the ` key
            if (event.key === '`' || event.key === '~') {
                this.toggleDebugMode();
            }
            // Toggle night mode with 'N' key
            if (event.key === 'n' || event.key === 'N') {
                this.toggleNightMode();
            }
            // Activate boost with space bar
            if (event.key === ' ' && this.boost.available > 0) {
                this.boost.active = true;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            // Deactivate boost when space released
            if (e.key === ' ') {
                this.boost.active = false;
            }
        });
    }
    
    positionCarOnRoad() {
        // Use the City's method to get a good spawn position on a road
        const spawnPosition = this.city.getSpawnPosition();
        
        // Set car position and adjust for car height
        this.car.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
        this.car.mesh.position.copy(this.car.position);
        
        // Set rotation to face along the road
        this.car.rotation.y = spawnPosition.rotation;
        this.car.mesh.rotation.copy(this.car.rotation);
        
        // Update direction vector based on rotation
        this.car.direction.set(0, 0, 1).applyEuler(this.car.rotation);
        
        // Update quaternion from Euler rotation
        this.car.rotationQuaternion.setFromEuler(this.car.rotation);
        
        console.log(`Car positioned at (${spawnPosition.x}, ${spawnPosition.y}, ${spawnPosition.z})`);
    }
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        
        // Visualize or hide obstacles
        if (this.debugMode) {
            this.visualizeObstacles();
            this.visualizeBoundary();
        } else {
            // Remove obstacle helpers
            if (this.debugHelpers) {
                this.debugHelpers.forEach(helper => {
                    this.scene.remove(helper);
                });
                this.debugHelpers = [];
            }
            
            // Remove boundary visualization
            if (this.boundaryHelper) {
                this.scene.remove(this.boundaryHelper);
                this.boundaryHelper = null;
            }
        }
    }
    
    visualizeObstacles() {
        // Create a helper to visualize obstacle boundaries
        this.debugHelpers = [];
        
        this.obstacles.forEach(obstacle => {
            const helperGeometry = new THREE.SphereGeometry(obstacle.boundingRadius, 16, 16);
            const helperMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                wireframe: true,
                transparent: true,
                opacity: 0.3
            });
            const helper = new THREE.Mesh(helperGeometry, helperMaterial);
            helper.position.copy(obstacle.position);
            this.scene.add(helper);
            this.debugHelpers.push(helper);
        });
    }
    
    visualizeBoundary() {
        // Create a wireframe box to visualize the city boundary
        const citySize = this.city.citySize * this.city.blockSize + (this.city.citySize + 1) * this.city.roadWidth;
        const halfSize = citySize / 2;
        const buffer = 10; // Match the buffer in the update method
        
        // Create a wireframe box
        const boundaryGeometry = new THREE.BoxGeometry(
            (halfSize - buffer) * 2, 
            100, // Tall enough to be visible
            (halfSize - buffer) * 2
        );
        
        const boundaryMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        
        this.boundaryHelper = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
        this.boundaryHelper.position.set(0, 50, 0); // Position at half height
        this.scene.add(this.boundaryHelper);
    }
    
    toggleNightMode() {
        this.nightMode = !this.nightMode;
        console.log(`Night mode ${this.nightMode ? 'enabled' : 'disabled'}`);
        
        if (this.nightMode) {
            // Night mode settings
            this.scene.background = new THREE.Color(0x0a1a2a); // Dark blue night sky
            this.scene.fog = new THREE.FogExp2(0x0a1a2a, 0.008); // Thicker fog at night
            
            // Adjust lighting for night mode
            this.scene.children.forEach(child => {
                if (child.type === 'DirectionalLight') {
                    child.intensity = 0.3;
                } else if (child.type === 'AmbientLight') {
                    child.intensity = 0.2;
                }
            });
        } else {
            // Day mode settings
            this.scene.background = new THREE.Color(0x87CEEB); // Light blue day sky
            this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.005);
            
            // Restore lighting
            this.scene.children.forEach(child => {
                if (child.type === 'DirectionalLight') {
                    child.intensity = 0.8;
                } else if (child.type === 'AmbientLight') {
                    child.intensity = 0.5;
                }
            });
        }
    }
    
    start() {
        // Start the game loop
        this.lastTime = performance.now();
        this.update();
    }
    
    update() {
        // Calculate delta time
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;
        
        // Update boost
        this.updateBoost(deltaTime);
        
        // Update the car
        this.car.update(this.inputHandler, deltaTime, this.obstacles);
        
        // Apply speed boost with smooth transition
        const targetMultiplier = this.boost.active && this.boost.available > 0 ? 
                                this.boost.speedMultiplier : 1.0;
        
        // Smoothly interpolate between current and target multiplier
        this.boost.currentMultiplier += (targetMultiplier - this.boost.currentMultiplier) * 
                                      this.boost.transitionSpeed * deltaTime;
        
        // Apply the current multiplier to car speed
        if (this.boost.currentMultiplier > 1.01) { // Only apply if it's meaningfully above 1.0
            // Handle boost differently based on whether the car is airborne
            if (this.car.isAirborne) {
                // When airborne, use a fixed acceleration approach instead of a multiplier
                // This ensures boosting never slows the car down
                
                // Define maximum safe airborne speed
                const maxAirborneSpeed = 25;
                
                // Only apply boost if we're below the maximum speed
                if (this.car.speed < maxAirborneSpeed) {
                    // Apply a fixed acceleration based on how active the boost is
                    const boostStrength = (this.boost.currentMultiplier - 1.0) / (this.boost.speedMultiplier - 1.0);
                    const airborneAcceleration = 10 * boostStrength * deltaTime; // Fixed acceleration per second
                    
                    // Add the acceleration to current speed
                    this.car.speed += airborneAcceleration;
                    
                    // Cap at maximum airborne speed
                    this.car.speed = Math.min(this.car.speed, maxAirborneSpeed);
                }
            } else {
                // Normal boost on ground - use the multiplier approach
                this.car.speed *= this.boost.currentMultiplier;
            }
            
            // Create boost trail effect if multiplier is significant
            if (this.boost.currentMultiplier > 1.2) {
                this.createBoostTrail();
                
                // Enhance bloom effect during boost
                if (this.bloomPass) {
                    const bloomIntensity = 1.0 + (this.boost.currentMultiplier - 1.0) * 0.5;
                    this.bloomPass.strength = bloomIntensity;
                }
            }
        } else {
            // Reset bloom effect
            if (this.bloomPass) {
                this.bloomPass.strength = 1.0;
            }
        }
        
        // Enforce a hard boundary for the car - ensure it never goes beyond the city limits
        const carPosition = this.car.getPosition();
        const citySize = this.city.citySize * this.city.blockSize + (this.city.citySize + 1) * this.city.roadWidth;
        const halfSize = citySize / 2;
        const buffer = 10; // Keep car a bit away from the edge
        
        if (Math.abs(carPosition.x) > halfSize - buffer || Math.abs(carPosition.z) > halfSize - buffer) {
            // Car is trying to go out of bounds - push it back
            const wasOutOfBounds = { x: false, z: false };
            const originalPos = carPosition.clone();
            
            if (Math.abs(carPosition.x) > halfSize - buffer) {
                carPosition.x = Math.sign(carPosition.x) * (halfSize - buffer);
                wasOutOfBounds.x = true;
            }
            
            if (Math.abs(carPosition.z) > halfSize - buffer) {
                carPosition.z = Math.sign(carPosition.z) * (halfSize - buffer);
                wasOutOfBounds.z = true;
            }
            
            // Create a boundary normal for realistic bounce
            const boundaryNormal = new THREE.Vector3(0, 0, 0);
            
            if (wasOutOfBounds.x) {
                boundaryNormal.x = -Math.sign(originalPos.x);
            }
            
            if (wasOutOfBounds.z) {
                boundaryNormal.z = -Math.sign(originalPos.z);
            }
            
            boundaryNormal.normalize();
            
            // Calculate bounce direction similar to wall collisions
            const dotProduct = this.car.velocity.dot(boundaryNormal);
            
            // Only bounce if moving toward the boundary
            if (dotProduct < 0) {
                // Calculate reflection vector (v - 2(v·n)n)
                const bounceVelocity = this.car.velocity.clone().sub(
                    boundaryNormal.clone().multiplyScalar(2 * dotProduct)
                ).normalize();
                
                // Apply the new direction with a bounce
                this.car.direction.copy(bounceVelocity);
                
                // Apply bounce effect - reduce speed but maintain some momentum
                this.car.speed *= 0.4;
                
                // Update car rotation to match new direction
                this.car.rotation.y = Math.atan2(this.car.direction.x, this.car.direction.z);
                this.car.rotationQuaternion.setFromEuler(this.car.rotation);
                
                // Add a small vertical boost for a bouncy feel if going fast enough
                if (Math.abs(this.car.speed) > 15 && !this.car.isAirborne) {
                    this.car.isAirborne = true;
                    this.car.verticalVelocity = 4;
                }
            } else {
                // If moving away from boundary, just reduce speed
                this.car.speed *= 0.5;
            }
        }
        
        // Check for ramp interactions
        this.checkRampInteractions();
        
        // Check for physics object interactions
        this.updatePhysicsObjects(deltaTime);
        
        // Update humans
        this.updateHumans(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update camera to follow car
        this.updateCamera();
        
        // Update speedometer
        this.updateSpeedometer();
        
        // Render the scene
        if (this.composer) {
            this.composer.render();
        } else {
        this.renderer.render(this.scene, this.camera);
        }
        
        // Request next frame
        requestAnimationFrame(() => this.update());
    }
    
    updateCamera() {
        // Calculate the target position behind the car
        const carPosition = this.car.getPosition();
        const carDirection = this.car.getDirection();
        
        // Position camera behind the car
        const idealOffset = this.cameraOffset.clone();
        idealOffset.applyQuaternion(this.car.getRotationQuaternion());
        idealOffset.add(carPosition);
        
        // Smooth camera movement using lerp
        this.camera.position.lerp(idealOffset, 0.1);
        
        // Look at position slightly ahead of the car
        this.cameraTarget.copy(carPosition);
        this.cameraTarget.y += 1.5; // Look slightly above the car
        this.camera.lookAt(this.cameraTarget);
    }
    
    updateSpeedometer() {
        const speed = Math.round(this.car.getSpeed() * 10) / 10;
        if (this.speedometer) {
            // Format with leading zeros for retro digital feel
            const speedStr = speed.toFixed(1).padStart(5, '0');
            this.speedometer.textContent = `SPEED: ${speedStr} MPH`;
            
            // Change color based on speed
            if (speed > 30) {
                this.speedometer.style.color = '#ff0000'; // Red at high speed
                this.speedometer.style.textShadow = '0 0 5px #ff0000, 0 0 10px #ff0000';
            } else if (speed > 20) {
                this.speedometer.style.color = '#ffff00'; // Yellow at medium speed
                this.speedometer.style.textShadow = '0 0 5px #ffff00, 0 0 10px #ffff00';
            } else {
                this.speedometer.style.color = '#ff00ff'; // Magenta at regular speed
                this.speedometer.style.textShadow = '0 0 5px #ff00ff, 0 0 10px #ff00ff';
            }
        }
    }
    
    onWindowResize() {
        // Update camera
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update composer
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    
    checkRampInteractions() {
        // Check if car is on any ramp
        const carPosition = this.car.getPosition();
        const carDirection = this.car.getDirection();
        const carSpeed = this.car.getSpeed();
        
        // Reset ramp state - we'll set it to true if we're on any ramp
        let onAnyRamp = false;
        let currentRampHeight = 0;
        let currentRamp = null;

        for (const ramp of this.ramps) {
            // Handle omnidirectional launchpads differently
            if (ramp.type === 'launchpad' && ramp.omnidirectional) {
                // Calculate distance from car to launchpad center (XZ plane only)
                const dx = carPosition.x - ramp.position.x;
                const dz = carPosition.z - ramp.position.z;
                const distanceSquared = dx * dx + dz * dz;
                
                // Check if car is on the launchpad
                if (distanceSquared <= ramp.radius * ramp.radius) {
                    // We are on a launchpad
                    onAnyRamp = true;
                    currentRamp = ramp;
                    
                    // Set the car's height to the launchpad height
                    if (!this.car.isAirborne) {
                        this.car.position.y = 0.5 + ramp.height;
                        
                        // Apply a small speed boost for more fun
                        if (carSpeed > 10) {
                            this.car.speed *= 1.02; 
                        }
                        
                        // Calculate distance from center as a percentage of radius
                        const distanceFromCenter = Math.sqrt(distanceSquared);
                        const normalizedDistance = distanceFromCenter / ramp.radius;
                        
                        // Trigger launch when car is reasonably fast and not already airborne
                        if (carSpeed > 5 && !this.car.isAirborne) {
                            // Calculate launch strength based on speed and distance from center
                            // Maximum launch at the center, reduced at the edges
                            const centerBonus = 1 - normalizedDistance;
                            const speedFactor = Math.min(1, carSpeed / 25);
                            
                            // Limit maximum launch strength when boosting to prevent going through buildings
                            const maxJumpStrength = 22; // Cap the maximum jump strength
                            const baseJumpStrength = Math.min(ramp.jumpStrength, maxJumpStrength);
                            
                            const launchStrength = baseJumpStrength * speedFactor * (0.7 + centerBonus * 0.3);
                            
                            // Set car to airborne state
                            this.car.isAirborne = true;
                            this.car.verticalVelocity = launchStrength;
                            
                            // Add a slight upward tilt based on speed
                            this.car.rotation.x = -0.2 - (speedFactor * 0.3);
                            
                            // Limit the car's horizontal speed during high jumps to prevent collision issues
                            if (carSpeed > 30) {
                                this.car.speed = 30;
                            } else {
                                // Add a small speed boost when jumping at normal speeds
                                this.car.speed *= 1.05;
                            }
                            
                            // Create jump particles
                            this.createJumpParticles(carPosition);
                            
                            // Log jump
                            console.log(`LAUNCHPAD JUMP! Velocity: ${launchStrength.toFixed(2)}`);
                        }
                    }
                    
                    // Once we've found a launchpad we're on, we can stop checking
                    break;
                }
            } 
            // Handle traditional directional ramps
            else {
                // Create a local coordinate system based on ramp orientation
                const rampForward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ramp.rotation);
                const rampRight = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ramp.rotation);
                
                // Calculate car position relative to ramp
                const relativePos = carPosition.clone().sub(ramp.position);
                
                // Project onto ramp forward and right axes
                const forwardProjection = relativePos.dot(rampForward);
                const rightProjection = relativePos.dot(rampRight);
                
                // Check if car is on the ramp
                if (Math.abs(rightProjection) < ramp.width / 2 && 
                    forwardProjection > -ramp.length / 2 && 
                    forwardProjection < ramp.length / 2) {
                    
                    // We are on a ramp
                    onAnyRamp = true;
                    currentRamp = ramp;
                    
                    // Calculate height of ramp at car's position
                    // This is a simplified calculation; the ramp height increases linearly from front to back
                    const normalizedPos = (forwardProjection + ramp.length / 2) / ramp.length;
                    currentRampHeight = normalizedPos * ramp.height;
                    
                    // Set the car's height based on the ramp height at this position
                    if (!this.car.isAirborne) {
                        this.car.position.y = 0.5 + currentRampHeight;
                        
                        // When approaching the ramp, increase the car's speed slightly for more fun jumps
                        if (normalizedPos < 0.4 && carSpeed > 15) {
                            this.car.speed *= 1.01; // Small boost when hitting the ramp
                        }
                    }
                    
                    // Only jump if we're at the high end of the ramp and moving in the right direction
                    if (normalizedPos > 0.8 && carSpeed > 10) {
                        // Check if we're going the right direction - dot product should be positive
                        const alignmentWithRamp = carDirection.dot(rampForward);
                        
                        if (alignmentWithRamp > 0.7) { // Car is well aligned with ramp
                            // Apply jump velocity based on car speed and ramp parameters
                            // Higher speed = bigger jump
                            const jumpFactor = Math.min(1, carSpeed / 30); // Normalize between 0 and 1
                            
                            // Limit maximum jump strength when boosting to prevent going through buildings
                            const maxJumpStrength = 20; // Cap the maximum jump strength
                            const baseJumpStrength = Math.min(ramp.jumpStrength, maxJumpStrength);
                            
                            const jumpVelocity = baseJumpStrength * jumpFactor;
                            
                            // Don't trigger the jump if we're already airborne
                            if (!this.car.isAirborne) {
                                // Set car to airborne state
                                this.car.isAirborne = true;
                                this.car.verticalVelocity = jumpVelocity;
                                
                                // Add an upward rotation to the car for a more dramatic effect
                                this.car.rotation.x = -0.3;
                                
                                // Limit car's speed during high jumps
                                if (carSpeed > 30) {
                                    this.car.speed = 30;
                                } else {
                                    // Add a small speed boost when jumping at normal speeds
                                    this.car.speed *= 1.1;
                                }
                                
                                // Create jump particles
                                this.createJumpParticles(carPosition);
                                
                                // Play a jump sound (placeholder for now)
                                console.log("JUMP! Velocity: " + jumpVelocity.toFixed(2));
                            }
                        }
                    }
                }
            }
        }
        
        // If we're not on any ramp and not airborne, reset to ground height
        if (!onAnyRamp && !this.car.isAirborne) {
            this.car.position.y = 0.5;
        }
        
        // Update the car's onRamp state
        this.car.onRamp = onAnyRamp;
        this.car.rampHeight = currentRampHeight;
        this.car.currentRamp = currentRamp;
    }
    
    createJumpParticles(position) {
        // Create a simple particle effect when jumping
        const particleCount = 10;
        
        for (let i = 0; i < particleCount; i++) {
            // Create a simple particle
            const size = 0.2 + Math.random() * 0.3;
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshBasicMaterial({
                color: 0xff9500,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Position at the jumping point
            particle.position.copy(position);
            particle.position.y -= 0.5; // Start at ground level
            
            // Random initial velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 5 + 5,  // Mostly upward
                (Math.random() - 0.5) * 5
            );
            
            // Add to scene
            this.scene.add(particle);
            
            // Store particle data
            const particleData = {
                mesh: particle,
                velocity: velocity,
                gravity: 9.8,
                lifeTime: 0,
                maxLifeTime: 1 + Math.random() * 0.5
            };
            
            // Add update logic
            const updateParticle = (deltaTime) => {
                // Update position
                particleData.velocity.y -= particleData.gravity * deltaTime;
                particleData.mesh.position.x += particleData.velocity.x * deltaTime;
                particleData.mesh.position.y += particleData.velocity.y * deltaTime;
                particleData.mesh.position.z += particleData.velocity.z * deltaTime;
                
                // Update rotation for effect
                particleData.mesh.rotation.x += deltaTime * 5;
                particleData.mesh.rotation.z += deltaTime * 5;
                
                // Update lifetime and fade out
                particleData.lifeTime += deltaTime;
                particleData.mesh.material.opacity = 0.7 * (1 - particleData.lifeTime / particleData.maxLifeTime);
                
                // Remove when lifetime expires
                if (particleData.lifeTime >= particleData.maxLifeTime) {
                    this.scene.remove(particleData.mesh);
                    return true; // Signal to remove from update loop
                }
                
                return false;
            };
            
            // Add to a particles array to be updated each frame
            if (!this.particles) this.particles = [];
            this.particles.push(updateParticle);
        }
    }
    
    updatePhysicsObjects(deltaTime) {
        // Update all physics objects (trash cans, benches, streetlights, barrels, crates)
        const car = this.car;
        const carPosition = car.getPosition();
        const carSpeed = car.getSpeed();
        const carDirection = car.getDirection();
        
        // Apply physics to all objects
        for (const obj of this.city.getPhysicsObjects()) {
            // Skip objects that haven't been knocked over
            if (!obj.isKnockedOver) {
                // Default sphere-based collision detection
                let collision = false;
                const distance = carPosition.distanceTo(obj.position);
                const collisionThreshold = car.getBoundingRadius() + obj.radius;
                
                // Check for collision with car
                if (distance < collisionThreshold) {
                    collision = true;
                } 
                // Special case for streetlights - add cylinder-based collision for the pole
                else if (obj.type === 'streetlight' && obj.pole) {
                    // Calculate distance from car to the streetlight pole (2D - xz plane)
                    const carToLight = new THREE.Vector2(
                        carPosition.x - obj.position.x,
                        carPosition.z - obj.position.z
                    );
                    const distanceToPole = carToLight.length();
                    
                    // Check if car is close enough to the pole for a potential collision
                    const maxPossibleDistance = car.getBoundingRadius() + obj.pole.radius;
                    
                    if (distanceToPole < maxPossibleDistance) {
                        // Car is close enough to potentially hit the pole
                        collision = true;
                    }
                }
                
                if (collision) {
                    // Calculate impact force based on car speed
                    const impactForce = carSpeed * 0.5;
                    
                    // Different object types have different thresholds for being knocked over
                    let knockoverThreshold;
                    switch (obj.type) {
                        case 'trashCan':
                            knockoverThreshold = 3;
                            break;
                        case 'bench':
                            knockoverThreshold = 7;
                            break;
                        case 'streetlight':
                            knockoverThreshold = 6;
                            break;
                        case 'barrel':
                            knockoverThreshold = 4;
                            break;
                        case 'crate':
                            knockoverThreshold = 5;
                            break;
                        default:
                            knockoverThreshold = 5;
                    }
                    
                    // Only knock over if impact force is high enough
                    if (impactForce > knockoverThreshold) {
                        // Object is knocked over
                        obj.isKnockedOver = true;
                        
                        // Add score for knocking over objects
                        this.addScore(50);
                        
                        // Calculate impulse direction based on car's position and direction
                        const impulseDirection = new THREE.Vector3()
                            .subVectors(obj.position, carPosition)
                            .normalize();
                        
                        // Add a vertical component for more dramatic physics
                        impulseDirection.y = 0.5;
                        impulseDirection.normalize();
                        
                        // Apply velocity based on car speed and direction
                        obj.velocity.copy(carDirection).multiplyScalar(carSpeed * 0.3);
                        obj.velocity.add(impulseDirection.multiplyScalar(impactForce));
                        
                        // Apply random rotation for more chaotic motion
                        obj.angularVelocity.set(
                            (Math.random() - 0.5) * 5,
                            (Math.random() - 0.5) * 5,
                            (Math.random() - 0.5) * 5
                        );
                        
                        // Special effects for different object types
                        if (obj.type === 'streetlight' && obj.light) {
                            // Start light flickering
                            this.flickerLight(obj.light);
                        } else if (obj.type === 'barrel') {
                            // Add a more dramatic effect for barrels - they get more height
                            obj.velocity.y += 2;
                            
                            // Add score bonus for hitting barrels
                            this.addScore(75);
                        } else if (obj.type === 'crate') {
                            // Crates get more horizontal movement but less vertical
                            obj.velocity.y *= 0.7;
                            obj.velocity.x *= 1.5;
                            obj.velocity.z *= 1.5;
                            
                            // Add score bonus for hitting crates
                            this.addScore(60);
                        }
                        
                        // Slow down the car based on object mass
                        const carSlowdown = Math.min(0.8, obj.mass / 100);
                        car.speed *= (1 - carSlowdown);
                    }
                }
            } else {
                // Object has been knocked over, apply physics
                
                // Apply gravity
                obj.velocity.y -= 20 * deltaTime; // Gravity effect
                
                // Update position
                obj.position.add(obj.velocity.clone().multiplyScalar(deltaTime));
                
                // Apply angular velocity (rotation)
                const rotation = new THREE.Euler(
                    obj.angularVelocity.x * deltaTime,
                    obj.angularVelocity.y * deltaTime,
                    obj.angularVelocity.z * deltaTime,
                    'XYZ'
                );
                const rotationDelta = new THREE.Quaternion().setFromEuler(rotation);
                const currentQuaternion = new THREE.Quaternion().setFromEuler(obj.rotation);
                currentQuaternion.multiply(rotationDelta);
                obj.rotation.setFromQuaternion(currentQuaternion);
                
                // Check for ground collision
                if (obj.position.y - obj.height/2 < 0) {
                    obj.position.y = obj.height/2;
                    
                    // Bounce with damping
                    if (Math.abs(obj.velocity.y) > 0.5) {
                        obj.velocity.y = -obj.velocity.y * 0.3; // Bounce with 70% energy loss
                        
                        // Reduce horizontal velocity due to friction
                        obj.velocity.x *= 0.9;
                        obj.velocity.z *= 0.9;
                    } else {
                        obj.velocity.y = 0;
                    }
                    
                    // Also dampen angular velocity
                    obj.angularVelocity.multiplyScalar(0.9);
                }
                
                // Slow down due to air resistance
                obj.velocity.multiplyScalar(0.98);
                obj.angularVelocity.multiplyScalar(0.98);
                
                // Update object mesh
                obj.mesh.position.copy(obj.position);
                obj.mesh.rotation.copy(obj.rotation);
                
                // Special effects for different object types
                if (obj.type === 'streetlight') {
                    // Gradually dim the light based on pole angle
                    if (obj.light) {
                        // Get the up vector of the pole
                        const upVector = new THREE.Vector3(0, 1, 0).applyEuler(obj.rotation);
                        const normalUp = new THREE.Vector3(0, 1, 0);
                        
                        // Calculate angle between current rotation and upright
                        const angleFactor = upVector.dot(normalUp); // 1 when upright, 0 when sideways, -1 when upside down
                        const normalizedAngle = (angleFactor + 1) / 2; // 1 when upright, 0.5 when sideways, 0 when upside down
                        
                        // Dim the light based on angle
                        obj.light.intensity = Math.max(0, normalizedAngle) * 1.0;
                    }
                } else if (obj.type === 'barrel') {
                    // Add more bounce for barrels
                    if (obj.position.y === obj.height/2 && Math.abs(obj.velocity.y) <= 0.5) {
                        // Barrel has settled on the ground, make it roll more
                        const horizontalSpeed = Math.sqrt(obj.velocity.x * obj.velocity.x + obj.velocity.z * obj.velocity.z);
                        if (horizontalSpeed > 0.1) {
                            // Calculate roll axis (perpendicular to movement direction)
                            const movementDir = new THREE.Vector3(obj.velocity.x, 0, obj.velocity.z).normalize();
                            const rollAxis = new THREE.Vector3(-movementDir.z, 0, movementDir.x);
                            
                            // Apply rolling angular velocity
                            const rollSpeed = horizontalSpeed * 2;
                            obj.angularVelocity.copy(rollAxis.multiplyScalar(rollSpeed));
                        }
                    }
                }
                
                // Reset objects that have come to rest (or after a certain time)
                const isAtRest = obj.velocity.lengthSq() < 0.01 && obj.angularVelocity.lengthSq() < 0.01;
                const isOutOfBounds = Math.abs(obj.position.x) > 500 || Math.abs(obj.position.z) > 500;
                
                if (isAtRest || isOutOfBounds || obj.resetTimer > 60) {
                    // Only reset the object if it's far from the player to avoid jarring visuals
                    if (carPosition.distanceTo(obj.position) > 50 || isOutOfBounds) {
                        this.resetPhysicsObject(obj);
                    }
                } else {
                    // Increment reset timer
                    obj.resetTimer = (obj.resetTimer || 0) + deltaTime;
                }
            }
        }
    }
    
    flickerLight(light) {
        if (!light) return;
        
        // Store original intensity
        const originalIntensity = light.intensity;
        
        // Create a more dramatic flickering effect
        const flickerCount = 10;
        let flickerIndex = 0;
        
        const flicker = () => {
            // Random intensity between 0 and original
            if (flickerIndex % 2 === 0) {
                // Bright flash
                light.intensity = originalIntensity * (1.2 + Math.random() * 0.3);
            } else {
                // Dim moment
                light.intensity = originalIntensity * Math.random() * 0.5;
            }
            
            flickerIndex++;
            
            if (flickerIndex < flickerCount) {
                // Continue flickering
                setTimeout(flicker, 50 + Math.random() * 50);
            } else {
                // After flickering, set to a dimmer but stable value
                light.intensity = originalIntensity * 0.7;
            }
        };
        
        // Start flickering
        flicker();
    }
    
    resetPhysicsObject(obj) {
        if (obj.type === 'trashCan') {
            // Get a new random position for the trash can
            const newPosition = this.getRandomSidewalkPosition();
            
            // Reset the physics object to a new position
            obj.originalPosition.copy(newPosition);
            obj.position.copy(newPosition);
            obj.rotation.copy(obj.originalRotation);
            obj.velocity.set(0, 0, 0);
            obj.angularVelocity.set(0, 0, 0);
            obj.isKnockedOver = false;
            
            // Update the mesh
            obj.mesh.position.copy(obj.position);
            obj.mesh.rotation.copy(obj.rotation);
        } else {
            // Reset to original position for other objects
            obj.position.copy(obj.originalPosition);
            obj.rotation.copy(obj.originalRotation);
            obj.velocity.set(0, 0, 0);
            obj.angularVelocity.set(0, 0, 0);
            obj.isKnockedOver = false;
            
            // Update the mesh
            obj.mesh.position.copy(obj.position);
            obj.mesh.rotation.copy(obj.rotation);
            
            // Special case for streetlights: reset the light
            if (obj.type === 'streetlight' && obj.light) {
                obj.light.intensity = 1.0; // Reset light to full intensity
            }
        }
    }
    
    getRandomSidewalkPosition() {
        // Choose a random road
        const isHorizontal = Math.random() > 0.5;
        const roadArray = isHorizontal ? this.city.getRoads().horizontal : this.city.getRoads().vertical;
        const roadIndex = Math.floor(Math.random() * roadArray.length);
        const road = roadArray[roadIndex];
        
        // Get city dimensions
        const totalSize = this.city.citySize * this.city.blockSize + (this.city.citySize + 1) * this.city.roadWidth;
        const halfTotalSize = totalSize / 2;
        
        // Position slightly off the road on the sidewalk
        const roadPos = isHorizontal ? road.centerZ : road.centerX;
        const offset = (road.width / 2) + 1.5; // Place on sidewalk
        const sideOffset = (Math.random() > 0.5 ? 1 : -1) * offset;
        
        // Calculate position
        let x, y, z;
        if (isHorizontal) {
            x = (Math.random() * totalSize) - halfTotalSize;
            z = roadPos + sideOffset;
        } else {
            x = roadPos + sideOffset;
            z = (Math.random() * totalSize) - halfTotalSize;
        }
        
        // Y position (height) is half the height of the trash can
        y = 1; // Typical trash can height is 2, so halfway up is 1
        
        return new THREE.Vector3(x, y, z);
    }
    
    updateParticles(deltaTime) {
        if (!this.particles) return;
        
        // Update all particles, remove those that are finished
        this.particles = this.particles.filter(updateFn => !updateFn(deltaTime));
    }
    
    updateHumans(deltaTime) {
        if (!this.humans) return;
        
        const carPosition = this.car.getPosition();
        const carRadius = this.car.getBoundingRadius();
        const carSpeed = this.car.getSpeed();
        
        // Define a maximum distance for full AI processing
        // Humans beyond this distance will use simplified updates
        const maxAIProcessingDistance = 500;
        
        // Update each human
        this.humans.forEach(human => {
            if (human.isDead) {
                // Dead humans don't move, just stay on the ground
                return;
            }
            
            // Update position
            const humanPos = human.position;
            // Ensure human stays on the ground
            humanPos.y = 0; // Set Y position to ground level
            
            // Update the mesh position (correct height off the ground)
            human.mesh.position.set(humanPos.x, 0, humanPos.z); // Set Y to 0 for ground level
            
            // Get distance to car
            const distanceToCar = humanPos.distanceTo(carPosition);
            
            // Check if human is hit by car
            if (distanceToCar < (carRadius + human.boundingRadius)) {
                // Check if car is moving fast enough to kill
                if (carSpeed > 5) {
                    this.killHuman(human, carPosition.clone().sub(humanPos).normalize());
                    return;
                }
            }
            
            // Skip complex AI processing for humans far from the player
            if (distanceToCar > maxAIProcessingDistance) {
                // For distant humans, just do minimal updates
                // This significantly improves performance
                if (human.state === 'walking') {
                    // Simple walking animation without path calculations
                    this.animateWalking(human, deltaTime);
                }
                return;
            }
            
            // Full AI logic for nearby humans
            if (human.state === 'walking') {
                // Walking state
                
                // Check if needs to flee from car
                if (distanceToCar < human.detectionRadius) {
                    // Change to fleeing state
                    human.state = 'fleeing';
                    human.runningFrom = carPosition.clone();
                } else {
                    // Regular walking behavior
                    this.updateWalkingHuman(human, deltaTime);
                }
            } else if (human.state === 'fleeing') {
                // Fleeing state
                
                // Check if still needs to flee (car is close)
                if (distanceToCar < human.detectionRadius * 1.5) { // Keep fleeing until a safe distance
                    // Calculate vector away from car
                    const fleeDirection = new THREE.Vector3().subVectors(humanPos, carPosition).normalize();
                    
                    // Update human velocity
                    human.velocity.copy(fleeDirection).multiplyScalar(human.fleeSpeed);
                    
                    // Calculate new position but don't apply yet
                    const newPosition = humanPos.clone().add(human.velocity.clone().multiplyScalar(deltaTime));
                    
                    // Check for boundary collision
                    let collisionDetected = false;
                    
                    // Check against boundary obstacles
                    for (const obstacle of this.obstacles) {
                        if (obstacle.type === 'boundary') {
                            // For boundary obstacles, use a simple distance check
                            const distance = newPosition.distanceTo(obstacle.position);
                            if (distance < (human.boundingRadius + obstacle.boundingRadius)) {
                                collisionDetected = true;
                                break;
                            }
                        }
                    }
                    
                    // Also enforce a hard boundary based on city size
                    const cityBounds = this.city.citySize * this.city.blockSize + (this.city.citySize + 1) * this.city.roadWidth;
                    const halfBounds = cityBounds / 2;
                    const boundaryBuffer = 5; // Keep humans a bit away from the edge
                    
                    const atBoundary = Math.abs(newPosition.x) > halfBounds - boundaryBuffer || 
                                       Math.abs(newPosition.z) > halfBounds - boundaryBuffer;
                    
                    // Modify direction if hitting a boundary
                    if (collisionDetected || atBoundary) {
                        // Find a new flee direction that doesn't hit the boundary
                        // Try to move along the boundary instead
                        if (atBoundary) {
                            // Determine which boundary is being hit
                            let tangentDir = new THREE.Vector3();
                            
                            if (Math.abs(newPosition.x) > halfBounds - boundaryBuffer) {
                                // Hitting east/west boundary, move north/south
                                tangentDir.set(0, 0, Math.sign(carPosition.z - humanPos.z) * -1);
                            } else {
                                // Hitting north/south boundary, move east/west
                                tangentDir.set(Math.sign(carPosition.x - humanPos.x) * -1, 0, 0);
                            }
                            
                            // Update velocity to move along boundary
                            human.velocity.copy(tangentDir).multiplyScalar(human.fleeSpeed);
                            
                            // Update position with adjusted velocity
                            humanPos.add(human.velocity.clone().multiplyScalar(deltaTime));
                        } else {
                            // Just stop and don't update position this frame
                            // They'll get a new direction next frame
                        }
                    } else {
                        // No collision, update position normally
                        humanPos.copy(newPosition);
                    }
                    
                    // Ensure Y position remains at ground level
                    humanPos.y = 0;
                    
                    // Update human rotation to face away from car
                    const targetAngle = Math.atan2(fleeDirection.x, fleeDirection.z);
                    // Smoothly rotate towards target angle
                    const angleDiff = targetAngle - human.rotation;
                    // Normalize to [-PI, PI]
                    const normalizedDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
                    human.rotation += normalizedDiff * 5 * deltaTime; // Smooth rotation
                    human.mesh.rotation.y = human.rotation;
                    
                    // Run animation
                    this.animateRunning(human, deltaTime);
                } else {
                    // Car is far away, go back to walking
                    human.state = 'walking';
                    human.velocity.set(0, 0, 0);
                }
            }
        });
    }
    
    animateWalking(human, deltaTime) {
        // Simple walking animation
        if (!human.limbs) return;
        
        // Update walk cycle
        human.animationState.walkCycle += deltaTime * human.animationState.animSpeed;
        
        // Calculate leg and arm angles based on walk cycle
        const legAngle = Math.sin(human.animationState.walkCycle) * 0.3;
        const armAngle = -Math.sin(human.animationState.walkCycle) * 0.2;
        
        // Apply angles to limbs
        human.limbs.leftLeg.rotation.x = legAngle;
        human.limbs.rightLeg.rotation.x = -legAngle;
        human.limbs.leftArm.rotation.x = armAngle;
        human.limbs.rightArm.rotation.x = -armAngle;
    }
    
    animateRunning(human, deltaTime) {
        // Running animation - more exaggerated than walking
        if (!human.limbs) return;
        
        // Update walk cycle faster for running
        human.animationState.walkCycle += deltaTime * human.animationState.animSpeed * 2;
        
        // Calculate leg and arm angles based on walk cycle - more exaggerated
        const legAngle = Math.sin(human.animationState.walkCycle) * 0.7;
        const armAngle = -Math.sin(human.animationState.walkCycle) * 0.5;
        
        // Apply angles to limbs
        human.limbs.leftLeg.rotation.x = legAngle;
        human.limbs.rightLeg.rotation.x = -legAngle;
        human.limbs.leftArm.rotation.x = armAngle;
        human.limbs.rightArm.rotation.x = -armAngle;
    }
    
    updateWalkingHuman(human, deltaTime) {
        // 1. Calculate new position based on velocity
        const humanPos = human.position;
        
        // If no direction, assign a new random direction
        if (human.velocity.lengthSq() < 0.01) {
            // Determine direction based on walkHorizontal flag
            if (human.walkHorizontal) {
                // Walking east/west
                human.velocity.set((Math.random() > 0.5 ? 1 : -1), 0, 0);
            } else {
                // Walking north/south
                human.velocity.set(0, 0, (Math.random() > 0.5 ? 1 : -1));
            }
            
            // Normalize and set speed
            human.velocity.normalize().multiplyScalar(human.walkSpeed);
            
            // Set rotation to match direction
            human.rotation = Math.atan2(human.velocity.x, human.velocity.z);
            human.mesh.rotation.y = human.rotation;
        }
        
        // Calculate new position but don't apply yet
        const newPosition = humanPos.clone().add(human.velocity.clone().multiplyScalar(deltaTime));
        
        // Check for boundary collision
        let collisionDetected = false;
        
        // Check against boundary obstacles
        for (const obstacle of this.obstacles) {
            if (obstacle.type === 'boundary') {
                // For boundary obstacles, use a simple distance check
                const distance = newPosition.distanceTo(obstacle.position);
                if (distance < (human.boundingRadius + obstacle.boundingRadius)) {
                    collisionDetected = true;
                    break;
                }
            }
        }
        
        // Also enforce a hard boundary based on city size
        const cityBounds = this.city.citySize * this.city.blockSize + (this.city.citySize + 1) * this.city.roadWidth;
        const halfBounds = cityBounds / 2;
        const boundaryBuffer = 5; // Keep humans a bit away from the edge
        
        const atBoundary = Math.abs(newPosition.x) > halfBounds - boundaryBuffer || 
                          Math.abs(newPosition.z) > halfBounds - boundaryBuffer;
        
        // Modify direction if hitting a boundary or randomly
        if (collisionDetected || atBoundary || Math.random() < 0.01) { // 1% chance to change direction randomly
            if (atBoundary) {
                // If at boundary, turn towards center
                const centerDir = new THREE.Vector3(0, 0, 0).sub(humanPos).normalize();
                human.velocity.copy(centerDir).multiplyScalar(human.walkSpeed);
            } else {
                // Just pick a new random direction
                const randomAngle = Math.random() * Math.PI * 2;
                human.velocity.set(Math.sin(randomAngle), 0, Math.cos(randomAngle)).multiplyScalar(human.walkSpeed);
            }
            
            // Update rotation to match new direction
            human.rotation = Math.atan2(human.velocity.x, human.velocity.z);
            
            // Schedule a smooth rotation
            const targetRotation = human.rotation;
            const rotationDiff = targetRotation - human.mesh.rotation.y;
            // Normalize to [-PI, PI]
            const normalizedDiff = ((rotationDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
            human.mesh.rotation.y += normalizedDiff * 5 * deltaTime; // Smooth rotation
        } else {
            // No collision, update position normally
            humanPos.copy(newPosition);
        }
        
        // Ensure Y position remains at ground level
        humanPos.y = 0;
        
        // Walking animation
        this.animateWalking(human, deltaTime);
    }
    
    killHuman(human, impactDirection) {
        if (human.isDead) return; // Already dead
        
        // Mark as dead
        human.isDead = true;
        human.state = 'dead';
        
        // Add points
        this.addScore(human.pointValue);
        
        // Make the body "ragdoll" - fall over in the direction of the impact
        const humanGroup = human.mesh;
        
        // Rotate the human to fall in the impact direction
        const impactAngle = Math.atan2(impactDirection.x, impactDirection.z);
        humanGroup.rotation.y = impactAngle;
        
        // Rotate to lie on the ground
        humanGroup.rotation.x = Math.PI / 2;
        
        // Lower to ground level
        humanGroup.position.y = 0.3;
        
        // Create blood effect
        this.createBloodSplatter(human.position.clone());
        
        // Detach limbs with probability
        if (Math.random() < 0.5) {
            // Choose a random limb to detach
            const limbs = [human.limbs.leftArm, human.limbs.rightArm, human.limbs.leftLeg, human.limbs.rightLeg];
            const limbToDetach = limbs[Math.floor(Math.random() * limbs.length)];
            
            // Detach by making it fly off
            const limbWorldPos = new THREE.Vector3();
            limbToDetach.getWorldPosition(limbWorldPos);
            
            // Create a copy of the limb
            const detachedLimb = limbToDetach.clone();
            
            // Hide the original limb
            limbToDetach.visible = false;
            
            // Position the detached limb at the world position
            detachedLimb.position.copy(limbWorldPos);
            
            // Add directly to the scene
            this.scene.add(detachedLimb);
            
            // Add physics to the detached limb
            const limbVelocity = impactDirection.clone().multiplyScalar(5 + Math.random() * 5);
            limbVelocity.y = 5 + Math.random() * 5; // Up in the air
            
            const angularVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
            
            // Create an update function for the limb physics
            const updateLimb = (deltaTime) => {
                // Apply gravity
                limbVelocity.y -= 9.8 * deltaTime;
                
                // Move limb
                detachedLimb.position.x += limbVelocity.x * deltaTime;
                detachedLimb.position.y += limbVelocity.y * deltaTime;
                detachedLimb.position.z += limbVelocity.z * deltaTime;
                
                // Rotate limb
                detachedLimb.rotation.x += angularVelocity.x * deltaTime;
                detachedLimb.rotation.y += angularVelocity.y * deltaTime;
                detachedLimb.rotation.z += angularVelocity.z * deltaTime;
                
                // Check for ground collision
                if (detachedLimb.position.y < 0.1) {
                    detachedLimb.position.y = 0.1;
                    limbVelocity.y = 0;
                    // Apply friction
                    limbVelocity.x *= 0.95;
                    limbVelocity.z *= 0.95;
                }
                
                // Check if limb has stopped moving
                if (limbVelocity.lengthSq() < 0.1 && detachedLimb.position.y < 0.2) {
                    return true; // Signal to stop updating
                }
                
                return false;
            };
            
            // Add to update list
            if (!this.particles) this.particles = [];
            this.particles.push(updateLimb);
        }
    }
    
    createBloodSplatter(position) {
        // Create blood particles
        const particleCount = 10;
        
        for (let i = 0; i < particleCount; i++) {
            // Create a blood particle
            const size = 0.1 + Math.random() * 0.2;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0xaa0000, // Dark red
                transparent: true,
                opacity: 0.9
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Position at the impact point
            particle.position.copy(position);
            particle.position.y = 0.1 + Math.random() * 0.3;
            
            // Random velocity, mostly outward and slightly upward
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.random() * 2,
                Math.sin(angle) * speed
            );
            
            // Add to scene
            this.scene.add(particle);
            
            // Store particle data
            const particleData = {
                mesh: particle,
                velocity: velocity,
                gravity: 9.8,
                lifeTime: 0,
                maxLifeTime: 0.5 + Math.random() * 0.5
            };
            
            // Add update logic
            const updateParticle = (deltaTime) => {
                // Apply gravity
                particleData.velocity.y -= particleData.gravity * deltaTime;
                
                // Update position
                particleData.mesh.position.x += particleData.velocity.x * deltaTime;
                particleData.mesh.position.y += particleData.velocity.y * deltaTime;
                particleData.mesh.position.z += particleData.velocity.z * deltaTime;
                
                // If hit ground, stop and become a permanent blood stain
                if (particleData.mesh.position.y < 0.05) {
                    particleData.mesh.position.y = 0.05;
                    
                    // Create a blood stain on the ground
                    const stainSize = 0.3 + Math.random() * 0.5;
                    const stainGeometry = new THREE.CircleGeometry(stainSize, 8);
                    const stainMaterial = new THREE.MeshBasicMaterial({
                        color: 0x880000, // Darker red for blood stain
                        transparent: true,
                        opacity: 0.7
                    });
                    
                    const stain = new THREE.Mesh(stainGeometry, stainMaterial);
                    stain.position.copy(particleData.mesh.position);
                    stain.position.y = 0.01; // Just above ground
                    stain.rotation.x = -Math.PI / 2; // Flat on ground
                    
                    this.scene.add(stain);
                    this.bloodStains.push(stain);
                    
                    // Limit blood stains to prevent performance issues
                    if (this.bloodStains.length > 50) {
                        const oldStain = this.bloodStains.shift();
                        this.scene.remove(oldStain);
                    }
                    
                    // Remove the particle
                    this.scene.remove(particleData.mesh);
                    return true;
                }
                
                // Update lifetime
                particleData.lifeTime += deltaTime;
                if (particleData.lifeTime >= particleData.maxLifeTime) {
                    this.scene.remove(particleData.mesh);
                    return true;
                }
                
                return false;
            };
            
            // Add to particles array
            if (!this.particles) this.particles = [];
            this.particles.push(updateParticle);
        }
    }
    
    updateBoost(deltaTime) {
        // Update boost meter
        if (this.boost.active && this.boost.available > 0) {
            // Deplete boost when active
            this.boost.available = Math.max(0, this.boost.available - this.boost.depleteRate * deltaTime);
        } else {
            // Recharge boost when not active
            this.boost.available = Math.min(this.boost.max, this.boost.available + this.boost.rechargeRate * deltaTime);
        }
        
        // Update boost meter UI
        this.updateBoostMeter();
    }
    
    updateBoostMeter() {
        // Update boost meter fill
        const percentage = (this.boost.available / this.boost.max) * 100;
        this.boostFill.style.width = percentage + '%';
        
        // Change color based on amount
        if (percentage < 20) {
            this.boostFill.style.backgroundColor = '#ff0000'; // Red when low
        } else if (percentage < 50) {
            this.boostFill.style.backgroundColor = '#ffff00'; // Yellow when medium
        } else {
            this.boostFill.style.backgroundColor = '#ff00ff'; // Magenta when high
        }
    }
    
    createBoostTrail() {
        // Create particles behind the car for boost effect
        const carPosition = this.car.getPosition();
        const carDirection = this.car.getDirection().multiplyScalar(-1); // Behind the car
        
        // Create 2 particles per frame
        for (let i = 0; i < 2; i++) {
            // Get position behind the car, with small random offset
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 1.5, 
                Math.random() * 0.5, 
                (Math.random() - 0.5) * 1.5
            );
            
            const particlePos = carPosition.clone()
                .add(carDirection.clone().multiplyScalar(2 + Math.random()))
                .add(offset);
            
            // Create particle
            const size = 0.3 + Math.random() * 0.6;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            
            // Create glowing neon material
            const colors = [0xff00ff, 0x00ffff, 0xff6600]; // Magenta, Cyan, Orange
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(particlePos);
            
            // Add to scene
            this.scene.add(particle);
            
            // Particle data
            const particleData = {
                mesh: particle,
                life: 0,
                maxLife: 0.5 + Math.random() * 0.5,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    1 + Math.random() * 2,
                    (Math.random() - 0.5) * 2
                )
            };
            
            // Store particle for update
            if (!this.boost.trailParticles) this.boost.trailParticles = [];
            this.boost.trailParticles.push(particleData);
            
            // Add to general particles array for updating
            if (!this.particles) this.particles = [];
            this.particles.push((deltaTime) => {
                // Update life
                particleData.life += deltaTime;
                
                // Update position
                particleData.mesh.position.add(
                    particleData.velocity.clone().multiplyScalar(deltaTime)
                );
                
                // Update scale and opacity
                const lifeProgress = particleData.life / particleData.maxLife;
                const scale = 1 - lifeProgress;
                particleData.mesh.scale.set(scale, scale, scale);
                particleData.mesh.material.opacity = 0.7 * (1 - lifeProgress);
                
                // Remove when dead
                if (particleData.life >= particleData.maxLife) {
                    this.scene.remove(particleData.mesh);
                    
                    // Remove from trail particles array
                    const index = this.boost.trailParticles.indexOf(particleData);
                    if (index > -1) {
                        this.boost.trailParticles.splice(index, 1);
                    }
                    
                    return true; // Signal to remove from update list
                }
                
                return false;
            });
        }
    }
    
    addScore(points) {
        this.score += points;
        if (this.scoreDisplay) {
            // Format score with leading zeros for retro feel
            const scoreStr = this.score.toString().padStart(6, '0');
            this.scoreDisplay.innerHTML = `SCORE: ${scoreStr}`;
        }
    }
} 