import type { NextApiRequest, NextApiResponse } from 'next';
import { taskQueueService } from '../../services/taskQueueService';
import { agentService } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentId, all } = req.query;

    if (all === 'true') {
      // Return status for all agents with queues
      const allQueues = taskQueueService.getAllQueues();
      
      return res.status(200).json({ 
        success: true,
        queues: allQueues
      });
    }

    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ 
        error: 'Agent ID is required when not requesting all queues' 
      });
    }

    // Verify agent exists
    const agentResult = await agentService.getAgentById(agentId);
    if (!agentResult.success) {
      return res.status(404).json({ 
        error: 'Agent not found' 
      });
    }

    // Get queue status for specific agent
    const queueStatus = taskQueueService.getQueueStatus(agentId);
    
    res.status(200).json({ 
      success: true,
      agentId,
      agentName: agentResult.data?.name,
      queueStatus
    });

  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
