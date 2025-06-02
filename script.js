import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let directionalLight; // Main directional light
let newLight1, newLight2; // Variables to store the new lights
const clock = new THREE.Clock();

// --- Data Structures ---
// Holds all data related to the first 3D model
const model1Data = {
    gltfModel: null, // The Three.js object for the model
    modelUrl: 'https://raw.githubusercontent.com/RSOS-ops/CoryPill-2/main/ShadowedGaze-good-1.glb', // URL to load the GLB/GLTF file
    initialScale: new THREE.Vector3(1, 1, 1), // Initial scale after normalization
    initialQuaternionDuringScaleUp: null,
    isRotationBoostActive: false, // Flag for rotation speed boost
    boostEndTime: 0, // Timestamp when rotation boost ends
    isScalingDown: false, // Flag for scaling down animation
    scaleStartTime: 0, // Timestamp when scaling down animation started (Seq A for Model 1)
    isScalingUp: false, // Flag for scaling up animation
    scaleStartTimeUp: 0, // Timestamp when scaling up animation started (Seq D for Model 1)
};

// Holds all data related to the second 3D model
const model2Data = {
    gltfModel: null, // The Three.js object for the model
    modelUrl: 'https://raw.githubusercontent.com/RSOS-ops/CoryPill-2/main/CoryPill_StackedText-Centrd.glb', // URL to load the GLB/GLTF file
    initialScale: new THREE.Vector3(1, 1, 1), // Initial scale after normalization
    initialQuaternionDuringScaleUp: null,
    isRotationBoostActive: false, // Flag for rotation speed boost
    boostEndTime: 0, // Timestamp when rotation boost ends
    isScalingUp: false, // Flag for scaling up animation (Seq B for Model 2)
    scaleStartTime: 0, // Timestamp when scaling up animation started
    isScalingDown: false, // Flag for scaling down animation (Seq C for Model 2)
    scaleStartTimeDown: 0, // Timestamp when scaling down animation started
};

// Configuration for animation parameters
const animationConfig = {
    NORMAL_ROTATION_SPEED: (3 * Math.PI) / 30, // Radians per second for idle rotation
    BOOST_ROTATION_MULTIPLIER: 70, // Multiplier for rotation speed during boost
    BOOST_DURATION: 1.0, // Duration of the rotation boost in seconds
    SCALE_DURATION: 1.0, // Duration of scaling animations (up and down) in seconds
    TRANSITION_DELAY: 1.1, // Delay in seconds before the next model starts appearing after the current one is clicked
};

// --- Global Animation State Variables ---
// These control the fading animations of the secondary lights (newLight1, newLight2)
let isFadingOutLights = false; // Flag for fading out newLight1 and newLight2
let lightsFadeStartTime = 0;   // Timestamp when light fade-out started
let isFadingInLights = false;  // Flag for fading in newLight1 and newLight2
let lightsFadeInStartTime = 0; // Timestamp when light fade-in should start

// --- Sequence State Management ---
const SEQUENCE_STATES = {
    SEQUENCE_1_IDLE: 'SEQUENCE_1_IDLE', // Model 1 is visible and idle
    SEQUENCE_1_START_TRANSITION_AWAY: 'SEQUENCE_1_START_TRANSITION_AWAY', // Model 1 is scaling down
    SEQUENCE_1_COMPLETE_TRANSITION_TO_2: 'SEQUENCE_1_COMPLETE_TRANSITION_TO_2', // Model 2 is scaling up
    SEQUENCE_2_IDLE: 'SEQUENCE_2_IDLE', // Model 2 is visible and idle
    SEQUENCE_2_START_TRANSITION_AWAY: 'SEQUENCE_2_START_TRANSITION_AWAY', // Model 2 is scaling down
    SEQUENCE_2_COMPLETE_TRANSITION_TO_1: 'SEQUENCE_2_COMPLETE_TRANSITION_TO_1', // Model 1 is scaling up
};
let currentSequenceState = SEQUENCE_STATES.SEQUENCE_1_IDLE; // Initial state
// activeModelIdentifier is removed, currentSequenceState will be the source of truth.
let clickTime = 0; // Timestamp of the last click, used to time animation sequences

