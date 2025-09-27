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
    <div className={`fixed top-16 right-4 bg-gray-800 border-2 border-gray-600 ${className}`} style={{ imageRendering: 'pixelated' }}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-2 border-b border-gray-400 cursor-pointer hover:bg-gray-700"
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ borderBottom: '1px solid #666', imageRendering: 'pixelated' }}
      >
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400" style={{ imageRendering: 'pixelated' }}></div>
          <span className="text-xs font-bold text-white" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>AI FEED</span>
          <span className="text-xs text-green-300" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>({aiAgents.size})</span>
        </div>
        <span className="text-gray-300 text-xs font-bold" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
          {isCollapsed ? '▼' : '▲'}
        </span>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="w-72 max-h-80 overflow-hidden flex flex-col">
          {/* Agent Status Panel */}
          <div className="p-2 border-b border-gray-600" style={{ borderBottom: '1px solid #666', imageRendering: 'pixelated' }}>
            <div className="text-xs font-bold text-white mb-1" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>AGENTS</div>
            <div className="grid grid-cols-1 gap-1 max-h-16 overflow-y-auto">
              {Array.from(aiAgents.values()).map((agent) => (
                <div key={agent.id} className="flex items-center space-x-1 text-xs" style={{ imageRendering: 'pixelated' }}>
                  <div 
                    className="w-2 h-2" 
                    style={{ backgroundColor: agent.color, imageRendering: 'pixelated' }}
                  ></div>
                  <span className="text-white truncate font-bold" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>{agent.name}</span>
                  <span className="text-gray-400 text-xs uppercase" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
                    {agent.activity.replace('_', ' ')}
                  </span>
                </div>
              ))}
              {/* Invisible element to scroll to for agents */}
              <div ref={agentsEndRef} />
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-48" style={{ imageRendering: 'pixelated' }}>
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-2" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
                NO ACTIVITY
              </div>
            ) : (
              chatMessages.slice(-15).map((message) => (
                <div key={message.id} className="flex items-start space-x-1 text-xs" style={{ imageRendering: 'pixelated' }}>
                  <span className="text-sm" style={{ imageRendering: 'pixelated' }}>{getMessageTypeIcon(message.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1 mb-0">
                      <div 
                        className="w-1 h-1" 
                        style={{ backgroundColor: getAgentColor(message.agentId), imageRendering: 'pixelated' }}
                      ></div>
                      <span className="text-gray-400 text-xs font-bold" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <p className={`${getMessageTypeColor(message.type)} break-words text-xs font-bold`} style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
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
          <div className="p-1 border-t border-gray-600 text-center" style={{ borderTop: '1px solid #666', imageRendering: 'pixelated' }}>
            <span className="text-xs text-gray-400 font-bold" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
              LIVE FEED
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveFeed;
