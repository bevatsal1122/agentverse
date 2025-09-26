import { gameState, TileType } from '../game/state';
import { MapConfig, stringToTileType } from './defaultMap';

export class MapLoader {
  static loadMap(mapConfig: MapConfig) {
    // Clear existing map
    gameState.clearMap();
    
    // Load the new map
    for (let y = 0; y < mapConfig.height; y++) {
      for (let x = 0; x < mapConfig.width; x++) {
        const tileString = mapConfig.tiles[y][x];
        const tileType = stringToTileType(tileString);
        gameState.placeTile(x, y, tileType);
      }
    }
    
    console.log(`Loaded map: ${mapConfig.name} (${mapConfig.width}x${mapConfig.height})`);
  }
  
  static loadDefaultMap() {
    // Import and load the default map
    import('./defaultMap').then(({ defaultMap }) => {
      this.loadMap(defaultMap);
    });
  }
  
  static createEmptyMap(width: number, height: number) {
    const emptyMap: MapConfig = {
      name: "Empty Map",
      width,
      height,
      tiles: Array(height).fill(null).map(() => 
        Array(width).fill('grass')
      )
    };
    
    this.loadMap(emptyMap);
  }
}
