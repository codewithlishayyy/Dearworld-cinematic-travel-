
import * as THREE from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';


// ==========================================
// ASCEND - CINEMATIC EARTH
// Smooth rotation, no blinking or flashing
// ==========================================


// Earth model files
const BASE =
    'https://api.getlayers.ai/storage/v1/object/public/public/assets/ascend-d9857ad1f2';


// Earth settings
const CONFIG = {
    planetRadius: 1.95,

    rotationSpeed: 0.03,
    initialRotation: 2.07,
    tilt: 0.37,

    starCount: 1000,

    backgroundColor: '#04060f',

    atmosphereColor: '#4779ff',

    cloudOpacity: 0.18,
    cloudSpeed: 0.006
};


// Earth positions while scrolling
const STOPS_X = [
    { p: 0, v: 0 },
    { p: 0.32, v: -3.1 },
    { p: 0.64, v: 3.2 },
    { p: 1, v: 0 }
];

const STOPS_Y = [
    { p: 0, v: -4.5 },
    { p: 0.32, v: 0.55 },
    { p: 0.64, v: 0.45 },
    { p: 1, v: 0.15 }
];

const STOPS_S = [
    { p: 0, v: 2.15 },
    { p: 0.32, v: 1 },
    { p: 0.64, v: 0.92 },
    { p: 1, v: 1.12 }
];


// ==========================================
// HELPER FUNCTIONS
// ==========================================

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
    return start + (end - start) * amount;
}

function sample(stops, progress) {

    for (let i = 1; i < stops.length; i++) {

        if (progress <= stops[i].p) {

            let amount =
                (progress - stops[i - 1].p) /
                (stops[i].p - stops[i - 1].p);

            amount = clamp(amount, 0, 1);

            amount = amount * amount * (3 - 2 * amount);

            return lerp(
                stops[i - 1].v,
                stops[i].v,
                amount
            );
        }
    }

    return stops[stops.length - 1].v;
}


// ==========================================
// START EARTH
// ==========================================

