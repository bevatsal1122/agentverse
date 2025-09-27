import React, { useState, useEffect } from 'react';
import { Agent } from '../types/database.types';

interface AgentsListProps {
  isVisible: boolean;
  onClose: () => void;
}

const AgentsList: React.FC<AgentsListProps> = ({ isVisible, onClose }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/agents');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch agents');
      }
      
      if (data.success && data.agents) {
        setAgents(data.agents);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchAgents();
    }
  }, [isVisible]);

  const filteredAgents = agents.filter(agent => {
    if (filter === 'active') return agent.status === 'active';
    if (filter === 'inactive') return agent.status === 'inactive';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-900/20';
      case 'busy':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'inactive':
        return 'text-gray-400 bg-gray-900/20';
      case 'offline':
        return 'text-red-400 bg-red-900/20';
      default:
        return 'text-gray-400 bg-gray-900/20';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getActivityStatus = (lastActive: string) => {
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 5) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 amongus-grid flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(26, 26, 46, 0.95)' }}>
      <div className="amongus-panel max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 border-b-2 border-gray-600 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-3xl font-bold text-white flex items-center tracking-wider">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mr-4 flex items-center justify-center shadow-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <div className="w-5 h-5 bg-white rounded-full"></div>
                </div>
              </div>
              CREW MANIFEST
            </h2>
            <div className="text-lg text-cyan-300 font-semibold">
              {agents.length} CREWMATES ABOARD
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Filter buttons */}
            <div className="amongus-toolbar p-2">
              <div className="flex space-x-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`amongus-button text-xs ${filter === 'all' ? 'selected' : ''}`}
                >
                  ALL ({agents.length})
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`amongus-button text-xs ${filter === 'active' ? 'selected' : ''}`}
                >
                  ACTIVE ({agents.filter(a => a.status === 'active').length})
                </button>
                <button
                  onClick={() => setFilter('inactive')}
                  className={`amongus-button text-xs ${filter === 'inactive' ? 'selected' : ''}`}
                >
                  INACTIVE ({agents.filter(a => a.status === 'inactive').length})
                </button>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="text-red-400 hover:text-red-300 transition-colors p-2 text-2xl font-bold"
              title="Close Crew Manifest"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="amongus-panel p-8 text-center">
                <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <div className="text-xl text-cyan-300 font-bold mb-2">SCANNING CREW QUARTERS...</div>
                <div className="text-gray-400">Accessing personnel database</div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <div className="amongus-panel p-8 text-center">
                <div className="text-red-400 mb-6">
                  <div className="text-6xl mb-4">⚠️</div>
                </div>
                <div className="text-red-400 text-xl font-bold mb-4 tracking-wider">SYSTEM ERROR</div>
                <div className="text-gray-300 mb-6 max-w-md">
                  Unable to access crew manifest: {error}
                </div>
                <button
                  onClick={fetchAgents}
                  className="amongus-button"
                >
                  RETRY SCAN
                </button>
              </div>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="amongus-panel p-8 text-center">
                <div className="text-gray-400 mb-6">
                  <div className="text-6xl mb-4">👥</div>
                </div>
                <div className="text-gray-300 text-xl font-bold mb-4 tracking-wider">NO CREWMATES DETECTED</div>
                <div className="text-gray-400 max-w-md">
                  {filter !== 'all' ? 
                    `No ${filter} crewmates found in this sector` : 
                    'The space station appears to be empty. Crewmates may need to report for duty.'
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="amongus-panel p-5 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {/* Agent Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        {agent.avatar_url ? (
                          <img
                            src={agent.avatar_url}
                            alt={agent.name}
                            className="w-16 h-16 rounded-full border-3 border-cyan-400 shadow-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-3 border-cyan-400 shadow-lg">
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-lg font-bold text-white">
                                {agent.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                        {/* Status indicator */}
                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-gray-800 flex items-center justify-center ${
                          agent.status === 'active' ? 'bg-green-500' :
                          agent.status === 'busy' ? 'bg-yellow-500' :
                          agent.status === 'inactive' ? 'bg-gray-500' : 'bg-red-500'
                        }`}>
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-xl tracking-wider">{agent.name}</h3>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider ${
                          agent.status === 'active' ? 'bg-green-900/30 text-green-300' :
                          agent.status === 'busy' ? 'bg-yellow-900/30 text-yellow-300' :
                          agent.status === 'inactive' ? 'bg-gray-900/30 text-gray-300' : 'bg-red-900/30 text-red-300'
                        }`}>
                          {agent.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agent Description */}
                  {agent.description && (
                    <div className="mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-600">
                      <div className="text-xs text-cyan-300 font-bold mb-1 tracking-wider">MISSION BRIEF</div>
                      <p className="text-gray-300 text-sm" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {agent.description}
                      </p>
                    </div>
                  )}

                  {/* Agent Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="amongus-building p-2 text-center">
                      <div className="text-cyan-300 font-bold text-lg">{agent.level}</div>
                      <div className="text-xs text-gray-400 font-bold tracking-wider">RANK</div>
                    </div>
                    <div className="amongus-building p-2 text-center">
                      <div className="text-yellow-300 font-bold text-lg">{agent.experience_points}</div>
                      <div className="text-xs text-gray-400 font-bold tracking-wider">EXP</div>
                    </div>
                    <div className="amongus-building p-2 text-center">
                      <div className="text-green-300 font-bold text-lg">{agent.reputation_score}</div>
                      <div className="text-xs text-gray-400 font-bold tracking-wider">REP</div>
                    </div>
                  </div>

                  {/* Capabilities */}
                  {agent.capabilities && agent.capabilities.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-cyan-300 font-bold mb-2 tracking-wider">SPECIALIZATIONS</div>
                      <div className="flex flex-wrap gap-2">
                        {agent.capabilities.slice(0, 3).map((capability, index) => (
                          <span
                            key={index}
                            className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-lg"
                          >
                            {capability.toUpperCase()}
                          </span>
                        ))}
                        {agent.capabilities.length > 3 && (
                          <span className="inline-block bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
                            +{agent.capabilities.length - 3} MORE
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Buildings Assigned */}
                  {agent.assigned_building_ids && agent.assigned_building_ids.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-600">
                      <div className="text-xs text-cyan-300 font-bold mb-1 tracking-wider">SECTOR ASSIGNMENT</div>
                      <div className="flex items-center space-x-2">
                        <div className="text-yellow-300 text-lg">🏢</div>
                        <div className="text-white font-semibold">
                          {agent.assigned_building_ids.length} FACILITY{agent.assigned_building_ids.length !== 1 ? 'S' : ''}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Last Active */}
                  <div className="text-xs text-gray-400 border-t-2 border-gray-600 pt-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold tracking-wider">LAST SEEN:</span>
                      <span className="text-cyan-300 font-semibold">{getActivityStatus(agent.last_active)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold tracking-wider">ENLISTED:</span>
                      <span className="text-gray-300">{formatDate(agent.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 border-t-2 border-gray-600 p-6 flex items-center justify-between">
          <div className="text-sm text-cyan-300 font-bold tracking-wider">
            DISPLAYING {filteredAgents.length} OF {agents.length} CREWMATES
          </div>
          <button
            onClick={fetchAgents}
            className="amongus-button flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>REFRESH SCAN</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentsList;
