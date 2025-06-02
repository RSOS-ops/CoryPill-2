import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let textMesh;
let gltfModel; // Add this line
const clock = new THREE.Clock(); // Add this line

// Approximate conversion for 'em' to three.js units.
// 1em is typically 16px. Let's assume a common screen height for calculation,
// or pick a three.js unit size that looks good.
// For simplicity, we'll aim for a visual size and adjust camera/positioning.
// A common approach is to make the text have a certain height in world units,
// then adjust the camera's Z position or FOV.
// Let's target a text height of around 0.5 to 1 world units for a start.
// The '5em' is a bit tricky as 'em' is relative to font size of parent,
// and in three.js we define absolute sizes.
// We'll define a text size in three.js units that looks like '5em'.
const TEXT_SIZE = 0.5; // This will be the 'height' of the font in world units
const TEXT_DEPTH = 0.05; // Depth of the 3D text

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7); // White light, moderate intensity
    directionalLight.position.set(5, 10, 7.5); // Positioned to the side and above
    scene.add(directionalLight);

    // Load Font
    const fontLoader = new FontLoader();
    fontLoader.load(
        // Official three.js examples font path for Roboto Regular
        'https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json', // Using Helvetiker as direct Roboto is not always in this format. For true Roboto, a custom JSON font file is often needed.
        (font) => {
            createText(font);
        },
        undefined, // onProgress callback
        (error) => {
            console.error('FontLoader error:', error);
            // Fallback: display simple HTML text if font loading fails
            const errorDiv = document.createElement('div');
            errorDiv.style.color = 'white';
            errorDiv.style.position = 'absolute';
            errorDiv.style.top = '50%';
            errorDiv.style.left = '50%';
            errorDiv.style.transform = 'translate(-50%, -50%)';
            errorDiv.style.fontSize = '5em'; // CSS em
            errorDiv.style.fontFamily = 'Roboto, sans-serif'; // CSS font family
            errorDiv.textContent = "Cory Richard (Font Load Error)";
            document.body.appendChild(errorDiv);
        }
    );

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);

    // GLTF Model Loading
    const gltfLoader = new GLTFLoader();
    const modelUrl = 'https://raw.githubusercontent.com/RSOS-ops/CoryPill-2/7eb893d18a45859db5110cf113a0a94f1cb46bfd/CoryPill_GLTF.glb';

    gltfLoader.load(
        modelUrl,
        (gltf) => {
            gltfModel = gltf.scene; // Assign to the module-scoped variable

            // Calculate bounding box for scaling
            const box = new THREE.Box3().setFromObject(gltfModel);
            const size = box.getSize(new THREE.Vector3());
            // const center = box.getCenter(new THREE.Vector3()); // center calculation can be kept if needed for complex centering later

            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) {
                const scaleFactor = 1.0 / maxDim;
                gltfModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
            }

            // Set final position for the model (centered in XY, further from camera)
            gltfModel.position.set(0, 0, -0.5);

            scene.add(gltfModel);
            console.log('GLTF model loaded successfully and positioned.');
        },
        (xhr) => {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded'); // Optional progress
        },
        (error) => {
            console.error('Error loading GLTF model:', error);
            // You could add a fallback or user message here
            const errorDiv = document.createElement('div');
            errorDiv.style.color = 'red';
            errorDiv.style.position = 'absolute';
            errorDiv.style.top = '60%'; // Slightly below the main text
            errorDiv.style.left = '50%';
            errorDiv.style.transform = 'translate(-50%, -50%)';
            errorDiv.style.fontSize = '2em';
            errorDiv.textContent = "3D Model Load Error";
            document.body.appendChild(errorDiv);
        }
    );

    animate();
}

function createText(font) {
    const text = "Cory Richard";
    const textGeo = new TextGeometry(text, {
        font: font,
        size: TEXT_SIZE,
        height: TEXT_DEPTH, // three.js 'height' is extrusion depth
        curveSegments: 12,
        bevelEnabled: false
    });

    // Compute bounding box to center the text
    textGeo.computeBoundingBox();
    const textBoundingBox = textGeo.boundingBox;
    const textWidth = textBoundingBox.max.x - textBoundingBox.min.x;
    const textHeight = textBoundingBox.max.y - textBoundingBox.min.y;

    // Material
    const textMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF }); // White

    // Mesh
    textMesh = new THREE.Mesh(textGeo, textMat);

    // Center the text
    // For exact centering, we need to offset by half its computed width and height
    textMesh.position.x = -textWidth / 2;
    textMesh.position.y = -textHeight / 2;
    textMesh.position.z = 0.5; // Move text slightly forward

    scene.add(textMesh);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta(); // Get time delta for frame-rate independence

    // Rotate GLTF model if it's loaded
    if (gltfModel) {
        // Target: 360 degrees (2 * Math.PI radians) every 30 seconds
        const rotationSpeed = (2 * Math.PI) / 30; // Radians per second
        gltfModel.rotation.y += rotationSpeed * deltaTime; // Apply rotation for the current frame
    }

    renderer.render(scene, camera);
}

// Start the application
init();