/**
 * Initializes the THREE.js scene, camera, renderer, lights, and loads models.
 */
function init() {
    // Scene setup
    scene = new THREE.Scene();

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3; // Initial camera position

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true }); // Enable anti-aliasing for smoother edges
    renderer.setSize(window.innerWidth, window.innerHeight); // Set renderer size to window size
    renderer.setPixelRatio(window.devicePixelRatio); // Adjust pixel ratio for device screen
    renderer.setClearColor(0x000000); // Set background color to black
    document.body.appendChild(renderer.domElement); // Add renderer to the DOM

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 4.0); // Soft ambient light for overall illumination
    scene.add(ambientLight);

    // Main directional light, always on, intensity might change based on active model
    directionalLight = new THREE.DirectionalLight(0xffffff, 5.0);
    directionalLight.position.set(5, 10, 7.5); // Positioned to cast shadows and highlight
    scene.add(directionalLight);

    // Secondary directional light 1, fades in/out
    newLight1 = new THREE.DirectionalLight(0xffffff, 5.0);
    newLight1.position.set(-5, -10, -7.5); // Positioned from another angle
    scene.add(newLight1);

    // Secondary directional light 2, fades in/out
    newLight2 = new THREE.DirectionalLight(0xffffff, 5.0);
    newLight2.position.set(0, 0, 5); // Positioned from yet another angle
    scene.add(newLight2);

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false); // Handle window resize events

    // Load 3D Models
    // Load the first model, initially visible
    loadGLTFModel(model1Data, true, (loadedModel, calculatedInitialScale) => {
        model1Data.gltfModel = loadedModel;
        model1Data.initialScale.copy(calculatedInitialScale);
        // Adjust camera to fit the first loaded model
        const boundingBox = new THREE.Box3().setFromObject(model1Data.gltfModel);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180); // Convert vertical FOV to radians

        // Calculate distance to fit object perfectly based on FOV and object's largest dimension
        // The /2 is because tan(fov/2) relates half the dimension to the distance.
        let cameraZ = maxDim / 2 / Math.tan(fov / 2);
        
        cameraZ *= 2.5; // Zoom out further by applying the new multiplier

        camera.position.set(center.x, center.y, center.z + cameraZ);
        camera.lookAt(center);
        console.log('Camera position adjusted for model 1.');
    });

    // Load the second model, initially hidden
    loadGLTFModel(model2Data, false, (loadedModel, calculatedInitialScale) => {
        model2Data.gltfModel = loadedModel;
        model2Data.initialScale.copy(calculatedInitialScale);
    });


    // Event Listener for mouse click to swap models
    window.addEventListener('click', () => {
        // Ignore clicks if models aren't loaded yet or if a transition is already in progress
        if (!model1Data.gltfModel || !model2Data.gltfModel ||
            (currentSequenceState !== SEQUENCE_STATES.SEQUENCE_1_IDLE && currentSequenceState !== SEQUENCE_STATES.SEQUENCE_2_IDLE)) {
            console.log("Models not loaded or transition in progress. Click ignored. State:", currentSequenceState);
            return;
        }

        clickTime = clock.elapsedTime; // Record click time for animation sequencing

        if (currentSequenceState === SEQUENCE_STATES.SEQUENCE_1_IDLE) {
            console.log("Click: SEQUENCE_1_IDLE. Initiating transition from Sequence 1 to Sequence 2. Time:", clickTime);
            currentSequenceState = SEQUENCE_STATES.SEQUENCE_1_START_TRANSITION_AWAY;

            // Setup Model 1 (associated with Sequence 1) for scaling down
            model1Data.gltfModel.scale.copy(model1Data.initialScale);
            model1Data.gltfModel.visible = true;
            model1Data.isScalingDown = true;
            model1Data.scaleStartTime = clickTime;
            model1Data.isRotationBoostActive = true;
            model1Data.boostEndTime = clickTime + animationConfig.BOOST_DURATION;
            model1Data.isScalingUp = false;

            // Reset Model 2's animation states
            model2Data.isScalingUp = false;
            model2Data.isScalingDown = false;
            model2Data.isRotationBoostActive = false;
            if (model2Data.gltfModel) model2Data.gltfModel.visible = false;

            // Lights: Fade out secondary lights as Model 1 (Sequence 1) transitions away, preparing for Model 2 (part of Sequence 1 completion)
            if (directionalLight) directionalLight.intensity = 5.0; // Keep main light for Model 1 during its scale out
            if (newLight1 && newLight2) {
                newLight1.intensity = 5.0; // Start fade from full
                newLight2.intensity = 5.0;
                isFadingOutLights = true;
                lightsFadeStartTime = clickTime; // Start fade immediately
                isFadingInLights = false;
            }
        } else if (currentSequenceState === SEQUENCE_STATES.SEQUENCE_2_IDLE) {
            console.log("Click: SEQUENCE_2_IDLE. Initiating transition from Sequence 2 to Sequence 1. Time:", clickTime);
            currentSequenceState = SEQUENCE_STATES.SEQUENCE_2_START_TRANSITION_AWAY;

            // Setup Model 2 (associated with Sequence 2) for scaling down
            model2Data.gltfModel.scale.copy(model2Data.initialScale);
            model2Data.gltfModel.visible = true;
            model2Data.isScalingDown = true;
            model2Data.scaleStartTimeDown = clickTime;
            model2Data.isRotationBoostActive = true;
            model2Data.boostEndTime = clickTime + animationConfig.BOOST_DURATION;
            model2Data.isScalingUp = false;

            // Reset Model 1's animation states
            model1Data.isScalingUp = false;
            model1Data.isScalingDown = false;
            model1Data.isRotationBoostActive = false;
            if (model1Data.gltfModel) model1Data.gltfModel.visible = false;

            // Lights: Fade in secondary lights as Model 2 (Sequence 2) transitions away, preparing for Model 1 (part of Sequence 2 completion)
            // Main light intensity for Model 2 (currently 3.0) will change to 5.0 when Model 1 is fully up.
            if (newLight1 && newLight2) {
                isFadingInLights = true;
                lightsFadeInStartTime = clickTime + animationConfig.TRANSITION_DELAY; // Delay fade-in start
                isFadingOutLights = false;
                newLight1.intensity = 0.0; // Start fade from zero
                newLight2.intensity = 0.0;
                console.log("Preparing to fade in lights for Model 1 (Sequence 2 complete to 1). Start time:", lightsFadeInStartTime);
            }
        }
    }, false);

    animate(); // Start the main animation loop
}

