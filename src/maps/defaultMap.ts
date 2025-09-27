import { TileType } from '../game/state';

export interface BuildingInfo {
  id: string;
  type: string;
  x: number;
  y: number;
  zone: string;
  assignedAgent?: string;
}

export interface MapConfig {
  name: string;
  width: number;
  height: number;
  tiles: string[][];
  buildings: BuildingInfo[];
}

// Helper function to create a clean, realistic city layout with building IDs
function createCityMap(): { tiles: string[][], buildings: BuildingInfo[] } {
  const width = 25;
  const height = 25;
  const map: string[][] = Array.from({ length: height }, () => Array(width).fill('space'));
  const buildings: BuildingInfo[] = [];
  let buildingCounter = 1;
  
  // Helper function to add building with ID
  const addBuilding = (x: number, y: number, type: string, zone: string) => {
    const id = `B${buildingCounter.toString().padStart(3, '0')}`;
    buildings.push({ id, type, x, y, zone });
    map[y][x] = type;
    buildingCounter++;
  };
  
  // ===== STEP 1: CREATE CLEAN ROAD NETWORK (NO OVERLAPS) =====
  
  // Main north-south roads
  for (let y = 0; y < height; y++) {
    map[y][6] = 'corridor';   // West main street
    map[y][12] = 'corridor';  // Central avenue
    map[y][18] = 'corridor';  // East main street
  }
  
  // Main east-west roads
  for (let x = 0; x < width; x++) {
    map[4][x] = 'corridor';   // North boulevard
    map[10][x] = 'corridor';  // Central boulevard
    map[16][x] = 'corridor';  // South boulevard
    map[21][x] = 'corridor';  // Industrial road
  }
  
  // Secondary local streets (only where needed, no overlaps)
  // Downtown area local streets
  for (let x = 13; x < 18; x++) {
    if (map[7][x] === 'space') map[7][x] = 'corridor';
    if (map[13][x] === 'space') map[13][x] = 'corridor';
  }
  for (let y = 5; y < 10; y++) {
    if (map[y][15] === 'space') map[y][15] = 'corridor';
  }
  
  // Residential local streets
  for (let x = 1; x < 6; x++) {
    if (map[2][x] === 'space') map[2][x] = 'corridor';
    if (map[8][x] === 'space') map[8][x] = 'corridor';
    if (map[14][x] === 'space') map[14][x] = 'corridor';
  }
  for (let y = 11; y < 16; y++) {
    if (map[y][3] === 'space') map[y][3] = 'corridor';
  }
  
  // East side suburban streets
  for (let x = 19; x < 25; x++) {
    if (map[2][x] === 'space') map[2][x] = 'corridor';
    if (map[8][x] === 'space') map[8][x] = 'corridor';
    if (map[14][x] === 'space') map[14][x] = 'corridor';
  }
  for (let y = 5; y < 10; y++) {
    if (map[y][21] === 'space') map[y][21] = 'corridor';
  }
  
  // Industrial area access roads
  for (let x = 1; x < 12; x++) {
    if (map[19][x] === 'space') map[19][x] = 'corridor';
    if (map[23][x] === 'space') map[23][x] = 'corridor';
  }
  for (let y = 17; y < 21; y++) {
    if (map[y][9] === 'space') map[y][9] = 'corridor';
  }
  
  // ===== STEP 2: ADD NATURAL FEATURES =====
  
  // Simple river (no conflicts with roads)
  const riverTiles = [
    [0, 11], [1, 11], [2, 12], [3, 12], [4, 12], [5, 11],
    [7, 11], [8, 11], [9, 12], [10, 12], [11, 11]
  ];
  
  riverTiles.forEach(([x, y]) => {
    if (x < width && y < height && map[y][x] === 'space') {
      map[y][x] = 'water';
    }
  });
  
  // ===== STEP 3: FILL ZONES WITH BUILDINGS (ONLY IN EMPTY SPACES) =====
  
  // HISTORIC DISTRICT (Northwest)
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 6; x++) {
      if (map[y][x] === 'space') {
        if ((x + y) % 5 === 0) {
          addBuilding(x, y, 'recreation', 'Historic District');
        } else {
          addBuilding(x, y, 'living_quarters', 'Historic District');
        }
      }
    }
  }
  
  // DOWNTOWN BUSINESS (North-Central)
  for (let y = 0; y < 10; y++) {
    for (let x = 7; x < 12; x++) {
      if (map[y][x] === 'space') {
        if ((x + y) % 7 === 0) {
          addBuilding(x, y, 'recreation', 'Downtown Business');
        } else {
          addBuilding(x, y, 'research_lab', 'Downtown Business');
        }
      }
    }
  }
  
  // HIGH-RISE DISTRICT (Central-East)
  for (let y = 5; y < 16; y++) {
    for (let x = 13; x < 18; x++) {
      if (map[y][x] === 'space') {
        if ((x + y) % 6 === 0) {
          addBuilding(x, y, 'recreation', 'High-Rise District');
        } else {
          addBuilding(x, y, 'research_lab', 'High-Rise District');
        }
      }
    }
  }
  
  // UPSCALE RESIDENTIAL (East)
  for (let y = 0; y < 16; y++) {
    for (let x = 19; x < 25; x++) {
      if (map[y][x] === 'space') {
        if ((x + y) % 4 === 0) {
          addBuilding(x, y, 'recreation', 'Upscale Residential');
        } else {
          addBuilding(x, y, 'living_quarters', 'Upscale Residential');
        }
      }
    }
  }
  
  // MIDDLE-CLASS RESIDENTIAL (West)
  for (let y = 5; y < 16; y++) {
    for (let x = 0; x < 6; x++) {
      if (map[y][x] === 'space') {
        if ((x + y) % 6 === 0) {
          addBuilding(x, y, 'recreation', 'Middle-Class Residential');
        } else {
          addBuilding(x, y, 'living_quarters', 'Middle-Class Residential');
        }
      }
    }
  }
  
  // INDUSTRIAL DISTRICT (South-West)
  for (let y = 17; y < 25; y++) {
    for (let x = 0; x < 12; x++) {
      if (map[y][x] === 'space') {
        if (x % 4 === 0) {
          addBuilding(x, y, 'power_line', 'Industrial District');
        } else if ((x + y) % 3 === 0) {
          addBuilding(x, y, 'engineering_bay', 'Industrial District');
        } else {
          addBuilding(x, y, 'living_quarters', 'Industrial District');
        }
      }
    }
  }
  
  // COMMERCIAL DISTRICT (South-Central)
  for (let y = 17; y < 25; y++) {
    for (let x = 13; x < 18; x++) {
      if (map[y][x] === 'space') {
        if ((x + y) % 5 === 0) {
          addBuilding(x, y, 'recreation', 'Commercial District');
        } else {
          addBuilding(x, y, 'research_lab', 'Commercial District');
        }
      }
    }
  }
  
  // SUBURBAN AREA (South-East)
  for (let y = 17; y < 25; y++) {
    for (let x = 19; x < 25; x++) {
      if (map[y][x] === 'space') {
        if ((x + y) % 4 === 0) {
          addBuilding(x, y, 'recreation', 'Suburban Area');
        } else {
          addBuilding(x, y, 'living_quarters', 'Suburban Area');
        }
      }
    }
  }
  
  // Central park area
  for (let y = 11; y < 16; y++) {
    for (let x = 7; x < 12; x++) {
      if (map[y][x] === 'space') {
        addBuilding(x, y, 'recreation', 'Central Park');
      }
    }
  }
  
  return { tiles: map, buildings };
}

