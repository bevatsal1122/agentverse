import { TileType } from '../game/state';

export interface MapConfig {
  name: string;
  width: number;
  height: number;
  tiles: string[][];
}

// Helper function to create a realistic city layout
function createCityMap(): string[][] {
  const width = 25;
  const height = 25;
  const map: string[][] = Array.from({ length: height }, () => Array(width).fill('space'));
  
  // Create major road grid - all using single corridor type
  for (let x = 0; x < width; x++) {
    map[6][x] = 'corridor';   // North main road
    map[12][x] = 'corridor';  // Central main road
    map[18][x] = 'corridor';  // South main road
  }
  
  for (let y = 0; y < height; y++) {
    map[y][8] = 'corridor';   // West main road
    map[y][16] = 'corridor';  // East main road
  }
  
  // Local street grid
  for (let x = 3; x < width; x += 5) {
    for (let y = 0; y < height; y++) {
      if (map[y][x] === 'space') {
        map[y][x] = 'corridor';
      }
    }
  }
  
  for (let y = 3; y < height; y += 4) {
    for (let x = 0; x < width; x++) {
      if (map[y][x] === 'space') {
        map[y][x] = 'corridor';
      }
    }
  }
  
  // Residential areas (deterministic patterns)
  // North residential
  for (let y = 1; y < 6; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (map[y][x] === 'space') {
        if ((x + y) % 3 < 2) {
          map[y][x] = 'living_quarters';
        } else if ((x + y) % 8 === 0) {
          map[y][x] = 'recreation';
        }
      }
    }
  }
  
  // South residential
  for (let y = 13; y < 18; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (map[y][x] === 'space') {
        if ((x + y) % 3 < 2) {
          map[y][x] = 'living_quarters';
        } else if ((x + y) % 7 === 0) {
          map[y][x] = 'recreation';
        }
      }
    }
  }
  
  // Downtown commercial district
  for (let y = 7; y < 12; y++) {
    for (let x = 9; x < 16; x++) {
      if (map[y][x] === 'space') {
        if ((x + y) % 3 < 2) {
          map[y][x] = 'research_lab';
        }
      }
    }
  }
  
  // Industrial zone (west side)
  for (let y = 19; y < 24; y++) {
    for (let x = 1; x < 8; x++) {
      if (map[y][x] === 'space') {
        if (x % 4 === 0) {
          map[y][x] = 'power_line';
        } else if ((x + y) % 3 < 2) {
          map[y][x] = 'engineering_bay';
        }
      }
    }
  }
  
  // Central park area
  for (let y = 9; y < 11; y++) {
    for (let x = 17; x < 22; x++) {
      if (map[y][x] === 'space') {
        map[y][x] = 'recreation';
      }
    }
  }
  
  // Smaller parks scattered around
  const parkLocations = [
    [2, 2], [22, 3], [4, 20], [20, 22], [10, 4], [18, 8]
  ];
  
  parkLocations.forEach(([px, py]) => {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        if (py + dy < height && px + dx < width && map[py + dy][px + dx] === 'space') {
          map[py + dy][px + dx] = 'recreation';
        }
      }
    }
  });
  
  // Create a scenic lake in the northeast area
  // Main lake body (irregular shape for natural look)
  const lakeTiles = [
    [19, 1], [20, 1], [21, 1], [22, 1], [23, 1],
    [18, 2], [19, 2], [20, 2], [21, 2], [22, 2], [23, 2], [24, 2],
    [17, 3], [18, 3], [19, 3], [20, 3], [21, 3], [22, 3], [23, 3], [24, 3],
    [16, 4], [17, 4], [18, 4], [19, 4], [20, 4], [21, 4], [22, 4], [23, 4],
    [15, 5], [16, 5], [17, 5], [18, 5], [19, 5], [20, 5], [21, 5], [22, 5],
    [14, 6], [15, 6], [16, 6], [17, 6], [18, 6], [19, 6], [20, 6], [21, 6],
    [13, 7], [14, 7], [15, 7], [16, 7], [17, 7], [18, 7], [19, 7], [20, 7],
    [12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8],
    [11, 9], [12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9],
    [10, 10], [11, 10], [12, 10], [13, 10], [14, 10], [15, 10], [16, 10], [17, 10],
    [9, 11], [10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11],
    [8, 12], [9, 12], [10, 12], [11, 12], [12, 12], [13, 12], [14, 12], [15, 12],
    [7, 13], [8, 13], [9, 13], [10, 13], [11, 13], [12, 13], [13, 13], [14, 13],
    [6, 14], [7, 14], [8, 14], [9, 14], [10, 14], [11, 14], [12, 14], [13, 14],
    [5, 15], [6, 15], [7, 15], [8, 15], [9, 15], [10, 15], [11, 15], [12, 15],
    [4, 16], [5, 16], [6, 16], [7, 16], [8, 16], [9, 16], [10, 16], [11, 16],
    [3, 17], [4, 17], [5, 17], [6, 17], [7, 17], [8, 17], [9, 17], [10, 17],
    [2, 18], [3, 18], [4, 18], [5, 18], [6, 18], [7, 18], [8, 18], [9, 18],
    [1, 19], [2, 19], [3, 19], [4, 19], [5, 19], [6, 19], [7, 19], [8, 19],
    [0, 20], [1, 20], [2, 20], [3, 20], [4, 20], [5, 20], [6, 20], [7, 20],
    [0, 21], [1, 21], [2, 21], [3, 21], [4, 21], [5, 21], [6, 21], [7, 21],
    [0, 22], [1, 22], [2, 22], [3, 22], [4, 22], [5, 22], [6, 22], [7, 22],
    [0, 23], [1, 23], [2, 23], [3, 23], [4, 23], [5, 23], [6, 23], [7, 23],
    [0, 24], [1, 24], [2, 24], [3, 24], [4, 24], [5, 24], [6, 24], [7, 24]
  ];
  
  // Place lake tiles (only if they don't conflict with roads)
  lakeTiles.forEach(([x, y]) => {
    if (x < width && y < height && map[y][x] === 'space') {
      map[y][x] = 'water';
    }
  });
  
  return map;
}

export const defaultMap: MapConfig = {
  name: "Compact City",
  width: 25,
  height: 25,
  tiles: createCityMap()
};

// Helper function to convert string to TileType
export function stringToTileType(str: string): TileType {
  switch (str.toLowerCase()) {
    case 'space': return TileType.SPACE;
    case 'corridor': return TileType.CORRIDOR;
    case 'living_quarters': return TileType.LIVING_QUARTERS;
    case 'research_lab': return TileType.RESEARCH_LAB;
    case 'engineering_bay': return TileType.ENGINEERING_BAY;
    case 'recreation': return TileType.RECREATION;
    case 'power_line': return TileType.POWER_LINE;
    case 'water': return TileType.WATER;
    // Legacy support for old tile types - all roads map to single corridor type
    case 'grass': return TileType.SPACE;
    case 'road': return TileType.CORRIDOR;
    case 'main_road': return TileType.CORRIDOR;
    case 'main_corridor': return TileType.CORRIDOR;
    case 'highway': return TileType.CORRIDOR;
    case 'residential': return TileType.LIVING_QUARTERS;
    case 'commercial': return TileType.RESEARCH_LAB;
    case 'industrial': return TileType.ENGINEERING_BAY;
    case 'park': return TileType.RECREATION;
    default: return TileType.SPACE;
  }
}
