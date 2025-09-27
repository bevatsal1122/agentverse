import { TileType, GameState } from './state';

export interface PathNode {
  x: number;
  y: number;
  g: number; // Distance from start
  h: number; // Heuristic distance to goal
  f: number; // Total cost (g + h)
  parent?: PathNode;
}

export interface Path {
  nodes: Array<{x: number, y: number}>;
  length: number;
}

export class Pathfinder {
  private gameState: GameState;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  /**
   * Check if a tile is walkable (road/corridor only for building visits)
   */
  private isWalkable(x: number, y: number, allowBuildings: boolean = false): boolean {
    // Check map boundaries first using actual map dimensions
    const mapWidth = this.gameState.mapWidth;
    const mapHeight = this.gameState.mapHeight;
    if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) {
      return false; // Outside map boundaries
    }
    
    const tile = this.gameState.mapData.get(`${x},${y}`);
    
    if (!tile) {
      return false; // No tile exists
    }

    // Always allow corridors (roads) and space tiles for movement
    if (tile.type === TileType.CORRIDOR || tile.type === TileType.SPACE) {
      return true;
    }

    // Allow buildings only if specified (for start/end points)
    if (allowBuildings) {
      return tile.type === TileType.LIVING_QUARTERS ||
             tile.type === TileType.RESEARCH_LAB ||
             tile.type === TileType.ENGINEERING_BAY ||
             tile.type === TileType.RECREATION;
    }

    return false;
  }

  /**
   * Find the nearest road tile to a given position
   */
  private findNearestRoad(x: number, y: number): {x: number, y: number} | null {
    const maxSearchRadius = 10;
    
    for (let radius = 1; radius <= maxSearchRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check the perimeter of the current radius
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          
          const checkX = x + dx;
          const checkY = y + dy;
          
          // Skip if outside map boundaries
          const mapWidth = this.gameState.mapWidth;
          const mapHeight = this.gameState.mapHeight;
          if (checkX < 0 || checkX >= mapWidth || checkY < 0 || checkY >= mapHeight) continue;
          
          if (this.isWalkable(checkX, checkY)) {
            return { x: checkX, y: checkY };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Calculate Manhattan distance heuristic
   */
  private heuristic(a: {x: number, y: number}, b: {x: number, y: number}): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * Get neighboring walkable tiles
   */
  private getNeighbors(node: PathNode): Array<{x: number, y: number}> {
    const neighbors: Array<{x: number, y: number}> = [];
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: 0 },  // East
      { x: 0, y: 1 },  // South
      { x: -1, y: 0 }  // West
    ];

    for (const dir of directions) {
      const newX = node.x + dir.x;
      const newY = node.y + dir.y;
      
      if (this.isWalkable(newX, newY)) {
        neighbors.push({ x: newX, y: newY });
      }
    }

    return neighbors;
  }

  /**
   * Reconstruct path from goal node back to start
   */
  private reconstructPath(node: PathNode): Path {
    const path: Array<{x: number, y: number}> = [];
    let current: PathNode | undefined = node;
    
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    
    return {
      nodes: path,
      length: path.length
    };
  }

  /**
   * Find path from start to goal using A* algorithm, only via roads
   */
  public findPath(startX: number, startY: number, goalX: number, goalY: number): Path | null {
    // Find nearest roads to start and goal positions
    const startRoad = this.findNearestRoad(startX, startY);
    const goalRoad = this.findNearestRoad(goalX, goalY);
    
    if (!startRoad || !goalRoad) {
      console.log('Could not find road access for pathfinding');
      return null;
    }

    // A* algorithm implementation
    const openList: PathNode[] = [];
    const closedList: Set<string> = new Set();
    
    const startNode: PathNode = {
      x: startRoad.x,
      y: startRoad.y,
      g: 0,
      h: this.heuristic(startRoad, goalRoad),
      f: 0
    };
    startNode.f = startNode.g + startNode.h;
    
    openList.push(startNode);
    
    while (openList.length > 0) {
      // Find node with lowest f score
      let currentIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[currentIndex].f) {
          currentIndex = i;
        }
      }
      
      const current = openList.splice(currentIndex, 1)[0];
      const currentKey = `${current.x},${current.y}`;
      closedList.add(currentKey);
      
      // Check if we reached the goal
      if (current.x === goalRoad.x && current.y === goalRoad.y) {
        const path = this.reconstructPath(current);
        
        // Add the original start and goal positions if they're different
        if (startX !== startRoad.x || startY !== startRoad.y) {
          path.nodes.unshift({ x: startX, y: startY });
        }
        if (goalX !== goalRoad.x || goalY !== goalRoad.y) {
          path.nodes.push({ x: goalX, y: goalY });
        }
        
        return path;
      }
      
      // Check all neighbors
      const neighbors = this.getNeighbors(current);
      
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        
        if (closedList.has(neighborKey)) {
          continue;
        }
        
        const g = current.g + 1;
        const h = this.heuristic(neighbor, goalRoad);
        const f = g + h;
        
        // Check if this neighbor is already in open list with better score
        const existingIndex = openList.findIndex(n => n.x === neighbor.x && n.y === neighbor.y);
        
        if (existingIndex === -1) {
          // Add new node to open list
          openList.push({
            x: neighbor.x,
            y: neighbor.y,
            g,
            h,
            f,
            parent: current
          });
        } else if (g < openList[existingIndex].g) {
          // Update existing node with better path
          openList[existingIndex].g = g;
          openList[existingIndex].f = f;
          openList[existingIndex].parent = current;
        }
      }
    }
    
    // No path found
    return null;
  }

  /**
   * Find path to a specific building type
   */
  public findPathToBuilding(startX: number, startY: number, buildingType: TileType): Path | null {
    // Find all buildings of the specified type
    const buildings: Array<{x: number, y: number}> = [];
    
    for (const [key, tile] of Array.from(this.gameState.mapData.entries())) {
      if (tile.type === buildingType) {
        buildings.push({ x: tile.x, y: tile.y });
      }
    }
    
    if (buildings.length === 0) {
      return null;
    }
    
    // Find the closest building by Manhattan distance
    let closestBuilding = buildings[0];
    let shortestDistance = this.heuristic({ x: startX, y: startY }, closestBuilding);
    
    for (const building of buildings) {
      const distance = this.heuristic({ x: startX, y: startY }, building);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        closestBuilding = building;
      }
    }
    
    return this.findPath(startX, startY, closestBuilding.x, closestBuilding.y);
  }

  /**
   * Find path to a random building of a specific type
   */
  public findPathToRandomBuilding(startX: number, startY: number, buildingType: TileType): Path | null {
    // Find all buildings of the specified type
    const buildings: Array<{x: number, y: number}> = [];
    
    for (const [key, tile] of Array.from(this.gameState.mapData.entries())) {
      if (tile.type === buildingType) {
        buildings.push({ x: tile.x, y: tile.y });
      }
    }
    
    if (buildings.length === 0) {
      return null;
    }
    
    // Pick a random building
    const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
    
    return this.findPath(startX, startY, randomBuilding.x, randomBuilding.y);
  }
}
