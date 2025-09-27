export enum Tool {
  SELECT = 'select',
  BULLDOZER = 'bulldozer',
  CORRIDOR = 'corridor',
  LIVING_QUARTERS = 'living_quarters',
  RESEARCH_LAB = 'research_lab',
  ENGINEERING_BAY = 'engineering_bay',
  RECREATION = 'recreation',
  POWER = 'power'
}

export enum TileType {
  SPACE = 'space',
  CORRIDOR = 'corridor',
  MAIN_CORRIDOR = 'main_corridor',
  HIGHWAY = 'highway',
  LIVING_QUARTERS = 'living_quarters',
  RESEARCH_LAB = 'research_lab',
  ENGINEERING_BAY = 'engineering_bay',
  RECREATION = 'recreation',
  POWER_LINE = 'power_line',
  WATER = 'water'
}

export interface Position {
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  isMoving: boolean;
  animationFrame: number;
  direction: 'left' | 'right' | 'up' | 'down';
}

export interface Tile {
  type: TileType;
  x: number;
  y: number;
}

export enum CrewmateType {
  CREW = 'crew',
  SCIENTIST = 'scientist',
  ENGINEER = 'engineer',
  CAPTAIN = 'captain'
}

export enum CrewmateActivity {
  WALKING = 'walking',
  WORKING = 'working',
  RESTING = 'resting',
  EATING = 'eating',
  RESEARCHING = 'researching',
  MAINTAINING = 'maintaining'
}

export interface Crewmate {
  id: string;
  type: CrewmateType;
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  activity: CrewmateActivity;
  speed: number;
  direction: 'north' | 'south' | 'east' | 'west';
  animationFrame: number;
  lastMoveTime: number;
  homeX: number;
  homeY: number;
  workX: number;
  workY: number;
}

export interface GameState {
  selectedTool: Tool;
  mapData: Map<string, Tile>;
  playerPosition: Position;
  cameraPosition: { x: number; y: number };
  gridSize: number;
  tileSize: number;
  crewmates: Map<string, Crewmate>;
  lastCrewmateUpdate: number;
}

class GameStateManager {
  private state: GameState = {
    selectedTool: Tool.SELECT,
    mapData: new Map(),
    playerPosition: { x: 5, y: 5, pixelX: 320, pixelY: 320, isMoving: false, animationFrame: 0, direction: 'right' }, // Start at center of a 10x10 grid
    cameraPosition: { x: 0, y: 0 }, // Will be updated when window is available
    gridSize: 64,
    tileSize: 64,
    crewmates: new Map(),
    lastCrewmateUpdate: 0
  };

  private listeners: Array<(state: GameState) => void> = [];

  getState(): GameState {
    return { ...this.state };
  }

  // Crewmate management methods
  addCrewmate(crewmate: Crewmate): void {
    this.state.crewmates.set(crewmate.id, crewmate);
    this.notifyListeners();
  }

  removeCrewmate(id: string): void {
    this.state.crewmates.delete(id);
    this.notifyListeners();
  }

  updateCrewmate(id: string, updates: Partial<Crewmate>): void {
    const crewmate = this.state.crewmates.get(id);
    if (crewmate) {
      this.state.crewmates.set(id, { ...crewmate, ...updates });
      this.notifyListeners();
    }
  }

  getCrewmates(): Map<string, Crewmate> {
    return new Map(this.state.crewmates);
  }

  spawnRandomCrewmate(): Crewmate {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];
    const types = [CrewmateType.CREW, CrewmateType.SCIENTIST, CrewmateType.ENGINEER, CrewmateType.CAPTAIN];
    
