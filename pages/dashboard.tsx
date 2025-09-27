import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Tables } from "./types/database.types";

type Agent = Tables<"agents">;

// Dummy chat data for testing
const DUMMY_CHATS: { [agentId: string]: any[] } = {
  agent1qvswlr5z7reu5m5rz7cq6jxuxad3x599zxskmryxvl6yw9sqal7xgz5ze5y: [
    {
      id: "1",
      text: "Hello! I'm raghavvvvvvvvvvv. How can I help you today?",
      sender: "agent",
      timestamp: "2024-09-27T18:12:00Z",
    },
    {
      id: "2",
      text: "What can you do?",
      sender: "user",
      timestamp: "2024-09-27T18:13:00Z",
    },
    {
      id: "3",
      text: "I can help with DeFi operations, smart contract interactions, and blockchain transactions. What specific task would you like assistance with?",
      sender: "agent",
      timestamp: "2024-09-27T18:13:30Z",
    },
  ],
  agent2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz: [
    {
      id: "1",
      text: "Welcome! I'm TradingBot Pro, your advanced DeFi trading assistant.",
      sender: "agent",
      timestamp: "2024-09-27T10:45:00Z",
    },
    {
      id: "2",
      text: "Can you help me with yield farming strategies?",
      sender: "user",
      timestamp: "2024-09-27T10:46:00Z",
    },
    {
      id: "3",
      text: "Absolutely! I can analyze current yield farming opportunities, calculate APRs, and suggest optimal strategies based on risk tolerance. Which protocols are you interested in?",
      sender: "agent",
      timestamp: "2024-09-27T10:46:30Z",
    },
  ],
  agent3xyz789uvw456rst123qpo098nml654kji321hgf098edc765ba: [
    {
      id: "1",
      text: "Hi! I'm NFT Collector, specialized in NFT discovery and collection strategies.",
      sender: "agent",
      timestamp: "2024-09-26T14:20:00Z",
    },
    {
      id: "2",
      text: "What's the best NFT collection to invest in?",
      sender: "user",
      timestamp: "2024-09-26T14:21:00Z",
    },
    {
      id: "3",
      text: "I analyze market trends, floor prices, and community sentiment to identify promising collections. Currently, I'm tracking several undervalued projects with strong fundamentals.",
      sender: "agent",
      timestamp: "2024-09-26T14:21:30Z",
    },
  ],
  agent4mno321pqr654stu987vwx210yz543abc876def109ghi432jkl: [
    {
      id: "1",
      text: "Hello! I'm Social Media Manager, ready to help with your online presence.",
      sender: "agent",
      timestamp: "2024-09-27T12:00:00Z",
    },
    {
      id: "2",
      text: "How can you help with social media?",
      sender: "user",
      timestamp: "2024-09-27T12:01:00Z",
    },
    {
      id: "3",
      text: "I can create engaging content, manage posting schedules, analyze engagement metrics, and help grow your community across multiple platforms.",
      sender: "agent",
      timestamp: "2024-09-27T12:01:30Z",
    },
  ],
};

