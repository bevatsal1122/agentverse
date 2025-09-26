import { TileType } from '../game/state';

export interface MapConfig {
  name: string;
  width: number;
  height: number;
  tiles: string[][];
}

export const defaultMap: MapConfig = {
  name: "Downtown Metro",
  width: 30,
  height: 30,
  tiles: [
    // Row 0 - Northern suburbs
    ['grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 1 - Residential outskirts
    ['grass', 'residential', 'residential', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'residential', 'residential', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 2 - Residential with parks
    ['grass', 'residential', 'residential', 'park', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'park', 'residential', 'residential', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 3 - Connecting road
    ['road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road'],
    // Row 4 - Residential district
    ['grass', 'residential', 'residential', 'residential', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'residential', 'residential', 'residential', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 5 - Residential with parks
    ['grass', 'residential', 'residential', 'park', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'park', 'residential', 'residential', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 6 - Cross street
    ['road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road'],
    // Row 7 - Mixed residential
    ['grass', 'residential', 'residential', 'residential', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'residential', 'residential', 'residential', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 8 - Residential with parks
    ['grass', 'residential', 'residential', 'park', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'park', 'residential', 'residential', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 9 - Main arterial road
    ['highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway'],
    // Row 10 - Commercial district begins
    ['grass', 'commercial', 'commercial', 'commercial', 'commercial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'commercial', 'commercial', 'commercial', 'commercial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 11 - Commercial with power
    ['grass', 'commercial', 'commercial', 'power_line', 'power_line', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'power_line', 'power_line', 'commercial', 'commercial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 12 - Cross street
    ['main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road', 'main_road'],
    // Row 13 - Downtown commercial
    ['grass', 'commercial', 'commercial', 'commercial', 'commercial', 'commercial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'commercial', 'commercial', 'commercial', 'commercial', 'commercial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 14 - Commercial with power
    ['grass', 'commercial', 'commercial', 'power_line', 'power_line', 'power_line', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'power_line', 'power_line', 'power_line', 'commercial', 'commercial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 15 - Central business district
    ['highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway', 'highway'],
    // Row 16 - Downtown core
    ['grass', 'commercial', 'commercial', 'commercial', 'commercial', 'commercial', 'commercial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'commercial', 'commercial', 'commercial', 'commercial', 'commercial', 'commercial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 17 - Commercial with power
    ['grass', 'commercial', 'commercial', 'power_line', 'power_line', 'power_line', 'power_line', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'power_line', 'power_line', 'power_line', 'power_line', 'commercial', 'commercial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 18 - Cross street
    ['road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road'],
    // Row 19 - Mixed commercial
    ['grass', 'commercial', 'commercial', 'commercial', 'commercial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'commercial', 'commercial', 'commercial', 'commercial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 20 - Commercial with power
    ['grass', 'commercial', 'commercial', 'power_line', 'power_line', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'power_line', 'power_line', 'commercial', 'commercial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 21 - Main arterial road
    ['road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road'],
    // Row 22 - Industrial zone begins
    ['grass', 'industrial', 'industrial', 'industrial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'industrial', 'industrial', 'industrial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 23 - Industrial with power
    ['grass', 'industrial', 'industrial', 'power_line', 'power_line', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'power_line', 'power_line', 'industrial', 'industrial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 24 - Cross street
    ['road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road'],
    // Row 25 - Industrial district
    ['grass', 'industrial', 'industrial', 'industrial', 'industrial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'industrial', 'industrial', 'industrial', 'industrial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 26 - Industrial with power
    ['grass', 'industrial', 'industrial', 'power_line', 'power_line', 'power_line', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'power_line', 'power_line', 'power_line', 'industrial', 'industrial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 27 - Cross street
    ['road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road', 'road'],
    // Row 28 - Industrial outskirts
    ['grass', 'industrial', 'industrial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'industrial', 'industrial', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
    // Row 29 - Southern edge
    ['grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass']
  ]
};

// Helper function to convert string to TileType
export function stringToTileType(str: string): TileType {
  switch (str.toLowerCase()) {
    case 'grass': return TileType.GRASS;
    case 'road': return TileType.ROAD;
    case 'main_road': return TileType.MAIN_ROAD;
    case 'highway': return TileType.HIGHWAY;
    case 'residential': return TileType.RESIDENTIAL;
    case 'commercial': return TileType.COMMERCIAL;
    case 'industrial': return TileType.INDUSTRIAL;
    case 'park': return TileType.PARK;
    case 'power_line': return TileType.POWER_LINE;
    case 'water': return TileType.WATER;
    default: return TileType.GRASS;
  }
}
