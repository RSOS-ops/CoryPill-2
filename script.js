import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

let scene, camera, renderer;
let textMesh;

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
    // textMesh.position.z is 0 by default, camera is at z=2

    scene.add(textMesh);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Start the application
init();
