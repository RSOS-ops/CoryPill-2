import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
const clock = new THREE.Clock();

// --- Model 1 (gltfModel1) Variables ---
let gltfModel1 = null; // Renamed from gltfModel
const model1Url = 'https://raw.githubusercontent.com/RSOS-ops/CoryPill-2/main/ShadowedGaze-good-1.glb'; // Renamed from modelUrl
let initialScale1 = new THREE.Vector3(1, 1, 1); // Renamed from initialScale
let isRotationBoostActive1 = false;
let boostEndTime1 = 0;
let isScalingDown1 = false; // For Seq A (Model 1 scales down)
let scaleStartTime1 = 0;   // For Seq A
let isScalingUp1 = false;    // For Seq D (Model 1 scales up)
let scaleStartTimeUp1 = 0; // For Seq D

// --- Model 2 (gltfModel2) Variables ---
let gltfModel2 = null;
const model2Url = 'https://raw.githubusercontent.com/RSOS-ops/CoryPill-2/main/CoryPill_StackedText-Centrd.glb';
let initialScale2 = new THREE.Vector3(1, 1, 1);
let isRotationBoostActive2 = false;
let boostEndTime2 = 0;
let isScalingUp2 = false;    // For Seq B (Model 2 scales up)
let scaleStartTime2 = 0;   // For Seq B
let isScalingDown2 = false;  // For Seq C (Model 2 scales down)
let scaleStartTimeDown2 = 0; // For Seq C


// --- General Animation & State Variables ---
const NORMAL_ROTATION_SPEED = (2 * Math.PI) / 30; // Radians per second
const BOOST_ROTATION_MULTIPLIER = 80;
const BOOST_DURATION = 1.0; // Updated duration
const SCALE_DURATION = 1.0; // Updated duration for both scaling down and up

// --- Cyclical Interaction State Variables ---
let activeModelIdentifier = 1; // 1 for gltfModel1, 2 for gltfModel2
let clickTime = 0; // Tracks time of click to manage sequence transitions/timing
let awaitingModel2Visibility = false; // True when Model 1 has been clicked, Model 2 appearance is pending
let awaitingModel1Visibility = false; // True when Model 2 has been clicked, Model 1 appearance is pending

