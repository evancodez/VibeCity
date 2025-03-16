import * as THREE from 'three';

export class City {
    constructor(scene) {
        this.scene = scene;
        this.citySize = 3; // 3x3 grid
        this.blockSize = 50; // Size of each city block
        this.roadWidth = 10; // Width of roads
        
        // Track obstacles for collision detection
        this.obstacles = [];
        
        // Track interactive objects
        this.ramps = [];
        this.physicsObjects = [];
        this.humans = [];
        
        // Track road information
        this.roads = {
            horizontal: [],
            vertical: []
        };
        
        // Track open spaces
        this.openSpaces = [];
        
        // Color palette (80s synthwave palette)
        this.colors = {
            road: 0x222222,        // Dark gray
            sidewalk: 0x555555,    // Light gray
            grass: 0x116611,       // Darker green
            buildingA: 0x5522cc,   // Purple
            buildingB: 0xff2266,   // Hot pink
            buildingC: 0x00ccff,   // Cyan
            buildingD: 0xffcc00,   // Gold
            buildingE: 0xff6622,   // Orange
            buildingF: 0x22ffcc,   // Teal
            accent: 0xffffff,      // White
            gridLine: 0xff00ff     // Magenta grid lines
        };
        
        // Game style - 80s retrowave
        this.gameStyle = {
            wireframe: false,        // Wireframe mode for objects
            useGrid: true,           // Show grid on the ground
            sunsetSkybox: true,      // Use sunset skybox
            neonColors: true,        // Use neon colors for buildings
            postProcessing: true     // Apply postprocessing effects
        };
        
        // Create the city
        this.createGround();
        
        // Create open spaces instead of buildings in some areas
        this.createOpenSpaces();
        
        // Create fewer buildings in designated areas
        //this.createBuildings();
        //this.createLandmarks();
        this.createBoundary(); // Add a boundary around the map
        //this.createRamps();    // Re-enable ramps for fun jumps
        this.createPhysicsObjects();
        this.createHumans();
        //this.createAdditionalFeatures(); // Add more map features
    }
    
    // Create large open spaces for driving
    createOpenSpaces() {
        // Define a large central open space and a few smaller ones
        
        // Calculate total city dimensions
        const totalSize = this.citySize * this.blockSize + (this.citySize + 1) * this.roadWidth;
        const halfTotalSize = totalSize / 2;
        
        // Define open spaces (center position and radius) - make central area much larger
        this.openSpaces = [
            { x: 0, z: 0, radius: 120 },  // Large central open space (increased radius significantly)
            { x: -halfTotalSize * 0.6, z: halfTotalSize * 0.6, radius: 40 }, // Northeast open space
            { x: halfTotalSize * 0.6, z: -halfTotalSize * 0.6, radius: 50 }  // Southwest open space
        ];
        
        // Add some decorative elements to the open spaces
        this.addOpenSpaceDecorations();
    }
    
    addOpenSpaceDecorations() {
        // Add minimal decorations to open spaces
        for (const space of this.openSpaces) {
            // Add very few trees, only at the edges of open spaces
            const treeCount = Math.floor(space.radius / 40); // Much fewer trees (was 20)
            
            for (let i = 0; i < treeCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                // Position trees mostly at the edges
                const distance = space.radius * 0.7 + Math.random() * (space.radius * 0.2);
                const x = space.x + Math.cos(angle) * distance;
                const z = space.z + Math.sin(angle) * distance;
                
                // Even lower chance of adding trees
                if (Math.random() < 0.2) { // Reduced from 0.3
                    this.createTree(x, z);
                }
            }
            
        
            
            // Add launchpads - spread them out and place them strategically
            this.addStuntRamps(space);
        }
    }
    
    
    addStuntRamps(space) {
        // Add a few launchpads in the open space
        const launchpadCount = Math.min(3, Math.floor(space.radius / 30));
        
        for (let i = 0; i < launchpadCount; i++) {
            const angle = (i / launchpadCount) * Math.PI * 2;
            const distance = space.radius * 0.4;
            const x = space.x + Math.cos(angle) * distance;
            const z = space.z + Math.sin(angle) * distance;
            
            // Create an omnidirectional launchpad/trampoline
            this.createLaunchpad(x, z);
        }
    }
    
    // Override building generation to respect open spaces
    createBuildings() {
        // Create a grid of city blocks
        for (let row = 0; row < this.citySize; row++) {
            for (let col = 0; col < this.citySize; col++) {
                // Calculate the center position of the block
                const blockX = (col * this.blockSize) + (col * this.roadWidth) - 
                               ((this.citySize - 1) * this.blockSize + (this.citySize - 1) * this.roadWidth) / 2;
                               
                const blockZ = (row * this.blockSize) + (row * this.roadWidth) - 
                               ((this.citySize - 1) * this.blockSize + (this.citySize - 1) * this.roadWidth) / 2;
                
                // Check if this block is in an open space
                let inOpenSpace = false;
                for (const space of this.openSpaces) {
                    const distance = Math.sqrt(Math.pow(blockX - space.x, 2) + Math.pow(blockZ - space.z, 2));
                    if (distance < space.radius) {
                        inOpenSpace = true;
                        break;
                    }
                }
                
                // Only generate buildings if not in an open space
                if (!inOpenSpace) {
                    // Randomly decide if this block will be a park
                    const isPark = Math.random() < 0.2;
                    
                    if (isPark) {
                        this.createPark(blockX, blockZ);
                    } else {
                        this.generateBuildingsForBlock(blockX, blockZ, row, col);
                    }
                }
            }
        }
    }
    
    generateBuildingsForBlock(blockX, blockZ, row, col) {
        // Parameters for building generation
        const minBuildingSize = 4;
        const maxBuildingSize = 8;
        const minBuildingHeight = 5;
        const maxBuildingHeight = 15;
        const buildingSpacing = 1.5; // Space between buildings
        const maxBuildingsPerBlock = 5; // Maximum number of buildings per block
        
        // Determine number of buildings for this block (1-5)
        const numBuildings = Math.floor(Math.random() * maxBuildingsPerBlock) + 1;
        
        // Available area within the block
        const availableWidth = this.blockSize - buildingSpacing * 2;
        const availableDepth = this.blockSize - buildingSpacing * 2;
        
        // Generate buildings
        for (let i = 0; i < numBuildings; i++) {
            // Generate random building dimensions
            const buildingWidth = minBuildingSize + Math.random() * (maxBuildingSize - minBuildingSize);
            const buildingDepth = minBuildingSize + Math.random() * (maxBuildingSize - minBuildingSize);
            const buildingHeight = minBuildingHeight + Math.random() * (maxBuildingHeight - minBuildingHeight);
            
            // Calculate position within the block
            let x, z;
            
            if (numBuildings === 1) {
                // If only one building, position it in the center of the block
                x = blockX;
                z = blockZ;
            } else {
                // Otherwise, position it randomly within the block
                x = blockX - (availableWidth / 2) + buildingWidth/2 + Math.random() * (availableWidth - buildingWidth);
                z = blockZ - (availableDepth / 2) + buildingDepth/2 + Math.random() * (availableDepth - buildingDepth);
            }
            
            // Random rotation (typically 0, 90, 180, or 270 degrees)
            const rotation = Math.floor(Math.random() * 4) * (Math.PI / 2);
            
            // Generate random color index
            const colorKeys = Object.keys(this.colors).filter(key => key.startsWith('building'));
            const colorKey = colorKeys[Math.floor(Math.random() * colorKeys.length)];
            const buildingColor = this.colors[colorKey];
            
            // Create building geometry and material
            const geometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
            const material = new THREE.MeshStandardMaterial({
                color: buildingColor,
                roughness: 0.7,
                metalness: 0.2
            });
            
            // Create the building mesh
            const building = new THREE.Mesh(geometry, material);
            building.position.set(x, buildingHeight / 2, z);
            building.rotation.y = rotation;
            building.castShadow = true;
            building.receiveShadow = true;
            
            // Add windows
            this.addWindowsToBuilding(building, buildingWidth, buildingHeight, buildingDepth);
            
            // Add building to the scene
            this.scene.add(building);
            
            // Add building to obstacles for collision detection
            this.obstacles.push({
                position: new THREE.Vector3(x, buildingHeight / 2, z),
                boundingRadius: Math.sqrt(Math.pow(buildingWidth / 2, 2) + Math.pow(buildingDepth / 2, 2)),
                type: 'building',
                mesh: building
            });
        }
    }
    
