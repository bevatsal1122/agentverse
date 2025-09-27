import type { NextApiRequest, NextApiResponse } from 'next';
import { gameState } from '../../../src/game/state';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const state = gameState.getState();
    const aiAgents = Array.from(state.aiAgents.values());
    
    res.status(200).json({
      success: true,
      gameState: {
        totalAgents: aiAgents.length,
        agents: aiAgents.map(agent => ({
          id: agent.id,
          name: agent.name,
          type: agent.type,
          x: agent.x,
          y: agent.y,
          activity: agent.activity,
          homeX: agent.homeX,
          homeY: agent.homeY,
          workX: agent.workX,
          workY: agent.workY
        }))
      }
    });

  } catch (error) {
    console.error('Error getting game state:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}