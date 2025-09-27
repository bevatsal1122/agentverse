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
    // Get agents from game state directly
    const gameAgents = Array.from(gameState.state.aiAgents.values());
    const gameAgentsMap = gameState.getAIAgents();
    const gameAgentsFromMap = Array.from(gameAgentsMap.values());
    
    res.status(200).json({
      success: true,
      debug: {
        directState: {
          totalAgents: gameAgents.length,
          agents: gameAgents.map(agent => ({
            id: agent.id,
            name: agent.name,
            x: agent.x,
            y: agent.y,
            activity: agent.activity,
            currentThought: agent.currentThought
          }))
        },
        fromMap: {
          totalAgents: gameAgentsFromMap.length,
          agents: gameAgentsFromMap.map(agent => ({
            id: agent.id,
            name: agent.name,
            x: agent.x,
            y: agent.y,
            activity: agent.activity,
            currentThought: agent.currentThought
          }))
        },
        stateKeys: Array.from(gameState.state.aiAgents.keys()),
        mapKeys: Array.from(gameAgentsMap.keys())
      }
    });

  } catch (error) {
    console.error('Error debugging game state:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
