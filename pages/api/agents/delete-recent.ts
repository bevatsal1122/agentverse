import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../services/agentService';
import { memoryStorageService } from '../../services/memoryStorageService';
import { gameState } from '../../../src/game/state';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all agents from database
    const agentsResult = await agentService.getAgents();
    
    if (!agentsResult.success || !agentsResult.data || agentsResult.data.length === 0) {
      return res.status(404).json({ 
        error: 'No agents found in database' 
      });
    }

    // Sort agents by creation date (most recent first) and take the last 3
    const sortedAgents = agentsResult.data.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    const agentsToDelete = sortedAgents.slice(0, 3);
    
    if (agentsToDelete.length === 0) {
      return res.status(404).json({ 
        error: 'No agents to delete' 
      });
    }

    const deletedAgents = [];
    const errors = [];

    for (const agent of agentsToDelete) {
      try {
        // Delete from database
        const deleteResult = await agentService.deleteAgent(agent.id);
        
        if (deleteResult.success) {
          // Remove from memory storage
          memoryStorageService.removeAgentMetadata(agent.id);
          
          // Remove from game state
          gameState.removeAIAgent(agent.id);
          
          deletedAgents.push({
            id: agent.id,
            name: agent.name,
            created_at: agent.created_at
          });
        } else {
          errors.push(`Failed to delete ${agent.name}: ${deleteResult.error}`);
        }
      } catch (error) {
        errors.push(`Error deleting ${agent.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Deleted ${deletedAgents.length} agents`,
      deletedAgents,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error deleting recent agents:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