    addWindowsToBuilding(building, width, height, depth) {
        // Window parameters
        const windowSize = 0.5;
        const windowSpacing = 1.2;
        const windowDepth = 0.05;
        const windowColor = this.colors.accent; // Use accent color for windows
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: windowColor,
            emissive: windowColor,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.8
        });
        
        // Calculate number of windows per floor and number of floors
        const windowsPerWidth = Math.floor((width - 1) / windowSpacing);
        const windowsPerDepth = Math.floor((depth - 1) / windowSpacing);
        const floors = Math.floor((height - 1) / windowSpacing);
        
        // Add windows to all four sides of the building
        const sides = [
            { axis: 'z', sign: 1, offset: depth / 2 + 0.01 },   // Front
            { axis: 'z', sign: -1, offset: depth / 2 + 0.01 },  // Back
            { axis: 'x', sign: 1, offset: width / 2 + 0.01 },   // Right
            { axis: 'x', sign: -1, offset: width / 2 + 0.01 }   // Left
        ];
        
        sides.forEach(side => {
            const isWidthSide = side.axis === 'z';
            const windowCount = isWidthSide ? windowsPerWidth : windowsPerDepth;
            const sideLength = isWidthSide ? width : depth;
            
            for (let floor = 0; floor < floors; floor++) {
                for (let w = 0; w < windowCount; w++) {
                    // Add a window
                    const windowGeometry = new THREE.BoxGeometry(
                        isWidthSide ? windowSize : windowDepth,
                        windowSize,
                        isWidthSide ? windowDepth : windowSize
                    );
                    
                    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
                    
                    // Position the window
                    const startPos = -sideLength / 2 + 1;
                    const pos = startPos + w * windowSpacing;
                    const y = 1 + floor * windowSpacing;
                    
                    if (isWidthSide) {
                        windowMesh.position.set(
                            pos,
                            y - height/2, // Adjust for building origin being at center
                            side.sign * side.offset
                        );
                    } else {
                        windowMesh.position.set(
                            side.sign * side.offset,
                            y - height/2, // Adjust for building origin being at center
                            pos
                        );
                    }
                    
                    // Randomly skip some windows
                    if (Math.random() > 0.2) {
                        building.add(windowMesh);
                    }
                }
            }
        });
    }
    
    createGround() {
        // Calculate total city dimensions
        const totalSize = this.citySize * this.blockSize + (this.citySize + 1) * this.roadWidth;
        const halfTotalSize = totalSize / 2;
        
        // Create base ground plane
        const groundGeometry = new THREE.PlaneGeometry(totalSize * 1.5, totalSize * 1.5); // Make ground larger than city
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: this.colors.grass,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        ground.position.y = 0; // At ground level
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Create roads
        this.createRoads(totalSize, halfTotalSize);
        
        // Add road markings
        this.addRoadMarkings(totalSize, halfTotalSize);
        
        // Create hills in the open areas
        //this.createHills();
        
        // Add grid lines for 80s retro feel
        if (this.gameStyle.useGrid) {
            this.addGridLines(totalSize * 1.5, 10); // Grid with 10-unit spacing
        }
    }
    
    createHills() {
        // Create hills of various sizes in the open spaces
        for (const space of this.openSpaces) {
            // Create 3-5 hills in each open space
            const hillCount = 3 + Math.floor(Math.random() * 3);
            
            for (let i = 0; i < hillCount; i++) {
                // Random position within the open space (but not at the very center)
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * space.radius * 0.6; // Not too close to the edge
                const x = space.x + Math.cos(angle) * distance;
                const z = space.z + Math.sin(angle) * distance;
                
                // Random hill size
                const hillRadius = 10 + Math.random() * 15;
                const hillHeight = 3 + Math.random() * 4;
                
                this.createHill(x, z, hillRadius, hillHeight);
            }
        }
    }
    
    createHill(x, z, radius, height) {
        // Create a hill using a mesh
        const segments = 32;
        const hillGeometry = new THREE.CircleGeometry(radius, segments);
        
        // Modify the geometry to create a hill shape
        const positions = hillGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            const distanceFromCenter = Math.sqrt(x * x + z * z);
            const normalizedDistance = distanceFromCenter / radius;
            
            // Use a cosine function to create a smooth hill shape
            // Height is maximum at center and tapers to 0 at the edges
            const y = height * Math.cos(normalizedDistance * Math.PI / 2);
            positions[i + 1] = Math.max(0, y); // Ensure no negative values
        }
        
        // Update geometry normals after modifying vertices
        hillGeometry.computeVertexNormals();
        
        // Create material with a slightly different green than the base ground
        const hillMaterial = new THREE.MeshStandardMaterial({
            color: 0x44AA44, // Slightly different green
            roughness: 0.8,
            metalness: 0.2
        });
        
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);
        hill.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        hill.position.set(x, 0.1, z); // Slightly above ground to prevent z-fighting
        hill.receiveShadow = true;
        hill.castShadow = true;
        this.scene.add(hill);
    }
    
    addGridLines(size, spacing) {
        // Create a grid pattern on the ground for retrowave aesthetic
        const gridGeometry = new THREE.BufferGeometry();
        const vertices = [];
        const halfSize = size / 2;
        
        // Create horizontal lines
        for (let i = -halfSize; i <= halfSize; i += spacing) {
            vertices.push(-halfSize, 0.05, i); // Start point
            vertices.push(halfSize, 0.05, i);  // End point
        }
        
        // Create vertical lines
        for (let i = -halfSize; i <= halfSize; i += spacing) {
            vertices.push(i, 0.05, -halfSize); // Start point
            vertices.push(i, 0.05, halfSize);  // End point
        }
        
        gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        // Create material with glow effect
        const gridMaterial = new THREE.LineBasicMaterial({
            color: this.colors.gridLine,
            transparent: true,
            opacity: 0.5
        });
        
        const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
        this.scene.add(grid);
    }
    
    // Modified to create more humans in open spaces
    createHumans() {
        // Create humans walking around the city
        const humanCount = 20; // Base number of humans
        
        // Get city dimensions
        const totalSize = this.citySize * this.blockSize + (this.citySize + 1) * this.roadWidth;
        const halfTotalSize = totalSize / 2;
        
        // Add regular humans around the city
        for (let i = 0; i < humanCount; i++) {
            // Choose a random road to place the human near
            const isHorizontal = Math.random() > 0.5;
            const roadArray = isHorizontal ? this.roads.horizontal : this.roads.vertical;
            const roadIndex = Math.floor(Math.random() * roadArray.length);
            const road = roadArray[roadIndex];
            
            // Position on or near the road
            const roadPos = isHorizontal ? road.centerZ : road.centerX;
            const offset = (Math.random() > 0.3) ? 
                           (Math.random() * road.width / 2) :   // On the road (30% chance)
                           (road.width / 2 + Math.random() * 2); // On the sidewalk (70% chance)
            const sideOffset = (Math.random() > 0.5 ? 1 : -1) * offset;
            
            // Calculate position
            let x, z;
            if (isHorizontal) {
                x = (Math.random() * totalSize) - halfTotalSize;
                z = roadPos + sideOffset;
            } else {
                x = roadPos + sideOffset;
                z = (Math.random() * totalSize) - halfTotalSize;
            }
            
            // Create human at this position
            this.createHuman(x, z, isHorizontal);
        }
        
        // Add additional humans in open spaces
        for (const space of this.openSpaces) {
            // Add more humans in open spaces
            const spaceHumanCount = 10 + Math.floor(space.radius / 6); 
            
            for (let i = 0; i < spaceHumanCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * space.radius * 0.9;
                const x = space.x + Math.cos(angle) * distance;
                const z = space.z + Math.sin(angle) * distance;
                
                // Create human with random walking direction
                this.createHuman(x, z, Math.random() > 0.5);
            }
        }
    }
    
    createRoads(totalSize, halfTotalSize) {
        // Create horizontal roads
        for (let i = 0; i <= this.citySize; i++) {
            const roadPosition = -halfTotalSize + i * (this.blockSize + this.roadWidth);
            
            // Store road position information
            this.roads.horizontal.push({
                index: i,
                position: roadPosition,
                centerZ: roadPosition, // Z position of the road center
                width: this.roadWidth
            });
            
            // Horizontal road
            const horizontalRoadGeometry = new THREE.PlaneGeometry(totalSize, this.roadWidth);
            const roadMaterial = new THREE.MeshStandardMaterial({
                color: this.colors.road,
                roughness: 0.9,
                metalness: 0.1
            });
            const horizontalRoad = new THREE.Mesh(horizontalRoadGeometry, roadMaterial);
            horizontalRoad.position.set(0, 0.01, roadPosition); // Slightly above ground to prevent z-fighting
            horizontalRoad.rotation.x = -Math.PI / 2;
            horizontalRoad.receiveShadow = true;
            this.scene.add(horizontalRoad);
            
            // Horizontal sidewalks
            if (i < this.citySize) {
                const sidewalkWidth = 2;
                const sidewalkGeometry = new THREE.PlaneGeometry(totalSize, sidewalkWidth);
                const sidewalkMaterial = new THREE.MeshStandardMaterial({
                    color: this.colors.sidewalk,
                    roughness: 0.9,
                    metalness: 0.1
                });
                
                // North sidewalk
                const northSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
                northSidewalk.position.set(0, 0.02, roadPosition + this.roadWidth/2 - sidewalkWidth/2);
                northSidewalk.rotation.x = -Math.PI / 2;
                northSidewalk.receiveShadow = true;
                this.scene.add(northSidewalk);
                
                // South sidewalk
                const southSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
                southSidewalk.position.set(0, 0.02, roadPosition - this.roadWidth/2 + sidewalkWidth/2);
                southSidewalk.rotation.x = -Math.PI / 2;
                southSidewalk.receiveShadow = true;
                this.scene.add(southSidewalk);
            }
        }
        
        // Create vertical roads
        for (let i = 0; i <= this.citySize; i++) {
            const roadPosition = -halfTotalSize + i * (this.blockSize + this.roadWidth);
            
            // Store road position information
            this.roads.vertical.push({
                index: i,
                position: roadPosition,
                centerX: roadPosition, // X position of the road center
                width: this.roadWidth
            });
            
            // Vertical road
            const verticalRoadGeometry = new THREE.PlaneGeometry(this.roadWidth, totalSize);
            const roadMaterial = new THREE.MeshStandardMaterial({
                color: this.colors.road,
                roughness: 0.9,
                metalness: 0.1
            });
            const verticalRoad = new THREE.Mesh(verticalRoadGeometry, roadMaterial);
            verticalRoad.position.set(roadPosition, 0.01, 0); // Slightly above ground to prevent z-fighting
            verticalRoad.rotation.x = -Math.PI / 2;
            verticalRoad.receiveShadow = true;
            this.scene.add(verticalRoad);
            
            // Vertical sidewalks
            if (i < this.citySize) {
                const sidewalkWidth = 2;
                const sidewalkGeometry = new THREE.PlaneGeometry(sidewalkWidth, totalSize);
                const sidewalkMaterial = new THREE.MeshStandardMaterial({
                    color: this.colors.sidewalk,
                    roughness: 0.9,
                    metalness: 0.1
                });
                
                // East sidewalk
                const eastSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
                eastSidewalk.position.set(roadPosition + this.roadWidth/2 - sidewalkWidth/2, 0.02, 0);
                eastSidewalk.rotation.x = -Math.PI / 2;
                eastSidewalk.receiveShadow = true;
                this.scene.add(eastSidewalk);
                
                // West sidewalk
                const westSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
                westSidewalk.position.set(roadPosition - this.roadWidth/2 + sidewalkWidth/2, 0.02, 0);
                westSidewalk.rotation.x = -Math.PI / 2;
                westSidewalk.receiveShadow = true;
                this.scene.add(westSidewalk);
            }
        }
        
        // Add road markings
        this.addRoadMarkings(totalSize, halfTotalSize);
    }
    
    addRoadMarkings(totalSize, halfTotalSize) {
        // Create dashed line texture for road markings
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 48, 128, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(totalSize / 4, 1);
        
        // Add markings to horizontal roads
        for (let i = 0; i <= this.citySize; i++) {
            const roadPosition = -halfTotalSize + i * (this.blockSize + this.roadWidth);
            
            // Only add markings to internal roads (not the outer edge)
            if (i > 0 && i < this.citySize) {
                const markerGeometry = new THREE.PlaneGeometry(totalSize, 0.5);
                const markerMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    map: texture
                });
                const roadMarker = new THREE.Mesh(markerGeometry, markerMaterial);
                roadMarker.position.set(0, 0.03, roadPosition);
                roadMarker.rotation.x = -Math.PI / 2;
                this.scene.add(roadMarker);
            }
        }
        
        // Rotate texture for vertical roads
        texture.rotation = Math.PI / 2;
        texture.repeat.set(1, totalSize / 4);
        texture.needsUpdate = true;
        
        // Add markings to vertical roads
        for (let i = 0; i <= this.citySize; i++) {
            const roadPosition = -halfTotalSize + i * (this.blockSize + this.roadWidth);
            
            // Only add markings to internal roads (not the outer edge)
            if (i > 0 && i < this.citySize) {
                const markerGeometry = new THREE.PlaneGeometry(0.5, totalSize);
                const markerMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    map: texture
                });
                const roadMarker = new THREE.Mesh(markerGeometry, markerMaterial);
                roadMarker.position.set(roadPosition, 0.03, 0);
                roadMarker.rotation.x = -Math.PI / 2;
                this.scene.add(roadMarker);
            }
        }
    }
    
    createPark(blockX, blockZ) {
        // Create base for the park (grass is already there from ground)
        const parkSize = this.blockSize * 0.9; // Slightly smaller than block
        const parkX = blockX + this.blockSize / 2;
        const parkZ = blockZ + this.blockSize / 2;
        
        // Add a fountain in the center
        this.createFountain(parkX, parkZ);
        
        // Add some trees
        const treeCount = 10;
        for (let i = 0; i < treeCount; i++) {
            const angle = (i / treeCount) * Math.PI * 2;
            const radius = parkSize * 0.3;
            const treeX = parkX + Math.cos(angle) * radius;
            const treeZ = parkZ + Math.sin(angle) * radius;
            this.createTree(treeX, treeZ);
        }
    }
    
    createFountain(x, z) {
        // Base of the fountain
        const baseGeometry = new THREE.CylinderGeometry(6, 6, 1, 32);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x999999, // Gray
            roughness: 0.8,
            metalness: 0.2
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(x, 0.5, z);
        base.castShadow = true;
        base.receiveShadow = true;
        this.scene.add(base);
        
        // Middle tier
        const middleGeometry = new THREE.CylinderGeometry(3, 4, 1, 32);
        const middleMaterial = new THREE.MeshStandardMaterial({
            color: 0x999999,
            roughness: 0.8,
            metalness: 0.2
        });
        const middle = new THREE.Mesh(middleGeometry, middleMaterial);
        middle.position.set(x, 1.5, z);
        middle.castShadow = true;
        middle.receiveShadow = true;
        this.scene.add(middle);
        
        // Water basin
        const waterGeometry = new THREE.CylinderGeometry(5.8, 5.8, 0.5, 32);
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x3399ff, // Blue
            roughness: 0.2,
            metalness: 0.8,
            transparent: true,
            opacity: 0.8
        });
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.position.set(x, 0.75, z);
        this.scene.add(water);
        
        // Top tier
        const topGeometry = new THREE.CylinderGeometry(1, 2, 1, 32);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: 0x999999,
            roughness: 0.8,
            metalness: 0.2
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.set(x, 2.5, z);
        top.castShadow = true;
        top.receiveShadow = true;
        this.scene.add(top);
        
        // Add to obstacles list for collision detection
        const obstacle = {
            type: 'fountain',
            position: new THREE.Vector3(x, 0, z),
            boundingRadius: 6.0, // Fountain collision radius
            mesh: base // Reference the base for simplicity
        };
        this.obstacles.push(obstacle);
    }
    
    createTree(x, z) {
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 3, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown
            roughness: 0.9,
            metalness: 0.1
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(x, 1.5, z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        this.scene.add(trunk);
        
        // Tree foliage
        const foliageGeometry = new THREE.ConeGeometry(2, 4, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x00AA00, // Green
            roughness: 0.8,
            metalness: 0.2
        });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.set(x, 5, z);
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        this.scene.add(foliage);
        
        // Add to obstacles list for collision detection
        const obstacle = {
            type: 'tree',
            position: new THREE.Vector3(x, 0, z),
            boundingRadius: 1.5, // Tree collision radius
            mesh: trunk // Just reference the trunk for simplicity
        };
        this.obstacles.push(obstacle);
    }
    
    createLandmarks() {
        // Calculate the total size of the city
        const totalSize = this.citySize * this.blockSize + (this.citySize + 1) * this.roadWidth;
        const halfTotalSize = totalSize / 2;
        
        // Create a tall building in one corner
        const skyscraperX = -halfTotalSize + this.roadWidth + this.blockSize / 2;
        const skyscraperZ = -halfTotalSize + this.roadWidth + this.blockSize / 2;
        this.createSkyscraper(skyscraperX, skyscraperZ);
    }
    
    createSkyscraper(x, z) {
        // A tall landmark building
        const baseWidth = 12;
        const baseDepth = 12;
        const baseHeight = 40;
        
        // Base of the skyscraper
        const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: this.colors.buildingE,
            roughness: 0.7,
            metalness: 0.3
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(x, baseHeight / 2, z);
        base.castShadow = true;
        base.receiveShadow = true;
        this.scene.add(base);
        
        // Top section
        const topWidth = 8;
        const topDepth = 8;
        const topHeight = 15;
        const topGeometry = new THREE.BoxGeometry(topWidth, topHeight, topDepth);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: this.colors.buildingF,
            roughness: 0.7,
            metalness: 0.3
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.set(x, baseHeight + topHeight / 2, z);
        top.castShadow = true;
        top.receiveShadow = true;
        this.scene.add(top);
        
        // Add windows to the skyscraper
        this.addWindowsToBuilding(base, baseWidth, baseDepth, baseHeight);
        this.addWindowsToBuilding(top, topWidth, topDepth, topHeight);
        
        // Add an antenna on top
        const antennaGeometry = new THREE.CylinderGeometry(0.3, 0.5, 10, 8);
        const antennaMaterial = new THREE.MeshStandardMaterial({
            color: 0x999999,
            roughness: 0.5,
            metalness: 0.8
        });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.set(x, baseHeight + topHeight + 5, z);
        antenna.castShadow = true;
        this.scene.add(antenna);
        
        // Add to obstacles list for collision detection
        const obstacle = {
            type: 'skyscraper',
            position: new THREE.Vector3(x, baseHeight / 2, z),
            boundingRadius: Math.max(baseWidth, baseDepth) / 2 + 1, // Skyscraper collision radius
            mesh: base // Reference the base for simplicity
        };
        this.obstacles.push(obstacle);
    }
    
    createRamps() {
        // Create ramps in various locations across the city
        const totalSize = this.citySize * this.blockSize + (this.citySize + 1) * this.roadWidth;
        const halfTotalSize = totalSize / 2;
        
        // Create a few ramps around the city
        const rampLocations = [
            // Ramps on main roads
            { x: 30, z: 10, rotation: 0 },
            { x: -30, z: -5, rotation: Math.PI },
            { x: 5, z: -30, rotation: Math.PI / 2 },
            { x: -15, z: 25, rotation: -Math.PI / 2 }
        ];
        
        rampLocations.forEach(loc => {
            this.createRamp(loc.x, loc.z, loc.rotation);
        });
    }
    
    createRamp(x, z, rotation) {
        // Create a ramp with improved dimensions and steepness
        const rampLength = 8;
        const rampWidth = 7; // Wider ramps are easier to use
        const rampHeight = 4; // Higher ramps for more dramatic jumps
        
        // Create the base of the ramp
        const baseGeometry = new THREE.BoxGeometry(rampWidth, 0.5, rampLength);
        const rampMaterial = new THREE.MeshStandardMaterial({
            color: 0xE57F23, // Orange-ish
            roughness: 0.8,
            metalness: 0.2
        });
        
        const base = new THREE.Mesh(baseGeometry, rampMaterial);
        base.position.set(x, 0.25, z);
        base.rotation.y = rotation;
        base.castShadow = true;
        base.receiveShadow = true;
        this.scene.add(base);
        
        // Create the sloped part with better design
        const slopeGeometry = new THREE.BufferGeometry();
        
        // Define vertices for the slope (triangle)
        const vertices = new Float32Array([
            // Front face (triangle)
            -rampWidth/2, 0, rampLength/2,
            rampWidth/2, 0, rampLength/2,
            0, rampHeight, -rampLength/2,
            
            // Left face
            -rampWidth/2, 0, rampLength/2,
            0, rampHeight, -rampLength/2,
            -rampWidth/2, 0, -rampLength/2,
            
            // Right face
            rampWidth/2, 0, rampLength/2,
            rampWidth/2, 0, -rampLength/2,
            0, rampHeight, -rampLength/2,
            
            // Bottom face
            -rampWidth/2, 0, -rampLength/2,
            rampWidth/2, 0, -rampLength/2,
            -rampWidth/2, 0, rampLength/2,
            
            // Bottom face (continued)
            rampWidth/2, 0, -rampLength/2,
            rampWidth/2, 0, rampLength/2,
            -rampWidth/2, 0, rampLength/2
        ]);
        
        slopeGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        slopeGeometry.computeVertexNormals();
        
        const slope = new THREE.Mesh(slopeGeometry, rampMaterial);
        slope.position.set(x, 0.5, z);
        slope.rotation.y = rotation;
        slope.castShadow = true;
        slope.receiveShadow = true;
        this.scene.add(slope);
        
        // Add reflective strips on the ramp (make them brighter and more visible)
        const stripWidth = 0.8;
        const stripGeometry = new THREE.PlaneGeometry(stripWidth, rampLength);
        const stripMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00, // Yellow
            emissive: 0xFFFF00,
            emissiveIntensity: 0.8,
            roughness: 0.3,
            metalness: 0.7
        });
        
        // Left strip
        const leftStrip = new THREE.Mesh(stripGeometry, stripMaterial);
        leftStrip.position.set(-rampWidth/2 + stripWidth, 0.01, 0);
        leftStrip.rotation.x = -Math.PI / 2;
        slope.add(leftStrip);
        
        // Right strip
        const rightStrip = new THREE.Mesh(stripGeometry, stripMaterial);
        rightStrip.position.set(rampWidth/2 - stripWidth, 0.01, 0);
        rightStrip.rotation.x = -Math.PI / 2;
        slope.add(rightStrip);
        
        // Add center strip
        const centerStrip = new THREE.Mesh(stripGeometry, stripMaterial);
        centerStrip.position.set(0, 0.01, 0);
        centerStrip.rotation.x = -Math.PI / 2;
        slope.add(centerStrip);
        
        // Add a glow effect for the ramp
        const glowGeometry = new THREE.BoxGeometry(rampWidth + 0.5, 0.1, rampLength + 0.5);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF6600,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, -0.2, 0);
        base.add(glow);
        
        // Add to ramps array
        this.ramps.push({
            type: 'ramp',
            position: new THREE.Vector3(x, 0.5, z),
            rotation: rotation,
            width: rampWidth,
            length: rampLength,
            height: rampHeight,
            jumpStrength: 18, // Increased jump strength for better jumps
            base: base,
            slope: slope
        });
    }
    
    createPhysicsObjects() {
        // Add physics objects like trash cans throughout the city
        const totalSize = this.citySize * this.blockSize + (this.citySize + 1) * this.roadWidth;
        const halfTotalSize = totalSize / 2;
        
        // Create trash cans near sidewalks
        for (let i = 0; i < 20; i++) {
            // Choose a random road
            const isHorizontal = Math.random() > 0.5;
            const roadArray = isHorizontal ? this.roads.horizontal : this.roads.vertical;
            const roadIndex = Math.floor(Math.random() * roadArray.length);
            const road = roadArray[roadIndex];
            
            // Position slightly off the road on the sidewalk
            const roadPos = isHorizontal ? road.centerZ : road.centerX;
            const offset = (road.width / 2) + 1.5; // Place on sidewalk
            const sideOffset = (Math.random() > 0.5 ? 1 : -1) * offset;
            
            // Calculate position
            let x, z;
            if (isHorizontal) {
                x = (Math.random() * totalSize) - halfTotalSize;
                z = roadPos + sideOffset;
            } else {
                x = roadPos + sideOffset;
                z = (Math.random() * totalSize) - halfTotalSize;
            }
            
            // Create a trash can
            this.createTrashCan(x, z);
        }
        
        // Add benches and streetlights too
        for (let i = 0; i < 15; i++) {
            // Similar placement logic as trash cans
            const isHorizontal = Math.random() > 0.5;
            const roadArray = isHorizontal ? this.roads.horizontal : this.roads.vertical;
            const roadIndex = Math.floor(Math.random() * roadArray.length);
            const road = roadArray[roadIndex];
            
            const roadPos = isHorizontal ? road.centerZ : road.centerX;
            const offset = (road.width / 2) + 1.5; // Place on sidewalk
            const sideOffset = (Math.random() > 0.5 ? 1 : -1) * offset;
            
            let x, z;
            if (isHorizontal) {
                x = (Math.random() * totalSize) - halfTotalSize;
                z = roadPos + sideOffset;
            } else {
                x = roadPos + sideOffset;
                z = (Math.random() * totalSize) - halfTotalSize;
            }
            
            // Create a bench or streetlight
            if (Math.random() > 0.5) {
                const rotation = isHorizontal ? 0 : Math.PI / 2;
                this.createBench(x, z, rotation);
            } else {
                this.createStreetlight(x, z);
            }
        }
        
        // Add physics objects to open spaces
        this.addPhysicsObjectsToOpenSpaces();
    }
    
    addPhysicsObjectsToOpenSpaces() {
        // Scatter lots of physics objects in open spaces
        for (const space of this.openSpaces) {
            // Add different kinds of obstacles based on space size
            const objectCount = Math.floor(space.radius / 6); // Plenty of objects
            
            for (let i = 0; i < objectCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * space.radius * 0.8;
                const x = space.x + Math.cos(angle) * distance;
                const z = space.z + Math.sin(angle) * distance;
                
                // Choose a random object type
                const objectType = Math.random();
                
                if (objectType < 0.3) {
                    this.createTrashCan(x, z);
                } else if (objectType < 0.5) {
                    const rotation = Math.random() * Math.PI * 2;
                    this.createBench(x, z, rotation);
                } else if (objectType < 0.7) {
                    this.createStreetlight(x, z);
                } else if (objectType < 0.85) {
                    this.createBarrel(x, z);
                } else {
                    this.createCrate(x, z);
                }
            }
        }
    }
    
    createBarrel(x, z) {
        // Create a barrel that can be knocked over
        const barrelRadius = 1;
        const barrelHeight = 2;
        
        // Create the barrel body
        const barrelGeometry = new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelHeight, 16);
        const barrelMaterial = new THREE.MeshStandardMaterial({
            color: 0x993333, // Red barrel
            roughness: 0.7,
            metalness: 0.3
        });
        
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.set(x, barrelHeight/2, z);
        barrel.castShadow = true;
        barrel.receiveShadow = true;
        this.scene.add(barrel);
        
        // Add details to the barrel (rings)
        const ringGeometry = new THREE.TorusGeometry(barrelRadius + 0.05, 0.1, 8, 16);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.5,
            metalness: 0.5
        });
        
        // Top ring
        const topRing = new THREE.Mesh(ringGeometry, ringMaterial);
        topRing.position.y = barrelHeight/2 - 0.1;
        topRing.rotation.x = Math.PI/2;
        barrel.add(topRing);
        
        // Middle ring
        const middleRing = new THREE.Mesh(ringGeometry, ringMaterial);
        middleRing.position.y = 0;
        middleRing.rotation.x = Math.PI/2;
        barrel.add(middleRing);
        
        // Bottom ring
        const bottomRing = new THREE.Mesh(ringGeometry, ringMaterial);
        bottomRing.position.y = -barrelHeight/2 + 0.1;
        bottomRing.rotation.x = Math.PI/2;
        barrel.add(bottomRing);
        
        // Add a hazard symbol
        const symbolGeometry = new THREE.PlaneGeometry(1, 1);
        const symbolMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00, // Yellow warning symbol
            transparent: true,
            opacity: 0.9
        });
        
        const symbol = new THREE.Mesh(symbolGeometry, symbolMaterial);
        symbol.position.set(0, 0, barrelRadius + 0.01);
        symbol.rotation.y = Math.PI;
        barrel.add(symbol);
        
        // Add to physics objects array
        this.physicsObjects.push({
            type: 'barrel',
            position: new THREE.Vector3(x, barrelHeight/2, z),
            rotation: new THREE.Euler(0, 0, 0),
            originalPosition: new THREE.Vector3(x, barrelHeight/2, z),
            originalRotation: new THREE.Euler(0, 0, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            angularVelocity: new THREE.Vector3(0, 0, 0),
            mass: 40, // Heavier than trash cans
            radius: barrelRadius,
            height: barrelHeight,
            isKnockedOver: false,
            mesh: barrel
        });
    }
    
    createCrate(x, z) {
        // Create a wooden crate
        const crateSize = 1.5;
        const crateGeometry = new THREE.BoxGeometry(crateSize, crateSize, crateSize);
        const crateMaterial = new THREE.MeshStandardMaterial({
            color: 0xA67B5B, // Wooden color
            roughness: 0.8,
            metalness: 0.1
        });
        
        const crate = new THREE.Mesh(crateGeometry, crateMaterial);
        crate.position.set(x, crateSize/2, z);
        crate.castShadow = true;
        crate.receiveShadow = true;
        this.scene.add(crate);
        
        // Add crate details (edges)
        const edgeSize = crateSize + 0.05;
        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(edgeSize, edgeSize, edgeSize));
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
        const wireframe = new THREE.LineSegments(edges, edgeMaterial);
        crate.add(wireframe);
        
        // Random rotation
        const rotation = Math.random() * Math.PI * 0.25;
        crate.rotation.y = rotation;
        
        // Add to physics objects array
        this.physicsObjects.push({
            type: 'crate',
            position: new THREE.Vector3(x, crateSize/2, z),
            rotation: new THREE.Euler(0, rotation, 0),
            originalPosition: new THREE.Vector3(x, crateSize/2, z),
            originalRotation: new THREE.Euler(0, rotation, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            angularVelocity: new THREE.Vector3(0, 0, 0),
            mass: 30, // Medium weight
            radius: crateSize * 0.75, // Slightly smaller than actual size for better collisions
            height: crateSize,
            isKnockedOver: false,
            mesh: crate
        });
    }
    
    createTrashCan(x, z) {
        // Create a trash can that can be knocked over
        const trashCanRadius = 0.8;
        const trashCanHeight = 2;
        
        // Create the can
        const canGeometry = new THREE.CylinderGeometry(trashCanRadius, trashCanRadius, trashCanHeight, 12);
        const canMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444, // Dark gray
            roughness: 0.8,
            metalness: 0.2
        });
        
        const trashCan = new THREE.Mesh(canGeometry, canMaterial);
        trashCan.position.set(x, trashCanHeight/2, z);
        trashCan.castShadow = true;
        trashCan.receiveShadow = true;
        this.scene.add(trashCan);
        
        // Add a lid
        const lidGeometry = new THREE.CylinderGeometry(trashCanRadius + 0.1, trashCanRadius, 0.2, 12);
        const lidMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222, // Even darker
            roughness: 0.7,
            metalness: 0.3
        });
        
        const lid = new THREE.Mesh(lidGeometry, lidMaterial);
        lid.position.y = trashCanHeight/2 + 0.1;
        trashCan.add(lid);
        
        // Add to physics objects array
        this.physicsObjects.push({
            type: 'trashCan',
            position: new THREE.Vector3(x, trashCanHeight/2, z),
            rotation: new THREE.Euler(0, 0, 0),
            originalPosition: new THREE.Vector3(x, trashCanHeight/2, z),
            originalRotation: new THREE.Euler(0, 0, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            angularVelocity: new THREE.Vector3(0, 0, 0),
            mass: 20,
            radius: trashCanRadius,
            height: trashCanHeight,
            isKnockedOver: false,
            mesh: trashCan
        });
    }
    
    createHuman(x, z, walkHorizontal) {
        // Create a simple human figure
        const humanGroup = new THREE.Group();
        
        // Choose a random color for clothing
        const colors = [0x2266DD, 0xDD2222, 0x22DD22, 0xDDDD22, 0xDD22DD, 0x22DDDD];
        const clothingColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Body
        const bodyGeometry = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: clothingColor,
            roughness: 0.8,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.9;
        body.castShadow = true;
        humanGroup.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFDBBA, // Skin tone
            roughness: 0.8,
            metalness: 0.1
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.7;
        head.castShadow = true;
        humanGroup.add(head);
        
        // Arms
        const armGeometry = new THREE.CapsuleGeometry(0.1, 0.6, 4, 8);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: clothingColor,
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Left arm
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.4, 1.0, 0);
        leftArm.rotation.z = -0.2;
        leftArm.castShadow = true;
        humanGroup.add(leftArm);
        
        // Right arm
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.4, 1.0, 0);
        rightArm.rotation.z = 0.2;
        rightArm.castShadow = true;
        humanGroup.add(rightArm);
        
        // Legs
        const legGeometry = new THREE.CapsuleGeometry(0.12, 0.8, 4, 8);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222, // Dark pants
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Left leg
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.2, 0.4, 0);
        leftLeg.castShadow = true;
        humanGroup.add(leftLeg);
        
        // Right leg
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.2, 0.4, 0);
        rightLeg.castShadow = true;
        humanGroup.add(rightLeg);
        
        // Position the human
        humanGroup.position.set(x, 0, z); // Ensure Y is 0 to be on the ground
        
        // Set random rotation (facing direction)
        const rotation = Math.random() * Math.PI * 2;
        humanGroup.rotation.y = rotation;
        
        // Add to scene
        this.scene.add(humanGroup);
        
        // Add to humans array with properties
        this.humans.push({
            type: 'human',
            mesh: humanGroup,
            position: new THREE.Vector3(x, 0, z), // Set Y to 0 for ground level
            velocity: new THREE.Vector3(0, 0, 0),
            rotation: rotation,
            walkSpeed: 2 + Math.random() * 2, // Random walking speed
            walkHorizontal: walkHorizontal,
            state: 'walking', // walking, fleeing, dead
            runningFrom: null, // Will store the car position when fleeing
            fleeSpeed: 5 + Math.random() * 3, // Faster than walking
            detectionRadius: 15, // How far they can "see" the car
            pointValue: 100,
            isDead: false,
            limbs: {
                leftArm: leftArm,
                rightArm: rightArm,
                leftLeg: leftLeg,
                rightLeg: rightLeg
            },
            animationState: {
                legForward: Math.random() < 0.5, // Randomly start with left or right leg forward
                animSpeed: 2 + Math.random(), // Random animation speed for variety
                walkCycle: 0
            },
            boundingRadius: 0.4 // Collision radius
        });
    }
    
    // Helper method to get road information
    getRoads() {
        return this.roads;
    }
    
    // Helper method to get a good spawn position on a road
    getSpawnPosition() {
        // Choose a horizontal road in the middle of the city
        const horizontalRoadIndex = Math.floor(this.citySize / 2);
        const roadInfo = this.roads.horizontal[horizontalRoadIndex];
        
        // Return the position in the middle of the road
        return {
            x: 0, // Center of the city horizontally
            y: 0.5, // Just above the ground
            z: roadInfo.centerZ,
            rotation: -Math.PI / 2 // Facing along the road (east)
        };
    }
    
    // Method to get all obstacles for collision detection
    getObstacles() {
        return this.obstacles;
    }
    
    // Method to get ramps
    getRamps() {
        return this.ramps;
    }
    
    // Method to get physics objects
    getPhysicsObjects() {
        return this.physicsObjects;
    }
    
    // Method to get humans
    getHumans() {
        return this.humans;
    }
    
    createBoundary() {
        console.log("Creating boundary walls...");
        // Calculate the total size of the city
        const totalSize = this.citySize * this.blockSize + (this.citySize + 1) * this.roadWidth;
        const halfTotalSize = totalSize / 2;
        
        // Create two sets of boundaries:
        // 1. Visual buildings along the edge (decorative)
        // 2. Invisible larger collision wall beyond that (functional)
        
        // PART 1: Create visual boundary buildings
        const boundaryWidth = 10; // Width of the visible boundary wall
        const boundaryHeight = 20; // Height of the visible boundary wall
        
        // Array of visible boundary segments (north, east, south, west)
        const visibleBoundaries = [
            // North wall (along z = -halfTotalSize - boundaryWidth/2)
            {
                width: totalSize + boundaryWidth * 2, // Add extra to cover corners
                depth: boundaryWidth,
                x: 0,
                z: -halfTotalSize - boundaryWidth/2,
                rotation: 0
            },
            // East wall (along x = halfTotalSize + boundaryWidth/2)
            {
                width: boundaryWidth,
                depth: totalSize + boundaryWidth * 2, // Add extra to cover corners
                x: halfTotalSize + boundaryWidth/2,
                z: 0,
                rotation: 0
            },
            // South wall (along z = halfTotalSize + boundaryWidth/2)
            {
                width: totalSize + boundaryWidth * 2, // Add extra to cover corners
                depth: boundaryWidth,
                x: 0,
                z: halfTotalSize + boundaryWidth/2,
                rotation: 0
            },
            // West wall (along x = -halfTotalSize - boundaryWidth/2)
            {
                width: boundaryWidth,
                depth: totalSize + boundaryWidth * 2, // Add extra to cover corners
                x: -halfTotalSize - boundaryWidth/2,
                z: 0,
                rotation: 0
            }
        ];
        
        // Create materials with different colors for variety
        const materials = [
            new THREE.MeshStandardMaterial({ color: this.colors.buildingA, roughness: 0.7, metalness: 0.2 }),
            new THREE.MeshStandardMaterial({ color: this.colors.buildingB, roughness: 0.7, metalness: 0.2 }),
            new THREE.MeshStandardMaterial({ color: this.colors.buildingD, roughness: 0.7, metalness: 0.2 }),
            new THREE.MeshStandardMaterial({ color: this.colors.buildingE, roughness: 0.7, metalness: 0.2 })
        ];
        
        // Create each visible boundary segment as a series of buildings
        visibleBoundaries.forEach((boundary, index) => {
            const segmentLength = (index % 2 === 0) ? boundary.width : boundary.depth;
            const numSegments = Math.ceil(segmentLength / 20); // Split into 20-unit segments
            const segmentSize = segmentLength / numSegments;
            
            for (let i = 0; i < numSegments; i++) {
                // Calculate position for this segment
                let segX = boundary.x;
                let segZ = boundary.z;
                const offset = -segmentLength/2 + i * segmentSize + segmentSize/2;
                
                if (index === 0 || index === 2) { // North/South walls
                    segX += offset;
                } else { // East/West walls
                    segZ += offset;
                }
                
                // Randomize building properties
                const height = boundaryHeight + (Math.random() * 10 - 5); // Vary height
                const width = (index % 2 === 0) ? segmentSize : boundary.width;
                const depth = (index % 2 === 0) ? boundary.depth : segmentSize;
                
                // Create building with random material from the set
                const material = materials[Math.floor(Math.random() * materials.length)];
                const geometry = new THREE.BoxGeometry(width, height, depth);
                const building = new THREE.Mesh(geometry, material);
                
                building.position.set(segX, height / 2, segZ);
                building.castShadow = true;
                building.receiveShadow = true;
                this.scene.add(building);
                
                // Add windows for visual interest
                this.addWindowsToBuilding(building, width, depth, height);
                
                // Add to obstacles for collision detection
                const obstacle = {
                    type: 'boundary',
                    position: new THREE.Vector3(segX, height / 2, segZ),
                    boundingRadius: Math.max(width, depth) / 2,
                    mesh: building
                };
                this.obstacles.push(obstacle);
            }
        });
        
        // PART 2: Create invisible boundary wall outside the visible buildings
        // This wall will be much taller and extend beyond the visible buildings to ensure nothing escapes
        const buffer = 10; // Extra buffer beyond visible buildings
        const invisibleWallHeight = 1000; // Very tall to prevent jumping over
        
        // Create an invisible material
        const invisibleMaterial = new THREE.MeshBasicMaterial({ 
            transparent: true, 
            opacity: 0.0, // Completely invisible
            side: THREE.DoubleSide 
        });
        
        // Define the invisible boundary walls (larger than visible ones)
        const invisibleBoundaries = [
            // North wall
            {
                width: totalSize + boundaryWidth * 4, // Wider than visible boundary
                depth: buffer,
                x: 0,
                z: -halfTotalSize - boundaryWidth - buffer/2
            },
            // East wall
            {
                width: buffer,
                depth: totalSize + boundaryWidth * 4,
                x: halfTotalSize + boundaryWidth + buffer/2,
                z: 0
            },
            // South wall
            {
                width: totalSize + boundaryWidth * 4,
                depth: buffer,
                x: 0,
                z: halfTotalSize + boundaryWidth + buffer/2
            },
            // West wall
            {
                width: buffer,
                depth: totalSize + boundaryWidth * 4,
                x: -halfTotalSize - boundaryWidth - buffer/2,
                z: 0
            }
        ];
        
        // Create each invisible wall and add to obstacles
        invisibleBoundaries.forEach(boundary => {
            const geometry = new THREE.BoxGeometry(boundary.width, invisibleWallHeight, boundary.depth);
            const wall = new THREE.Mesh(geometry, invisibleMaterial);
            
            wall.position.set(boundary.x, invisibleWallHeight/2, boundary.z);
            this.scene.add(wall);
            
            // Add to obstacles with a very large bounding radius
            const obstacle = {
                type: 'boundary',
                position: new THREE.Vector3(boundary.x, invisibleWallHeight/2, boundary.z),
                boundingRadius: Math.max(boundary.width, boundary.depth) / 2,
                mesh: wall
            };
            this.obstacles.push(obstacle);
        });
        
        // Add an invisible floor to prevent falling through if there are any gaps
        const floorGeometry = new THREE.BoxGeometry(totalSize * 2, 1, totalSize * 2);
        const floor = new THREE.Mesh(floorGeometry, invisibleMaterial);
        floor.position.set(0, -0.5, 0); // Just below the visible ground
        this.scene.add(floor);
        
        // Don't add the floor to obstacles as it would interfere with normal movement
    }
    
    createAdditionalFeatures() {
        // Calculate total city dimensions
        const totalSize = this.citySize * this.blockSize + (this.citySize + 1) * this.roadWidth;
        const halfTotalSize = totalSize / 2;
        
        // 1. Add parking lots
        this.createParkingLot(-halfTotalSize + 20, 0, 15, 25);
        this.createParkingLot(halfTotalSize - 20, halfTotalSize - 30, 15, 25);
        
        // 2. Add some decorative elements (trees, benches, streetlights)
        // Add trees along some roads
        this.addStreetDecorations();
        
        // 3. Add a stadium
        this.createStadium(halfTotalSize - 40, -halfTotalSize + 40);
        
        // 4. Add a park with a lake
        this.createParkWithLake(-halfTotalSize + 40, -halfTotalSize + 40, 35);
    }
    
    createParkingLot(x, z, width, depth) {
        // Create parking lot ground
        const groundGeometry = new THREE.PlaneGeometry(width, depth);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111, // Dark asphalt
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(x, 0.02, z); // Slightly above main ground
        this.scene.add(ground);
        
        // Add parking spaces
        const spaceWidth = 2.5;
        const spaceDepth = 5;
        const rows = Math.floor(depth / spaceDepth) - 1;
        const spotsPerRow = Math.floor(width / spaceWidth) - 1;
        
        // Create a canvas for the parking lot texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#333333';
        ctx.fillRect(0, 0, 512, 512);
        
        // Draw parking spot lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        for (let i = 1; i < 10; i++) {
            const y = i * (512 / 10);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();
        }
        
        const linesTexture = new THREE.CanvasTexture(canvas);
        
        // Add lines
        const linesGeometry = new THREE.PlaneGeometry(width, depth);
        const linesMaterial = new THREE.MeshBasicMaterial({
            map: linesTexture,
            transparent: true
        });
        const lines = new THREE.Mesh(linesGeometry, linesMaterial);
        lines.rotation.x = -Math.PI / 2;
        lines.position.set(x, 0.03, z);
        this.scene.add(lines);
        
        // Add a few cars in the parking lot
        const carPositions = [];
        for (let i = 0; i < 5; i++) {
            const row = Math.floor(Math.random() * rows);
            const spot = Math.floor(Math.random() * spotsPerRow);
            
            // Calculate car position
            const carX = x - width/2 + spaceWidth/2 + spot * spaceWidth;
            const carZ = z - depth/2 + spaceDepth/2 + row * spaceDepth;
            
            // Check if spot is already taken
            let spotTaken = false;
            for (const pos of carPositions) {
                if (Math.abs(pos.x - carX) < 2 && Math.abs(pos.z - carZ) < 4) {
                    spotTaken = true;
                    break;
                }
            }
            
            if (!spotTaken) {
                carPositions.push({ x: carX, z: carZ });
                this.createParkedCar(carX, carZ, Math.random() > 0.5 ? 0 : Math.PI/2);
            }
        }
    }
    
    createParkedCar(x, z, rotation) {
        // Simple parked car model
        const carWidth = 1.8;
        const carLength = 4;
        const carHeight = 1.4;
        
        // Random color
        const colors = [0x0000FF, 0xFF0000, 0x00FF00, 0xFFFF00, 0x00FFFF, 0xFFFFFF, 0x888888];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Car body
        const bodyGeometry = new THREE.BoxGeometry(carWidth, carHeight, carLength);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.5,
            metalness: 0.7
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(x, carHeight/2, z);
        body.rotation.y = rotation;
        body.castShadow = true;
        body.receiveShadow = true;
        this.scene.add(body);
        
        // Add as obstacle (but don't make it too restrictive for the car to navigate)
        const obstacle = {
            type: 'parkedCar',
            position: new THREE.Vector3(x, carHeight/2, z),
            boundingRadius: Math.max(carWidth, carLength) / 2,
            mesh: body
        };
        this.obstacles.push(obstacle);
    }
    
    addStreetDecorations() {
        // Add trees, benches and streetlights along roads
        const totalSize = this.citySize * this.blockSize + (this.citySize + 1) * this.roadWidth;
        const halfTotalSize = totalSize / 2;
        
        // Add decorations along horizontal roads
        for (const road of this.roads.horizontal) {
            const zPos = road.centerZ;
            
            // Add decorations along the length of the road (on the sidewalk)
            for (let x = -halfTotalSize + 10; x < halfTotalSize; x += 15) {
                if (Math.random() < 0.3) {
                    // Add a tree
                    const offset = (Math.random() > 0.5 ? 1 : -1) * (this.roadWidth/2 + 1);
                    this.createTree(x, zPos + offset);
                } else if (Math.random() < 0.3) {
                    // Add a streetlight
                    const offset = (Math.random() > 0.5 ? 1 : -1) * (this.roadWidth/2 + 1);
                    this.createStreetlight(x, zPos + offset);
                }
            }
        }
        
        // Add decorations along vertical roads
        for (const road of this.roads.vertical) {
            const xPos = road.centerX;
            
            // Add decorations along the length of the road (on the sidewalk)
            for (let z = -halfTotalSize + 10; z < halfTotalSize; z += 15) {
                if (Math.random() < 0.3) {
                    // Add a tree
                    const offset = (Math.random() > 0.5 ? 1 : -1) * (this.roadWidth/2 + 1);
                    this.createTree(xPos + offset, z);
                } else if (Math.random() < 0.3) {
                    // Add a streetlight
                    const offset = (Math.random() > 0.5 ? 1 : -1) * (this.roadWidth/2 + 1);
                    this.createStreetlight(xPos + offset, z);
                }
            }
        }
    }
    
    createStreetlight(x, z) {
        // Create a streetlight
        const poleHeight = 6;
        const poleRadius = 0.2;
        
        // Create a group for the streetlight
        const streetlightGroup = new THREE.Group();
        streetlightGroup.position.set(x, poleHeight/2, z);
        this.scene.add(streetlightGroup);
        
        const poleGeometry = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.5
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.castShadow = true;
        streetlightGroup.add(pole);
        
        // Add light fixture
        const fixtureGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.8);
        const fixtureMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.5,
            metalness: 0.8
        });
        const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
        fixture.position.set(0, poleHeight/2, 0);
        pole.add(fixture);
        
        // Add light
        const light = new THREE.PointLight(0xFFFFAA, 1, 15);
        light.position.set(0, -0.2, 0);
        fixture.add(light);
        
        // Add a glow
        const glowGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFDD,
            transparent: true,
            opacity: 0.4
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, -0.2, 0);
        fixture.add(glow);
        
        // Add to physics objects for interactive behavior
        this.physicsObjects.push({
            type: 'streetlight',
            position: new THREE.Vector3(x, poleHeight/2, z),
            rotation: new THREE.Euler(0, 0, 0),
            originalPosition: new THREE.Vector3(x, poleHeight/2, z),
            originalRotation: new THREE.Euler(0, 0, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            angularVelocity: new THREE.Vector3(0, 0, 0),
            mass: 25, // Heavier than trash cans
            radius: 0.8, // Increased radius for better pole collision detection
            height: poleHeight,
            isKnockedOver: false,
            mesh: streetlightGroup,
            light: light, // Store the light reference to turn it off when knocked over
            // Store pole dimensions to enable cylinder-based collision detection
            pole: {
                radius: poleRadius,
                height: poleHeight,
                position: new THREE.Vector3(0, 0, 0) // Local position within the group
            }
        });
    }
    
    createBench(x, z, rotation) {
        // Create a simple bench
        const benchGroup = new THREE.Group();
        const benchHeight = 0.5;
        const benchWidth = 2;
        const benchDepth = 0.5;
        
        // Position the bench group
        benchGroup.position.set(x, benchHeight/2, z);
        benchGroup.rotation.y = rotation;
        this.scene.add(benchGroup);
        
        // Bench seat
        const seatGeometry = new THREE.BoxGeometry(benchWidth, 0.1, benchDepth);
        const seatMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown wood
            roughness: 0.9,
            metalness: 0.1
        });
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.position.y = benchHeight/2;
        benchGroup.add(seat);
        
        // Bench legs
        const legGeometry = new THREE.BoxGeometry(0.1, benchHeight, benchDepth);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444, // Dark metal
            roughness: 0.5,
            metalness: 0.8
        });
        
        // Left leg
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-benchWidth/2 + 0.2, -benchHeight/4, 0);
        benchGroup.add(leftLeg);
        
        // Right leg
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(benchWidth/2 - 0.2, -benchHeight/4, 0);
        benchGroup.add(rightLeg);
        
        // Add to physics objects for interactive behavior
        this.physicsObjects.push({
            type: 'bench',
            position: new THREE.Vector3(x, benchHeight/2, z),
            rotation: new THREE.Euler(0, rotation, 0),
            originalPosition: new THREE.Vector3(x, benchHeight/2, z),
            originalRotation: new THREE.Euler(0, rotation, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            angularVelocity: new THREE.Vector3(0, 0, 0),
            mass: 35, // Heavier than trash cans, harder to knock over
            radius: 1.2, // Increased radius for better collision detection
            height: benchHeight,
            isKnockedOver: false,
            mesh: benchGroup
        });
    }
    
    createStadium(x, z) {
        // Create a simple stadium
        const stadiumWidth = 40;
        const stadiumDepth = 30;
        const wallHeight = 10;
        
        // Main field
        const fieldGeometry = new THREE.PlaneGeometry(stadiumWidth - 10, stadiumDepth - 10);
        const fieldMaterial = new THREE.MeshStandardMaterial({
            color: 0x00AA00, // Green field
            roughness: 0.9,
            metalness: 0.1
        });
        const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
        field.rotation.x = -Math.PI / 2;
        field.position.set(x, 0.05, z);
        this.scene.add(field);
        
        // Stadium walls
        const wallGeometry = new THREE.BoxGeometry(stadiumWidth, wallHeight, 1);
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xDDDDDD,
            roughness: 0.7,
            metalness: 0.3
        });
        
        // North wall
        const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
        northWall.position.set(x, wallHeight/2, z - stadiumDepth/2);
        northWall.castShadow = true;
        northWall.receiveShadow = true;
        this.scene.add(northWall);
        
        // South wall
        const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
        southWall.position.set(x, wallHeight/2, z + stadiumDepth/2);
        southWall.castShadow = true;
        southWall.receiveShadow = true;
        this.scene.add(southWall);
        
        // East wall
        const eastWallGeometry = new THREE.BoxGeometry(1, wallHeight, stadiumDepth);
        const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
        eastWall.position.set(x + stadiumWidth/2, wallHeight/2, z);
        eastWall.castShadow = true;
        eastWall.receiveShadow = true;
        this.scene.add(eastWall);
        
        // West wall
        const westWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
        westWall.position.set(x - stadiumWidth/2, wallHeight/2, z);
        westWall.castShadow = true;
        westWall.receiveShadow = true;
        this.scene.add(westWall);
        
        // Add stands
        this.createStadiumStands(x, z, stadiumWidth, stadiumDepth, wallHeight);
        
        // Add obstacles for collision
        [northWall, southWall, eastWall, westWall].forEach(wall => {
            const boundingRadius = Math.max(
                wall.geometry.parameters.width, 
                wall.geometry.parameters.depth
            ) / 2;
            
            const obstacle = {
                type: 'stadium',
                position: wall.position.clone(),
                boundingRadius: boundingRadius,
                mesh: wall
            };
            this.obstacles.push(obstacle);
        });
    }
    
    createStadiumStands(x, z, width, depth, wallHeight) {
        // Create stadium stands
        const standMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888, // Gray stands
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Create stands geometries
        const northStandGeometry = new THREE.BoxGeometry(width - 10, wallHeight/2, 8);
        const northStand = new THREE.Mesh(northStandGeometry, standMaterial);
        northStand.position.set(x, wallHeight/4, z - depth/2 + 5);
        northStand.castShadow = true;
        northStand.receiveShadow = true;
        this.scene.add(northStand);
        
        const southStandGeometry = new THREE.BoxGeometry(width - 10, wallHeight/2, 8);
        const southStand = new THREE.Mesh(southStandGeometry, standMaterial);
        southStand.position.set(x, wallHeight/4, z + depth/2 - 5);
        southStand.castShadow = true;
        southStand.receiveShadow = true;
        this.scene.add(southStand);
        
        const eastStandGeometry = new THREE.BoxGeometry(8, wallHeight/2, depth - 16);
        const eastStand = new THREE.Mesh(eastStandGeometry, standMaterial);
        eastStand.position.set(x + width/2 - 5, wallHeight/4, z);
        eastStand.castShadow = true;
        eastStand.receiveShadow = true;
        this.scene.add(eastStand);
        
        const westStandGeometry = new THREE.BoxGeometry(8, wallHeight/2, depth - 16);
        const westStand = new THREE.Mesh(westStandGeometry, standMaterial);
        westStand.position.set(x - width/2 + 5, wallHeight/4, z);
        westStand.castShadow = true;
        westStand.receiveShadow = true;
        this.scene.add(westStand);
        
        // Add spectators (simplified as colored boxes)
        const standWidth = width - 10;
        const spectatorRows = 3;
        const spectatorsPerRow = Math.floor(standWidth / 2);
        
        // Add spectators to north and south stands
        for (const stand of [northStand, southStand]) {
            for (let row = 0; row < spectatorRows; row++) {
                for (let i = 0; i < spectatorsPerRow; i++) {
                    if (Math.random() < 0.7) { // 70% chance to have a spectator
                        const spectatorColor = Math.random() > 0.5 ? 0xFF0000 : 0x0000FF; // Red or blue team
                        const spectatorGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.4);
                        const spectatorMaterial = new THREE.MeshBasicMaterial({ color: spectatorColor });
                        const spectator = new THREE.Mesh(spectatorGeometry, spectatorMaterial);
                        
                        // Position on stand
                        const xOffset = -standWidth/2 + 1 + i * 2;
                        const yOffset = 2 + row * 1;
                        const zOffset = stand === northStand ? 2 : -2; // Different for north/south stands
                        
                        spectator.position.set(xOffset, yOffset, zOffset);
                        stand.add(spectator);
                    }
                }
            }
        }
    }
    
    createParkWithLake(x, z, size) {
        // Create a park with a lake
        // Park grass
        const parkGeometry = new THREE.CircleGeometry(size, 32);
        const parkMaterial = new THREE.MeshStandardMaterial({
            color: 0x33AA33, // Slightly different green
            roughness: 0.9,
            metalness: 0.1
        });
        const park = new THREE.Mesh(parkGeometry, parkMaterial);
        park.rotation.x = -Math.PI / 2;
        park.position.set(x, 0.05, z);
        this.scene.add(park);
        
        // Lake
        const lakeGeometry = new THREE.CircleGeometry(size/3, 32);
        const lakeMaterial = new THREE.MeshStandardMaterial({
            color: 0x0066AA, // Blue water
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.8
        });
        const lake = new THREE.Mesh(lakeGeometry, lakeMaterial);
        lake.rotation.x = -Math.PI / 2;
        lake.position.set(x, 0.1, z);
        this.scene.add(lake);
        
        // Add trees around the park
        const numTrees = 20;
        for (let i = 0; i < numTrees; i++) {
            const angle = (i / numTrees) * Math.PI * 2;
            const radius = size * 0.7 + Math.random() * (size * 0.2); // Trees around the perimeter
            const treeX = x + Math.cos(angle) * radius;
            const treeZ = z + Math.sin(angle) * radius;
            
            this.createTree(treeX, treeZ);
        }
        
        // Add a few benches
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const radius = size * 0.4 + Math.random() * (size * 0.1); // Benches between lake and trees
            const benchX = x + Math.cos(angle) * radius;
            const benchZ = z + Math.sin(angle) * radius;
            
            // Create a bench facing the lake
            const benchAngle = Math.atan2(benchZ - z, benchX - x) + Math.PI; // Face toward lake
            this.createBench(benchX, benchZ, benchAngle);
        }
    }
    
    createLaunchpad(x, z) {
        // Create an omnidirectional launchpad/trampoline
        const launchpadRadius = 6; // Larger circular area
        const launchpadHeight = 0.3; // Lower height for a trampoline effect
        const bounciness = 14; // How much bounce/launch effect
        
        // Create the base - a flat circular platform slightly raised from the ground
        const baseGeometry = new THREE.CylinderGeometry(launchpadRadius, launchpadRadius + 0.5, launchpadHeight, 24);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x22CCFF, // Bright blue/cyan
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0x1166FF,
            emissiveIntensity: 0.2
        });
        
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(x, launchpadHeight/2, z);
        base.castShadow = true;
        base.receiveShadow = true;
        this.scene.add(base);
        
        // Create the trampoline surface with a slight dome shape
        const surfaceGeometry = new THREE.CircleGeometry(launchpadRadius - 0.5, 24);
        // Modify the geometry to create a slight dome
        const positions = surfaceGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const dx = positions[i];
            const dz = positions[i + 2];
            const distanceFromCenter = Math.sqrt(dx * dx + dz * dz);
            const normalizedDistance = distanceFromCenter / (launchpadRadius - 0.5);
            
            // Create a slight dome shape (higher in center, lower at edges)
            positions[i + 1] = 0.4 * (1 - Math.pow(normalizedDistance, 2));
        }
        
        // Update geometry normals after modifying vertices
        surfaceGeometry.computeVertexNormals();
        
        const surfaceMaterial = new THREE.MeshStandardMaterial({
            color: 0x00FFFF, // Cyan color for the bounce surface
            roughness: 0.2,
            metalness: 0.8,
            emissive: 0x00FFFF,
            emissiveIntensity: 0.3
        });
        
        const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
        surface.rotation.x = -Math.PI / 2; // Make it horizontal
        surface.position.set(0, launchpadHeight + 0.01, 0);
        base.add(surface);
        
        // Add pattern/stripes on the surface
        const patternGeometry = new THREE.RingGeometry(2, 2.5, 24);
        const patternMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00, // Yellow
            emissive: 0xFFFF00,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        
   
        
        // Add a glow effect for the launchpad
        const glowGeometry = new THREE.CylinderGeometry(launchpadRadius + 0.5, launchpadRadius + 1, 0.1, 24);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, -0.1, 0);
        base.add(glow);
        
        // Add to ramps array (using same array for compatibility with existing code)
        this.ramps.push({
            type: 'launchpad',
            position: new THREE.Vector3(x, launchpadHeight, z),
            radius: launchpadRadius,
            height: launchpadHeight,
            jumpStrength: bounciness, // How powerful the launch is
            omnidirectional: true, // Flag to indicate this is an omnidirectional launchpad
            base: base,
            surface: surface
        });
    }
} 