function init() {
    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2; // Adjust camera position to view the text

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000); // Black background
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.75); // Color updated
    directionalLight.position.set(5, 10, 7.5); // Positioned to the side and above
    scene.add(directionalLight);

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);

    // GLTF Model Loading
    const gltfLoader = new GLTFLoader(); // Loader can be reused

    // Load Model 1
    gltfLoader.load(
        model1Url,
        (gltf) => {
            gltfModel1 = gltf.scene;

            // 1. Calculate pre-scale bounding box and center
            const initialBox = new THREE.Box3().setFromObject(gltfModel1);
            const initialCenter = initialBox.getCenter(new THREE.Vector3());
            const initialSize = initialBox.getSize(new THREE.Vector3());

            // 2. Determine scale factor to normalize max dimension to 1.0
            const maxDim = Math.max(initialSize.x, initialSize.y, initialSize.z);
            const scaleFactor = (maxDim > 0) ? 1.0 / maxDim : 1.0;
            gltfModel1.scale.set(scaleFactor, scaleFactor, scaleFactor);

            // 3. Position model so its GEOMETRIC center is at (0,0,-0.5)
            const scaledCenterOffset = initialCenter.clone().multiplyScalar(scaleFactor);
            gltfModel1.position.copy(scaledCenterOffset.negate());
            gltfModel1.position.z += -0.5;

            // Store the initial scale after normalization
            initialScale1.copy(gltfModel1.scale);
            gltfModel1.visible = true; // Explicitly set initial visibility

            scene.add(gltfModel1);
            console.log('GLTF model 1 loaded, scaled, positioned, and set to visible.');

            // 4. Adjust camera for Model 1 (initial setup)
            const currentWorldBox = new THREE.Box3().setFromObject(gltfModel1);
            const worldSphere = currentWorldBox.getBoundingSphere(new THREE.Sphere());
            const radius = worldSphere.radius;
            const fitRadiusNet = radius / 0.9;
            const distance = fitRadiusNet / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
            camera.position.x = worldSphere.center.x;
            camera.position.y = worldSphere.center.y;
            camera.position.z = worldSphere.center.z + distance;
            camera.lookAt(worldSphere.center);
            console.log('Camera position adjusted for model 1.');
        },
        undefined, // onProgress callback (optional)
        (error) => {
            console.error('Error loading GLTF model 1:', error);
            // Simplified error display for now
            const errorDiv = document.createElement('div');
            errorDiv.textContent = "3D Model 1 Load Error";
            document.body.appendChild(errorDiv); // Basic error feedback
        }
    );

    // Load Model 2
    gltfLoader.load(
        model2Url,
        (gltf) => {
            gltfModel2 = gltf.scene;

            // 1. Calculate pre-scale bounding box and center
            const initialBox2 = new THREE.Box3().setFromObject(gltfModel2);
            const initialCenter2 = initialBox2.getCenter(new THREE.Vector3());
            const initialSize2 = initialBox2.getSize(new THREE.Vector3());

            // 2. Determine scale factor to normalize max dimension to 1.0
            const maxDim2 = Math.max(initialSize2.x, initialSize2.y, initialSize2.z);
            const scaleFactor2 = (maxDim2 > 0) ? 1.0 / maxDim2 : 1.0;
            gltfModel2.scale.set(scaleFactor2, scaleFactor2, scaleFactor2);

            // Store the initial scale after normalization
            initialScale2.copy(gltfModel2.scale);

            // 3. Position model (similar to model1 or adjust as needed)
            const scaledCenterOffset2 = initialCenter2.clone().multiplyScalar(scaleFactor2);
            gltfModel2.position.copy(scaledCenterOffset2.negate());
            gltfModel2.position.z += -0.5; // Assuming same Z offset for now

            gltfModel2.visible = false; // Initially hidden
            scene.add(gltfModel2);
            console.log('GLTF model 2 loaded, scaled, positioned, and hidden.');
        },
        (xhr) => {
            // console.log('Model 2: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('Error loading GLTF model 2:', error);
            const errorDiv = document.createElement('div');
            // Customize error message/display for model 2 if needed
            errorDiv.textContent = "3D Model 2 Load Error";
            document.body.appendChild(errorDiv);
        }
    );

    // Event Listener for mouse click
    window.addEventListener('click', () => {
        // Ensure models are loaded before starting any sequence
        if (!gltfModel1 || !gltfModel2) {
            console.log("Models not yet loaded. Click ignored.");
            return;
        }

        clickTime = clock.elapsedTime;

        if (!gltfModel1 || !gltfModel2) { // Check should ideally be at the very start
            console.log("Models not yet loaded. Click ignored.");
            return;
        }

        if (activeModelIdentifier === 1) {
            console.log("Click on Model 1. Starting Sequence A (Model 1 down) & B (Model 2 up). clickTime:", clickTime);

            // Setup for Sequence A (Model 1 scaling down & boost)
            if (gltfModel1) { // Ensure model1 is loaded
                gltfModel1.scale.copy(initialScale1); // Reset to full scale if clicked rapidly or during its scale up
                gltfModel1.visible = true; // Ensure it's visible for this animation
                isScalingDown1 = true;
                scaleStartTime1 = clickTime;
                isRotationBoostActive1 = true;
                boostEndTime1 = clickTime + BOOST_DURATION;
                isScalingUp1 = false; // Ensure it's not trying to scale up
            }

            // Prepare for Sequence B (Model 2 scaling up)
            awaitingModel2Visibility = true;
            awaitingModel1Visibility = false;

            // Reset states for Model 2
            isScalingUp2 = false;
            isScalingDown2 = false;
            isRotationBoostActive2 = false;
            if (gltfModel2) gltfModel2.visible = false;

        } else if (activeModelIdentifier === 2) {
            console.log("Click on Model 2. Starting Sequence C (Model 2 down) & D (Model 1 up). clickTime:", clickTime);

            // Setup for Sequence C (Model 2 scaling down & boost)
            if (gltfModel2) { // Ensure model2 is loaded
                gltfModel2.scale.copy(initialScale2); // Reset to full scale
                gltfModel2.visible = true; // Ensure it's visible for this animation
                isScalingDown2 = true;
                scaleStartTimeDown2 = clickTime;
                isRotationBoostActive2 = true;
                boostEndTime2 = clickTime + BOOST_DURATION;
                isScalingUp2 = false; // Ensure it's not trying to scale up
            }

            // Prepare for Sequence D (Model 1 scaling up)
            awaitingModel1Visibility = true;
            awaitingModel2Visibility = false;

            // Reset states for Model 1
            isScalingUp1 = false;
            isScalingDown1 = false;
            isRotationBoostActive1 = false;
            if (gltfModel1) gltfModel1.visible = false;

        } else {
            // This case should ideally not be reached if activeModelIdentifier is managed correctly.
            // Defaulting to Model 1's sequence start.
            console.warn("activeModelIdentifier in unexpected state:", activeModelIdentifier, "Defaulting to Model 1 sequence. clickTime:", clickTime);
            activeModelIdentifier = 1; // Correct the state
            // Repeat logic for activeModelIdentifier === 1 (or call a function)
            if (gltfModel1) {
                gltfModel1.scale.copy(initialScale1);
                gltfModel1.visible = true;
                isScalingDown1 = true;
                scaleStartTime1 = clickTime;
                isRotationBoostActive1 = true;
                boostEndTime1 = clickTime + BOOST_DURATION;
                isScalingUp1 = false;
            }
            awaitingModel2Visibility = true;
            awaitingModel1Visibility = false;
            isScalingUp2 = false;
            isScalingDown2 = false;
            isRotationBoostActive2 = false;
            if (gltfModel2) gltfModel2.visible = false;
        }
    }, false);

    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTimeTotal = clock.elapsedTime;

    // Animation Logic for gltfModel1
    if (gltfModel1) {
        // Scaling Down (Sequence A)
        if (isScalingDown1) {
            const animElapsedTime = elapsedTimeTotal - scaleStartTime1;
            if (animElapsedTime < SCALE_DURATION) {
                const scaleProgress = animElapsedTime / SCALE_DURATION;
                const currentScalar = 1.0 - scaleProgress;
                gltfModel1.scale.set(initialScale1.x * currentScalar, initialScale1.y * currentScalar, initialScale1.z * currentScalar);
            } else {
                gltfModel1.scale.set(0, 0, 0);
                isScalingDown1 = false;
                gltfModel1.visible = false;
                console.log("Sequence A (Model 1) complete: scaled down and hidden. Time:", elapsedTimeTotal);
            }
        }

        // Scaling Up (Sequence D)
        if (isScalingUp1) {
            const animElapsedTime = elapsedTimeTotal - scaleStartTimeUp1;
            if (animElapsedTime < SCALE_DURATION) {
                const scaleProgress = animElapsedTime / SCALE_DURATION;
                gltfModel1.scale.set(initialScale1.x * scaleProgress, initialScale1.y * scaleProgress, initialScale1.z * scaleProgress);
            } else {
                gltfModel1.scale.copy(initialScale1);
                isScalingUp1 = false;
                activeModelIdentifier = 1; // Model 1 is now the active, visible, idle model
                console.log("Sequence D (Model 1) complete: scaled up. Active model: 1. Time:", elapsedTimeTotal);
            }
        }

        // Rotation for Model 1 (Boost or Normal)
        if (gltfModel1.visible) {
            let currentRotationSpeed1 = NORMAL_ROTATION_SPEED;
            if (isRotationBoostActive1) {
                if (elapsedTimeTotal < boostEndTime1) {
                    currentRotationSpeed1 = NORMAL_ROTATION_SPEED * BOOST_ROTATION_MULTIPLIER;
                } else {
                    isRotationBoostActive1 = false; // Boost period ended
                }
            }
            // Apply rotation if scaling up, or if it's the active model and not doing any scaling animation
            if (isScalingUp1 || (activeModelIdentifier === 1 && !isScalingDown1 && !isRotationBoostActive1 && !isScalingUp1) ) {
                 gltfModel1.rotation.y += currentRotationSpeed1 * deltaTime;
            } else if (activeModelIdentifier === 1 && !isScalingDown1 && !isScalingUp1 && isRotationBoostActive1) { // boost during idle after click
                 gltfModel1.rotation.y += currentRotationSpeed1 * deltaTime;
            } else if (isScalingDown1) { // also rotate while scaling down (Seq A)
                 gltfModel1.rotation.y += currentRotationSpeed1 * deltaTime;
            }
        }
    }

    // Animation Logic for gltfModel2
    if (gltfModel2) {
        // Scaling Up (Sequence B)
        if (isScalingUp2) {
            const animElapsedTime = elapsedTimeTotal - scaleStartTime2;
            if (animElapsedTime < SCALE_DURATION) {
                const scaleProgress = animElapsedTime / SCALE_DURATION;
                gltfModel2.scale.set(initialScale2.x * scaleProgress, initialScale2.y * scaleProgress, initialScale2.z * scaleProgress);
            } else {
                gltfModel2.scale.copy(initialScale2);
                isScalingUp2 = false;
                activeModelIdentifier = 2; // Model 2 is now the active, visible, idle model
                console.log("Sequence B (Model 2) complete: scaled up. Active model: 2. Time:", elapsedTimeTotal);
            }
        }

        // Scaling Down (Sequence C)
        if (isScalingDown2) {
            const animElapsedTime = elapsedTimeTotal - scaleStartTimeDown2;
            if (animElapsedTime < SCALE_DURATION) {
                const scaleProgress = animElapsedTime / SCALE_DURATION;
                const currentScalar = 1.0 - scaleProgress;
                gltfModel2.scale.set(initialScale2.x * currentScalar, initialScale2.y * currentScalar, initialScale2.z * currentScalar);
            } else {
                gltfModel2.scale.set(0, 0, 0);
                isScalingDown2 = false;
                gltfModel2.visible = false;
                console.log("Sequence C (Model 2) complete: scaled down and hidden. Time:", elapsedTimeTotal);
            }
        }

        // Rotation for Model 2 (Boost or Normal)
        if (gltfModel2.visible) {
            let currentRotationSpeed2 = NORMAL_ROTATION_SPEED;
            if (isRotationBoostActive2) {
                if (elapsedTimeTotal < boostEndTime2) {
                    currentRotationSpeed2 = NORMAL_ROTATION_SPEED * BOOST_ROTATION_MULTIPLIER;
                } else {
                    isRotationBoostActive2 = false; // Boost period ended
                }
            }
             // Apply rotation if scaling up, or if it's the active model and not doing any scaling animation
            if (isScalingUp2 || (activeModelIdentifier === 2 && !isScalingDown2 && !isRotationBoostActive2 && !isScalingUp2) ) {
                gltfModel2.rotation.y += currentRotationSpeed2 * deltaTime;
            } else if (activeModelIdentifier === 2 && !isScalingDown2 && !isScalingUp2 && isRotationBoostActive2) { // boost during idle after click
                gltfModel2.rotation.y += currentRotationSpeed2 * deltaTime;
            } else if (isScalingDown2) { // also rotate while scaling down (Seq C)
                gltfModel2.rotation.y += currentRotationSpeed2 * deltaTime;
            }
        }
    }

    // Delayed Sequence Transitions
    // Triggering Model 2 Visibility (Sequence B start)
    if (awaitingModel2Visibility && gltfModel1 && !isScalingDown1 && elapsedTimeTotal >= clickTime + 1.1) {
        console.log("Initiating Sequence B (Model 2 up). Time:", elapsedTimeTotal);
        if (gltfModel2) {
            gltfModel2.visible = true;
            gltfModel2.scale.set(0, 0, 0);
            isScalingUp2 = true;
            scaleStartTime2 = elapsedTimeTotal;
            isRotationBoostActive2 = true; // Start boost with scale up
            boostEndTime2 = elapsedTimeTotal + BOOST_DURATION;
        }
        awaitingModel2Visibility = false;
    }

    // Triggering Model 1 Visibility (Sequence D start)
    if (awaitingModel1Visibility && gltfModel2 && !isScalingDown2 && elapsedTimeTotal >= clickTime + 1.1) {
        console.log("Initiating Sequence D (Model 1 up). Time:", elapsedTimeTotal);
        if (gltfModel1) {
            gltfModel1.visible = true;
            gltfModel1.scale.set(0, 0, 0);
            isScalingUp1 = true;
            scaleStartTimeUp1 = elapsedTimeTotal;
            isRotationBoostActive1 = true; // Start boost with scale up
            boostEndTime1 = elapsedTimeTotal + BOOST_DURATION;
        }
        awaitingModel1Visibility = false;
    }

    renderer.render(scene, camera);
}

// Start the application
init();
