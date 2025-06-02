import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
const clock = new THREE.Clock();

// --- Model 1 (gltfModel1) Variables ---
let gltfModel1 = null; // Renamed from gltfModel
const model1Url = 'https://raw.githubusercontent.com/RSOS-ops/CoryPill-2/main/ShadowedGaze-good-1.glb'; // Renamed from modelUrl
let initialScale1 = new THREE.Vector3(1, 1, 1); // Renamed from initialScale
let isRotationBoostActive1 = false; // Renamed from isRotationBoostActive
let boostEndTime1 = 0; // Renamed from boostEndTime
let isScalingDown1 = false; // Renamed from isScalingDown
let scaleStartTime1 = 0; // Renamed from scaleStartTime

// --- Model 2 (gltfModel2) Variables ---
let gltfModel2 = null;
const model2Url = 'https://raw.githubusercontent.com/RSOS-ops/CoryPill-2/main/CoryPill_StackedText-Centrd.glb';
let initialScale2 = new THREE.Vector3(1, 1, 1);
let isRotationBoostActive2 = false; // For independent rotation of model 2
let boostEndTime2 = 0;             // For independent rotation of model 2
let isScalingUp2 = false;          // For model 2 scaling up animation
let scaleStartTime2 = 0;           // For model 2 scaling animation timing (can be reused or specific like this)


// --- General Animation & State Variables ---
const NORMAL_ROTATION_SPEED = (2 * Math.PI) / 30; // Radians per second
const BOOST_ROTATION_MULTIPLIER = 80;
const BOOST_DURATION = 1.0; // Updated duration
const SCALE_DURATION = 1.0; // Updated duration for both scaling down and up

