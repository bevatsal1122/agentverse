import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../services/agentService';
import { chatGPTService } from '../../services/geminiService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all agents
    const agentsResult = await agentService.getAgents();
    if (!agentsResult.success || !agentsResult.data) {
      return res.status(400).json({ 
        error: 'No agents found' 
      });
    }

    const agents = agentsResult.data;

    // Get AI analysis of agent capabilities
    const analysisResult = await chatGPTService.analyzeAgentCapabilities(agents as any);

    if (!analysisResult.success) {
      return res.status(500).json({ 
        error: 'AI analysis failed',
        details: analysisResult.error
      });
    }

    res.status(200).json({
      success: true,
      agentCount: agents.length,
      analysis: analysisResult.analysis,
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        capabilities: agent.capabilities,
        status: agent.status,
        level: agent.level,
        reputation_score: agent.reputation_score,
        experience_points: agent.experience_points
      })),
      analysisTimestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing agent capabilities:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
