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
    console.log('PlayerController.initialize() called, window available:', typeof window !== 'undefined');
    if (this.isInitialized || typeof window === 'undefined') {
      console.log('PlayerController initialization skipped:', { 
        isInitialized: this.isInitialized, 
        windowAvailable: typeof window !== 'undefined' 
      });
      return;
    }
    console.log('PlayerController initializing...');
    this.isInitialized = true;
    this.setupCollisionSystem();
    this.setupKeyboardListeners();
    console.log('PlayerController initialized successfully');
  }

  private setupCollisionSystem() {
    // Collision system disabled for new city map
  }

  private setupKeyboardListeners() {
    if (typeof window === 'undefined') {
      console.log('Cannot setup keyboard listeners - window not available');
      return;
    }
    
    console.log('Setting up keyboard listeners...');
    
    window.addEventListener('keydown', (e) => {
      console.log('Key down:', e.code);
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      console.log('Key up:', e.code);
      this.keys.delete(e.code);
    });

    console.log('Keyboard listeners set up successfully');
    // Don't start separate game loop - let main game loop handle updates
  }

  // Public method to update player movement (called from main game loop)
  update(deltaTime: number) {
    if (!deltaTime || !this.isInitialized) {
      console.log('Player update skipped:', { deltaTime, isInitialized: this.isInitialized });
      return;
    }
    console.log('Player update called with deltaTime:', deltaTime);
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
      
      // Apply map boundary constraints using actual map dimensions
      const state = gameState.getState();
      const tileSize = state.tileSize;
      const mapWidth = state.mapWidth;
      const mapHeight = state.mapHeight;
      const maxPixelX = (mapWidth - 1) * tileSize;
      const maxPixelY = (mapHeight - 1) * tileSize;
      
      // TEMPORARILY DISABLE BOUNDARY CONSTRAINTS FOR TESTING
      const constrainedPixelX = newPixelX;
      const constrainedPixelY = newPixelY;
      
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

    // Debug: log active keys
    if (this.keys.size > 0) {
      console.log('Active keys:', Array.from(this.keys));
    }

    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      console.log('Moving right');
      this.velocity.x = X_VELOCITY;
      isMoving = true;
      direction = 'right';
    } else if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      console.log('Moving left');
      this.velocity.x = -X_VELOCITY;
      isMoving = true;
      direction = 'left';
    }

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      console.log('Moving up');
      this.velocity.y = -X_VELOCITY;
      isMoving = true;
      direction = 'up';
    } else if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      console.log('Moving down');
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
