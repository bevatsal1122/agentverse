import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/contexts/AuthContext';

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
    <div className="h-screen amongus-grid overflow-hidden relative">
      {/* Among Us Style Background */}
      <div className="absolute inset-0">
        {/* Space Station Buildings */}
        <div className="absolute top-16 left-16 w-48 h-36 amongus-building rounded-lg">
          <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg"></div>
          <div className="absolute top-3 left-3 w-4 h-4 amongus-window rounded-sm"></div>
          <div className="absolute top-3 right-3 w-4 h-4 amongus-window rounded-sm"></div>
          <div className="absolute bottom-3 left-3 w-4 h-4 amongus-window rounded-sm"></div>
          <div className="absolute bottom-3 right-3 w-4 h-4 amongus-window rounded-sm"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 amongus-window rounded-sm"></div>
        </div>
        
        <div className="absolute top-24 right-20 w-40 h-28 amongus-building rounded-lg">
          <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg"></div>
          <div className="absolute top-3 left-3 w-4 h-4 amongus-window rounded-sm"></div>
          <div className="absolute top-3 right-3 w-4 h-4 amongus-window rounded-sm"></div>
          <div className="absolute bottom-3 left-3 w-4 h-4 amongus-window rounded-sm"></div>
        </div>
        
        <div className="absolute bottom-24 left-24 w-44 h-32 amongus-building rounded-lg">
          <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg"></div>
          <div className="absolute top-3 left-3 w-4 h-4 amongus-window rounded-sm"></div>
          <div className="absolute top-3 right-3 w-4 h-4 amongus-window rounded-sm"></div>
          <div className="absolute bottom-3 left-3 w-4 h-4 amongus-window rounded-sm"></div>
          <div className="absolute bottom-3 right-3 w-4 h-4 amongus-window rounded-sm"></div>
        </div>
        
        <div className="absolute bottom-20 right-12 w-36 h-24 amongus-building rounded-lg">
          <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg"></div>
          <div className="absolute top-3 left-3 w-4 h-4 amongus-window rounded-sm"></div>
          <div className="absolute top-3 right-3 w-4 h-4 amongus-window rounded-sm"></div>
        </div>

        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-cyan-300 rounded-full opacity-80 animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-blue-300 rounded-full opacity-70 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-cyan-400 rounded-full opacity-50 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/6 w-1 h-1 bg-purple-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute bottom-1/2 right-1/6 w-1.5 h-1.5 bg-indigo-400 rounded-full opacity-70 animate-pulse"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-start justify-center h-full p-4 pt-8">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column - Game Preview */}
            <div className="space-y-6">
              {/* Title Panel */}
              <div className="amongus-panel p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mr-4 flex items-center justify-center shadow-lg">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-wider">AGENTVERSE</h1>
                    <p className="text-lg text-blue-300 font-semibold">SPACE STATION BUILDER</p>
                  </div>
                </div>
                <div className="text-sm text-cyan-300 font-medium">
                  BUILD • MANAGE • EXPLORE
                </div>
              </div>

              {/* Game Preview Panel */}
              <div className="amongus-panel p-4">
                <h3 className="text-lg font-bold text-white mb-4 text-center">STATION PREVIEW</h3>
                <div className="bg-gray-700 border-2 border-gray-500 rounded-lg p-4">
                  {/* Mini Station Preview */}
                  <div className="grid grid-cols-8 gap-1 mb-3">
                    {Array.from({ length: 64 }).map((_, i) => {
                      const colors = ['bg-blue-500', 'bg-gray-600', 'bg-purple-500', 'bg-cyan-400', 'bg-gray-700'];
                      const color = colors[Math.floor(Math.random() * colors.length)];
                      return (
                        <div key={i} className={`w-4 h-4 border border-gray-400 rounded-sm ${color}`}></div>
                      );
                    })}
                  </div>
                  <div className="text-sm text-cyan-300 text-center font-medium">
                    REAL-TIME SPACE STATION SIMULATION
                  </div>
                </div>
              </div>

              {/* What You Can Do Panel */}
              <div className="amongus-panel p-4">
                <h3 className="text-lg font-bold text-white mb-4 text-center">STATION FEATURES</h3>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-500 border border-gray-400 rounded-sm mr-3"></div>
                    <span>• Design living quarters and crew accommodations</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-500 border border-gray-400 rounded-sm mr-3"></div>
                    <span>• Build research labs and scientific facilities</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-cyan-400 border border-gray-400 rounded-sm mr-3"></div>
                    <span>• Create engineering bays and maintenance areas</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-600 border border-gray-400 rounded-sm mr-3"></div>
                    <span>• Plan corridor networks and transportation systems</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 border border-gray-400 rounded-sm mr-3"></div>
                    <span>• Add life support systems and power generators</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 border border-gray-400 rounded-sm mr-3"></div>
                    <span>• Watch your station grow with crew and automated systems</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Auth */}
            <div className="space-y-6">
              {/* Auth Panel */}
              <div className="amongus-panel p-6">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">GET STARTED</h3>
                
                {!ready ? (
                  <div className="text-center py-8">
                    <div className="text-lg text-blue-300 mb-4">Initializing...</div>
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>
                ) : authenticated ? (
                  <div className="text-center py-8">
                    <div className="text-lg text-green-400 mb-4 font-semibold">Welcome back, Crewmate!</div>
                    <div className="text-sm text-gray-300 mb-6">
                      {user?.email?.address || 'Connected'}
                    </div>
                    <button
                      onClick={logout}
                      className="w-full amongus-button py-3 px-4 text-sm font-bold text-white focus:outline-none"
                    >
                      DISCONNECT
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <div className="text-lg text-blue-300 mb-2 font-medium">
                        Connect to the Space Station
                      </div>
                      <div className="text-sm text-gray-400">
                        Use your wallet or social account to join
                      </div>
                    </div>

                    <button
                      onClick={handleLogin}
                      disabled={isLoading}
                      className="w-full amongus-button py-4 px-6 text-lg font-bold text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'CONNECTING...' : 'CONNECT WALLET'}
                    </button>

                  </div>
                )}
              </div>

              {/* Why Play Panel */}
              <div className="amongus-panel p-4">
                <h3 className="text-lg font-bold text-white mb-4 text-center">WHY JOIN AGENTVERSE?</h3>
                <div className="space-y-3 text-sm text-gray-300">
                  <div>• Immersive space station building experience</div>
                  <div>• No downloads required - play in browser</div>
                  <div>• Real-time station simulation with crew AI</div>
                  <div>• Save and share your space stations</div>
                  <div>• Perfect for quick building sessions</div>
                </div>
              </div>

              {/* Stats Panel */}
              <div className="amongus-panel p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-white">1000+</div>
                    <div className="text-sm text-blue-300">CREWMATES</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">50+</div>
                    <div className="text-sm text-blue-300">STATIONS</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">24/7</div>
                    <div className="text-sm text-blue-300">ONLINE</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
