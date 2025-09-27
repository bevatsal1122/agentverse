import { gameState, Position } from './state';
// Collision system temporarily disabled for new city map

const X_VELOCITY = 200;
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

    // Start game loop
    this.gameLoop();
  }

  private gameLoop() {
    if (typeof window === 'undefined') return;
    const currentTime = performance.now();
    const deltaTime = this.lastTime ? (currentTime - this.lastTime) / 1000 : 0;
    this.lastTime = currentTime;
    
    this.handlePhysicsMovement(deltaTime);
    requestAnimationFrame(() => this.gameLoop());
  }

  private handlePhysicsMovement(deltaTime: number) {
    if (!deltaTime) return;
    
    const state = gameState.getState();
    const currentPos = state.playerPosition;
    
    // Handle input
    this.handleInput();
    
    // Simple direct movement (no physics for city map)
    const newPixelX = currentPos.pixelX + this.velocity.x * deltaTime;
    const newPixelY = currentPos.pixelY + this.velocity.y * deltaTime;
    gameState.setPlayerPixelPosition(newPixelX, newPixelY);
    
    // Update camera
    this.updateCamera(newPixelX, newPixelY);
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
