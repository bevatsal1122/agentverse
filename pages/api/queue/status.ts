import type { NextApiRequest, NextApiResponse } from 'next';
import { taskQueueService } from '../../services/taskQueueService';
import { redisService } from '../../services/redisService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch from Redis directly to ensure we get persistent data
    const redisKeys = await redisService.keys('hierarchical_queue:*');
    console.log('🔍 Found Redis queue keys:', redisKeys);
    
    const allHierarchicalQueues: Record<string, any> = {};
    
    for (const key of redisKeys) {
      const agentId = key.replace('hierarchical_queue:', '');
      const tasks = await redisService.get(key) || [];
      
      console.log(`🔍 Agent ${agentId} has ${tasks.length} tasks in Redis`);
      
      allHierarchicalQueues[agentId] = {
        queueLength: tasks.filter((t: any) => t.status === 'queued').length,
        processing: false, // We'll need to track this separately if needed
        tasks: tasks
      };
    }
    
    console.log('🔍 All hierarchical queues from Redis:', allHierarchicalQueues);
    console.log('🔍 Queue keys:', Object.keys(allHierarchicalQueues));
    
    // Transform hierarchical tasks into the required format
    const formattedTasks: any[] = [];
    
    Object.entries(allHierarchicalQueues).forEach(([agentAddress, queueData]) => {
      console.log(`🔍 Processing agent ${agentAddress}, tasks:`, queueData.tasks);
      if (queueData.tasks && queueData.tasks.length > 0) {
        // Use the masterTaskId from the first task to maintain consistency with frontend
        const masterTaskId = queueData.tasks[0].masterTaskId;
        // Use the masterTaskId directly as the task_id (it's already the frontend task ID)
        const task_id = masterTaskId || Date.now().toString();
        const master_id = parseInt(task_id.replace(/\D/g, '')) || Date.now();
        
        queueData.tasks.forEach((task, index) => {
          console.log(`🔍 Task ${index}:`, JSON.stringify(task, null, 2));
          const masterTask = {
            id: master_id,
            task_id: task_id,
            user_id: 2, // Default user_id as shown in example
            agent_address: "agent1q264hdm950xcsz2gjk64yupvy9clqy8zv8rjuuhwaf0208679k0gvee5phn",
            prompt: task.taskData.prompt,
            media_b64: task.taskData.media_b64 || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAA...",
            created_at: new Date(task.timestamp).toISOString().replace('T', ' ').substring(0, 19),
            agentic_tasks: [
              {
                id: task_id,
                task_id: task_id,
                prompt: task.taskData.prompt,
                media_b64: task.taskData.media_b64 || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAA...",
                agent_address: "agent1q264hdm950xcsz2gjk64yupvy9clqy8zv8rjuuhwaf0208679k0gvee5phn",
                created_at: new Date(task.timestamp).toISOString().replace('T', ' ').substring(0, 19)
              }
            ]
          };
          console.log(`🔍 Formatted master task:`, JSON.stringify(masterTask, null, 2));
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
