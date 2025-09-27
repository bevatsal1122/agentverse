import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../services/agentService';
import { chatGPTService } from '../../services/geminiService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { taskData, excludeAgentId } = req.body;

    if (!taskData || !taskData.title || !taskData.description) {
      return res.status(400).json({ 
        error: 'Task data with title and description is required' 
      });
    }

    // Get all available agents
    const availableAgentsResult = await agentService.getActiveAgents();
    if (!availableAgentsResult.success || !availableAgentsResult.data) {
      return res.status(400).json({ 
        error: 'No available agents found' 
      });
    }

    // Filter out excluded agent if specified
    let availableAgents = availableAgentsResult.data;
    if (excludeAgentId) {
      availableAgents = availableAgents.filter(agent => agent.id !== excludeAgentId);
    }

    if (availableAgents.length === 0) {
      return res.status(400).json({ 
        error: 'No agents available for analysis' 
      });
    }

    // Get AI recommendation
    const aiResult = await chatGPTService.selectBestAgent({
      taskTitle: taskData.title,
      taskDescription: taskData.description,
      availableAgents
    });

    if (!aiResult.success) {
      return res.status(500).json({ 
        error: 'AI analysis failed',
        details: aiResult.error
      });
    }

    // Get additional details about recommended and alternative agents
    const recommendedAgent = availableAgents.find(agent => agent.id === aiResult.recommendation?.recommendedAgentId);
    const alternativeAgents = aiResult.recommendation?.alternativeAgents?.map((alt: any) => ({
      ...alt,
      agent: availableAgents.find(agent => agent.id === alt.agentId)
    })) || [];

    res.status(200).json({
      success: true,
      analysis: {
        recommendation: aiResult.recommendation,
        recommendedAgent,
        alternativeAgents,
        totalAgentsAnalyzed: availableAgents.length,
        analysisTimestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error analyzing agents:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}