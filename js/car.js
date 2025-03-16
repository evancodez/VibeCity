import * as THREE from 'three';

export class Car {
    constructor(scene) {
        // Car properties
        this.scene = scene;
        this.mesh = null;
        this.wheelMeshes = [];
        
        // Physics properties
        this.position = new THREE.Vector3(0, 0.5, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.rotationQuaternion = new THREE.Quaternion();
        this.direction = new THREE.Vector3(0, 0, 1);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.speed = 0;
        
        // Jump physics
        this.isAirborne = false;
        this.verticalVelocity = 0;
        this.gravity = 20; // Gravity acceleration
        
        // Ramp handling
        this.onRamp = false;
        this.rampHeight = 0;
        
        // Car settings
        this.maxSpeed = 40;
        this.acceleration = 25;
        this.braking = 35;
        this.deceleration = 8;
        this.turnSpeed = Math.PI * 1.2; // Reduced from 1.5 to make turning less aggressive
        
        // Turning smoothness
        this.currentTurnAmount = 0;
        this.turnInertia = 0.15; // Controls how quickly turning responds to input changes
        
        // Collision detection
        this.boundingRadius = 1.8;
        this.lastValidPosition = new THREE.Vector3(0, 0.5, 0);
        this.colliding = false;
        this.bounceFactor = 0.3; // Controls how bouncy collisions are
        
        // Drift system
        this.isDrifting = false;
        this.driftThreshold = 0.6;
        this.driftMarks = [];
        this.driftMarkInterval = 0.05;
        this.lastDriftMarkTime = 0;
        this.maxDriftMarks = 100;
        
        // Create the car model
        this.createCarModel();
    }
    
    createCarModel() {
        // Create a group for the car
        this.mesh = new THREE.Group();
        
        // Create a sleek, low, wide sports car - Ferrari Testarossa inspired
        
        // Main body - wide and low with sharp angles
        const bodyGeometry = new THREE.BoxGeometry(2.4, 0.5, 4.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0066, // Hot pink
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0xff0066,
            emissiveIntensity: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.4;
        body.castShadow = true;
        body.receiveShadow = true;
        this.mesh.add(body);
        
        // Add the iconic side strakes (vertical vents along sides)
        this.addSideStrakes();
        
        // Wedge-shaped front
        const frontGeometry = new THREE.BoxGeometry(2.4, 0.3, 0.8);
        const frontMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0066,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0xff0066,
            emissiveIntensity: 0.2
        });
        const front = new THREE.Mesh(frontGeometry, frontMaterial);
        front.position.set(0, 0.25, 2.2);
        front.castShadow = true;
        front.receiveShadow = true;
        this.mesh.add(front);
        
        // Low-profile cabin with angled windshield
        const cabinGeometry = new THREE.BoxGeometry(1.8, 0.4, 2.5);
        const cabinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.1,
            metalness: 0.9
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.y = 0.85;
        cabin.position.z = 0.2;
        cabin.castShadow = true;
        cabin.receiveShadow = true;
        this.mesh.add(cabin);
        
        // Add windshields and windows
        this.addWindshields();
        
        // Add spoiler
        this.addSpoiler();
        
        // Add bumpers and details
        this.addBumpers();
        
        // Add wheels
        this.addWheels();
        
        // Add headlights
        this.addHeadlights();
        
        // Add taillights - more pronounced for 80s style
        this.addTaillights();
        
        // Add neon underglow
        this.addUnderglow();
        
        // Add pop-up headlights
        this.addPopupHeadlights();
        
        // Position the car
        this.mesh.position.copy(this.position);
        this.mesh.rotation.copy(this.rotation);
        
        // Add to scene
        this.scene.add(this.mesh);
    }
    
