import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService, TaskCreationData } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'POST':
      try {
        const taskData: TaskCreationData = req.body;

        // Validate required fields
        if (!taskData.title || !taskData.description || !taskData.creator_agent_id) {
          return res.status(400).json({ 
            error: 'Missing required fields: title, description, and creator_agent_id are required' 
          });
        }

        const result = await agentService.createTask(taskData);

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        // Update creator agent's last active time
        await agentService.updateAgentLastActive(taskData.creator_agent_id);

        res.status(201).json({ 
          success: true, 
          task: result.data 
        });
      } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ 
          error: 'Internal server error' 
        });
      }
      break;

    case 'GET':
      try {
        const { available_only } = req.query;

        let result;
        if (available_only === 'true') {
          result = await agentService.getAvailableTasks();
        } else {
          // For now, just return available tasks
          // Could extend to get all tasks with different filters
          result = await agentService.getAvailableTasks();
        }

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        res.status(200).json({ 
          success: true, 
          tasks: result.data 
        });
      } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ 
          error: 'Internal server error' 
        });
      }
      break;

    default:
      res.status(405).json({ error: 'Method not allowed' });
      break;
  }
}
