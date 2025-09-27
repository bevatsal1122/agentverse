import React from 'react';
import { Tool, gameState } from '../../src/game/state';
import { saveGame, loadGame, hasSavedGame } from '../../src/game/storage';
import { MapLoader } from '../../src/maps/mapLoader';

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

  const handleSpawnAIAgent = () => {
    const newAgent = gameState.spawnRandomAIAgent();
    if (!newAgent) {
      alert('Cannot spawn AI agent: no map loaded');
    }
  };

  const tools = [
    { id: Tool.SELECT, label: 'Select', icon: '🖱️' },
    { id: Tool.BULLDOZER, label: 'Demolish', icon: '💥' },
    { id: Tool.CORRIDOR, label: 'Corridors', icon: '🚶' },
    { id: Tool.LIVING_QUARTERS, label: 'Quarters', icon: '🏠' },
    { id: Tool.RESEARCH_LAB, label: 'Research', icon: '🔬' },
    { id: Tool.ENGINEERING_BAY, label: 'Engineering', icon: '⚙️' },
    { id: Tool.RECREATION, label: 'Recreation', icon: '🎮' },
    { id: Tool.POWER, label: 'Power', icon: '⚡' }
  ];

  return (
    <div className="bg-gray-800 border-2 border-gray-600 p-2" style={{ imageRendering: 'pixelated' }}>
      {/* Info Panel */}
      <div className="bg-gray-800 border-2 border-gray-600 p-2 flex justify-between items-center" style={{ imageRendering: 'pixelated' }}>
        <div className="text-xs" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
          <div className="font-bold text-white" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>ENERGY: 100%</div>
          <div className="text-blue-300" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>AI AGENTS: {gameState.getState().aiAgents.size}</div>
        </div>
        
        <div className="flex space-x-1">
          <button 
            onClick={handleSave} 
            className="bg-blue-600 border-2 border-blue-400 text-white font-bold text-xs px-2 py-1 hover:bg-blue-500"
            style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}
          >
            SAVE STATION
          </button>
          <button 
            onClick={handleLoad} 
            className="bg-blue-600 border-2 border-blue-400 text-white font-bold text-xs px-2 py-1 hover:bg-blue-500"
            style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}
          >
            LOAD STATION
          </button>
          <button 
            onClick={() => MapLoader.loadDefaultMap()} 
            className="bg-blue-600 border-2 border-blue-400 text-white font-bold text-xs px-2 py-1 hover:bg-blue-500"
            style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}
          >
            LOAD ALPHA
          </button>
          <button 
            onClick={() => MapLoader.createEmptyMap(30, 30)} 
            className="bg-blue-600 border-2 border-blue-400 text-white font-bold text-xs px-2 py-1 hover:bg-blue-500"
            style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}
          >
            NEW STATION
          </button>
          <button 
            onClick={handleSpawnAIAgent} 
            className="bg-cyan-600 border-2 border-cyan-400 text-white font-bold text-xs px-2 py-1 hover:bg-cyan-500"
            style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}
          >
            + AI AGENT
          </button>
        </div>
        
        <div className="text-xs" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
          <div className="text-white font-bold" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>MISSION: DAY 1</div>
          <div className="text-blue-300 font-bold" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>STATUS: ACTIVE</div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
