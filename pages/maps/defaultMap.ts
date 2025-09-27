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
