import { TileType } from '../game/state';

export interface MapConfig {
  name: string;
  width: number;
  height: number;
  tiles: string[][];
}

export const defaultMap: MapConfig = {
  name: "Mega Metro",
  width: 50,
  height: 50,
  tiles: [
    // Row 0–4: Northern greenery buffer
    ...Array.from({ length: 5 }, () => Array(50).fill('grass')),

    // Row 5–10: Northern suburbs (residential + parks + roads)
    ...Array.from({ length: 6 }, (_, r) => 
      Array.from({ length: 50 }, (_, c) => {
        if (c % 10 === 0) return 'road';
        if (c % 7 === 0 && r % 2 === 0) return 'park';
        return 'residential';
      })
    ),

    // Row 11: Major north–south highway
    Array(50).fill('highway'),

    // Row 12–20: Downtown commercial core
    ...Array.from({ length: 9 }, (_, r) => 
      Array.from({ length: 50 }, (_, c) => {
        if (r % 3 === 0 && c % 5 === 0) return 'park';
        if (c % 8 === 0) return 'main_road';
        return 'commercial';
      })
    ),

    // Row 21: East–west cross highway
    Array(50).fill('highway'),

    // Row 22–30: Mixed midtown (residential + small commercial)
    ...Array.from({ length: 9 }, (_, r) => 
      Array.from({ length: 50 }, (_, c) => {
        if (c % 12 === 0) return 'road';
        if (r % 4 === 0 && c % 6 === 0) return 'park';
        return (c % 5 < 3 ? 'residential' : 'commercial');
      })
    ),

    // Row 31: South cross highway
    Array(50).fill('highway'),

    // Row 32–40: Industrial zone on west side
    ...Array.from({ length: 9 }, (_, r) => 
      Array.from({ length: 50 }, (_, c) => {
        if (c < 15) return (c % 5 === 0 ? 'power_line' : 'industrial');
        if (c % 10 === 0) return 'road';
        return 'grass';
      })
    ),

    // Row 41: Peripheral road
    Array(50).fill('road'),

    // Row 42–48: Southern residential neighborhoods
    ...Array.from({ length: 7 }, (_, r) => 
      Array.from({ length: 50 }, (_, c) => {
        if (c % 9 === 0) return 'road';
        if ((c + r) % 11 === 0) return 'park';
        return 'residential';
      })
    ),

    // Row 49: Southern edge
    Array(50).fill('grass')
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