    addSideStrakes() {
        // Create the iconic side strakes (vertical vents) like on the Testarossa
        const strakeCount = 5;
        const strakeWidth = 0.05;
        const strakeHeight = 0.3;
        const strakeDepth = 1.6;
        const strakeSpacing = 0.25;
        const strakeStartZ = -1.2;
        
        const strakeMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.5,
            metalness: 0.8
        });
        
        // Left side strakes
        for (let i = 0; i < strakeCount; i++) {
            const strakeGeometry = new THREE.BoxGeometry(strakeWidth, strakeHeight, strakeDepth);
            const strake = new THREE.Mesh(strakeGeometry, strakeMaterial);
            strake.position.set(-1.2, 0.4, strakeStartZ + i * strakeSpacing);
            this.mesh.add(strake);
        }
        
        // Right side strakes
        for (let i = 0; i < strakeCount; i++) {
            const strakeGeometry = new THREE.BoxGeometry(strakeWidth, strakeHeight, strakeDepth);
            const strake = new THREE.Mesh(strakeGeometry, strakeMaterial);
            strake.position.set(1.2, 0.4, strakeStartZ + i * strakeSpacing);
            this.mesh.add(strake);
        }
    }
    
    addWindshields() {
        // Material for all glass with color tint
        const glassMaterial = new THREE.MeshStandardMaterial({
            color: 0x88CCFF,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.7
        });
        
        // Front windshield - angled
        const frontWindshieldGeometry = new THREE.BoxGeometry(1.7, 0.01, 1.2);
        const frontWindshield = new THREE.Mesh(frontWindshieldGeometry, glassMaterial);
        frontWindshield.position.set(0, 1.0, 1.2);
        frontWindshield.rotation.x = Math.PI / 6; // Angled windshield
        this.mesh.add(frontWindshield);
        
        // Rear windshield
        const rearWindshieldGeometry = new THREE.BoxGeometry(1.7, 0.01, 1.0);
        const rearWindshield = new THREE.Mesh(rearWindshieldGeometry, glassMaterial);
        rearWindshield.position.set(0, 1.0, -0.8);
        rearWindshield.rotation.x = -Math.PI / 8; // Slightly angled
        this.mesh.add(rearWindshield);
        
        // Side windows
        const sideWindowGeometry = new THREE.PlaneGeometry(1.6, 0.4);
        
        // Left window
        const leftWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
        leftWindow.position.set(-0.91, 0.95, 0.2);
        leftWindow.rotation.y = Math.PI / 2;
        this.mesh.add(leftWindow);
        
        // Right window
        const rightWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
        rightWindow.position.set(0.91, 0.95, 0.2);
        rightWindow.rotation.y = -Math.PI / 2;
        this.mesh.add(rightWindow);
    }
    
    addSpoiler() {
        // Add a rear spoiler
        const spoilerBaseGeometry = new THREE.BoxGeometry(2.2, 0.1, 0.4);
        const spoilerTopGeometry = new THREE.BoxGeometry(2.2, 0.5, 0.1);
        
        const spoilerMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0066, // Match body color
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0xff0066,
            emissiveIntensity: 0.2
        });
        
        // Base of spoiler
        const spoilerBase = new THREE.Mesh(spoilerBaseGeometry, spoilerMaterial);
        spoilerBase.position.set(0, 0.65, -2.2);
        this.mesh.add(spoilerBase);
        
        // Top part of spoiler
        const spoilerTop = new THREE.Mesh(spoilerTopGeometry, spoilerMaterial);
        spoilerTop.position.set(0, 0.9, -2.35);
        this.mesh.add(spoilerTop);
        
        // Spoiler supports (left and right)
        const supportGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.2);
        const supportMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.5,
            metalness: 0.8
        });
        
        const leftSupport = new THREE.Mesh(supportGeometry, supportMaterial);
        leftSupport.position.set(-1.0, 0.75, -2.3);
        this.mesh.add(leftSupport);
        
        const rightSupport = new THREE.Mesh(supportGeometry, supportMaterial);
        rightSupport.position.set(1.0, 0.75, -2.3);
        this.mesh.add(rightSupport);
    }
    
    addBumpers() {
        // Bumper material
        const bumperMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.5
        });
        
        // Front bumper
        const frontBumperGeometry = new THREE.BoxGeometry(2.4, 0.3, 0.2);
        const frontBumper = new THREE.Mesh(frontBumperGeometry, bumperMaterial);
        frontBumper.position.set(0, 0.25, 2.6);
        this.mesh.add(frontBumper);
        
        // Rear bumper
        const rearBumperGeometry = new THREE.BoxGeometry(2.4, 0.3, 0.2);
        const rearBumper = new THREE.Mesh(rearBumperGeometry, bumperMaterial);
        rearBumper.position.set(0, 0.25, -2.6);
        this.mesh.add(rearBumper);
    }
    
    addWheels() {
        // Create larger, low-profile wheels for sports car look
        const wheelRadius = 0.4;
        const wheelThickness = 0.2;
        
        // Wheel geometry and materials
        const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 16);
        wheelGeometry.rotateZ(Math.PI / 2); // Rotate to align with car direction
        
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111, // Almost black
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Rim material with metallic sheen
        const rimMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc, // Silver
            roughness: 0.2,
            metalness: 0.9
        });
        
        // Wheel positions - wider stance for sports car
        const wheelPositions = [
            { x: -1.15, y: 0.4, z: 1.5 },   // Front left
            { x: 1.15, y: 0.4, z: 1.5 },    // Front right
            { x: -1.15, y: 0.4, z: -1.5 },  // Back left
            { x: 1.15, y: 0.4, z: -1.5 }    // Back right
        ];
        
        // Create each wheel
        wheelPositions.forEach(pos => {
            // Tire
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.castShadow = true;
            wheel.receiveShadow = true;
            this.mesh.add(wheel);
            this.wheelMeshes.push(wheel);
            
            // Rim
            const rimGeometry = new THREE.CylinderGeometry(wheelRadius * 0.7, wheelRadius * 0.7, wheelThickness + 0.01, 8);
            rimGeometry.rotateZ(Math.PI / 2);
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.position.set(pos.x, pos.y, pos.z);
            this.mesh.add(rim);
        });
    }
    
    addHeadlights() {
        // Create sleek, rectangular headlight geometry
        const headlightGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.1);
        const headlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffcc,
            emissive: 0xffffcc,
            emissiveIntensity: 1.0
        });
        
        // Front headlights
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-0.7, 0.4, 2.61);
        this.mesh.add(leftHeadlight);
        
        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(0.7, 0.4, 2.61);
        this.mesh.add(rightHeadlight);
        
        // Add actual lights for illumination
        const headlightLight = new THREE.SpotLight(0xffffcc, 1.0, 50, Math.PI / 6, 0.5, 2);
        headlightLight.position.set(0, 0.5, 2.7);
        headlightLight.target.position.set(0, 0, 20);
        this.mesh.add(headlightLight);
        this.mesh.add(headlightLight.target);
    }
    
    addPopupHeadlights() {
        // Popup headlight housings (retracted by default)
        const popupGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.4);
        const popupMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0066, // Match car body
            roughness: 0.2,
            metalness: 0.9
        });
        
        // Left popup
        const leftPopup = new THREE.Group();
        const leftPopupHousing = new THREE.Mesh(popupGeometry, popupMaterial);
        leftPopup.add(leftPopupHousing);
        
        // Light element inside popup
        const leftLightGeometry = new THREE.CircleGeometry(0.15, 16);
        const leftLightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffcc,
            emissive: 0xffffcc,
            emissiveIntensity: 1.0
        });
        const leftLight = new THREE.Mesh(leftLightGeometry, leftLightMaterial);
        leftLight.position.z = 0.21;
        leftLight.rotation.y = Math.PI;
        leftPopup.add(leftLight);
        
        // Position the popup assembly
        leftPopup.position.set(-0.75, 0.4, 2.4);
        leftPopup.rotation.x = -Math.PI / 2; // Closed position (pointing down)
        this.mesh.add(leftPopup);
        
        // Right popup (mirror of left)
        const rightPopup = new THREE.Group();
        const rightPopupHousing = new THREE.Mesh(popupGeometry, popupMaterial);
        rightPopup.add(rightPopupHousing);
        
        const rightLight = new THREE.Mesh(leftLightGeometry, leftLightMaterial);
        rightLight.position.z = 0.21;
        rightLight.rotation.y = Math.PI;
        rightPopup.add(rightLight);
        
        rightPopup.position.set(0.75, 0.4, 2.4);
        rightPopup.rotation.x = -Math.PI / 2; // Closed position
        this.mesh.add(rightPopup);
        
        // Store references for animation
        this.popupHeadlights = {
            left: leftPopup,
            right: rightPopup,
            isOpen: false
        };
    }
    
    addTaillights() {
        // Create horizontal strip taillights (80s style)
        const tailLightGeometry = new THREE.BoxGeometry(2.2, 0.2, 0.1);
        const tailLightMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.9
        });
        
        // Main horizontal bar
        const tailLightBar = new THREE.Mesh(tailLightGeometry, tailLightMaterial);
        tailLightBar.position.set(0, 0.5, -2.61);
        this.mesh.add(tailLightBar);
        
        // Add detailed horizontal strips within the taillight
        for (let i = 0; i < 5; i++) {
            const stripGeometry = new THREE.BoxGeometry(2.0, 0.02, 0.05);
            const stripMaterial = new THREE.MeshStandardMaterial({
                color: 0xff3333,
                emissive: 0xff3333,
                emissiveIntensity: 1.0,
                transparent: true,
                opacity: 0.9
            });
            
            const strip = new THREE.Mesh(stripGeometry, stripMaterial);
            strip.position.set(0, 0.45 + i * 0.03, -2.61);
            this.mesh.add(strip);
        }
        
        // Add brake light above spoiler
        const brakeLightGeometry = new THREE.BoxGeometry(1.5, 0.1, 0.05);
        const brakeLightMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.9
        });
        
        const brakeLight = new THREE.Mesh(brakeLightGeometry, brakeLightMaterial);
        brakeLight.position.set(0, 0.9, -2.41);
        this.mesh.add(brakeLight);
    }
    
    addUnderglow() {
        // Create more intense underglow lights
        const glowColors = [
            0xff00ff, // Magenta
            0x00ffff, // Cyan
            0x9900ff  // Purple
        ];
        
        // Randomly select a color
        const glowColor = glowColors[Math.floor(Math.random() * glowColors.length)];
        
        // Create underglow lights
        const glowGeometry = new THREE.PlaneGeometry(3, 5);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        const underglow = new THREE.Mesh(glowGeometry, glowMaterial);
        underglow.rotation.x = Math.PI / 2; // Make it face downward
        underglow.position.y = 0.05; // Position it just below the car
        this.mesh.add(underglow);
        
        // Add actual point lights for glow effect
        const frontGlowLight = new THREE.PointLight(glowColor, 2, 5, 2);
        frontGlowLight.position.set(0, 0.1, 1.5);
        this.mesh.add(frontGlowLight);
        
        const rearGlowLight = new THREE.PointLight(glowColor, 2, 5, 2);
        rearGlowLight.position.set(0, 0.1, -1.5);
        this.mesh.add(rearGlowLight);
        
        // Store reference to glow for animation
        this.underglowLights = {
            color: glowColor,
            lights: [frontGlowLight, rearGlowLight],
            material: glowMaterial
        };
    }
    
    update(inputHandler, deltaTime, obstacles = []) {
        // Store the current position as potentially the last valid position
        if (!this.colliding) {
            this.lastValidPosition.copy(this.position);
        }
        
        // Apply acceleration/deceleration based on input (but not if airborne)
        if (!this.isAirborne) {
            if (inputHandler.isKeyDown('ArrowUp') || inputHandler.isKeyDown('w')) {
                // Accelerate forward
                this.speed += this.acceleration * deltaTime;
                this.speed = Math.min(this.speed, this.maxSpeed);
            } else if (inputHandler.isKeyDown('ArrowDown') || inputHandler.isKeyDown('s')) {
                // Brake/reverse
                this.speed -= this.braking * deltaTime;
                this.speed = Math.max(this.speed, -this.maxSpeed / 2); // Reverse is half of forward speed
            } else {
                // Decelerate when no input
                if (this.speed > 0) {
                    this.speed -= this.deceleration * deltaTime;
                    this.speed = Math.max(this.speed, 0);
                } else if (this.speed < 0) {
                    this.speed += this.deceleration * deltaTime;
                    this.speed = Math.min(this.speed, 0);
                }
            }
        } else {
            // While airborne, add a little air resistance but mostly maintain momentum
            if (this.speed > 0) {
                this.speed -= this.deceleration * 0.1 * deltaTime;
                this.speed = Math.max(this.speed, 0);
            } else if (this.speed < 0) {
                this.speed += this.deceleration * 0.1 * deltaTime;
                this.speed = Math.min(this.speed, 0);
            }
            
            // In air rotation control
            if (inputHandler.isKeyDown('ArrowLeft') || inputHandler.isKeyDown('a')) {
                // Roll left in air (fixing direction to match control input)
                this.rotation.z -= 1.5 * deltaTime;
            } else if (inputHandler.isKeyDown('ArrowRight') || inputHandler.isKeyDown('d')) {
                // Roll right in air (fixing direction to match control input)
                this.rotation.z += 1.5 * deltaTime;
            }
            
            // Pitch control (forward/backward tilting)
            if (inputHandler.isKeyDown('ArrowUp') || inputHandler.isKeyDown('w')) {
                // Pitch forward
                this.rotation.x += 0.8 * deltaTime;
                this.rotation.x = Math.min(this.rotation.x, 0.5);
            } else if (inputHandler.isKeyDown('ArrowDown') || inputHandler.isKeyDown('s')) {
                // Pitch backward
                this.rotation.x -= 0.8 * deltaTime;
                this.rotation.x = Math.max(this.rotation.x, -0.5);
            }
        }
        
        // Check for drift conditions
        const normalizedSpeed = Math.abs(this.speed) / this.maxSpeed;
        let isTurning = false;
        let turnDirection = 0;
        
        // Apply steering based on input, but only if moving and not airborne
        if (Math.abs(this.speed) > 0.1 && !this.isAirborne) {
            const steeringIntensity = this.getSteeringIntensity();
            let targetTurnAmount = 0;
            
            if (inputHandler.isKeyDown('ArrowLeft') || inputHandler.isKeyDown('a')) {
                // Turn left
                targetTurnAmount = 1;
                isTurning = true;
                turnDirection = 1; // Left
            } else if (inputHandler.isKeyDown('ArrowRight') || inputHandler.isKeyDown('d')) {
                // Turn right
                targetTurnAmount = -1;
                isTurning = true;
                turnDirection = -1; // Right
            }
            
            // Apply turn inertia for smoother turning
            this.currentTurnAmount = this.currentTurnAmount * (1 - this.turnInertia) + 
                                    targetTurnAmount * this.turnInertia;
            
            // Apply the turn with inertia
            this.rotation.y += this.turnSpeed * deltaTime * steeringIntensity * this.currentTurnAmount;
            
            // Update quaternion from Euler rotation
            this.rotationQuaternion.setFromEuler(this.rotation);
            
            // Update direction vector based on rotation
            this.direction.set(0, 0, 1).applyEuler(this.rotation);
        } else {
            // Gradually reduce turn amount when not turning or airborne
            this.currentTurnAmount *= (1 - this.turnInertia * 2);
        }
        
        // Check if we should be drifting (only when not on a ramp)
        this.isDrifting = isTurning && normalizedSpeed > this.driftThreshold && !this.isAirborne && !this.onRamp;
        
        // Create drift marks if drifting
        if (this.isDrifting) {
            this.createDriftMarks(deltaTime, turnDirection);
        }
        
        // Update velocity and position based on speed and direction
        this.velocity.copy(this.direction).multiplyScalar(this.speed);
        
        // Calculate new position
        const newPosition = this.position.clone().add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Always check for collisions even if airborne at high speeds
        // This fixes the issue where boosting then hitting a jump allows going through buildings
        let collisionResult = { colliding: false };
        
        // If airborne, perform a continuous collision check between the old and new position
        // to catch fast-moving objects that might skip through thin obstacles in a single frame
        if (this.isAirborne && this.speed > 15) {
            // Get direction vector from old to new position
            const moveDir = newPosition.clone().sub(this.position).normalize();
            const moveDistance = this.position.distanceTo(newPosition);
            
            // Check multiple points along the trajectory
            const numSteps = Math.max(3, Math.ceil(moveDistance / 2)); // At least 3 checks, more for longer distances
            const stepDistance = moveDistance / numSteps;
            
            for (let i = 1; i <= numSteps; i++) {
                const checkPos = this.position.clone().add(moveDir.clone().multiplyScalar(stepDistance * i));
                const checkResult = this.checkCollisions(checkPos, obstacles);
                
                if (checkResult.colliding) {
                    collisionResult = checkResult;
                    break;
                }
            }
        } else {
            // Normal collision check for non-airborne or slower airborne movement
            collisionResult = this.checkCollisions(newPosition, obstacles);
        }
        
        this.colliding = collisionResult.colliding;
        
        if (!collisionResult.colliding) {
            // No collision, proceed with movement
            this.position.copy(newPosition);
        } else {
            // Collision detected, implement bounce and slide along surfaces
            
            // Get the impact velocity magnitude for the bounce
            const impactSpeed = this.speed;
            
            // Calculate bounce direction (reflect velocity along collision normal)
            if (collisionResult.collisionNormal) {
                // Project velocity onto collision normal
                const dot = this.velocity.dot(collisionResult.collisionNormal);
                
                // Calculate reflection vector (v - 2(v·n)n)
                const bounceDirection = this.velocity.clone().sub(
                    collisionResult.collisionNormal.clone().multiplyScalar(2 * dot)
                ).normalize();
                
                // Apply bounce with reduced magnitude but more bounce than before
                this.direction.copy(bounceDirection);
                
                // Apply bounce force based on impact speed and bounce factor
                this.speed = Math.abs(impactSpeed) * this.bounceFactor;
                
                // If the impact is significant, add upward velocity for a small hop on collision
                if (Math.abs(impactSpeed) > 10) {
                    this.isAirborne = true;
                    this.verticalVelocity = 3 + Math.min(5, Math.abs(impactSpeed) * 0.1);
                }
                
                // Update rotation to match new direction
                this.rotation.y = Math.atan2(this.direction.x, this.direction.z);
                this.rotationQuaternion.setFromEuler(this.rotation);
            } else {
                // No normal available, just stop
                this.speed = 0;
            }
            
            // Move car to a safe position to prevent clipping
            // First try using the last valid position
            if (this.lastValidPosition.distanceTo(collisionResult.obstacle.position) > 
                (this.boundingRadius + collisionResult.obstacle.boundingRadius)) {
                this.position.copy(this.lastValidPosition);
            } else {
                // If last valid position is also in collision, push away from obstacle
                const pushVector = this.position.clone().sub(collisionResult.obstacle.position).normalize();
                const pushDistance = this.boundingRadius + collisionResult.obstacle.boundingRadius + 0.1; // Add a small buffer
                this.position.copy(collisionResult.obstacle.position.clone().add(
                    pushVector.multiplyScalar(pushDistance)
                ));
            }
            
            // If we were airborne, we've now landed (on an obstacle)
            if (this.isAirborne && this.verticalVelocity < 0) {
                // Only reset airborne state if we're falling (negative vertical velocity)
                this.isAirborne = false;
                this.verticalVelocity = 0;
                this.rotation.x = 0;
                this.rotation.z = 0;
            }
        }
        
        // Handle airborne state
        if (this.isAirborne) {
            // Apply gravity
            this.verticalVelocity -= this.gravity * deltaTime;
            this.position.y += this.verticalVelocity * deltaTime;
            
            // Check if car has landed
            if (this.position.y <= 0.5) { // Default car height
                this.position.y = 0.5;
                this.isAirborne = false;
                this.verticalVelocity = 0;
                
                // Add landing effect - reduce speed
                this.speed *= 0.7;
                
                // Reset rotation to level gradually
                this.rotation.x *= 0.5;
                this.rotation.z *= 0.5;
                
                // Create a landing effect - dust particles or something later
                console.log("Car landed!");
            }
        } else if (!this.onRamp) {
            // If not airborne and not on a ramp, make sure the car is at the right height
            this.position.y = 0.5;
            
            // Gradually reset X and Z rotation when on ground
            if (Math.abs(this.rotation.x) > 0.01) {
                this.rotation.x *= 0.9;
            } else {
                this.rotation.x = 0;
            }
            
            if (Math.abs(this.rotation.z) > 0.01) {
                this.rotation.z *= 0.9;
            } else {
                this.rotation.z = 0;
            }
        } else if (this.onRamp) {
            // If on a ramp, adjust pitch according to ramp height
            // Calculate an appropriate pitch based on the ramp slope
            const targetPitch = -Math.atan2(this.rampHeight, 8) * 0.5; // 8 is approximate ramp length
            
            // Smoothly interpolate to the target pitch
            const pitchLerpFactor = 0.1;
            this.rotation.x = this.rotation.x * (1 - pitchLerpFactor) + targetPitch * pitchLerpFactor;
        }
        
        // Update the car mesh
        this.mesh.position.copy(this.position);
        this.mesh.rotation.copy(this.rotation);
        
        // Animate wheels (simple rotation for now, only when not airborne)
        if (Math.abs(this.speed) > 0.1 && !this.isAirborne) {
            const wheelRotationSpeed = this.speed * 2;
            this.wheelMeshes.forEach(wheel => {
                wheel.rotation.x += wheelRotationSpeed * deltaTime;
            });
        }
    }
    
    createDriftMarks(deltaTime, turnDirection) {
        // Only create drift marks at certain intervals
        this.lastDriftMarkTime += deltaTime;
        if (this.lastDriftMarkTime < this.driftMarkInterval) return;
        this.lastDriftMarkTime = 0;
        
        // Create drift marks for each rear wheel
        const wheelOffsets = [
            { x: -1.1, z: -1.5 }, // Rear left
            { x: 1.1, z: -1.5 }   // Rear right
        ];
        
        wheelOffsets.forEach(offset => {
            // Calculate the world position of the wheel
            const wheelPos = new THREE.Vector3(offset.x, 0.05, offset.z)
                .applyQuaternion(this.rotationQuaternion)
                .add(this.position);
            
            // Create a drift mark at this position
            const markGeometry = new THREE.PlaneGeometry(0.5, 0.8);
            const markMaterial = new THREE.MeshBasicMaterial({
                color: 0x222222,
                transparent: true,
                opacity: 0.7
            });
            
            // Create the mark
            const mark = new THREE.Mesh(markGeometry, markMaterial);
            mark.position.copy(wheelPos);
            mark.rotation.x = -Math.PI / 2; // Make it lie flat on the ground
            mark.rotation.z = this.rotation.y; // Align with car direction
            
            // Add fade effect
            mark.userData = {
                creationTime: Date.now(),
                lifespan: 5000 // 5 seconds lifespan
            };
            
            // Add to scene and drift marks array
            this.scene.add(mark);
            this.driftMarks.push(mark);
            
            // Remove oldest marks if we exceed the maximum
            if (this.driftMarks.length > this.maxDriftMarks) {
                const oldestMark = this.driftMarks.shift();
                this.scene.remove(oldestMark);
            }
        });
        
        // Update existing drift marks (fade them out)
        const currentTime = Date.now();
        this.driftMarks.forEach(mark => {
            const age = currentTime - mark.userData.creationTime;
            const lifePercent = age / mark.userData.lifespan;
            
            if (lifePercent >= 1) {
                // Mark is too old, remove it
                this.scene.remove(mark);
                this.driftMarks = this.driftMarks.filter(m => m !== mark);
            } else {
                // Fade out the mark
                mark.material.opacity = 0.7 * (1 - lifePercent);
            }
        });
    }
    
    checkCollisions(position, obstacles) {
        for (const obstacle of obstacles) {
            if (!obstacle.position) continue;
            
            // Handle different collision shapes based on obstacle type
            if (obstacle.type === 'building' || obstacle.type === 'skyscraper' || 
                obstacle.type === 'boundary' || obstacle.type === 'stadium') {
                // Use box collision for buildings and similar structures
                if (this.checkBoxCollision(position, obstacle)) {
                    // Calculate collision normal - direction from obstacle center to car
                    const collisionNormal = position.clone().sub(obstacle.position).normalize();
                    
                    return { 
                        colliding: true,
                        obstacle: obstacle,
                        collisionNormal: collisionNormal
                    };
                }
            } 
            else if (obstacle.boundingRadius) {
                // Use sphere collision for circular objects
                const distance = position.distanceTo(obstacle.position);
                if (distance < (this.boundingRadius + obstacle.boundingRadius)) {
                    return { 
                        colliding: true,
                        obstacle: obstacle,
                        collisionNormal: position.clone().sub(obstacle.position).normalize()
                    };
                }
            }
        }
        
        return { colliding: false };
    }
    
    checkBoxCollision(position, obstacle) {
        // For building collision, we need to check if the car (as a circle)
        // intersects with the box of the building.
        
        // Get the half extents of the building (width and depth)
        if (!obstacle.mesh || !obstacle.mesh.geometry) return false;
        
        // Extract dimensions from the mesh geometry
        const geometry = obstacle.mesh.geometry;
        const parameters = geometry.parameters;
        
        if (!parameters) return false;
        
        const halfWidth = parameters.width / 2;
        const halfDepth = parameters.depth / 2;
        
        // Create a bounding box for the car
        const carBoundingBox = {
            min: new THREE.Vector3(
                position.x - this.boundingRadius,
                position.y - this.boundingRadius,
                position.z - this.boundingRadius
            ),
            max: new THREE.Vector3(
                position.x + this.boundingRadius,
                position.y + this.boundingRadius,
                position.z + this.boundingRadius
            )
        };
        
        // Get the obstacle's rotation
        const obstacleRotation = obstacle.mesh.rotation.y;
        
        // Calculate the corners of the building in world space
        const corners = [
            new THREE.Vector3(-halfWidth, 0, -halfDepth),
            new THREE.Vector3(halfWidth, 0, -halfDepth),
            new THREE.Vector3(halfWidth, 0, halfDepth),
            new THREE.Vector3(-halfWidth, 0, halfDepth)
        ];
        
        // Transform corners based on obstacle's rotation and position
        for (let i = 0; i < corners.length; i++) {
            // Apply rotation
            const rotatedX = corners[i].x * Math.cos(obstacleRotation) - corners[i].z * Math.sin(obstacleRotation);
            const rotatedZ = corners[i].x * Math.sin(obstacleRotation) + corners[i].z * Math.cos(obstacleRotation);
            
            corners[i].x = rotatedX;
            corners[i].z = rotatedZ;
            
            // Apply position
            corners[i].add(obstacle.position);
        }
        
        // Check if any of the building's edges intersect with the car's bounding box
        for (let i = 0; i < corners.length; i++) {
            const start = corners[i];
            const end = corners[(i + 1) % corners.length];
            
            // Check if the line segment from start to end intersects with the car's bounding box
            if (this.lineIntersectsBox(start, end, carBoundingBox)) {
                return true;
            }
        }
        
        // Check if the car is completely inside the building
        const relativePos = position.clone().sub(obstacle.position);
        
        // Rotate the point back to align with axis
        const rotatedPos = new THREE.Vector3(
            relativePos.x * Math.cos(-obstacleRotation) + relativePos.z * Math.sin(-obstacleRotation),
            relativePos.y,
            -relativePos.x * Math.sin(-obstacleRotation) + relativePos.z * Math.cos(-obstacleRotation)
        );
        
        if (Math.abs(rotatedPos.x) < halfWidth && Math.abs(rotatedPos.z) < halfDepth) {
            return true;
        }
        
        return false;
    }
    
    lineIntersectsBox(start, end, box) {
        // Check if a line segment from start to end intersects with the box
        const direction = end.clone().sub(start);
        const length = direction.length();
        direction.normalize();
        
        // Calculate intersection with each face of the box
        const tMin = (box.min.x - start.x) / (direction.x !== 0 ? direction.x : 0.00001);
        const tMax = (box.max.x - start.x) / (direction.x !== 0 ? direction.x : 0.00001);
        const tYMin = (box.min.y - start.y) / (direction.y !== 0 ? direction.y : 0.00001);
        const tYMax = (box.max.y - start.y) / (direction.y !== 0 ? direction.y : 0.00001);
        
        const tMinFinal = Math.max(Math.min(tMin, tMax), Math.min(tYMin, tYMax));
        const tMaxFinal = Math.min(Math.max(tMin, tMax), Math.max(tYMin, tYMax));
        
        // If tMaxFinal < 0, the line is behind the box
        // If tMinFinal > tMaxFinal, the line doesn't intersect the box
        // If tMinFinal > length, the box is beyond the segment's end
        if (tMaxFinal < 0 || tMinFinal > tMaxFinal || tMinFinal > length) {
            return false;
        }
        
        // Check Z intersection
        const tZMin = (box.min.z - start.z) / (direction.z !== 0 ? direction.z : 0.00001);
        const tZMax = (box.max.z - start.z) / (direction.z !== 0 ? direction.z : 0.00001);
        
        const tMinZ = Math.max(tMinFinal, Math.min(tZMin, tZMax));
        const tMaxZ = Math.min(tMaxFinal, Math.max(tZMin, tZMax));
        
        // If tMaxZ < 0, the line is behind the box
        // If tMinZ > tMaxZ, the line doesn't intersect the box
        // If tMinZ > length, the box is beyond the segment's end
        if (tMaxZ < 0 || tMinZ > tMaxZ || tMinZ > length) {
            return false;
        }
        
        return true;
    }
    
    getSteeringIntensity() {
        // Improved steering intensity calculation for better handling
        // Higher value at low speeds, more responsive at mid speeds, slightly reduced at high speeds
        const normalizedSpeed = Math.abs(this.speed) / this.maxSpeed;
        
        if (normalizedSpeed < 0.2) {
            // Very low speed, high steering
            return 1.2;
        } else if (normalizedSpeed < 0.6) {
            // Mid speed, enhanced steering
            return 1.0;
        } else {
            // High speed, slightly reduced steering for stability
            return 0.8 - (normalizedSpeed - 0.6) * 0.3;
        }
    }
    
    getPosition() {
        return this.position.clone();
    }
    
    getDirection() {
        return this.direction.clone();
    }
    
    getRotationQuaternion() {
        return this.rotationQuaternion.clone();
    }
    
    getSpeed() {
        return Math.abs(this.speed);
    }
    
    getBoundingRadius() {
        return this.boundingRadius;
    }
} 