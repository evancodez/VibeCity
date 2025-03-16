export class InputHandler {
    constructor() {
        this.keys = {};
        
        // Set up event listeners
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }
    
    onKeyDown(e) {
        // Prevent default actions for arrow keys to avoid page scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
        
        this.keys[e.key] = true;
    }
    
    onKeyUp(e) {
        this.keys[e.key] = false;
    }
    
    isKeyDown(key) {
        return this.keys[key] === true;
    }
    
    // For multiple key checks (e.g., if any directional key is pressed)
    isAnyKeyDown(keyArray) {
        return keyArray.some(key => this.isKeyDown(key));
    }
    
    // Get direction as vector (useful for movement calculations)
    getDirectionalInput() {
        let x = 0;
        let z = 0;
        
        if (this.isKeyDown('ArrowUp') || this.isKeyDown('w')) z = 1;
        if (this.isKeyDown('ArrowDown') || this.isKeyDown('s')) z = -1;
        if (this.isKeyDown('ArrowLeft') || this.isKeyDown('a')) x = -1;
        if (this.isKeyDown('ArrowRight') || this.isKeyDown('d')) x = 1;
        
        return { x, z };
    }
} 