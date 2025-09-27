import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../src/contexts/AuthContext";
import GameCanvas from "./components/GameCanvas";
import { Tool, gameState } from "../src/game/state";
import { playerController } from "../src/game/player";
import Navbar from "./components/Navbar";

export default function Game() {
  const router = useRouter();
  const { ready, authenticated, logout, user, databaseUser, isCreatingUser } =
    useAuth();
  const [selectedTool, setSelectedTool] = useState<Tool>(Tool.SELECT);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/auth");
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
      <div className="h-screen bg-gray-300 overflow-hidden relative">
        {/* Enhanced Background - City Skyline Pattern */}
        <div className="absolute inset-0">
          {/* Base Grid */}
          <div className="grid grid-cols-32 grid-rows-32 h-full w-full opacity-30">
            {Array.from({ length: 32 * 32 }).map((_, i) => {
              const x = i % 32;
              const y = Math.floor(i / 32);
              const isGrass = Math.random() > 0.6;
              const isRoad =
                Math.random() > 0.9 &&
                (x === 0 || x === 31 || y === 0 || y === 31);
              return (
                <div
                  key={i}
                  className={`border border-gray-400 ${
                    isRoad
                      ? "bg-gray-600"
                      : isGrass
                      ? "bg-green-400"
                      : "bg-gray-200"
                  }`}
                  style={{ width: "32px", height: "32px" }}
                />
              );
            })}
          </div>

          {/* Decorative Buildings */}
          <div className="absolute top-10 left-10 w-32 h-20 bg-gray-600 border-2 border-gray-800">
            <div className="w-full h-full bg-gray-500 border-b-2 border-gray-700"></div>
            <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-300"></div>
            <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-300"></div>
          </div>

          <div className="absolute top-16 right-16 w-24 h-16 bg-gray-600 border-2 border-gray-800">
            <div className="w-full h-full bg-gray-500 border-b-2 border-gray-700"></div>
            <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-300"></div>
          </div>

          <div className="absolute bottom-20 left-20 w-28 h-24 bg-gray-600 border-2 border-gray-800">
            <div className="w-full h-full bg-gray-500 border-b-2 border-gray-700"></div>
            <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-300"></div>
            <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-300"></div>
            <div className="absolute bottom-1 left-1 w-2 h-2 bg-yellow-300"></div>
          </div>

          <div className="absolute bottom-16 right-10 w-20 h-18 bg-gray-600 border-2 border-gray-800">
            <div className="w-full h-full bg-gray-500 border-b-2 border-gray-700"></div>
            <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-300"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex items-center justify-center h-full p-4">
          <div className="simcity-panel p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-blue-600 border-2 border-gray-800 mr-3 flex items-center justify-center">
                  <div className="w-8 h-8 bg-yellow-300 border border-gray-800"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-black mb-1">
                    AGENTVERSE
                  </h1>
                  <p className="text-sm text-gray-700">CITY BUILDER</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-lg font-bold text-black mb-2">
                {isCreatingUser ? "CREATING USER..." : "LOADING..."}
              </div>
              <div className="text-sm text-gray-600">
                {isCreatingUser
                  ? "Setting up your account"
                  : "Initializing game"}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="h-screen bg-gray-300 overflow-hidden relative">
        {/* Enhanced Background - City Skyline Pattern */}
        <div className="absolute inset-0">
          {/* Base Grid */}
          <div className="grid grid-cols-32 grid-rows-32 h-full w-full opacity-30">
            {Array.from({ length: 32 * 32 }).map((_, i) => {
              const x = i % 32;
              const y = Math.floor(i / 32);
              const isGrass = Math.random() > 0.6;
              const isRoad =
                Math.random() > 0.9 &&
                (x === 0 || x === 31 || y === 0 || y === 31);
              return (
                <div
                  key={i}
                  className={`border border-gray-400 ${
                    isRoad
                      ? "bg-gray-600"
                      : isGrass
                      ? "bg-green-400"
                      : "bg-gray-200"
                  }`}
                  style={{ width: "32px", height: "32px" }}
                />
              );
            })}
          </div>

          {/* Decorative Buildings */}
          <div className="absolute top-10 left-10 w-32 h-20 bg-gray-600 border-2 border-gray-800">
            <div className="w-full h-full bg-gray-500 border-b-2 border-gray-700"></div>
            <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-300"></div>
            <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-300"></div>
          </div>

          <div className="absolute top-16 right-16 w-24 h-16 bg-gray-600 border-2 border-gray-800">
            <div className="w-full h-full bg-gray-500 border-b-2 border-gray-700"></div>
            <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-300"></div>
          </div>

          <div className="absolute bottom-20 left-20 w-28 h-24 bg-gray-600 border-2 border-gray-800">
            <div className="w-full h-full bg-gray-500 border-b-2 border-gray-700"></div>
            <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-300"></div>
            <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-300"></div>
            <div className="absolute bottom-1 left-1 w-2 h-2 bg-yellow-300"></div>
          </div>

          <div className="absolute bottom-16 right-10 w-20 h-18 bg-gray-600 border-2 border-gray-800">
            <div className="w-full h-full bg-gray-500 border-b-2 border-gray-700"></div>
            <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-300"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex items-center justify-center h-full p-4">
          <div className="simcity-panel p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-blue-600 border-2 border-gray-800 mr-3 flex items-center justify-center">
                  <div className="w-8 h-8 bg-yellow-300 border border-gray-800"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-black mb-1">
                    AGENTVERSE
                  </h1>
                  <p className="text-sm text-gray-700">CITY BUILDER</p>
                </div>
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="text-lg font-bold text-black mb-2">
                CONNECT WALLET
              </div>
              <div className="text-sm text-gray-600 mb-4">
                Connect your wallet to access the game
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => router.push("/auth")}
                className="simcity-button py-3 px-6 text-sm font-bold text-black hover:bg-yellow-300 focus:outline-none"
              >
                CONNECT WALLET
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-300 overflow-hidden relative">
      {/* Navbar */}
      <Navbar currentPage="game" />

      <GameCanvas selectedTool={selectedTool} />
    </div>
  );
}
