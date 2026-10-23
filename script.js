
import Lenis from 'https://unpkg.com/lenis@1.3.23/dist/lenis.mjs';

import { startPlanet } from './planet.js';


// Check reduced motion preference
const reduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
).matches;


// Update footer year
const year = document.getElementById('year');

if (year) {
    year.textContent = new Date().getFullYear();
}


// Show website content
const revealItems = document.querySelectorAll('[data-reveal]');

// Show everything without fading or blinking
revealItems.forEach(function(item) {
    item.classList.add('in');
});


// Smooth scrolling
if (!reduced) {

    const lenis = new Lenis({
        duration: 1.15,
        smoothWheel: true,
        touchMultiplier: 1.5
    });

    function scrollFrame(time) {
        lenis.raf(time);
        requestAnimationFrame(scrollFrame);
    }

    requestAnimationFrame(scrollFrame);
}


// Start the Three.js Earth
startPlanet({
    reducedMotion: reduced
});
