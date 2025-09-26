import React, { useState } from 'react';
import { useRouter } from 'next/router';

export default function Auth() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just redirect to game - you can add actual auth logic later
    router.push('/game');
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
                
                {/* Toggle Buttons */}
                <div className="flex mb-6 bg-gray-200 border-2 border-gray-400">
                  <button
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 py-3 px-4 text-sm font-bold border-r-2 border-gray-400 ${
                      isLogin
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-black hover:bg-gray-400'
                    }`}
                  >
                    SIGN IN
                  </button>
                  <button
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 py-3 px-4 text-sm font-bold ${
                      !isLogin
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-black hover:bg-gray-400'
                    }`}
                  >
                    SIGN UP
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <label htmlFor="username" className="block text-xs font-bold text-black mb-2">
                        USERNAME:
                      </label>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-white border-2 border-gray-400 text-black text-sm focus:outline-none focus:border-blue-500"
                        placeholder="Enter username"
                        required={!isLogin}
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-black mb-2">
                      EMAIL:
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-400 text-black text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Enter email"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-xs font-bold text-black mb-2">
                      PASSWORD:
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-400 text-black text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Enter password"
                      required
                    />
                  </div>

                  {!isLogin && (
                    <div>
                      <label htmlFor="confirmPassword" className="block text-xs font-bold text-black mb-2">
                        CONFIRM PASSWORD:
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-white border-2 border-gray-400 text-black text-sm focus:outline-none focus:border-blue-500"
                        placeholder="Confirm password"
                        required={!isLogin}
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full simcity-button py-3 px-4 text-sm font-bold text-black hover:bg-yellow-300 focus:outline-none"
                  >
                    {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
                  </button>
                </form>

                {/* Demo Button */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => router.push('/game')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-bold underline"
                  >
                    CONTINUE AS GUEST (DEMO)
                  </button>
                </div>
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
