import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './contexts/AuthContext';

export default function Auth() {
  const router = useRouter();
  const { ready, authenticated, user, login, logout, isLoading } = useAuth();

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/game');
    }
  }, [ready, authenticated, router]);

  const handleLogin = async () => {
    await login();
  };

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
            const isRoad = Math.random() > 0.9 && (x === 0 || x === 31 || y === 0 || y === 31);
            return (
              <div
                key={i}
                className={`border border-gray-400 ${
                  isRoad ? 'bg-gray-600' : isGrass ? 'bg-green-400' : 'bg-gray-200'
                }`}
                style={{ width: '32px', height: '32px' }}
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
      <div className="relative z-10 flex items-start justify-center h-full p-4 pt-8">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column - Game Preview */}
            <div className="space-y-4">
              {/* Title Panel */}
              <div className="simcity-panel p-6 text-center">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-12 h-12 bg-blue-600 border-2 border-gray-800 mr-3 flex items-center justify-center">
                    <div className="w-8 h-8 bg-yellow-300 border border-gray-800"></div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-black mb-1">AGENTVERSE</h1>
                    <p className="text-sm text-gray-700">CITY BUILDER</p>
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  BUILD • MANAGE • PROSPER
                </div>
              </div>

              {/* Game Preview Panel */}
              <div className="simcity-panel p-4">
                <h3 className="text-sm font-bold text-black mb-3 text-center">GAME PREVIEW</h3>
                <div className="bg-gray-200 border-2 border-gray-400 p-4">
                  {/* Mini City Preview */}
                  <div className="grid grid-cols-8 gap-1 mb-3">
                    {Array.from({ length: 64 }).map((_, i) => {
                      const colors = ['bg-green-400', 'bg-gray-600', 'bg-blue-400', 'bg-yellow-300', 'bg-gray-200'];
                      const color = colors[Math.floor(Math.random() * colors.length)];
                      return (
                        <div key={i} className={`w-4 h-4 border border-gray-500 ${color}`}></div>
                      );
                    })}
                  </div>
                  <div className="text-xs text-gray-700 text-center">
                    REAL-TIME CITY SIMULATION
                  </div>
                </div>
              </div>

              {/* What You Can Do Panel */}
              <div className="simcity-panel p-4">
                <h3 className="text-sm font-bold text-black mb-3 text-center">WHAT YOU CAN DO</h3>
                <div className="space-y-2 text-xs text-gray-700">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 border border-gray-600 mr-2"></div>
                    <span>• Design residential neighborhoods with houses and apartments</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-400 border border-gray-600 mr-2"></div>
                    <span>• Build commercial districts with offices and shopping centers</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-300 border border-gray-600 mr-2"></div>
                    <span>• Create industrial zones with factories and warehouses</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-600 border border-gray-600 mr-2"></div>
                    <span>• Plan road networks and traffic systems</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-600 border border-gray-600 mr-2"></div>
                    <span>• Add parks, power lines, and utilities</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-400 border border-gray-600 mr-2"></div>
                    <span>• Watch your city grow with animated traffic and citizens</span>
                  </div>
                </div>
              </div>

              {/* Game Features Panel */}
              <div className="simcity-panel p-4">
                <h3 className="text-sm font-bold text-black mb-3 text-center">KEY FEATURES</h3>
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-700">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-400 border border-gray-600 mr-2"></div>
                    PIXEL PERFECT
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-400 border border-gray-600 mr-2"></div>
                    REAL-TIME SIM
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-300 border border-gray-600 mr-2"></div>
                    SAVE/LOAD
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-600 border border-gray-600 mr-2"></div>
                    TRAFFIC AI
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Auth */}
            <div className="space-y-4">
              {/* Auth Panel */}
              <div className="simcity-panel p-6">
                <h3 className="text-lg font-bold text-black mb-4 text-center">GET STARTED</h3>
                
                {!ready ? (
                  <div className="text-center py-8">
                    <div className="text-sm text-gray-600">Loading...</div>
                  </div>
                ) : authenticated ? (
                  <div className="text-center py-8">
                    <div className="text-sm text-green-600 mb-4">Welcome back!</div>
                    <div className="text-xs text-gray-600 mb-4">
                      {user?.email?.address || 'Connected'}
                    </div>
                    <button
                      onClick={logout}
                      className="w-full simcity-button py-3 px-4 text-sm font-bold text-black hover:bg-yellow-300 focus:outline-none"
                    >
                      SIGN OUT
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <div className="text-sm text-gray-700 mb-2">
                        Connect with your wallet or social account
                      </div>
                    </div>

                    <button
                      onClick={handleLogin}
                      disabled={isLoading}
                      className="w-full simcity-button py-3 px-4 text-sm font-bold text-black hover:bg-yellow-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'CONNECTING...' : 'CONNECT WALLET'}
                    </button>

                  </div>
                )}
              </div>

              {/* Why Play Panel */}
              <div className="simcity-panel p-4">
                <h3 className="text-sm font-bold text-black mb-3 text-center">WHY PLAY AGENTVERSE?</h3>
                <div className="space-y-2 text-xs text-gray-700">
                  <div>• Nostalgic SimCity-style gameplay</div>
                  <div>• No downloads required - play in browser</div>
                  <div>• Real-time city simulation with traffic</div>
                  <div>• Save and share your cities</div>
                  <div>• Perfect for quick city-building sessions</div>
                </div>
              </div>

              {/* Stats Panel */}
              <div className="simcity-panel p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-black">1000+</div>
                    <div className="text-xs text-gray-600">PLAYERS</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-black">50+</div>
                    <div className="text-xs text-gray-600">CITIES</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-black">24/7</div>
                    <div className="text-xs text-gray-600">ONLINE</div>
                  </div>
                </div>
              </div>

              {/* Footer Panel */}
              <div className="simcity-panel p-3 text-center">
                <p className="text-xs text-gray-700">© 2024 AGENTVERSE. BUILD YOUR DREAM CITY.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
