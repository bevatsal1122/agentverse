import React, { useState, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import GameCanvas from './components/GameCanvas';
import { Tool, gameState } from './game/state';
import { playerController } from './game/player';

function App() {
  const [selectedTool, setSelectedTool] = useState<Tool>(Tool.SELECT);

  useEffect(() => {
    // Initialize player controller
    playerController;

    const unsubscribe = gameState.subscribe((state) => {
      // Force re-render when game state changes
    });

    return unsubscribe;
  }, []);

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    gameState.setTool(tool);
  };

  return (
    <div className="h-screen bg-gray-300 overflow-hidden">
      <Toolbar selectedTool={selectedTool} onToolSelect={handleToolSelect} />
      <div className="flex-1 p-2">
        <GameCanvas selectedTool={selectedTool} />
      </div>
    </div>
  );
}

export default App;
