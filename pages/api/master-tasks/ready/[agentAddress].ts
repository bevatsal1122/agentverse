import type { NextApiRequest, NextApiResponse } from 'next';
import { memoryStorageService } from '../../../../services/memoryStorageService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentAddress } = req.query;

    if (!agentAddress || typeof agentAddress !== 'string') {
      return res.status(400).json({ 
        error: 'Agent address is required' 
      });
    }

    // Get master tasks assigned to this agent that are in_progress (ready for processing)
    const masterTasks = memoryStorageService.getMasterTasksByAgent(agentAddress)
      .filter(task => task.status === 'in_progress' && task.aggregated_results);

    // Get subtask information for each master task
    const tasksWithSubtasks = masterTasks.map(masterTask => {
      const subtasks = memoryStorageService.getSubtasksByTask(masterTask.id);
      return {
        id: masterTask.id,
        user_id: masterTask.user_id,
        agent_address: masterTask.agent_address,
        prompt: masterTask.prompt,
        media_b64: masterTask.media_b64,
        status: masterTask.status,
        aggregated_results: masterTask.aggregated_results,
        created_at: masterTask.created_at,
        subtasks: subtasks.map(subtask => ({
          id: subtask.id,
          prompt: subtask.prompt,
          agent_address: subtask.agent_address,
          status: subtask.status,
          output: subtask.output,
          completed_at: subtask.completed_at
        }))
      };
    });

    res.status(200).json({ 
      success: true,
      agentAddress,
      readyTasks: tasksWithSubtasks,
      count: tasksWithSubtasks.length
    });

  } catch (error) {
    console.error('Error getting ready master tasks:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
