export enum Tool {
  SELECT = 'select',
  BULLDOZER = 'bulldozer',
  ROAD = 'road',
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  PARK = 'park',
  POWER = 'power'
}

export enum TileType {
  GRASS = 'grass',
  ROAD = 'road',
  MAIN_ROAD = 'main_road',
  HIGHWAY = 'highway',
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  PARK = 'park',
  POWER_LINE = 'power_line',
  WATER = 'water'
}

export interface Position {
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
}

export interface Tile {
  type: TileType;
  x: number;
  y: number;
}

export interface GameState {
  selectedTool: Tool;
  mapData: Map<string, Tile>;
  playerPosition: Position;
  cameraPosition: { x: number; y: number };
  gridSize: number;
  tileSize: number;
}

class GameStateManager {
  private state: GameState = {
    selectedTool: Tool.SELECT,
    mapData: new Map(),
    playerPosition: { x: 5, y: 5, pixelX: 160, pixelY: 160 }, // Start at center of a 10x10 grid
    cameraPosition: { x: 0, y: 0 }, // Will be updated when window is available
    gridSize: 32,
    tileSize: 32
  };

  private listeners: Array<(state: GameState) => void> = [];

  getState(): GameState {
    return { ...this.state };
  }

  setTool(tool: Tool) {
    this.state.selectedTool = tool;
    this.notifyListeners();
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
      pixelY: pixelY ?? this.state.playerPosition.pixelY 
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
      pixelY 
    };
    this.notifyListeners();
  }

  setCameraPosition(x: number, y: number) {
    this.state.cameraPosition = { x, y };
    this.notifyListeners();
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    // If no tile exists, treat as grass (walkable)
    return !tile || tile.type === TileType.GRASS || tile.type === TileType.ROAD || tile.type === TileType.PARK;
  }

  // Initialize the map with grass terrain
  initializeGrassTerrain(width: number, height: number) {
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        this.placeTile(x, y, TileType.GRASS);
      }
    }
  }

  // Ensure grass terrain exists around a position
  ensureGrassAround(centerX: number, centerY: number, radius: number = 10) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        if (!this.getTile(x, y)) {
          this.placeTile(x, y, TileType.GRASS);
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