const cityData = createCityMap();

export const defaultMap: MapConfig = {
  name: "Metro City",
  width: 25,
  height: 25,
  tiles: cityData.tiles,
  buildings: cityData.buildings
};

// Helper functions for building management
export function getBuildingById(buildingId: string): BuildingInfo | undefined {
  return defaultMap.buildings.find(building => building.id === buildingId);
}

export function getBuildingsByZone(zone: string): BuildingInfo[] {
  return defaultMap.buildings.filter(building => building.zone === zone);
}

export function getBuildingsByType(type: string): BuildingInfo[] {
  return defaultMap.buildings.filter(building => building.type === type);
}

export function assignAgentToBuilding(buildingId: string, agentId: string): boolean {
  const building = getBuildingById(buildingId);
  if (building && !building.assignedAgent) {
    building.assignedAgent = agentId;
    return true;
  }
  return false;
}

export function unassignAgentFromBuilding(buildingId: string): boolean {
  const building = getBuildingById(buildingId);
  if (building && building.assignedAgent) {
    building.assignedAgent = undefined;
    return true;
  }
  return false;
}

export function getAvailableBuildings(): BuildingInfo[] {
  return defaultMap.buildings.filter(building => !building.assignedAgent);
}

export function getBuildingsAssignedToAgent(agentId: string): BuildingInfo[] {
  return defaultMap.buildings.filter(building => building.assignedAgent === agentId);
}

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
