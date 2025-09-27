import { gameState, Position } from './state';
// Collision system temporarily disabled for new city map

const X_VELOCITY = 300; // Increased for smoother movement
const JUMP_POWER = 250;
const GRAVITY = 580;

export class PlayerController {
  private keys: Set<string> = new Set();
  private moveSpeed = 8; // pixels per frame
  private isInitialized = false;
  private velocity = { x: 0, y: 0 };
  private isOnGround = false;
  // Collision system disabled
  private lastTime = 0;

  constructor() {
    // Don't initialize immediately - wait for client-side
  }

  initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;
    this.setupCollisionSystem();
    this.setupKeyboardListeners();
  }

  private setupCollisionSystem() {
    // Collision system disabled for new city map
  }

  private setupKeyboardListeners() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Don't start separate game loop - let main game loop handle updates
  }

  // Public method to update player movement (called from main game loop)
  update(deltaTime: number) {
    if (!deltaTime || !this.isInitialized) return;
    this.handlePhysicsMovement(deltaTime);
  }

  private handlePhysicsMovement(deltaTime: number) {
    if (!deltaTime) return;
    
    const state = gameState.getState();
    const currentPos = state.playerPosition;
    
    // Handle input
    this.handleInput();
    
    // Only update position if there's actual movement
    if (this.velocity.x !== 0 || this.velocity.y !== 0) {
      // Simple direct movement (no physics for city map)
      const newPixelX = currentPos.pixelX + this.velocity.x * deltaTime;
      const newPixelY = currentPos.pixelY + this.velocity.y * deltaTime;
      
      // Apply map boundary constraints (25x25 grid, 32px tiles)
      const tileSize = 32;
      const mapWidth = 25;
      const mapHeight = 25;
      const maxPixelX = (mapWidth - 1) * tileSize;
      const maxPixelY = (mapHeight - 1) * tileSize;
      
      const constrainedPixelX = Math.max(0, Math.min(maxPixelX, newPixelX));
      const constrainedPixelY = Math.max(0, Math.min(maxPixelY, newPixelY));
      
      // Only update state if position actually changed (reduces unnecessary updates)
      if (Math.abs(constrainedPixelX - currentPos.pixelX) > 0.5 || Math.abs(constrainedPixelY - currentPos.pixelY) > 0.5) {
        gameState.setPlayerPixelPosition(constrainedPixelX, constrainedPixelY);
      }
    }
  }

  private handleInput() {
    this.velocity.x = 0;
    this.velocity.y = 0;
    let isMoving = false;
    let direction: 'left' | 'right' | 'up' | 'down' | undefined;

    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      this.velocity.x = X_VELOCITY;
      isMoving = true;
      direction = 'right';
    } else if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      this.velocity.x = -X_VELOCITY;
      isMoving = true;
      direction = 'left';
    }

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      this.velocity.y = -X_VELOCITY;
      isMoving = true;
      direction = 'up';
    } else if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      this.velocity.y = X_VELOCITY;
      isMoving = true;
      direction = 'down';
    }

    // Update player animation
    gameState.updatePlayerAnimation(isMoving, direction);
  }







  destroy() {
    // Cleanup if needed
  }
}

export const playerController = new PlayerController();