/**
 * Loads a GLTF model, normalizes its scale and centers it, then adds it to the scene.
 * The model is scaled such that its largest dimension is 1 unit.
 * It's positioned so its geometric center is at (0,0,-0.5) in world space.
 *
 * @param {object} modelDataObj - The data object associated with the model (e.g., model1Data or model2Data),
 *                                containing its URL and where to store the loaded gltfScene and initialScale.
 * @param {boolean} isInitiallyVisible - Determines if the model is set to visible upon loading.
 * @param {function} onLoadedCallback - A callback function that is executed once the model is successfully loaded
 *                                      and processed. It receives the loaded model (THREE.Group) and its
 *                                      calculated initial scale (THREE.Vector3) as arguments.
 */
function loadGLTFModel(modelDataObj, isInitiallyVisible, onLoadedCallback) {
    const gltfLoader = new GLTFLoader(); // Instantiate the GLTF loader

    gltfLoader.load(
        modelDataObj.modelUrl, // URL of the 3D model
        (gltf) => { // Success callback: called when the model is loaded
            const model = gltf.scene; // The loaded 3D scene (typically a THREE.Group)

            // --- 1. Calculate Pre-Scale Bounding Box and Center ---
            // This box encompasses the model in its original, unscaled form.
            const initialBox = new THREE.Box3().setFromObject(model);
            const initialCenter = initialBox.getCenter(new THREE.Vector3()); // Model's original geometric center
            const initialSize = initialBox.getSize(new THREE.Vector3());     // Model's original dimensions (width, height, depth)

            // --- 2. Determine Scale Factor for Normalization ---
            // We want to scale the model so its largest dimension becomes 1.0 unit.
            // This makes it easier to manage model sizes consistently.
            const maxDim = Math.max(initialSize.x, initialSize.y, initialSize.z);
            const scaleFactor = (maxDim > 0) ? 1.0 / maxDim : 1.0; // Avoid division by zero if model has no size
            model.scale.set(scaleFactor, scaleFactor, scaleFactor); // Apply uniform scale

            // --- 3. Position Model for Centering ---
            // After scaling, the model's original center (initialCenter) has also been scaled.
            // We need to translate the model so this scaled center moves to the world origin (0,0,0),
            // and then shift it slightly back along the Z-axis.
            const scaledCenterOffset = initialCenter.clone().multiplyScalar(scaleFactor);
            model.position.copy(scaledCenterOffset.negate()); // Move model to origin based on its scaled center
            model.position.z += -0.5; // Shift model slightly back along Z-axis

            // Store the calculated initial scale (as a new Vector3 to avoid reference issues)
            // This is the scale that makes the model 1 unit in its largest dimension.
            const calculatedInitialScale = model.scale.clone();
            model.visible = isInitiallyVisible; // Set initial visibility

            scene.add(model); // Add the processed model to the main scene
            console.log(`GLTF model loaded from ${modelDataObj.modelUrl}, scaled, positioned, and set to visible: ${isInitiallyVisible}.`);

            // Execute the callback, if provided, passing the loaded model and its normalized scale
            if (onLoadedCallback) {
                onLoadedCallback(model, calculatedInitialScale);
            }
        },
        undefined, // onProgress callback (optional, can be used to show loading percentage)
        // Error handling callback: called if model loading fails
        (error) => {
            console.error(`Error loading GLTF model from ${modelDataObj.modelUrl}:`, error);
            // Display a basic error message to the user on the page
            const errorDiv = document.createElement('div');
            errorDiv.textContent = `3D Model Load Error (${modelDataObj.modelUrl})`;
            document.body.appendChild(errorDiv);
        }
    );
}


