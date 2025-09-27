import type { NextApiRequest, NextApiResponse } from 'next';
import { gameState } from '../../../src/game/state';
import { memoryStorageService } from '../../services/memoryStorageService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get agents from game state
    const gameAgents = Array.from(gameState.state.aiAgents.values());
    
    // Get agents from memory storage
    const memoryAgents = memoryStorageService.getActiveAgents();
    
    res.status(200).json({
      success: true,
      gameState: {
        totalAgents: gameAgents.length,
        agents: gameAgents.map(agent => ({
          id: agent.id,
          name: agent.name,
          type: agent.type,
          x: agent.x,
          y: agent.y,
          activity: agent.activity
        }))
      },
      memoryStorage: {
        totalAgents: memoryAgents.length,
        agents: memoryAgents.map(agent => ({
          id: agent.id,
          name: agent.id, // memory storage doesn't have name field
          status: agent.status
        }))
      }
    });

  } catch (error) {
    console.error('Error getting agent status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
