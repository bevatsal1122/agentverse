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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border-2 border-gray-600 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-600 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full mr-3 flex items-center justify-center">
                <div className="w-5 h-5 bg-white rounded-full"></div>
              </div>
              Available Agents
            </h2>
            <div className="text-sm text-gray-400">
              {agents.length} total agents
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Filter buttons */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                All ({agents.length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filter === 'active' ? 'bg-green-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Active ({agents.filter(a => a.status === 'active').length})
              </button>
              <button
                onClick={() => setFilter('inactive')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filter === 'inactive' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Inactive ({agents.filter(a => a.status === 'inactive').length})
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-gray-300">Loading agents...</div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-red-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-red-400 text-lg font-semibold mb-2">Error Loading Agents</div>
                <div className="text-gray-400 mb-4">{error}</div>
                <button
                  onClick={fetchAgents}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-gray-400 text-lg">No agents found</div>
                <div className="text-sm text-gray-500">
                  {filter !== 'all' ? `No ${filter} agents available` : 'No agents have been registered yet'}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:bg-gray-750 transition-colors"
                >
                  {/* Agent Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {agent.avatar_url ? (
                          <img
                            src={agent.avatar_url}
                            alt={agent.name}
                            className="w-12 h-12 rounded-full border-2 border-gray-600"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-gray-600">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-gray-800">
                                {agent.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                        {/* Status indicator */}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${
                          agent.status === 'active' ? 'bg-green-500' :
                          agent.status === 'busy' ? 'bg-yellow-500' :
                          agent.status === 'inactive' ? 'bg-gray-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg">{agent.name}</h3>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                          {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agent Description */}
                  {agent.description && (
                    <p className="text-gray-300 text-sm mb-3" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {agent.description}
                    </p>
                  )}

                  {/* Agent Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <div className="text-white font-semibold">{agent.level}</div>
                      <div className="text-xs text-gray-400">Level</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{agent.experience_points}</div>
                      <div className="text-xs text-gray-400">XP</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{agent.reputation_score}</div>
                      <div className="text-xs text-gray-400">Rep</div>
                    </div>
                  </div>

                  {/* Capabilities */}
                  {agent.capabilities && agent.capabilities.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1">Capabilities:</div>
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities.slice(0, 3).map((capability, index) => (
                          <span
                            key={index}
                            className="inline-block bg-blue-900/30 text-blue-300 px-2 py-1 rounded text-xs"
                          >
                            {capability}
                          </span>
                        ))}
                        {agent.capabilities.length > 3 && (
                          <span className="inline-block bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                            +{agent.capabilities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Buildings Assigned */}
                  {agent.assigned_building_ids && agent.assigned_building_ids.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1">Assigned Buildings:</div>
                      <div className="text-sm text-white">
                        {agent.assigned_building_ids.length} building{agent.assigned_building_ids.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}

                  {/* Last Active */}
                  <div className="text-xs text-gray-400 border-t border-gray-700 pt-2">
                    <div className="flex justify-between">
                      <span>Last active:</span>
                      <span>{getActivityStatus(agent.last_active)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Joined:</span>
                      <span>{formatDate(agent.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 border-t border-gray-600 p-4 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {filteredAgents.length} of {agents.length} agents
          </div>
          <button
            onClick={fetchAgents}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentsList;