/**
 * Handles window resize events. It updates the camera's aspect ratio
 * and the renderer's size to match the new window dimensions.
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight; // Update aspect ratio
    camera.updateProjectionMatrix(); // Apply changes to camera projection
    renderer.setSize(window.innerWidth, window.innerHeight); // Resize renderer
}

/**
 * The main animation loop, managed by requestAnimationFrame.
 * This function is called before each screen repaint (typically 60 times per second).
 * It calculates time deltas, updates all animations (lights, models),
 * handles delayed sequence transitions, and renders the scene.
 */
function animate() {
    requestAnimationFrame(animate); // Schedule the next frame
    const deltaTime = clock.getDelta(); // Time elapsed since the last frame (seconds)
    const elapsedTimeTotal = clock.elapsedTime; // Total time elapsed since the clock started (seconds)

    // Update light animations (fading in/out)
    updateLightAnimations(elapsedTimeTotal);
    // Update model animations (scaling, rotation)
    updateModelAnimations(deltaTime, elapsedTimeTotal);

    // --- Sequence State Machine for Transitions ---
    switch (currentSequenceState) {
        case SEQUENCE_STATES.SEQUENCE_1_START_TRANSITION_AWAY:
            if (!model1Data.isScalingDown && elapsedTimeTotal >= clickTime + animationConfig.TRANSITION_DELAY) { // Model 1 done scaling down, delay passed
                console.log("Transition: Model 1 scaled down (Sequence 1 Away), initiating Model 2 scale up (Sequence 1 Complete to 2). Time:", elapsedTimeTotal);
                currentSequenceState = SEQUENCE_STATES.SEQUENCE_1_COMPLETE_TRANSITION_TO_2;
                // Initialize Model 2 for scaling up
                if (model2Data.gltfModel) {
                    model2Data.gltfModel.visible = true;
                    model2Data.gltfModel.scale.set(0, 0, 0);
                    model2Data.isScalingUp = true;
                    model2Data.initialQuaternionDuringScaleUp = null; 
                    model2Data.scaleStartTime = elapsedTimeTotal;
                    model2Data.isRotationBoostActive = true;
                    model2Data.boostEndTime = elapsedTimeTotal + animationConfig.BOOST_DURATION;
                }
            }
            break;
        case SEQUENCE_STATES.SEQUENCE_1_COMPLETE_TRANSITION_TO_2:
            if (!model2Data.isScalingUp) { // Model 2 done scaling up
                console.log("Transition: Model 2 scaled up (Sequence 1 Complete to 2), now Model 2 Idle. Time:", elapsedTimeTotal);
                currentSequenceState = SEQUENCE_STATES.SEQUENCE_2_IDLE;
                // Final light setup for Model 2 Idle state
                if (directionalLight) directionalLight.intensity = 3.0;
                if (newLight1) newLight1.intensity = 0.0; // Should be fully faded out
                if (newLight2) newLight2.intensity = 0.0;
            }
            break;
        case SEQUENCE_STATES.SEQUENCE_2_START_TRANSITION_AWAY:
            if (!model2Data.isScalingDown && elapsedTimeTotal >= clickTime + animationConfig.TRANSITION_DELAY) { // Model 2 done scaling down, delay passed
                console.log("Transition: Model 2 scaled down (Sequence 2 Away), initiating Model 1 scale up (Sequence 2 Complete to 1). Time:", elapsedTimeTotal);
                currentSequenceState = SEQUENCE_STATES.SEQUENCE_2_COMPLETE_TRANSITION_TO_1;
                // Initialize Model 1 for scaling up
                if (model1Data.gltfModel) {
                    model1Data.gltfModel.visible = true;
                    model1Data.gltfModel.scale.set(0, 0, 0);
                    model1Data.isScalingUp = true;
                    model1Data.initialQuaternionDuringScaleUp = null; 
                    model1Data.scaleStartTimeUp = elapsedTimeTotal;
                    model1Data.isRotationBoostActive = true;
                    model1Data.boostEndTime = elapsedTimeTotal + animationConfig.BOOST_DURATION;
                }
            }
            break;
        case SEQUENCE_STATES.SEQUENCE_2_COMPLETE_TRANSITION_TO_1:
            if (!model1Data.isScalingUp) { // Model 1 done scaling up
                console.log("Transition: Model 1 scaled up (Sequence 2 Complete to 1), now Model 1 Idle. Time:", elapsedTimeTotal);
                currentSequenceState = SEQUENCE_STATES.SEQUENCE_1_IDLE;
                // Final light setup for Model 1 Idle state
                if (directionalLight) directionalLight.intensity = 5.0;
                if (newLight1) newLight1.intensity = 5.0; // Should be fully faded in
                if (newLight2) newLight2.intensity = 5.0;
            }
            break;
    }
    renderer.render(scene, camera); // Render the scene with the updated camera and objects
}

