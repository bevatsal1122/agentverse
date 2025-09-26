import React from 'react';
import { Tool } from '../game/state';
import { saveGame, loadGame, hasSavedGame } from '../game/storage';
import { MapLoader } from '../maps/mapLoader';

interface ToolbarProps {
  selectedTool: Tool;
  onToolSelect: (tool: Tool) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ selectedTool, onToolSelect }) => {
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

  const tools = [
    { id: Tool.SELECT, label: 'Select', icon: '🖱️' },
    { id: Tool.BULLDOZER, label: 'Bulldozer', icon: '🚜' },
    { id: Tool.ROAD, label: 'Roads', icon: '🛣️' },
    { id: Tool.RESIDENTIAL, label: 'Residential', icon: '🏘️' },
    { id: Tool.COMMERCIAL, label: 'Commercial', icon: '🏬' },
    { id: Tool.INDUSTRIAL, label: 'Industrial', icon: '🏭' },
    { id: Tool.PARK, label: 'Parks', icon: '🌳' },
    { id: Tool.POWER, label: 'Power', icon: '⚡' }
  ];

  return (
    <div className="simcity-toolbar p-2">
      {/* Info Panel */}
      <div className="simcity-panel p-2 flex justify-between items-center">
        <div className="text-xs">
          <div className="font-bold">FUNDS: $20,000</div>
          <div>Population: 0</div>
        </div>
        
        <div className="flex space-x-1">
          <button onClick={handleSave} className="simcity-button text-xs">
            Save City
          </button>
          <button onClick={handleLoad} className="simcity-button text-xs">
            Load City
          </button>
          <button onClick={() => MapLoader.loadDefaultMap()} className="simcity-button text-xs">
            Load Map
          </button>
          <button onClick={() => MapLoader.createEmptyMap(30, 30)} className="simcity-button text-xs">
            New Map
          </button>
        </div>
        
        <div className="text-xs">
          <div>Date: Jan 1900</div>
          <div>Speed: Paused</div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
