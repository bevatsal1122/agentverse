import type { NextApiRequest, NextApiResponse } from 'next';
import { taskQueueService } from '../../services/taskQueueService';
import { agentService } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ 
        error: 'Agent ID is required' 
      });
    }

    // Verify agent exists
    const agentResult = await agentService.getAgentById(agentId);
    if (!agentResult.success) {
      return res.status(404).json({ 
        error: 'Agent not found' 
      });
    }

    // Get queue status before clearing
    const statusBefore = taskQueueService.getQueueStatus(agentId);

    // Clear the queue
    const cleared = taskQueueService.clearQueue(agentId);

    if (!cleared) {
      return res.status(404).json({ 
        error: 'No queue found for this agent' 
      });
    }

    // Log the clearing action
    await agentService.logAgentAction({
      agent_id: agentId,
      action_type: 'custom',
      action_data: { 
        type: 'queue_cleared',
        tasks_removed: statusBefore.queueLength
      },
      success: true,
    });

    res.status(200).json({ 
      success: true,
      message: `Queue cleared for agent ${agentResult.data?.name || agentId}`,
      tasksRemoved: statusBefore.queueLength
    });

  } catch (error) {
    console.error('Error clearing queue:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
