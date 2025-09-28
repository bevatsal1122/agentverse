import React, { useState, useEffect, useRef } from 'react';
import { gameState, ChatMessage, AIAgent } from '../../src/game/state';

interface LiveFeedProps {
  className?: string;
}

const LiveFeed: React.FC<LiveFeedProps> = ({ className = '' }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiAgents, setAIAgents] = useState<Map<string, AIAgent>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agentsEndRef = useRef<HTMLDivElement>(null);

  // Helper function to get display name (ENS if available, otherwise agent name)
  const getAgentDisplayName = (agent: AIAgent): string => {
    return agent.ens || agent.name;
  };

  useEffect(() => {
    const unsubscribe = gameState.subscribe((state) => {
      setChatMessages(state.chatMessages.slice(-50)); // Keep last 50 messages
      setAIAgents(state.aiAgents);
    });

    return unsubscribe;
  }, []);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current && !isCollapsed) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 10);
    }
  }, [chatMessages, isCollapsed]);

  // Auto-scroll agents panel if needed
  useEffect(() => {
    if (agentsEndRef.current && !isCollapsed) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        agentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 10);
    }
  }, [aiAgents, isCollapsed]);

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'thinking':
        return 'text-cyan-400';
      case 'action':
        return 'text-lime-400';
      case 'interaction':
        return 'text-yellow-400';
      default:
        return 'text-white';
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'thinking':
        return '💭';
      case 'action':
        return '⚡';
      case 'interaction':
        return '🤝';
      default:
        return '💬';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getAgentName = (agentId: string) => {
    if (agentId === 'player') {
      return 'Player';
    }
    const agent = aiAgents.get(agentId);
    return agent?.name || 'Unknown Agent';
  };

  const getAgentColor = (agentId: string) => {
    if (agentId === 'player') {
      return '#0066CC'; // Blue color for player
    }
    const agent = aiAgents.get(agentId);
    return agent?.color || '#ffffff';
  };

  return (
    <div className={`fixed top-20 right-4 pixel-ai-feed ${className}`} style={{ imageRendering: 'pixelated' }}>
      {/* Header */}
      <div 
        className="pixel-ai-feed-header flex items-center justify-between p-3 cursor-pointer hover:bg-opacity-80 transition-all duration-200"
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ imageRendering: 'pixelated' }}
      >
        <div className="flex items-center space-x-2">
          {/* Animated status indicator */}
          <div className="relative">
            <div className="w-3 h-3 bg-gradient-to-br from-green-400 to-emerald-500 border border-green-300 shadow-lg" style={{ imageRendering: 'pixelated' }}></div>
            <div className="absolute inset-0 w-3 h-3 bg-green-400 opacity-30 animate-pulse" style={{ imageRendering: 'pixelated' }}></div>
          </div>
          <span className="text-sm font-bold text-white pixel-text-shadow tracking-wide" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
            AI FEED
          </span>
          <span className="text-xs text-yellow-300 font-bold pixel-text-shadow" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
            ({aiAgents.size})
          </span>
        </div>
        <span className="text-white text-sm font-bold pixel-text-shadow hover:scale-110 transition-transform" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
          {isCollapsed ? '▼' : '▲'}
        </span>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="w-80 max-h-96 overflow-hidden flex flex-col">
          {/* Agent Status Panel */}
          <div className="pixel-ai-feed-section p-3" style={{ imageRendering: 'pixelated' }}>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-gradient-to-br from-blue-400 to-cyan-500 border border-blue-300" style={{ imageRendering: 'pixelated' }}></div>
              <span className="text-sm font-bold text-white pixel-text-shadow tracking-wide" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
                AGENTS
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-20 overflow-y-auto">
              {Array.from(aiAgents.values()).map((agent) => (
                <div key={agent.id} className="pixel-agent-item flex items-center space-x-2 p-2" style={{ imageRendering: 'pixelated' }}>
                  <div 
                    className="w-3 h-3 border border-white shadow-sm" 
                    style={{ backgroundColor: agent.color, imageRendering: 'pixelated' }}
                  ></div>
                  <span className="text-white truncate font-bold text-sm pixel-text-shadow" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
                    {getAgentDisplayName(agent)}
                  </span>
                  <span className="text-yellow-300 text-xs uppercase font-bold pixel-text-shadow" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
                    {agent.activity.replace('_', ' ')}
                  </span>
                </div>
              ))}
              {/* Invisible element to scroll to for agents */}
              <div ref={agentsEndRef} />
            </div>
          </div>

          {/* Chat Messages */}
          <div className="pixel-ai-feed-section flex-1 overflow-y-auto p-3 space-y-2 max-h-56" style={{ imageRendering: 'pixelated' }}>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-gradient-to-br from-yellow-400 to-orange-500 border border-yellow-300" style={{ imageRendering: 'pixelated' }}></div>
              <span className="text-sm font-bold text-white pixel-text-shadow tracking-wide" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
                LIVE FEED
              </span>
            </div>
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-4 pixel-text-shadow" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
                NO ACTIVITY
              </div>
            ) : (
              chatMessages.slice(-15).map((message) => (
                <div key={message.id} className="pixel-message-item flex items-start space-x-2 p-2" style={{ imageRendering: 'pixelated' }}>
                  <span className="text-lg flex-shrink-0" style={{ imageRendering: 'pixelated' }}>{getMessageTypeIcon(message.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <div 
                        className="w-2 h-2 border border-white shadow-sm" 
                        style={{ backgroundColor: getAgentColor(message.agentId), imageRendering: 'pixelated' }}
                      ></div>
                      <span className="text-yellow-300 text-xs font-bold pixel-text-shadow" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <p className={`${getMessageTypeColor(message.type)} break-words text-sm font-bold pixel-text-shadow`} style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
                      {message.message}
                    </p>
                  </div>
                </div>
              ))
            )}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer */}
          <div className="pixel-ai-feed-footer p-2 text-center" style={{ imageRendering: 'pixelated' }}>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-1 h-1 bg-gradient-to-br from-green-400 to-emerald-500 animate-pulse" style={{ imageRendering: 'pixelated' }}></div>
              <span className="text-xs text-green-300 font-bold pixel-text-shadow" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
                SYSTEM ONLINE
              </span>
              <div className="w-1 h-1 bg-gradient-to-br from-green-400 to-emerald-500 animate-pulse" style={{ imageRendering: 'pixelated' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveFeed;
