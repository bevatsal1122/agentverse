import { gameState, Tile } from './state';

const STORAGE_KEY = 'city-builder-save';

export interface SaveData {
  mapData: Array<[string, Tile]>;
  playerPosition: { x: number; y: number };
  timestamp: number;
}

export function saveGame(): boolean {
  try {
    const state = gameState.getState();
    const saveData: SaveData = {
      mapData: gameState.getMapDataArray(),
      playerPosition: state.playerPosition,
      timestamp: Date.now()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    return true;
  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}

export function loadGame(): boolean {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) {
      return false;
    }
    
    const saveData: SaveData = JSON.parse(savedData);
    gameState.loadMapData(saveData.mapData);
    gameState.setPlayerPosition(saveData.playerPosition.x, saveData.playerPosition.y);
    
    return true;
  } catch (error) {
    console.error('Failed to load game:', error);
    return false;
  }
}

export function hasSavedGame(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
