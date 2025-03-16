import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Game } from './game.js';
import { Car } from './car.js';
import { City } from './city.js';
import { InputHandler } from './input.js';

// Initialize the game when the window loads
window.addEventListener('load', () => {
    const game = new Game();
    game.init();
    game.start();
}); 