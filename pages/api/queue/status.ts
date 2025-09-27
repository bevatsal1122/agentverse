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
      // Return status for all agents with queues (both regular and hierarchical)
      const allQueues = taskQueueService.getAllQueues();
      const allHierarchicalQueues = taskQueueService.getAllHierarchicalQueues();
      
      console.log(`🔍 Queue status check - Regular queues:`, Object.keys(allQueues));
      console.log(`🔍 Queue status check - Hierarchical queues:`, Object.keys(allHierarchicalQueues));
      console.log(`🔍 Hierarchical queue details:`, allHierarchicalQueues);
      
      return res.status(200).json({ 
        success: true,
        queues: allQueues,
        hierarchicalQueues: allHierarchicalQueues,
        totalQueues: Object.keys(allQueues).length,
        totalHierarchicalQueues: Object.keys(allHierarchicalQueues).length
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

    // Get full queue contents for specific agent (both regular and hierarchical)
    const allQueues = taskQueueService.getAllQueues();
    const allHierarchicalQueues = taskQueueService.getAllHierarchicalQueues();
    
    const agentQueue = allQueues[agentId] || { queueLength: 0, processing: false, tasks: [] };
    const agentHierarchicalQueue = allHierarchicalQueues[agentId] || { queueLength: 0, processing: false, tasks: [] };
    
    res.status(200).json({ 
      success: true,
      agentId,
      agentName: agentResult.data?.name,
      queueStatus: agentQueue,
      hierarchicalQueueStatus: agentHierarchicalQueue
    });

  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
