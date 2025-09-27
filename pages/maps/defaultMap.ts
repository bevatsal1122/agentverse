import { TileType } from '../game/state';

export interface MapConfig {
  name: string;
  width: number;
  height: number;
  tiles: string[][];
}

// Helper function to create a realistic city layout
function createCityMap(): string[][] {
  const width = 50;
  const height = 50;
  const map: string[][] = Array.from({ length: height }, () => Array(width).fill('space'));
  
  // Create major highway grid
  for (let x = 0; x < width; x++) {
    map[12][x] = 'highway';  // North highway
    map[25][x] = 'highway';  // Central highway
    map[37][x] = 'highway';  // South highway
  }
  
  for (let y = 0; y < height; y++) {
    map[y][15] = 'main_corridor';  // West corridor
    map[y][30] = 'main_corridor';  // East corridor
  }
  
  // Local street grid
  for (let x = 6; x < width; x += 9) {
    for (let y = 0; y < height; y++) {
      if (map[y][x] === 'space') {
        map[y][x] = 'corridor';
      }
    }
  }
  
  for (let y = 6; y < height; y += 8) {
    for (let x = 0; x < width; x++) {
      if (map[y][x] === 'space') {
        map[y][x] = 'corridor';
      }
    }
  }
  
  // Residential areas (deterministic patterns)
  // North residential
  for (let y = 1; y < 12; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (map[y][x] === 'space') {
        if ((x + y) % 4 < 2) {
          map[y][x] = 'living_quarters';
        } else if ((x + y) % 12 === 0) {
          map[y][x] = 'recreation';
        }
      }
    }
  }
  
  // South residential
  for (let y = 26; y < 37; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (map[y][x] === 'space') {
        if ((x + y) % 4 < 2) {
          map[y][x] = 'living_quarters';
        } else if ((x + y) % 10 === 0) {
          map[y][x] = 'recreation';
        }
      }
    }
  }
  
  // Downtown commercial district
  for (let y = 13; y < 25; y++) {
    for (let x = 16; x < 30; x++) {
      if (map[y][x] === 'space') {
        if ((x + y) % 3 < 2) {
          map[y][x] = 'research_lab';
        }
      }
    }
  }
  
  // Industrial zone (west side)
  for (let y = 18; y < 32; y++) {
    for (let x = 1; x < 15; x++) {
      if (map[y][x] === 'space') {
        if (x % 5 === 0) {
          map[y][x] = 'power_line';
        } else if ((x + y) % 3 < 2) {
          map[y][x] = 'engineering_bay';
        }
      }
    }
  }
  
  // Central park area
  for (let y = 20; y < 24; y++) {
    for (let x = 32; x < 40; x++) {
      if (map[y][x] === 'space') {
        map[y][x] = 'recreation';
      }
    }
  }
  
  // Suburban parks
  const parkLocations = [
    [3, 3], [45, 5], [8, 35], [42, 40], [20, 8], [35, 15]
  ];
  
  parkLocations.forEach(([px, py]) => {
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        if (py + dy < height && px + dx < width && map[py + dy][px + dx] === 'space') {
          map[py + dy][px + dx] = 'recreation';
        }
      }
    }
  });
  
  return map;
}

export const defaultMap: MapConfig = {
  name: "New Metropolis",
  width: 50,
  height: 50,
  tiles: createCityMap()
};

// Helper function to convert string to TileType
export function stringToTileType(str: string): TileType {
  switch (str.toLowerCase()) {
    case 'space': return TileType.SPACE;
    case 'corridor': return TileType.CORRIDOR;
    case 'main_corridor': return TileType.MAIN_CORRIDOR;
    case 'highway': return TileType.HIGHWAY;
    case 'living_quarters': return TileType.LIVING_QUARTERS;
    case 'research_lab': return TileType.RESEARCH_LAB;
    case 'engineering_bay': return TileType.ENGINEERING_BAY;
    case 'recreation': return TileType.RECREATION;
    case 'power_line': return TileType.POWER_LINE;
    case 'water': return TileType.WATER;
    // Legacy support for old tile types
    case 'grass': return TileType.SPACE;
    case 'road': return TileType.CORRIDOR;
    case 'main_road': return TileType.MAIN_CORRIDOR;
    case 'residential': return TileType.LIVING_QUARTERS;
    case 'commercial': return TileType.RESEARCH_LAB;
    case 'industrial': return TileType.ENGINEERING_BAY;
    case 'park': return TileType.RECREATION;
    default: return TileType.SPACE;
  }
}
