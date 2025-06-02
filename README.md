# Interactive 3D Model Transition Demo

## Description

This project is a simple Three.js application that displays two 3D models. Users can click anywhere on the screen to toggle between the models. The transition includes animations for scaling, rotation, and dynamic changes to lighting.

This demo showcases:
*   Loading GLB (gLTF Binary) 3D models.
*   Perspective camera setup.
*   Basic scene setup with ambient and directional lights.
*   Animation system for smooth transitions:
    *   Models scale down and then up when toggling.
    *   Models have a continuous idle rotation.
    *   Rotation speed boosts during scaling animations.
*   Dynamic lighting changes that synchronize with model transitions.
*   State management for handling animation sequences and user interaction.

## How to Run

1.  **Clone the repository (if you have it as a Git repo):**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
    (If you downloaded the files directly, just navigate to the directory where `index.html` is located.)

2.  **Open `index.html` in a web browser:**
    *   Simply double-click the `index.html` file, or right-click and choose "Open with" your preferred web browser.
    *   Since the 3D models are loaded from absolute URLs (raw.githubusercontent.com), there's **no strict need for a local web server** for this particular demo to function.

3.  **For Local Development (if modifying model paths or using other local assets):**
    *   If you were to change model URLs to local paths, you would need to run a local web server due to browser security restrictions (CORS policy) for loading local files via `file:///` protocol.
    *   A simple way to start a local server (if you have Python installed):
        ```bash
        python -m http.server
        ```
        Or with Node.js:
        ```bash
        npx serve
        ```
    *   Then open `http://localhost:8000` (or the port indicated by your server) in your browser.

## Models Used

The demo uses two example GLB models hosted on GitHub:

*   **Model 1 (Shadowed Gaze Head):**
    *   URL: `https://raw.githubusercontent.com/RSOS-ops/CoryPill-2/main/ShadowedGaze-good-1.glb`
*   **Model 2 (Stacked Text "CoryPill"):**
    *   URL: `https://raw.githubusercontent.com/RSOS-ops/CoryPill-2/main/CoryPill_StackedText-Centrd.glb`

## Libraries Used

*   **Three.js:** A cross-browser JavaScript library/API used to create and display animated 3D computer graphics in a web browser.
    *   Website: [threejs.org](https://threejs.org/)

## Project Structure

*   `index.html`: The main HTML file that sets up the page, canvas, and loads the JavaScript. Includes an import map for Three.js modules.
*   `script.js`: Contains all the Three.js logic for scene setup, model loading, animation, state management, and user interaction.
*   `README.md`: This file, providing information about the project.
