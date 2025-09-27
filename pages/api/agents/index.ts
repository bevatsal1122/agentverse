import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to auth page on initial load
    router.push('/auth');
  }, [router]);

  return (
    <div className="h-screen amongus-grid overflow-hidden relative">
      {/* Among Us Style Background */}
      <div className="absolute inset-0">
        {/* Space Station Buildings */}
        <div className="absolute top-20 left-20 w-40 h-32 amongus-building rounded-lg">
          <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg"></div>
          <div className="absolute top-2 left-2 w-3 h-3 amongus-window rounded-sm"></div>
          <div className="absolute top-2 right-2 w-3 h-3 amongus-window rounded-sm"></div>
          <div className="absolute bottom-2 left-2 w-3 h-3 amongus-window rounded-sm"></div>
          <div className="absolute bottom-2 right-2 w-3 h-3 amongus-window rounded-sm"></div>
        </div>
        
        <div className="absolute top-32 right-24 w-32 h-24 amongus-building rounded-lg">
          <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg"></div>
          <div className="absolute top-2 left-2 w-3 h-3 amongus-window rounded-sm"></div>
          <div className="absolute top-2 right-2 w-3 h-3 amongus-window rounded-sm"></div>
        </div>
        
        <div className="absolute bottom-32 left-32 w-36 h-28 amongus-building rounded-lg">
          <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg"></div>
          <div className="absolute top-2 left-2 w-3 h-3 amongus-window rounded-sm"></div>
          <div className="absolute top-2 right-2 w-3 h-3 amongus-window rounded-sm"></div>
          <div className="absolute bottom-2 left-2 w-3 h-3 amongus-window rounded-sm"></div>
        </div>
        
        <div className="absolute bottom-24 right-16 w-28 h-20 amongus-building rounded-lg">
          <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg"></div>
          <div className="absolute top-2 left-2 w-3 h-3 amongus-window rounded-sm"></div>
        </div>

        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-cyan-300 rounded-full opacity-80 animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-blue-300 rounded-full opacity-70 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-cyan-400 rounded-full opacity-50 animate-pulse"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center h-full p-4">
        <div className="amongus-panel p-8 max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
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
          </div>

          <div className="text-center">
            <div className="text-xl font-bold text-white mb-3">INITIALIZING...</div>
            <div className="text-blue-300 mb-4">Connecting to authentication system</div>
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}