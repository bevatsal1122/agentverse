import { TileType } from '../game/state';

export interface MapConfig {
  name: string;
  width: number;
  height: number;
  tiles: string[][];
}

export const defaultMap: MapConfig = {
  name: "Alpha Station",
  width: 50,
  height: 50,
  tiles: [
    // Row 0–4: Outer space buffer
    ...Array.from({ length: 5 }, () => Array(50).fill('space')),

    // Row 5–10: Living quarters section (quarters + recreation + corridors)
    ...Array.from({ length: 6 }, (_, r) => 
      Array.from({ length: 50 }, (_, c) => {
        if (c % 10 === 0) return 'corridor';
        if (c % 7 === 0 && r % 2 === 0) return 'recreation';
        return 'living_quarters';
      })
    ),

    // Row 11: Major north–south main corridor
    Array(50).fill('highway'),

    // Row 12–20: Research and development core
    ...Array.from({ length: 9 }, (_, r) => 
      Array.from({ length: 50 }, (_, c) => {
        if (r % 3 === 0 && c % 5 === 0) return 'recreation';
        if (c % 8 === 0) return 'main_corridor';
        return 'research_lab';
      })
    ),

    // Row 21: East–west cross main corridor
    Array(50).fill('highway'),

    // Row 22–30: Mixed mid-station (quarters + small research)
    ...Array.from({ length: 9 }, (_, r) => 
      Array.from({ length: 50 }, (_, c) => {
        if (c % 12 === 0) return 'corridor';
        if (r % 4 === 0 && c % 6 === 0) return 'recreation';
        return (c % 5 < 3 ? 'living_quarters' : 'research_lab');
      })
    ),

    // Row 31: South cross main corridor
    Array(50).fill('highway'),

    // Row 32–40: Engineering zone on west side
    ...Array.from({ length: 9 }, (_, r) => 
      Array.from({ length: 50 }, (_, c) => {
        if (c < 15) return (c % 5 === 0 ? 'power_line' : 'engineering_bay');
        if (c % 10 === 0) return 'corridor';
        return 'space';
      })
    ),

    // Row 41: Peripheral corridor
    Array(50).fill('corridor'),

    // Row 42–48: Southern living quarters
    ...Array.from({ length: 7 }, (_, r) => 
      Array.from({ length: 50 }, (_, c) => {
        if (c % 9 === 0) return 'corridor';
        if ((c + r) % 11 === 0) return 'recreation';
        return 'living_quarters';
      })
    ),

    // Row 49: Southern edge
    Array(50).fill('space')
  ]
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