interface AgentCardProps {
  agent: Agent;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const [copied, setCopied] = useState(false);

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "inactive":
        return "bg-red-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Utility: "bg-blue-600",
      DeFi: "bg-green-600",
      Gaming: "bg-purple-600",
      NFT: "bg-pink-600",
      Infrastructure: "bg-orange-600",
      Social: "bg-cyan-600",
      "AI/ML": "bg-indigo-600",
      Other: "bg-gray-600",
    };
    return colors[category] || "bg-gray-600";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div className="amongus-panel p-3">
      <div className="flex items-center justify-between w-full">
        {/* Agent Avatar & Basic Info */}
        <div className="flex items-center space-x-3 w-48">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white truncate">
                {agent.name}
              </h3>
              <div className="flex items-center space-x-1 flex-shrink-0">
                <div
                  className={`w-2 h-2 rounded-full ${getStatusColor(
                    agent.status
                  )}`}
                ></div>
                <span className="text-xs text-gray-300 capitalize">
                  {agent.status || "Unknown"}
                </span>
              </div>
            </div>
            <p className="text-xs text-blue-300 truncate">
              {agent.description || "No description"}
            </p>
          </div>
        </div>

        {/* Agent Address */}
        <div className="flex-1 max-w-md mx-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 min-w-0">
              <span className="text-cyan-300 font-mono text-xs break-all">
                {agent.id}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(agent.id)}
              className="amongus-button px-2 py-1 text-xs flex-shrink-0"
              title="Copy address"
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-6 w-32">
          <div className="text-center">
            <div className="text-xs text-gray-400">Lvl</div>
            <div className="text-sm font-bold text-white">
              {agent.level || 1}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">XP</div>
            <div className="text-sm font-bold text-yellow-400">
              {agent.experience_points || 0}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Rep</div>
            <div className="text-sm font-bold text-green-400">
              {agent.reputation_score || 0}
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="w-32">
          {agent.capabilities && agent.capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {agent.capabilities.map((capability: string, index: number) => (
                <span
                  key={index}
                  className={`px-2 py-1 text-xs text-white rounded-full ${getCategoryColor(
                    capability
                  )}`}
                >
                  {capability}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-20 flex justify-center">
          <Link
            href={`/chat?agentId=${agent.id}&agentName=${encodeURIComponent(
              agent.name
            )}`}
            className="amongus-button px-3 py-1 text-xs bg-green-600 hover:bg-green-500 inline-block"
          >
            Chat
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/agents");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch agents");
      }

      setAgents(data.agents || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshAgents = () => {
    fetchAgents();
  };

  return (
    <div className="h-screen amongus-grid overflow-hidden relative">
      {/* Space Station Background Elements */}
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
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-full p-4">
        {/* Header */}
        <div className="amongus-panel p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mr-3 flex items-center justify-center">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <div className="w-5 h-5 bg-white rounded-full"></div>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  AGENT DASHBOARD
                </h1>
                <p className="text-sm text-blue-300">MANAGE YOUR AI AGENTS</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshAgents}
                className="amongus-button px-4 py-2 text-sm"
              >
                REFRESH
              </button>
              <Link
                href="/create-agent"
                className="amongus-button px-4 py-2 text-sm bg-green-600 hover:bg-green-500"
              >
                CREATE AGENT
              </Link>
              <Link
                href="/"
                className="amongus-button px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500"
              >
                HOME
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="amongus-panel p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {agents.length}
              </div>
              <div className="text-sm text-blue-300">TOTAL AGENTS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {agents.filter((a) => a.status === "active").length}
              </div>
              <div className="text-sm text-blue-300">ACTIVE</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {agents.reduce((sum, a) => sum + (a.experience_points || 0), 0)}
              </div>
              <div className="text-sm text-blue-300">TOTAL XP</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {agents.reduce((sum, a) => sum + (a.reputation_score || 0), 0)}
              </div>
              <div className="text-sm text-blue-300">TOTAL REPUTATION</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="amongus-panel p-8 text-center">
              <div className="text-xl font-bold text-white mb-4">
                LOADING AGENTS...
              </div>
              <div className="text-sm text-blue-300 mb-4">
                Please wait while we fetch your agents
              </div>
              <div className="flex justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          ) : error ? (
            <div className="amongus-panel p-6 text-center">
              <div className="text-red-400 text-lg font-bold mb-2">
                ERROR LOADING AGENTS
              </div>
              <div className="text-gray-300 mb-4">{error}</div>
              <button
                onClick={refreshAgents}
                className="amongus-button px-4 py-2"
              >
                TRY AGAIN
              </button>
            </div>
          ) : agents.length === 0 ? (
            <div className="amongus-panel p-8 text-center">
              <div className="text-xl font-bold text-white mb-4">
                NO AGENTS FOUND
              </div>
              <div className="text-blue-300 mb-6">
                Create your first AI agent to get started!
              </div>
              <Link
                href="/create-agent"
                className="amongus-button px-6 py-3 text-lg bg-green-600 hover:bg-green-500"
              >
                CREATE YOUR FIRST AGENT
              </Link>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
