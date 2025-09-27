import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { status, completion_data, agent_id } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Task ID is required' });
  }

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
    });
  }

  try {
    const result = await agentService.updateTaskStatus(id, status, completion_data);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Update agent's last active time if agent_id is provided
    if (agent_id) {
      await agentService.updateAgentLastActive(agent_id);
    }

    res.status(200).json({ 
      success: true, 
      task: result.data 
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