export function startPlanet({ reducedMotion = false } = {}) {

    const canvas = document.querySelector('.planet-canvas');

    if (!canvas) {
        console.warn('Earth canvas not found.');
        return;
    }


    // ======================================
    // RENDERER
    // ======================================

    let renderer;

    try {

        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });

    } catch (error) {

        console.error('WebGL is not available:', error);
        return;
    }

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 1.5)
    );

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.outputEncoding = THREE.sRGBEncoding;

    renderer.setClearColor(CONFIG.backgroundColor, 1);


    // ======================================
    // SCENE AND CAMERA
    // ======================================

    const scene = new THREE.Scene();

    scene.background = new THREE.Color(
        CONFIG.backgroundColor
    );

    const camera = new THREE.PerspectiveCamera(
        40,
        window.innerWidth / window.innerHeight,
        0.1,
        200
    );

    camera.position.set(0, 0, 8);


    // ======================================
    // LIGHTING
    // ======================================

    const ambientLight = new THREE.AmbientLight(
        0xffffff,
        0.85
    );

    scene.add(ambientLight);


    const sunlight = new THREE.DirectionalLight(
        0xffffff,
        1.5
    );

    sunlight.position.set(-5, 3, 7);

    scene.add(sunlight);


    const blueLight = new THREE.DirectionalLight(
        0x456bff,
        0.35
    );

    blueLight.position.set(4, -2, -5);

    scene.add(blueLight);


    // ======================================
    // EARTH GROUPS
    // ======================================

    const worldGroup = new THREE.Group();

    const planetGroup = new THREE.Group();

    const cloudGroup = new THREE.Group();

    planetGroup.rotation.z = CONFIG.tilt;

    cloudGroup.rotation.z = CONFIG.tilt;

    worldGroup.add(planetGroup);
    worldGroup.add(cloudGroup);

    scene.add(worldGroup);


    worldGroup.position.set(
        STOPS_X[0].v,
        STOPS_Y[0].v,
        0
    );

    worldGroup.scale.setScalar(STOPS_S[0].v);


    // ======================================
    // STATIC STARFIELD
    // No flickering
    // ======================================

    const starPositions = [];

    for (let i = 0; i < CONFIG.starCount; i++) {

        const y = Math.random() * 2 - 1;

        const angle = Math.random() * Math.PI * 2;

        const radius = Math.sqrt(1 - y * y) * 90;

        starPositions.push(
            Math.cos(angle) * radius,
            y * 90,
            Math.sin(angle) * radius
        );
    }


    const starGeometry = new THREE.BufferGeometry();

    starGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
            starPositions,
            3
        )
    );


    const starMaterial = new THREE.PointsMaterial({
        color: 0xcfe0ff,
        size: 0.13,
        transparent: true,
        opacity: 0.65,
        sizeAttenuation: true,
        depthWrite: false
    });


    const stars = new THREE.Points(
        starGeometry,
        starMaterial
    );

    scene.add(stars);


    // ======================================
    // SOFT ATMOSPHERE
    // Static glow, no pulsing
    // ======================================

    const atmosphereGeometry = new THREE.SphereGeometry(
        CONFIG.planetRadius * 1.035,
        64,
        64
    );


    const atmosphereMaterial = new THREE.ShaderMaterial({

        uniforms: {
            glowColor: {
                value: new THREE.Color(
                    CONFIG.atmosphereColor
                )
            }
        },

        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;

            void main() {

                vec4 viewPosition =
                    modelViewMatrix * vec4(position, 1.0);

                vNormal = normalize(
                    normalMatrix * normal
                );

                vPosition = viewPosition.xyz;

                gl_Position =
                    projectionMatrix * viewPosition;
            }
        `,

        fragmentShader: `
            uniform vec3 glowColor;

            varying vec3 vNormal;
            varying vec3 vPosition;

            void main() {

                vec3 normalDirection =
                    normalize(vNormal);

                vec3 viewDirection =
                    normalize(-vPosition);

                float rim = 1.0 - max(
                    dot(normalDirection, viewDirection),
                    0.0
                );

                rim = pow(rim, 3.0);

                float alpha = rim * 0.38;

                gl_FragColor = vec4(
                    glowColor,
                    alpha
                );
            }
        `,

        transparent: true,

        blending: THREE.AdditiveBlending,

        side: THREE.FrontSide,

        depthWrite: false
    });


    const atmosphere = new THREE.Mesh(
        atmosphereGeometry,
        atmosphereMaterial
    );

    planetGroup.add(atmosphere);


    // ======================================
    // LOAD EARTH MODEL
    // ======================================

    const dracoLoader = new DRACOLoader();

    dracoLoader.setDecoderPath(
        'https://www.gstatic.com/draco/versioned/decoders/1.5.5/'
    );


    const loader = new GLTFLoader();

    loader.setDRACOLoader(dracoLoader);


    let earthLoaded = false;

    let entryStart = 0;


    loader.load(

        BASE + '/planet.glb',

        function(gltf) {

            let originalMesh = null;

            gltf.scene.traverse(function(object) {

                if (object.isMesh && !originalMesh) {
                    originalMesh = object;
                }

            });


            if (!originalMesh) {
                console.error('Earth mesh not found.');
                return;
            }


            const earth = originalMesh.clone();

            earth.geometry = originalMesh.geometry.clone();

            earth.geometry.computeBoundingSphere();


            const sphere = earth.geometry.boundingSphere;

            const scale =
                CONFIG.planetRadius / sphere.radius;


            earth.scale.setScalar(scale);

            earth.position.copy(sphere.center)
                .multiplyScalar(-scale);


            // Keep original Earth texture
            earth.material = originalMesh.material.clone();

            // Stable surface appearance
            if (earth.material.isMeshStandardMaterial) {

                earth.material.metalness = 0;

                earth.material.roughness = 1;

                earth.material.envMapIntensity = 0;
            }


            planetGroup.add(earth);


            earthLoaded = true;

            entryStart = performance.now() / 1000;


            // ==================================
            // OPTIONAL CLOUD TEXTURE
            // ==================================

            const textureLoader = new THREE.TextureLoader();

            textureLoader.load(

                BASE + '/planet-clouds.png',

                function(texture) {

                    texture.wrapS = THREE.RepeatWrapping;

                    texture.wrapT = THREE.ClampToEdgeWrapping;

                    texture.repeat.set(1, 1);


                    const cloudMaterial =
                        new THREE.MeshBasicMaterial({

                            color: 0xffffff,

                            alphaMap: texture,

                            transparent: true,

                            opacity: CONFIG.cloudOpacity,

                            depthWrite: false,

                            side: THREE.FrontSide
                        });


                    const cloudGeometry =
                        new THREE.SphereGeometry(
                            CONFIG.planetRadius * 1.015,
                            64,
                            64
                        );


                    const clouds = new THREE.Mesh(
                        cloudGeometry,
                        cloudMaterial
                    );


                    cloudGroup.add(clouds);

                },

                undefined,

                function(error) {
                    console.warn(
                        'Cloud texture unavailable:',
                        error
                    );
                }
            );

        },

        undefined,

        function(error) {

            console.error(
                'Failed to load Earth:',
                error
            );
        }
    );


    // ======================================
    // SCROLL AND ANIMATION VALUES
    // ======================================

    let currentProgress = 0;

    let currentX = STOPS_X[0].v;

    let currentY = STOPS_Y[0].v;

    let currentScale = STOPS_S[0].v;

    let rotation = 0;

    let lastTime = performance.now() / 1000;


    // ======================================
    // ANIMATION LOOP
    // ======================================

    function animate() {

        requestAnimationFrame(animate);


        const now = performance.now() / 1000;

        const delta = clamp(
            now - lastTime,
            0,
            0.05
        );

        lastTime = now;


        // Current page scroll
        const maxScroll = Math.max(
            1,
            document.documentElement.scrollHeight -
            window.innerHeight
        );


        const targetProgress = clamp(
            window.scrollY / maxScroll,
            0,
            1
        );


        // Smooth scroll movement
        const scrollSmooth = Math.min(
            1,
            delta * 4.5
        );


        currentProgress = lerp(
            currentProgress,
            targetProgress,
            scrollSmooth
        );


        const moveSmooth = Math.min(
            1,
            delta * 3.2
        );


        const targetX = sample(
            STOPS_X,
            currentProgress
        ) * clamp(
            window.innerWidth / 1200,
            0.5,
            1
        );


        const targetY = sample(
            STOPS_Y,
            currentProgress
        );


        const targetScale = sample(
            STOPS_S,
            currentProgress
        );


        currentX = lerp(
            currentX,
            targetX,
            moveSmooth
        );


        currentY = lerp(
            currentY,
            targetY,
            moveSmooth
        );


        currentScale = lerp(
            currentScale,
            targetScale,
            moveSmooth
        );


        // ==================================
        // SMOOTH EARTH ENTRY
        // No flashing
        // ==================================

        let entryOffset = 0;

        if (earthLoaded && !reducedMotion) {

            const elapsed = now - entryStart;

            const progress = clamp(
                elapsed / 1.9,
                0,
                1
            );

            entryOffset =
                -6.5 * Math.pow(1 - progress, 3);
        }


        worldGroup.position.set(
            currentX,
            currentY + entryOffset,
            0
        );


        worldGroup.scale.setScalar(
            currentScale
        );


        // ==================================
        // SMOOTH EARTH ROTATION
        // ==================================

        if (!reducedMotion) {

            rotation +=
                delta * CONFIG.rotationSpeed;
        }


        planetGroup.rotation.y =
            CONFIG.initialRotation +
            rotation +
            currentProgress * Math.PI * 1.6;


        cloudGroup.rotation.y =
            planetGroup.rotation.y;


        // Very slow cloud movement
        if (!reducedMotion) {

            cloudGroup.rotation.y +=
                now * CONFIG.cloudSpeed;
        }


        // ==================================
        // SINGLE RENDER PASS
        // No bloom/composer flashing
        // ==================================

        renderer.render(scene, camera);
    }


    requestAnimationFrame(animate);


    // ======================================
    // RESPONSIVE RESIZING
    // ======================================

    window.addEventListener('resize', function() {

        const width = window.innerWidth;

        const height = window.innerHeight;


        camera.aspect = width / height;

        camera.updateProjectionMatrix();


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio || 1,
                1.5
            )
        );


        renderer.setSize(
            width,
            height
        );

    });

}
