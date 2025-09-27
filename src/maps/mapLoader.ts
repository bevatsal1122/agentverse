import { gameState, TileType } from '../game/state';
import { MapConfig, stringToTileType, defaultMap } from './defaultMap';

export class MapLoader {
  static loadMap(mapConfig: MapConfig) {
    console.log(`Starting to load map: ${mapConfig.name} (${mapConfig.width}x${mapConfig.height})`);
    
    // Clear existing map
    gameState.clearMap();
    console.log('Map cleared');
    
    // Set map dimensions
    gameState.setMapDimensions(mapConfig.width, mapConfig.height);
    console.log(`Map dimensions set: ${mapConfig.width}x${mapConfig.height}`);
    
    // Verify the dimensions were set correctly
    const currentState = gameState.getState();
    console.log(`Verified map dimensions in state: ${currentState.mapWidth}x${currentState.mapHeight}, tileSize: ${currentState.tileSize}`);
    
    // Load the new map
    let tilesPlaced = 0;
    for (let y = 0; y < mapConfig.height; y++) {
      for (let x = 0; x < mapConfig.width; x++) {
        const tileString = mapConfig.tiles[y][x];
        const tileType = stringToTileType(tileString);
        gameState.placeTile(x, y, tileType);
        tilesPlaced++;
      }
    }
    
    console.log(`Loaded map: ${mapConfig.name} (${mapConfig.width}x${mapConfig.height}) - ${tilesPlaced} tiles placed`);
    console.log('Final map data size:', gameState.getState().mapData.size);
  }
  
  static loadDefaultMap() {
    // Load the default map directly
    this.loadMap(defaultMap);
  }
  
  static createEmptyMap(width: number, height: number) {
    const emptyMap: MapConfig = {
      name: "Empty Map",
      width,
      height,
      tiles: Array(height).fill(null).map(() => 
        Array(width).fill('grass')
      ),
      buildings: [] // Empty buildings array for empty map
    };
    
    this.loadMap(emptyMap);
  }
}
