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
  private cameraKeys: Set<string> = new Set(); // Track camera control keys

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
    
    console.log('Setting up camera control keyboard listeners...');
    
    window.addEventListener('keydown', (e) => {
      // Track camera control keys
      if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyR', 'KeyT'].includes(e.code)) {
        e.preventDefault();
        this.cameraKeys.add(e.code);
        
        // Handle R key (reset camera) immediately
        if (e.code === 'KeyR') {
          gameState.resetCameraToPlayer();
          console.log('Camera: Reset to player');
        }
        
        // Handle T key (test path) immediately
        if (e.code === 'KeyT') {
          gameState.setHardcodedTestPath();
          console.log('Player: Starting hardcoded test path');
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      // Remove camera control keys when released
      if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyR', 'KeyT'].includes(e.code)) {
        e.preventDefault();
        this.cameraKeys.delete(e.code);
      }
    });

    console.log('Camera control keyboard listeners set up successfully');
  }

  // Public method to update player movement (called from main game loop)
  update(deltaTime: number) {
    if (!deltaTime || !this.isInitialized) {
      return;
    }
    this.handlePhysicsMovement(deltaTime);
  }

  private handlePhysicsMovement(deltaTime: number) {
    if (!deltaTime) return;
    
    // DISABLED: Manual physics movement removed - player movement is now algorithm-controlled only
    // The player position is now updated exclusively by the path following system in gameState
    
    // Only handle animation updates based on path following state
    this.handleInput();
  }

  private handleInput() {
    // DISABLED: Manual player controls removed - only algorithmic movement allowed
    // Player movement is now controlled entirely by path following algorithms
    
    // Handle camera movement based on held keys
    this.handleCameraMovement();
    
    // Check if player is following a path (algorithmic movement)
    const state = gameState.getState();
    if (state.isPlayerFollowingPath && state.playerPath && state.playerPath.length > 0) {
      // Player is moving via algorithm - update animation to show movement
      gameState.updatePlayerAnimation(true, 'right'); // Default direction for algorithmic movement
    } else {
      // Player is stationary
      gameState.updatePlayerAnimation(false);
    }
  }

  private handleCameraMovement() {
    if (this.cameraKeys.size === 0) return;
    
    const cameraSpeed = 0.2; // tiles per frame (smooth movement)
    let deltaX = 0;
    let deltaY = 0;
    
    // Calculate movement based on held keys
    if (this.cameraKeys.has('KeyA') || this.cameraKeys.has('ArrowLeft')) {
      deltaX -= cameraSpeed;
    }
    if (this.cameraKeys.has('KeyD') || this.cameraKeys.has('ArrowRight')) {
      deltaX += cameraSpeed;
    }
    if (this.cameraKeys.has('KeyW') || this.cameraKeys.has('ArrowUp')) {
      deltaY -= cameraSpeed;
    }
    if (this.cameraKeys.has('KeyS') || this.cameraKeys.has('ArrowDown')) {
      deltaY += cameraSpeed;
    }
    
    // Apply camera movement if there's any movement
    if (deltaX !== 0 || deltaY !== 0) {
      gameState.moveCamera(deltaX, deltaY);
    }
  }







  destroy() {
    // Cleanup if needed
  }
}

export const playerController = new PlayerController();
