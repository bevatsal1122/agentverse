import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { agent_id } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Task ID is required' });
  }

  if (!agent_id) {
    return res.status(400).json({ error: 'Agent ID is required' });
  }

  try {
    const result = await agentService.assignTaskToAgent(id, agent_id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Update agent's last active time
    await agentService.updateAgentLastActive(agent_id);

    res.status(200).json({ 
      success: true, 
      task: result.data 
    });
  } catch (error) {
    console.error('Error assigning task to agent:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
