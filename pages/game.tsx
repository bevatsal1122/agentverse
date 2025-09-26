import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './contexts/AuthContext';
import Toolbar from './components/Toolbar';
import GameCanvas from './components/GameCanvas';
import { Tool, gameState } from './game/state';
import { playerController } from './game/player';

export default function Game() {
  const router = useRouter();
  const { ready, authenticated, logout } = useAuth();
  const [selectedTool, setSelectedTool] = useState<Tool>(Tool.SELECT);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/auth');
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (ready && authenticated) {
      // Initialize player controller only on client side
      playerController.initialize();

      const unsubscribe = gameState.subscribe((state) => {
        // Force re-render when game state changes
      });

      return unsubscribe;
    }
  }, [ready, authenticated]);

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    gameState.setTool(tool);
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!ready) {
    return (
      <div className="h-screen bg-gray-300 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold text-black mb-2">Loading...</div>
          <div className="text-sm text-gray-600">Initializing game</div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="h-screen bg-gray-300 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold text-black mb-2">Authentication Required</div>
          <div className="text-sm text-gray-600 mb-4">Please sign in to access the game</div>
          <button
            onClick={() => router.push('/auth')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-300 overflow-hidden relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/20 backdrop-blur-sm">
        <div className="flex justify-between items-center p-2">
          <div className="flex items-center space-x-4">
            <h1 className="text-white font-bold text-lg">AgentVerse City Builder</h1>
            <div className="text-white text-sm">
              <span className="font-semibold">FUNDS:</span> $20,000
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push('/auth')}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-sm rounded transition-colors"
            >
              Back to Menu
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white text-sm rounded transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="pt-12">
        <Toolbar selectedTool={selectedTool} onToolSelect={handleToolSelect} />
        <div className="flex-1 p-2">
          <GameCanvas selectedTool={selectedTool} />
        </div>
      </div>
    </div>
  );
}