// --- Sequence State Variables ---
let currentSequence = 0; // 0: idle, 1: sequence 1 (model1 actions), 2: sequence 2 (model2 actions)
let clickTime = 0; // Tracks time of click to manage sequence transitions/timing
let awaitingSequence2Start = false; // Flag to indicate if sequence 2 is pending

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5); // Color updated
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

            scene.add(gltfModel1);
            console.log('GLTF model 1 loaded, scaled, and positioned.');

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
        currentSequence = 1; // Always start/restart with Sequence 1
        awaitingSequence2Start = true;

        console.log("Click event: Sequence 1 initiated. clickTime:", clickTime);

        // Setup for Sequence 1 (gltfModel1)
        if (gltfModel1) {
            gltfModel1.visible = true;
            gltfModel1.scale.copy(initialScale1); // Reset to initial scale
            isRotationBoostActive1 = true;
            boostEndTime1 = clickTime + BOOST_DURATION;
            isScalingDown1 = true;
            scaleStartTime1 = clickTime;
        }

        // Ensure model 2 is hidden and its animation states are reset
        if (gltfModel2) {
            gltfModel2.visible = false;
            // Optional: Reset scale to 0 or initialScale2 if needed immediately.
            // For now, animate() handles setting scale to 0 before starting its animation.
            // gltfModel2.scale.set(0, 0, 0);
        }
        isScalingUp2 = false;
        isRotationBoostActive2 = false;
        // scaleStartTime2 will be set when its animation actually starts in animate()

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
    const deltaTime = clock.getDelta(); // Call at the beginning
    const elapsedTimeTotal = clock.elapsedTime;

    // --- Animate Sequence 1 (gltfModel1) ---
    if (gltfModel1 && currentSequence === 1) {
        // Rotation Boost
        let currentRotationSpeed1 = NORMAL_ROTATION_SPEED;
        if (isRotationBoostActive1) {
            if (elapsedTimeTotal < boostEndTime1) {
                currentRotationSpeed1 = NORMAL_ROTATION_SPEED * BOOST_ROTATION_MULTIPLIER;
            } else {
                isRotationBoostActive1 = false; // Boost ended
            }
        }
        gltfModel1.rotation.y += currentRotationSpeed1 * deltaTime;

        // Scale-Down
        if (isScalingDown1) {
            const elapsedTime1 = elapsedTimeTotal - scaleStartTime1;
            if (elapsedTime1 < SCALE_DURATION) {
                const scaleProgress1 = elapsedTime1 / SCALE_DURATION;
                const currentScaleVal1 = 1.0 - scaleProgress1;
                gltfModel1.scale.set(
                    initialScale1.x * currentScaleVal1,
                    initialScale1.y * currentScaleVal1,
                    initialScale1.z * currentScaleVal1
                );
            } else {
                gltfModel1.scale.set(0, 0, 0);
                isScalingDown1 = false;
                gltfModel1.visible = false; // Hide model 1
                console.log("Sequence 1 (model 1) complete: scaled down and hidden. Time:", elapsedTimeTotal);
            }
        }
    }

    // --- Trigger Sequence 2 ---
    // Condition: waiting for seq 2, seq 1's scaling is done, and 1.1s passed since clickTime
    if (awaitingSequence2Start && currentSequence === 1 && gltfModel1 && !isScalingDown1 &&
        elapsedTimeTotal >= clickTime + 1.1) {

        console.log("Initiating Sequence 2. Time:", elapsedTimeTotal);
        currentSequence = 2;
        awaitingSequence2Start = false; // Consume the flag

        if (gltfModel1) gltfModel1.visible = false; // Ensure model 1 is hidden

        if (gltfModel2) {
            gltfModel2.visible = true;
            gltfModel2.scale.set(0, 0, 0); // Start from 0 scale for scale-up
            isScalingUp2 = true;
            scaleStartTime2 = elapsedTimeTotal; // Start timing for scale-up
            isRotationBoostActive2 = true;
            boostEndTime2 = elapsedTimeTotal + BOOST_DURATION; // BOOST_DURATION is 1.0s
            console.log("Sequence 2 (model 2) started: visible, scaling up, rotation boost active. Time:", elapsedTimeTotal);
        } else {
            console.log("Sequence 2 initiation failed: model 2 not loaded. Time:", elapsedTimeTotal);
            // Reset to idle or handle error appropriately if model2 should have been loaded
            currentSequence = 0;
        }
    }

    // --- Animate Sequence 2 (gltfModel2) ---
    if (gltfModel2 && currentSequence === 2) {
        // Rotation Boost
        let currentRotationSpeed2 = NORMAL_ROTATION_SPEED;
        if (isRotationBoostActive2) {
            if (elapsedTimeTotal < boostEndTime2) {
                currentRotationSpeed2 = NORMAL_ROTATION_SPEED * BOOST_ROTATION_MULTIPLIER;
            } else {
                isRotationBoostActive2 = false; // Boost period ended
            }
        }
        gltfModel2.rotation.y += currentRotationSpeed2 * deltaTime;

        // Scale-Up
        if (isScalingUp2) {
            const elapsedTime2 = elapsedTimeTotal - scaleStartTime2;
            if (elapsedTime2 < SCALE_DURATION) {
                const scaleProgress2 = elapsedTime2 / SCALE_DURATION;
                gltfModel2.scale.set(
                    initialScale2.x * scaleProgress2,
                    initialScale2.y * scaleProgress2,
                    initialScale2.z * scaleProgress2
                );
            } else {
                gltfModel2.scale.copy(initialScale2); // Ensure it's exactly at initial scale
                isScalingUp2 = false;
                console.log("Sequence 2 (model 2) complete: scaled up. Time:", elapsedTimeTotal);
                // Optionally, set currentSequence = 0 here to return to idle.
                // currentSequence = 0;
                // console.log("Animation cycle complete, returning to idle state. Time:", elapsedTimeTotal);
            }
        }
    }

    // If no sequence is active, and model2 is meant to be idle (e.g. just rotating normally)
    // This part is not in the current requirement but can be added if model2 should animate when idle.
    // if (gltfModel2 && currentSequence === 0 && gltfModel2.visible) {
    //    gltfModel2.rotation.y += NORMAL_ROTATION_SPEED * deltaTime;
    // }


    renderer.render(scene, camera);
}

// Start the application
init();
