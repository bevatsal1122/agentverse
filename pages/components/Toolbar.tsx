import React from 'react';
import { Tool, gameState } from '../game/state';
import { saveGame, loadGame, hasSavedGame } from '../game/storage';
import { MapLoader } from '../maps/mapLoader';

interface ToolbarProps {
  selectedTool: Tool;
  onToolSelect: (tool: Tool) => void;
}

const Toolbar: React.FC<ToolbarProps> = () => {
  const handleSave = () => {
    const success = saveGame();
    if (success) {
      alert('Game saved successfully!');
    } else {
      alert('Failed to save game');
    }
  };

  const handleLoad = () => {
    if (!hasSavedGame()) {
      alert('No saved game found');
      return;
    }
    
    const success = loadGame();
    if (success) {
      alert('Game loaded successfully!');
    } else {
      alert('Failed to load game');
    }
  };

  const handleSpawnCrewmate = () => {
    gameState.spawnRandomCrewmate();
  };

  const tools = [
    { id: Tool.SELECT, label: 'Select', icon: '🖱️' },
    { id: Tool.BULLDOZER, label: 'Demolish', icon: '💥' },
    { id: Tool.ROAD, label: 'Corridors', icon: '🚶' },
    { id: Tool.RESIDENTIAL, label: 'Quarters', icon: '🏠' },
    { id: Tool.COMMERCIAL, label: 'Research', icon: '🔬' },
    { id: Tool.INDUSTRIAL, label: 'Engineering', icon: '⚙️' },
    { id: Tool.PARK, label: 'Recreation', icon: '🎮' },
    { id: Tool.POWER, label: 'Power', icon: '⚡' }
  ];

  return (
    <div className="amongus-toolbar p-2">
      {/* Info Panel */}
      <div className="amongus-panel p-2 flex justify-between items-center">
        <div className="text-xs">
          <div className="font-bold text-white">ENERGY: 100%</div>
          <div className="text-blue-300">Crew: {gameState.getState().crewmates.size}</div>
        </div>
        
        <div className="flex space-x-1">
          <button onClick={handleSave} className="amongus-button text-xs">
            Save Station
          </button>
          <button onClick={handleLoad} className="amongus-button text-xs">
            Load Station
          </button>
          <button onClick={() => MapLoader.loadDefaultMap()} className="amongus-button text-xs">
            Load Alpha Station
          </button>
          <button onClick={() => MapLoader.createEmptyMap(30, 30)} className="amongus-button text-xs">
            New Station
          </button>
          <button onClick={handleSpawnCrewmate} className="amongus-button text-xs bg-green-600 hover:bg-green-500">
            + Crewmate
          </button>
        </div>
        
        <div className="text-xs">
          <div className="text-white">Mission: Day 1</div>
          <div className="text-blue-300">Status: Active</div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
