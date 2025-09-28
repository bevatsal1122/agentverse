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
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

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
      
      // Auto-refresh every 10 seconds to show dynamic values
      const interval = setInterval(() => {
        fetchAgents();
        setLastUpdate(new Date());
      }, 10000);
      
      return () => clearInterval(interval);
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
    <div className="fixed inset-0 retro-grid flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(26, 26, 46, 0.95)' }}>
      <div className="retro-panel max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-700 border-b-2 border-gray-500 p-4 flex items-center justify-between" style={{ background: 'linear-gradient(145deg, #404040, #2A2A2A)', borderColor: '#1A1A1A' }}>
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-green-300 flex items-center" style={{ fontFamily: 'Courier New, monospace', letterSpacing: '2px', textShadow: '1px 1px 0px #000000' }}>
              <div className="w-8 h-8 bg-green-500 mr-3 flex items-center justify-center border border-green-300" style={{ imageRendering: 'pixelated' }}>
                <div className="w-4 h-4 bg-green-300" style={{ imageRendering: 'pixelated' }}></div>
              </div>
              CREW.MANIFEST
            </h2>
            <div className="text-sm text-green-300 font-bold" style={{ fontFamily: 'Courier New, monospace', letterSpacing: '1px' }}>
              [{agents.length}] UNITS.DETECTED
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Filter buttons */}
            <div className="bg-gray-800 border border-gray-600 p-2" style={{ background: 'linear-gradient(145deg, #2A2A2A, #1A1A1A)' }}>
              <div className="flex space-x-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`retro-button text-xs ${filter === 'all' ? 'selected' : ''}`}
                >
                  ALL.{agents.length}
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`retro-button text-xs ${filter === 'active' ? 'selected' : ''}`}
                >
                  ACT.{agents.filter(a => a.status === 'active').length}
                </button>
                <button
                  onClick={() => setFilter('inactive')}
                  className={`retro-button text-xs ${filter === 'inactive' ? 'selected' : ''}`}
                >
                  INA.{agents.filter(a => a.status === 'inactive').length}
                </button>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="retro-button text-red-300 hover:text-red-200 p-2 text-lg font-bold"
              title="Close Crew Manifest"
              style={{ background: 'linear-gradient(145deg, #CC3333, #992222)' }}
            >
              [X]
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="retro-panel p-8 text-center">
                <div className="w-12 h-12 border-2 border-green-400 border-t-transparent animate-spin mx-auto mb-6" style={{ imageRendering: 'pixelated' }}></div>
                <div className="text-lg text-green-300 font-bold mb-2" style={{ fontFamily: 'Courier New, monospace', letterSpacing: '1px' }}>SCANNING.DATABASE...</div>
                <div className="text-gray-400 text-sm" style={{ fontFamily: 'Courier New, monospace' }}>ACCESSING.PERSONNEL.RECORDS</div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <div className="retro-panel p-8 text-center">
                <div className="text-red-400 mb-6">
                  <div className="text-4xl mb-4 bg-red-500 text-black p-2 inline-block" style={{ fontFamily: 'Courier New, monospace', imageRendering: 'pixelated' }}>ERROR</div>
                </div>
                <div className="text-red-400 text-lg font-bold mb-4" style={{ fontFamily: 'Courier New, monospace', letterSpacing: '1px' }}>SYSTEM.FAILURE</div>
                <div className="text-gray-300 mb-6 max-w-md text-sm" style={{ fontFamily: 'Courier New, monospace' }}>
                  DATABASE.ACCESS.DENIED: {error}
                </div>
                <button
                  onClick={fetchAgents}
                  className="retro-button"
                >
                  RETRY.SCAN
                </button>
              </div>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="retro-panel p-8 text-center">
                <div className="text-gray-400 mb-6">
                  <div className="text-4xl mb-4 bg-gray-600 text-black p-2 inline-block" style={{ fontFamily: 'Courier New, monospace', imageRendering: 'pixelated' }}>EMPTY</div>
                </div>
                <div className="text-gray-300 text-lg font-bold mb-4" style={{ fontFamily: 'Courier New, monospace', letterSpacing: '1px' }}>NO.UNITS.DETECTED</div>
                <div className="text-gray-400 max-w-md text-sm" style={{ fontFamily: 'Courier New, monospace' }}>
                  {filter !== 'all' ? 
                    `NO.${filter.toUpperCase()}.UNITS.IN.SECTOR` : 
                    'STATION.EMPTY.UNITS.REQUIRED.FOR.OPERATIONS'
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="retro-panel p-4 hover:shadow-lg transition-none"
                  style={{ imageRendering: 'pixelated' }}
                >
                  {/* Agent Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {agent.avatar_url ? (
                          <img
                            src={agent.avatar_url}
                            alt={agent.name}
                            className="w-12 h-12 border-2 border-green-400"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-blue-600 flex items-center justify-center border-2 border-green-400" style={{ imageRendering: 'pixelated' }}>
                            <div className="w-8 h-8 bg-yellow-400 flex items-center justify-center">
                              <span className="text-sm font-bold text-black" style={{ fontFamily: 'Courier New, monospace' }}>
                                {agent.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                        {/* Status indicator */}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 border border-black flex items-center justify-center ${
                          agent.status === 'active' ? 'bg-green-500' :
                          agent.status === 'busy' ? 'bg-yellow-500' :
                          agent.status === 'inactive' ? 'bg-gray-500' : 'bg-red-500'
                        }`} style={{ imageRendering: 'pixelated' }}>
                          <div className="w-2 h-2 bg-white" style={{ imageRendering: 'pixelated' }}></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-green-300 font-bold text-lg" style={{ fontFamily: 'Courier New, monospace', letterSpacing: '1px' }}>{agent.name.toUpperCase()}</h3>
                        <div className={`inline-flex items-center px-2 py-1 text-xs font-bold border ${
                          agent.status === 'active' ? 'bg-green-800 text-green-200 border-green-600' :
                          agent.status === 'busy' ? 'bg-yellow-800 text-yellow-200 border-yellow-600' :
                          agent.status === 'inactive' ? 'bg-gray-800 text-gray-200 border-gray-600' : 'bg-red-800 text-red-200 border-red-600'
                        }`} style={{ fontFamily: 'Courier New, monospace', imageRendering: 'pixelated' }}>
                          [{agent.status.toUpperCase()}]
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agent Description */}
                  {agent.description && (
                    <div className="mb-3 p-2 bg-gray-900 border border-gray-600" style={{ imageRendering: 'pixelated' }}>
                      <div className="text-xs text-green-400 font-bold mb-1" style={{ fontFamily: 'Courier New, monospace' }}>MISSION.DATA:</div>
                      <p className="text-gray-300 text-xs" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontFamily: 'Courier New, monospace',
                        lineHeight: '1.2'
                      }}>
                        {agent.description}
                      </p>
                    </div>
                  )}

                  {/* Agent Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-800 border border-gray-600 p-2 text-center" style={{ imageRendering: 'pixelated' }}>
                      <div className="text-cyan-300 font-bold text-sm" style={{ fontFamily: 'Courier New, monospace' }}>{agent.level}</div>
                      <div className="text-xs text-gray-400 font-bold" style={{ fontFamily: 'Courier New, monospace' }}>LVL</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-600 p-2 text-center" style={{ imageRendering: 'pixelated' }}>
                      <div className="text-yellow-300 font-bold text-sm" style={{ fontFamily: 'Courier New, monospace' }}>{agent.experience_points}</div>
                      <div className="text-xs text-gray-400 font-bold" style={{ fontFamily: 'Courier New, monospace' }}>EXP</div>
                    </div>
                  </div>
                  
                  {/* Capital and Reputation */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-800 border border-gray-600 p-2 text-center" style={{ imageRendering: 'pixelated' }}>
                      <div className="text-green-400 font-bold text-sm" style={{ fontFamily: 'Courier New, monospace' }}>
                        ${agent.total_capital?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-gray-400 font-bold" style={{ fontFamily: 'Courier New, monospace' }}>CAPITAL</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-600 p-2 text-center" style={{ imageRendering: 'pixelated' }}>
                      <div className={`font-bold text-sm ${agent.reputation_score >= 80 ? 'text-green-300' : agent.reputation_score >= 60 ? 'text-yellow-300' : 'text-red-300'}`} style={{ fontFamily: 'Courier New, monospace' }}>
                        {agent.reputation_score}
                      </div>
                      <div className="text-xs text-gray-400 font-bold" style={{ fontFamily: 'Courier New, monospace' }}>REP</div>
                    </div>
                  </div>

                  {/* Capabilities */}
                  {agent.capabilities && agent.capabilities.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-green-400 font-bold mb-1" style={{ fontFamily: 'Courier New, monospace' }}>SKILLS:</div>
                      <div className="flex flex-wrap gap-1">

                        {agent.capabilities.slice(0, 3).map((capability: string, index: number) => (
                          <span
                            key={index}
                            className="inline-block bg-blue-700 text-blue-200 px-2 py-1 text-xs font-bold border border-blue-500"
                            style={{ fontFamily: 'Courier New, monospace', imageRendering: 'pixelated' }}
                          >
                            {capability.toUpperCase()}
                          </span>
                        ))}
                        {agent.capabilities.length > 3 && (
                          <span className="inline-block bg-gray-700 text-gray-300 px-2 py-1 text-xs font-bold border border-gray-500" style={{ fontFamily: 'Courier New, monospace', imageRendering: 'pixelated' }}>
                            +{agent.capabilities.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Buildings Assigned */}
                  {agent.assigned_building_ids && agent.assigned_building_ids.length > 0 && (
                    <div className="mb-3 p-2 bg-gray-900 border border-gray-600" style={{ imageRendering: 'pixelated' }}>
                      <div className="text-xs text-green-400 font-bold mb-1" style={{ fontFamily: 'Courier New, monospace' }}>ASSIGNMENT:</div>
                      <div className="flex items-center space-x-2">
                        <div className="text-yellow-300 text-sm bg-yellow-800 px-1" style={{ fontFamily: 'Courier New, monospace', imageRendering: 'pixelated' }}>[B]</div>
                        <div className="text-white font-bold text-xs" style={{ fontFamily: 'Courier New, monospace' }}>
                          {agent.assigned_building_ids.length}.FACILITIES
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Last Active */}
                  <div className="text-xs text-gray-400 border-t border-gray-600 pt-2 space-y-1" style={{ fontFamily: 'Courier New, monospace' }}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">LAST.SEEN:</span>
                      <span className="text-green-300 font-bold">{getActivityStatus(agent.last_active).replace(' ', '.')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">CREATED:</span>
                      <span className="text-gray-300">{formatDate(agent.created_at).replace(' ', '.')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-700 border-t border-gray-500 p-4 flex items-center justify-between" style={{ background: 'linear-gradient(145deg, #404040, #2A2A2A)', borderColor: '#1A1A1A' }}>
          <div className="text-sm text-green-300 font-bold" style={{ fontFamily: 'Courier New, monospace' }}>
            DISPLAYING.{filteredAgents.length}.OF.{agents.length}.UNITS
            <div className="text-xs text-gray-400 mt-1">
              LAST.UPDATE: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
          <button
            onClick={fetchAgents}
            className="retro-button flex items-center space-x-2"
          >
            <div className="w-3 h-3 border border-white" style={{ imageRendering: 'pixelated' }}></div>
            <span>REFRESH.DATABASE</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentsList;