/**
 * Updates the intensity of newLight1 and newLight2 for fade-in and fade-out effects.
 * @param {number} elapsedTimeTotal - The total elapsed time from the THREE.Clock.
 */
function updateLightAnimations(elapsedTimeTotal) {
    // --- Light Fading Out Logic (for newLight1 and newLight2) ---
    if (isFadingOutLights) {
        const animElapsedTime = elapsedTimeTotal - lightsFadeStartTime; // Time since fade out started
        if (animElapsedTime < animationConfig.SCALE_DURATION) {
            // Calculate progress (0 to 1) of the fade-out animation
            const fadeProgress = animElapsedTime / animationConfig.SCALE_DURATION;
            // Decrease intensity from 5.0 down to 0.0 based on progress
            const currentIntensity = 5.0 * (1.0 - fadeProgress);
            if (newLight1) newLight1.intensity = Math.max(0, currentIntensity); // Ensure intensity doesn't go below 0
            if (newLight2) newLight2.intensity = Math.max(0, currentIntensity);
        } else {
            // Animation finished, ensure lights are fully off
            if (newLight1) newLight1.intensity = 0;
            if (newLight2) newLight2.intensity = 0;
            isFadingOutLights = false; // Reset flag
            console.log("Lights faded out. Time:", elapsedTimeTotal);
        }
    }

    // --- Light Fading In Logic (for newLight1 and newLight2) ---
    if (isFadingInLights) {
        // Wait for the specified delay (lightsFadeInStartTime) before starting the fade-in
        if (elapsedTimeTotal >= lightsFadeInStartTime) {
            const animElapsedTime = elapsedTimeTotal - lightsFadeInStartTime; // Time since fade in should have started
            if (animElapsedTime < animationConfig.SCALE_DURATION) {
                // Calculate progress (0 to 1) of the fade-in animation
                const fadeInProgress = animElapsedTime / animationConfig.SCALE_DURATION;
                // Increase intensity from 0.0 up to 5.0 based on progress
                const currentIntensity = 5.0 * fadeInProgress;
                if (newLight1) newLight1.intensity = Math.min(5.0, currentIntensity); // Ensure intensity doesn't exceed 5.0
                if (newLight2) newLight2.intensity = Math.min(5.0, currentIntensity);
            } else {
                // Animation finished, ensure lights are fully on
                if (newLight1) newLight1.intensity = 5.0;
                if (newLight2) newLight2.intensity = 5.0;
                isFadingInLights = false; // Reset flag
                console.log("Lights faded in. Time:", elapsedTimeTotal);
            }
        }
    }
}

