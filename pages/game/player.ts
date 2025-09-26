import { gameState, Position } from './state';

export class PlayerController {
  private keys: Set<string> = new Set();
  private moveSpeed = 8; // pixels per frame
  private isInitialized = false;

  constructor() {
    // Don't initialize immediately - wait for client-side
  }

  initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;
    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Start game loop
    this.gameLoop();
  }

  private gameLoop() {
    if (typeof window === 'undefined') return;
    this.handleMovement();
    requestAnimationFrame(() => this.gameLoop());
  }

  private handleMovement() {
    const state = gameState.getState();
    const currentPos = state.playerPosition;
    const tileSize = state.tileSize;
    
    let newPixelX = currentPos.pixelX;
    let newPixelY = currentPos.pixelY;
    let hasMoved = false;

    // Check movement keys and move pixel by pixel
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      newPixelY -= this.moveSpeed;
      hasMoved = true;
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      newPixelY += this.moveSpeed;
      hasMoved = true;
    }
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      newPixelX -= this.moveSpeed;
      hasMoved = true;
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      newPixelX += this.moveSpeed;
      hasMoved = true;
    }

    // Only update position if there was movement
    if (hasMoved) {
      // Only ensure grass occasionally to reduce performance impact
      if (Math.abs(newPixelX - currentPos.pixelX) > 32 || Math.abs(newPixelY - currentPos.pixelY) > 32) {
        const newTileX = Math.floor(newPixelX / tileSize);
        const newTileY = Math.floor(newPixelY / tileSize);
        gameState.ensureGrassAround(newTileX, newTileY, 10);
      }
      
      gameState.setPlayerPixelPosition(newPixelX, newPixelY);
      this.updateCamera(newPixelX, newPixelY);
    }
  }


  private updateCamera(playerPixelX: number, playerPixelY: number) {
    if (typeof window === 'undefined') return;
    
    const state = gameState.getState();
    
    // Center camera on player's exact pixel position
    const cameraX = -playerPixelX + (window.innerWidth / 2) - 16; // 16 is half player size
    const cameraY = -playerPixelY + (window.innerHeight / 2) - 16;
    
    gameState.setCameraPosition(cameraX, cameraY);
  }

  destroy() {
    // Cleanup if needed
  }
}

export const playerController = new PlayerController();
