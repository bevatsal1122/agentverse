import type { NextApiRequest, NextApiResponse } from 'next';
import { gameState } from '../../../src/game/state';
import { taskOrchestratorService } from '../../services/taskOrchestratorService';
import { agentService } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all active agents from game state
    const gameAgents = Array.from(gameState.state.aiAgents.values());
    const activeAgents = gameAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description || 'AI Agent',
      personality: agent.personality || 'friendly',
      capabilities: agent.capabilities || [],
      status: 'active' as const,
      current_building_id: undefined,
      assigned_building_ids: [],
      avatar_url: undefined,
      experience_points: 0,
      level: 1,
      reputation_score: 100,
      last_active: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    if (activeAgents.length === 0) {
      return res.status(400).json({ 
        error: 'No active agents available for task generation',
        message: 'Please create some agents first using /api/agents/create-default'
      });
    }

    // Fetch enriched agent data from database to show what will be sent to ChatGPT
    const enrichedAgentInfo = await Promise.all(
      activeAgents.map(async (agent) => {
        try {
          const fullAgentResult = await agentService.getAgentById(agent.id);
          if (fullAgentResult.success && fullAgentResult.data) {
            return {
              id: fullAgentResult.data.id,
              name: fullAgentResult.data.name,
              description: fullAgentResult.data.description,
              capabilities: fullAgentResult.data.capabilities,
              personality: fullAgentResult.data.personality,
              level: fullAgentResult.data.level,
              experience_points: fullAgentResult.data.experience_points,
              reputation_score: fullAgentResult.data.reputation_score,
              owner_address: fullAgentResult.data.owner_address,
              created_at: fullAgentResult.data.created_at
            };
          } else {
            return {
              id: agent.id,
              name: agent.name,
              description: agent.description,
              capabilities: agent.capabilities,
              personality: agent.personality,
              level: agent.level,
              experience_points: agent.experience_points,
              reputation_score: agent.reputation_score,
              note: 'Could not fetch full database data'
            };
          }
        } catch (error) {
          return {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            capabilities: agent.capabilities,
            personality: agent.personality,
            level: agent.level,
            experience_points: agent.experience_points,
            reputation_score: agent.reputation_score,
            note: 'Error fetching database data'
          };
        }
      })
    );

    res.status(200).json({
      success: true,
      message: 'Available agents for task orchestration (with database data)',
      availableAgents: enrichedAgentInfo,
      totalAgents: activeAgents.length,
      nextStep: 'Use POST /api/tasks/generate-collaborative with body: {"userId": "1"} to generate a task',
      note: 'This shows the enriched agent data that will be sent to ChatGPT, including full database descriptions and capabilities'
    });

  } catch (error) {
    console.error('Error testing orchestration:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