    const id = `crewmate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const type = types[Math.floor(Math.random() * types.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Find a random living quarters tile for home
    let homeX = 0, homeY = 0;
    for (const [key, tile] of Array.from(this.state.mapData.entries())) {
      if (tile.type === TileType.LIVING_QUARTERS) {
        homeX = tile.x;
        homeY = tile.y;
        break;
      }
    }
    
    // Find a random work location based on type
    let workX = homeX, workY = homeY;
    for (const [key, tile] of Array.from(this.state.mapData.entries())) {
      if ((type === CrewmateType.SCIENTIST && tile.type === TileType.RESEARCH_LAB) ||
          (type === CrewmateType.ENGINEER && tile.type === TileType.ENGINEERING_BAY) ||
          (type === CrewmateType.CREW && tile.type === TileType.RECREATION)) {
        workX = tile.x;
        workY = tile.y;
        break;
      }
    }
    
    const crewmate: Crewmate = {
      id,
      type,
      color,
      x: homeX,
      y: homeY,
      targetX: workX,
      targetY: workY,
      activity: CrewmateActivity.WALKING,
      speed: 0.5 + Math.random() * 0.5, // Random speed between 0.5 and 1.0
      direction: 'east',
      animationFrame: 0,
      lastMoveTime: Date.now(),
      homeX,
      homeY,
      workX,
      workY
    };
    
    this.addCrewmate(crewmate);
    return crewmate;
  }

  setTool(tool: Tool) {
    this.state.selectedTool = tool;
    this.notifyListeners();
  }

  // Crewmate AI and movement
  updateCrewmates(): void {
    const now = Date.now();
    const deltaTime = now - this.state.lastCrewmateUpdate;
    this.state.lastCrewmateUpdate = now;

    for (const [id, crewmate] of Array.from(this.state.crewmates.entries())) {
      this.updateCrewmateAI(crewmate, deltaTime);
    }
    
    this.notifyListeners();
  }

  private updateCrewmateAI(crewmate: Crewmate, deltaTime: number): void {
    const currentTile = this.state.mapData.get(`${crewmate.x},${crewmate.y}`);
    
    // Update animation frame
    crewmate.animationFrame = (crewmate.animationFrame + 1) % 8;
    
    // Simple pathfinding - move towards target
    const dx = crewmate.targetX - crewmate.x;
    const dy = crewmate.targetY - crewmate.y;
    
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
      // Reached target, choose new activity
      this.chooseNewActivity(crewmate);
    } else {
      // Move towards target
      const moveSpeed = crewmate.speed * (deltaTime / 1000);
      
      if (Math.abs(dx) > Math.abs(dy)) {
        // Move horizontally
        crewmate.x += dx > 0 ? moveSpeed : -moveSpeed;
        crewmate.direction = dx > 0 ? 'east' : 'west';
      } else {
        // Move vertically
        crewmate.y += dy > 0 ? moveSpeed : -moveSpeed;
        crewmate.direction = dy > 0 ? 'south' : 'north';
      }
      
      // Snap to grid when close
      if (Math.abs(crewmate.x - Math.round(crewmate.x)) < 0.1) {
        crewmate.x = Math.round(crewmate.x);
      }
      if (Math.abs(crewmate.y - Math.round(crewmate.y)) < 0.1) {
        crewmate.y = Math.round(crewmate.y);
      }
    }
    
    this.state.crewmates.set(crewmate.id, crewmate);
  }

  private chooseNewActivity(crewmate: Crewmate): void {
    const currentTile = this.state.mapData.get(`${Math.round(crewmate.x)},${Math.round(crewmate.y)}`);
    
    if (currentTile) {
      switch (currentTile.type) {
        case TileType.LIVING_QUARTERS:
          crewmate.activity = CrewmateActivity.RESTING;
          // After resting, go to work
          setTimeout(() => {
            crewmate.targetX = crewmate.workX;
            crewmate.targetY = crewmate.workY;
            crewmate.activity = CrewmateActivity.WALKING;
          }, 3000 + Math.random() * 5000);
          break;
          
        case TileType.RESEARCH_LAB:
          if (crewmate.type === CrewmateType.SCIENTIST) {
            crewmate.activity = CrewmateActivity.RESEARCHING;
            // After researching, go home
            setTimeout(() => {
              crewmate.targetX = crewmate.homeX;
              crewmate.targetY = crewmate.homeY;
              crewmate.activity = CrewmateActivity.WALKING;
            }, 5000 + Math.random() * 8000);
          } else {
            // Go to recreation
            this.findNearestTile(crewmate, TileType.RECREATION);
          }
          break;
          
        case TileType.ENGINEERING_BAY:
          if (crewmate.type === CrewmateType.ENGINEER) {
            crewmate.activity = CrewmateActivity.MAINTAINING;
            // After maintaining, go home
            setTimeout(() => {
              crewmate.targetX = crewmate.homeX;
              crewmate.targetY = crewmate.homeY;
              crewmate.activity = CrewmateActivity.WALKING;
            }, 4000 + Math.random() * 6000);
          } else {
            // Go to recreation
            this.findNearestTile(crewmate, TileType.RECREATION);
          }
          break;
          
        case TileType.RECREATION:
          crewmate.activity = CrewmateActivity.EATING;
          // After eating, go to work
          setTimeout(() => {
            crewmate.targetX = crewmate.workX;
            crewmate.targetY = crewmate.workY;
            crewmate.activity = CrewmateActivity.WALKING;
          }, 2000 + Math.random() * 4000);
          break;
          
        default:
          // Random walk
          this.findRandomCorridor(crewmate);
      }
    } else {
      // In space, find nearest corridor
      this.findNearestTile(crewmate, TileType.CORRIDOR);
    }
  }

  private findNearestTile(crewmate: Crewmate, tileType: TileType): void {
    let nearestDistance = Infinity;
    let nearestX = crewmate.x;
    let nearestY = crewmate.y;
    
    for (const [key, tile] of Array.from(this.state.mapData.entries())) {
      if (tile.type === tileType) {
        const distance = Math.abs(tile.x - crewmate.x) + Math.abs(tile.y - crewmate.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestX = tile.x;
          nearestY = tile.y;
        }
      }
    }
    
    crewmate.targetX = nearestX;
    crewmate.targetY = nearestY;
    crewmate.activity = CrewmateActivity.WALKING;
  }

  private findRandomCorridor(crewmate: Crewmate): void {
    const corridors: Array<{x: number, y: number}> = [];
    
    for (const [key, tile] of Array.from(this.state.mapData.entries())) {
      if (tile.type === TileType.CORRIDOR || tile.type === TileType.MAIN_CORRIDOR) {
        corridors.push({ x: tile.x, y: tile.y });
      }
    }
    
    if (corridors.length > 0) {
      const randomCorridor = corridors[Math.floor(Math.random() * corridors.length)];
      crewmate.targetX = randomCorridor.x;
      crewmate.targetY = randomCorridor.y;
      crewmate.activity = CrewmateActivity.WALKING;
    }
  }

  placeTile(x: number, y: number, type: TileType) {
    const key = `${x},${y}`;
    this.state.mapData.set(key, { type, x, y });
    this.notifyListeners();
  }

  deleteTile(x: number, y: number) {
    const key = `${x},${y}`;
    this.state.mapData.delete(key);
    this.notifyListeners();
  }

  getTile(x: number, y: number): Tile | undefined {
    const key = `${x},${y}`;
    return this.state.mapData.get(key);
  }

  setPlayerPosition(x: number, y: number, pixelX?: number, pixelY?: number) {
    this.state.playerPosition = { 
      x, 
      y, 
      pixelX: pixelX ?? this.state.playerPosition.pixelX, 
      pixelY: pixelY ?? this.state.playerPosition.pixelY,
      isMoving: this.state.playerPosition.isMoving,
      animationFrame: this.state.playerPosition.animationFrame,
      direction: this.state.playerPosition.direction
    };
    this.notifyListeners();
  }

  setPlayerPixelPosition(pixelX: number, pixelY: number) {
    const tileSize = this.state.tileSize;
    const tileX = Math.floor(pixelX / tileSize);
    const tileY = Math.floor(pixelY / tileSize);
    
    this.state.playerPosition = { 
      x: tileX, 
      y: tileY, 
      pixelX, 
      pixelY,
      isMoving: this.state.playerPosition.isMoving,
      animationFrame: this.state.playerPosition.animationFrame,
      direction: this.state.playerPosition.direction
    };
    this.notifyListeners();
  }

  setCameraPosition(x: number, y: number) {
    this.state.cameraPosition = { x, y };
    this.notifyListeners();
  }

  updatePlayerAnimation(isMoving: boolean, direction?: 'left' | 'right' | 'up' | 'down') {
    if (isMoving) {
      this.state.playerPosition.animationFrame = (this.state.playerPosition.animationFrame + 1) % 8;
    }
    this.state.playerPosition.isMoving = isMoving;
    if (direction) {
      this.state.playerPosition.direction = direction;
    }
    this.notifyListeners();
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    // If no tile exists, treat as grass (walkable)
    return !tile || tile.type === TileType.SPACE || tile.type === TileType.CORRIDOR || tile.type === TileType.RECREATION;
  }

  // Initialize the map with space terrain
  initializeSpaceTerrain(width: number, height: number) {
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        this.placeTile(x, y, TileType.SPACE);
      }
    }
  }

  // Ensure space terrain exists around a position
  ensureSpaceAround(centerX: number, centerY: number, radius: number = 10) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        if (!this.getTile(x, y)) {
          this.placeTile(x, y, TileType.SPACE);
        }
      }
    }
  }

  loadMapData(mapData: Array<[string, Tile]>) {
    this.state.mapData = new Map(mapData);
    this.notifyListeners();
  }

  getMapDataArray(): Array<[string, Tile]> {
    return Array.from(this.state.mapData.entries());
  }

  clearMap() {
    this.state.mapData.clear();
    this.notifyListeners();
  }

  initializeCamera() {
    if (typeof window !== 'undefined') {
      const playerPixelX = this.state.playerPosition.pixelX;
      const playerPixelY = this.state.playerPosition.pixelY;
      
      // Center camera on player's exact pixel position
      const cameraX = -playerPixelX + (window.innerWidth / 2) - 16; // 16 is half player size
      const cameraY = -playerPixelY + (window.innerHeight / 2) - 16;
      
      this.state.cameraPosition = { x: cameraX, y: cameraY };
      this.notifyListeners();
    }
  }

  subscribe(listener: (state: GameState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()));
  }
}

export const gameState = new GameStateManager();