/**
 * Manages animations for a single 3D model, including scaling, rotation, and visibility changes.
 * This function is called for each model in the `updateModelAnimations` function.
 *
 * @param {object} modelData - The data object for the model (either model1Data or model2Data).
 *                             This object holds the model's current state (e.g., isScalingDown,
 *                             isRotationBoostActive) and its THREE.js gltfModel object.
 * @param {number} deltaTime - The time elapsed since the last frame, used for frame-rate independent animation.
 * @param {number} elapsedTimeTotal - The total time elapsed since the application started.
 * @param {boolean} isActiveModelCurrently - REMOVED as currentSequenceState is now the source of truth.
 */
function animateModel(modelData, deltaTime, elapsedTimeTotal) {
    if (!modelData.gltfModel) return; // Exit if the model isn't loaded yet

    // --- Scaling Down Logic ---
    // Handles the animation when a model is shrinking and disappearing.
    if (modelData.isScalingDown) {
        // Model 1 uses 'scaleStartTime', Model 2 uses 'scaleStartTimeDown' for its distinct sequence.
        const startTime = (modelData === model1Data) ? modelData.scaleStartTime : modelData.scaleStartTimeDown;
        const animElapsedTime = elapsedTimeTotal - startTime; // Time since scaling down started

        if (animElapsedTime < animationConfig.SCALE_DURATION) {
            const scaleProgress = animElapsedTime / animationConfig.SCALE_DURATION; // Progress from 0 to 1
            const currentScalar = 1.0 - scaleProgress; // Scale factor from 1 down to 0
            modelData.gltfModel.scale.set(
                modelData.initialScale.x * currentScalar,
                modelData.initialScale.y * currentScalar,
                modelData.initialScale.z * currentScalar
            );
        } else {
            // Scaling down finished
            modelData.gltfModel.scale.set(0, 0, 0); // Ensure scale is zero
            modelData.isScalingDown = false;       // Reset flag
            modelData.gltfModel.visible = false;   // Hide the model
            console.log(`Model (${modelData.modelUrl}) completed scaling down. Time:`, elapsedTimeTotal);
        }
    }

    // --- Scaling Up Logic ---
    // Handles the animation when a model is growing and appearing.
    if (modelData.isScalingUp) {
        if (!modelData.initialQuaternionDuringScaleUp) {
            modelData.initialQuaternionDuringScaleUp = modelData.gltfModel.quaternion.clone();
        }
        // Model 1 uses 'scaleStartTimeUp', Model 2 uses 'scaleStartTime' for its distinct sequence.
         const startTime = (modelData === model1Data) ? modelData.scaleStartTimeUp : modelData.scaleStartTime;
        const animElapsedTime = elapsedTimeTotal - startTime; // Time since scaling up started

        if (animElapsedTime < animationConfig.SCALE_DURATION) {
            const scaleProgress = animElapsedTime / animationConfig.SCALE_DURATION; // Progress from 0 to 1

            // Calculate slerped orientation
            const slerpTargetQuaternion = new THREE.Quaternion(); // Target world orientation (0,0,0)
            if (modelData.initialQuaternionDuringScaleUp) { // Ensure initialQuaternion is available
                modelData.gltfModel.quaternion.copy(modelData.initialQuaternionDuringScaleUp).slerp(slerpTargetQuaternion, scaleProgress);
            } else {
                // Fallback if initialQuaternionDuringScaleUp was somehow not set (should not happen with current logic)
                modelData.gltfModel.quaternion.slerp(slerpTargetQuaternion, scaleProgress);
            }

            // Apply additional local Y-axis boosted spin
            if (modelData.isRotationBoostActive && elapsedTimeTotal < modelData.boostEndTime) {
                const boostSpinAmount = (animationConfig.NORMAL_ROTATION_SPEED * animationConfig.BOOST_ROTATION_MULTIPLIER) * deltaTime;
                modelData.gltfModel.rotateY(boostSpinAmount); // Rotates around the object's local Y-axis
            } else if (modelData.isRotationBoostActive) {
                modelData.isRotationBoostActive = false; // Boost time ended
            }
            // Scale factor from 0 up to 1 (based on initialScale)
            modelData.gltfModel.scale.set(
                modelData.initialScale.x * scaleProgress,
                modelData.initialScale.y * scaleProgress,
                modelData.initialScale.z * scaleProgress
            );
        } else {
            // Scaling up finished
            modelData.gltfModel.scale.copy(modelData.initialScale); // Ensure scale is set to initial full scale
            modelData.isScalingUp = false; // Reset flag
            modelData.gltfModel.rotation.set(0, 0, 0); // Set final rotation to (0,0,0)
            modelData.initialQuaternionDuringScaleUp = null; // Reset for next use
            modelData.isRotationBoostActive = false; // Ensure boost is off

            // Post-scaling up: Update active model identifier and set appropriate light intensities
            // This is now handled by the state machine in the main animate() function upon transitioning to IDLE states.
            // if (modelData === model1Data) { ... } else { ... }
        }
    }

    // --- Rotation Logic ---
    // Apply Y-axis rotation ONLY if the model is visible AND NOT currently scaling UP.
    if (modelData.gltfModel.visible && !modelData.isScalingUp) {
        let currentRotationSpeed = animationConfig.NORMAL_ROTATION_SPEED;

        // Check for rotation boost (typically for scaling down or specific click events)
        if (modelData.isRotationBoostActive) {
            if (elapsedTimeTotal < modelData.boostEndTime) {
                currentRotationSpeed = animationConfig.NORMAL_ROTATION_SPEED * animationConfig.BOOST_ROTATION_MULTIPLIER;
            } else {
                modelData.isRotationBoostActive = false; // Boost duration ended
            }
        }

        const isModel1Idle = modelData === model1Data && currentSequenceState === SEQUENCE_STATES.SEQUENCE_1_IDLE;
        const isModel2Idle = modelData === model2Data && currentSequenceState === SEQUENCE_STATES.SEQUENCE_2_IDLE;
        const isCurrentlyTheActiveIdleModel = isModel1Idle || isModel2Idle;

        // Apply rotation if:
        // 1. The model is currently scaling down (boost may apply).
        // 2. The model is the "active" one and in its IDLE state (normal rotation speed).
        if (modelData.isScalingDown) {
            modelData.gltfModel.rotation.y += currentRotationSpeed * deltaTime;
        } else if (isCurrentlyTheActiveIdleModel) {
            // For idle state, ensure boost is not active unless specifically intended.
            if (modelData.isRotationBoostActive && elapsedTimeTotal < modelData.boostEndTime) {
                modelData.gltfModel.rotation.y += currentRotationSpeed * deltaTime;
            } else {
                modelData.isRotationBoostActive = false; // Ensure boost is off for normal idle
                modelData.gltfModel.rotation.y += animationConfig.NORMAL_ROTATION_SPEED * deltaTime;
            }
        }
    }
}

/**
 * Central function to update animations for both models.
 * It calls `animateModel` for each model, passing the necessary state and time information.
 *
 * @param {number} deltaTime - The time elapsed since the last animation frame.
 * @param {number} elapsedTimeTotal - The total time elapsed since the application started.
 */
function updateModelAnimations(deltaTime, elapsedTimeTotal) {
    animateModel(model1Data, deltaTime, elapsedTimeTotal);
    animateModel(model2Data, deltaTime, elapsedTimeTotal);
}

// Start the application by calling the main initialization function
init();
