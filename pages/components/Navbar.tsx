import React from "react";
import Link from "next/link";
import { useAuth } from "../../src/contexts/AuthContext";
import { useRouter } from "next/router";

interface NavbarProps {
  currentPage?: string;
}

export default function Navbar({ currentPage }: NavbarProps) {
  const { authenticated, user, databaseUser, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="sticky top-0 z-50 pixel-header p-4 mb-4">
      <div className="flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-3 hover:scale-105 transition-transform duration-200">
            {/* Pixel-style logo with concentric rings */}
            <div className="relative pixel-logo-glow">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center border-2 border-orange-300 shadow-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center border border-purple-300">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center border border-blue-200">
                    <div className="w-4 h-4 bg-white rounded-full shadow-inner"></div>
                  </div>
                </div>
              </div>
              {/* Pixel-style glow effect */}
              <div className="absolute inset-0 w-10 h-10 bg-orange-400 rounded-full opacity-20 blur-sm animate-pulse"></div>
            </div>
            <span className="text-2xl font-bold text-white tracking-wider pixel-text-shadow">AGENTVERSE</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center space-x-2">
          <Link
            href="/dashboard"
            className={`pixel-button px-4 py-2 text-sm font-bold tracking-wide ${
              currentPage === "dashboard" ? "pixel-button-selected" : "pixel-button-default"
            }`}
          >
            All Agents
          </Link>
          <Link
            href="/create-agent"
            className={`pixel-button px-4 py-2 text-sm font-bold tracking-wide ${
              currentPage === "create-agent" ? "pixel-button-selected" : "pixel-button-default"
            }`}
          >
            Create Agent
          </Link>
          <Link
            href="/game"
            className={`pixel-button px-4 py-2 text-sm font-bold tracking-wide ${
              currentPage === "game" ? "pixel-button-selected" : "pixel-button-default"
            }`}
          >
            Game
          </Link>
        </div>

        {/* User Status */}
        <div className="flex items-center space-x-4">
          {authenticated && user ? (
            <div className="flex items-center space-x-3">
              {/* User Info */}
              <div className="text-right">
                <div className="text-sm text-white font-bold pixel-text-shadow">
                  {user.wallet?.address
                    ? `${user.wallet.address.slice(
                        0,
                        6
                      )}...${user.wallet.address.slice(-4)}`
                    : "Connected"}
                </div>
              </div>

              {/* User Avatar - Pixel Style */}
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center border-2 border-green-300 shadow-lg">
                  <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border border-yellow-200">
                    <div className="w-4 h-4 bg-white rounded-full shadow-inner"></div>
                  </div>
                </div>
                {/* Pixel-style glow effect */}
                <div className="absolute inset-0 w-8 h-8 bg-green-400 rounded-full opacity-20 blur-sm animate-pulse"></div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="pixel-button pixel-button-danger px-3 py-1 text-xs font-bold tracking-wide"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="pixel-button pixel-button-success px-4 py-2 text-sm font-bold tracking-wide"
            >
              Connect Wallet
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
