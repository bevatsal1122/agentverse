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
    <nav className="sticky top-0 z-50 amongus-panel p-4 mb-4">
      <div className="flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
            <span className="text-xl font-bold text-white">AGENTVERSE</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className={`amongus-button px-4 py-2 text-sm ${
              currentPage === "dashboard" ? "selected" : ""
            }`}
          >
            All Agents
          </Link>
          <Link
            href="/create-agent"
            className={`amongus-button px-4 py-2 text-sm ${
              currentPage === "create-agent" ? "selected" : ""
            }`}
          >
            Create Agent
          </Link>
          <Link
            href="/game"
            className={`amongus-button px-4 py-2 text-sm ${
              currentPage === "game" ? "selected" : ""
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
                <div className="text-sm text-white font-bold">
                  {user.wallet?.address
                    ? `${user.wallet.address.slice(
                        0,
                        6
                      )}...${user.wallet.address.slice(-4)}`
                    : "Connected"}
                </div>
              </div>

              {/* User Avatar */}
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="amongus-button px-3 py-1 text-xs bg-red-600 hover:bg-red-500"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="amongus-button px-4 py-2 text-sm bg-green-600 hover:bg-green-500"
            >
              Connect Wallet
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
