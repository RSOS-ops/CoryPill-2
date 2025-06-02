import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let gltfModel;
const clock = new THREE.Clock();
let initialScale = new THREE.Vector3(1, 1, 1); // Default initial scale

// Variables for rotation boost effect
let isRotationBoostActive = false;
let boostEndTime = 0;
const NORMAL_ROTATION_SPEED = (2 * Math.PI) / 30; // Radians per second for 360 deg in 30s
const BOOST_ROTATION_MULTIPLIER =80;
const BOOST_DURATION = .5; // seconds

// Variables for scaling animation
let isScalingDown = false;
let scaleStartTime = 0;
const SCALE_DURATION = 0.5; // seconds

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Color updated
    directionalLight.position.set(5, 10, 7.5); // Positioned to the side and above
    scene.add(directionalLight);

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);

    // GLTF Model Loading
    const gltfLoader = new GLTFLoader();
    const modelUrl = 'https://raw.githubusercontent.com/RSOS-ops/CoryPill-2/main/ShadowedGaze-good-1.glb';

    gltfLoader.load(
        modelUrl,
        (gltf) => {
            gltfModel = gltf.scene;

            // 1. Calculate pre-scale bounding box and center
            const initialBox = new THREE.Box3().setFromObject(gltfModel);
            const initialCenter = initialBox.getCenter(new THREE.Vector3());
            const initialSize = initialBox.getSize(new THREE.Vector3());

            // 2. Determine scale factor to normalize max dimension to 1.0
            const maxDim = Math.max(initialSize.x, initialSize.y, initialSize.z);
            const scaleFactor = (maxDim > 0) ? 1.0 / maxDim : 1.0;
            gltfModel.scale.set(scaleFactor, scaleFactor, scaleFactor);

            // 3. Position model so its GEOMETRIC center is at (0,0,-0.5)
            // The initialCenter was in model's local space. After scaling, its position
            // relative to the pivot is initialCenter.clone().multiplyScalar(scaleFactor).
            // To move this geometric center to world origin (0,0,0) and then to (0,0,-0.5):
            const scaledCenterOffset = initialCenter.clone().multiplyScalar(scaleFactor);
            gltfModel.position.copy(scaledCenterOffset.negate()); // Move pivot so scaled geo center is at (0,0,0)
            gltfModel.position.z += -0.5; // Then shift the whole thing to target Z

            // Store the initial scale after normalization
            initialScale.copy(gltfModel.scale);

            scene.add(gltfModel);
            console.log('GLTF model loaded, scaled, and positioned with geometric center at (0,0,-0.5).');

            // 4. Adjust camera to make the model fill ~90% of viewport height
            // Re-calculate bounding sphere AFTER scaling and positioning
            const currentWorldBox = new THREE.Box3().setFromObject(gltfModel);
            const worldSphere = currentWorldBox.getBoundingSphere(new THREE.Sphere());
            const radius = worldSphere.radius;

            // Calculate distance needed to fit the sphere's height (diameter) into 90% of FOV
            // The "height" of the object we want to fit is effectively its diameter for this purpose.
            // However, the formula tan(fov/2) = (H/2) / dist uses H/2 (which is radius).
            const fitRadiusNet = radius / 0.9; // Effective radius for 90% fill (object appears larger)
            const distance = fitRadiusNet / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

            camera.position.x = worldSphere.center.x; // Align camera X with model's geometric center X
            camera.position.y = worldSphere.center.y; // Align camera Y with model's geometric center Y
            camera.position.z = worldSphere.center.z + distance; // Position camera 'distance' away from model's center Z

            camera.lookAt(worldSphere.center); // Look at the geometric center of the model

            console.log('Camera position adjusted for 90% viewport fill.');
        },
        (xhr) => {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('Error loading GLTF model:', error);
            const errorDiv = document.createElement('div');
            errorDiv.style.color = 'red';
            errorDiv.style.position = 'absolute';
            errorDiv.style.top = '50%'; // Centered now, as no text
            errorDiv.style.left = '50%';
            errorDiv.style.transform = 'translate(-50%, -50%)';
            errorDiv.style.fontSize = '2em';
            errorDiv.textContent = "3D Model Load Error";
            document.body.appendChild(errorDiv);
        }
    );

    // Event Listener for mouse click to boost rotation and trigger scaling
    window.addEventListener('click', () => {
        // Rotation boost logic
        if (!isRotationBoostActive) {
            isRotationBoostActive = true;
            boostEndTime = clock.elapsedTime + BOOST_DURATION;
        } else {
            boostEndTime = clock.elapsedTime + BOOST_DURATION;
        }

        // Scaling animation logic
        if (gltfModel) { // Ensure model is loaded
            if (isScalingDown) {
                // If already scaling down, reset to initial scale to restart animation
                gltfModel.scale.copy(initialScale);
            }
            isScalingDown = true;
            scaleStartTime = clock.elapsedTime;
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
    let currentRotationSpeed = NORMAL_ROTATION_SPEED; // Default to normal speed

    if (isRotationBoostActive) {
        if (clock.elapsedTime >= boostEndTime) {
            isRotationBoostActive = false;
            // currentRotationSpeed remains NORMAL_ROTATION_SPEED (implicitly set at the start of this block or explicitly here)
            // No need to set currentRotationSpeed here as it's already normal by default
        } else {
            currentRotationSpeed = NORMAL_ROTATION_SPEED * BOOST_ROTATION_MULTIPLIER;
        }
    }

    if (gltfModel) {
        gltfModel.rotation.y += currentRotationSpeed * deltaTime;

        // Scaling animation
        if (isScalingDown) {
            const elapsedTime = clock.elapsedTime - scaleStartTime;
            if (elapsedTime < SCALE_DURATION) {
                const scaleProgress = elapsedTime / SCALE_DURATION;
                const currentScale = 1 - scaleProgress;
                gltfModel.scale.set(
                    initialScale.x * currentScale,
                    initialScale.y * currentScale,
                    initialScale.z * currentScale
                );
            } else {
                gltfModel.scale.set(0, 0, 0); // Ensure it's fully scaled down
                isScalingDown = false;
            }
        }
    }

    renderer.render(scene, camera);
}

// Start the application
init();
