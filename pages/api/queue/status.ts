import type { NextApiRequest, NextApiResponse } from 'next';
import { taskQueueService } from '../../services/taskQueueService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const allHierarchicalQueues = taskQueueService.getAllHierarchicalQueues();
    
    console.log('🔍 All hierarchical queues:', allHierarchicalQueues);
    console.log('🔍 Queue keys:', Object.keys(allHierarchicalQueues));
    
    // Transform hierarchical tasks into the required format
    const formattedTasks: any[] = [];
    
    Object.entries(allHierarchicalQueues).forEach(([agentAddress, queueData]) => {
      if (queueData.tasks && queueData.tasks.length > 0) {
        queueData.tasks.forEach((task, index) => {
          // Since the system only creates subtasks, we'll format them as master tasks
          const masterTask = {
            id: parseInt(task.id.replace(/\D/g, '')) || Date.now() + index,
            user_id: 2, // Default user_id as shown in example
            agent_address: agentAddress,
            prompt: task.taskData.prompt,
            media_b64: task.taskData.media_b64 || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAA...",
            created_at: new Date(task.timestamp).toISOString().replace('T', ' ').substring(0, 19),
            agentic_tasks: [
              {
                id: 1,
                task_id: parseInt(task.id.replace(/\D/g, '')) || Date.now() + index,
                prompt: task.taskData.prompt,
                media_b64: task.taskData.media_b64 || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAA...",
                agent_address: agentAddress,
                created_at: new Date(task.timestamp).toISOString().replace('T', ' ').substring(0, 19)
              }
            ]
          };
          formattedTasks.push(masterTask);
        });
      }
    });
    
    return res.status(200).json(formattedTasks);

  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
