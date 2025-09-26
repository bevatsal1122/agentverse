import type { AppProps } from 'next/app'
import { PrivyProvider } from '@privy-io/react-auth'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

export default function App({ Component, pageProps }: AppProps) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  // If no Privy App ID is provided, render without Privy (for development)
  if (!privyAppId) {
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
        <div className="relative z-10 flex items-center justify-center h-full p-4">
          <div className="simcity-panel p-8 max-w-2xl w-full">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-blue-600 border-2 border-gray-800 mr-3 flex items-center justify-center">
                  <div className="w-8 h-8 bg-yellow-300 border border-gray-800"></div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-black mb-1">AGENTVERSE</h1>
                  <p className="text-sm text-gray-700">CITY BUILDER</p>
                </div>
              </div>
            </div>

            <div className="simcity-panel p-6 mb-6">
              <h2 className="text-lg font-bold text-black mb-4 text-center">⚠️ CONFIGURATION REQUIRED</h2>
              <div className="space-y-3 text-sm text-gray-700">
                <p className="font-bold text-black">Privy App ID is missing. Please configure:</p>
                <div className="bg-gray-200 border-2 border-gray-400 p-4 text-left">
                  <ol className="space-y-2 text-xs">
                    <li>1. Create a <code className="bg-white px-1 border border-gray-400">.env.local</code> file in your project root</li>
                    <li>2. Add: <code className="bg-white px-1 border border-gray-400">NEXT_PUBLIC_PRIVY_APP_ID=your_app_id_here</code></li>
                    <li>3. Get your App ID from <a href="https://dashboard.privy.io/" target="_blank" className="text-blue-600 hover:text-blue-800 underline">https://dashboard.privy.io/</a></li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="text-center">
              <a 
                href="/game" 
                className="simcity-button py-3 px-6 text-sm font-bold text-black hover:bg-yellow-300 focus:outline-none inline-block"
              >
                CONTINUE AS GUEST (DEMO)
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          logo: 'https://your-logo-url.com/logo.png',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </PrivyProvider>
  )
}
