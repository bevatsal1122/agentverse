import type { NextApiRequest, NextApiResponse } from 'next';
import { memoryStorageService } from '../../../services/memoryStorageService';

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

    // Get all master tasks and their subtasks in the original JSON format
    const allMasterTasks = Array.from(memoryStorageService['masterTasks'].values());
    const allSubtasks = Array.from(memoryStorageService['subtasks'].values());

    // Filter tasks where this agent is either the master or a child agent
    const relevantTasks = allMasterTasks.filter(masterTask => {
      // Check if agent is the master
      if (masterTask.agent_address === agentAddress) {
        return true;
      }
      
      // Check if agent is a child agent in any subtask
      const hasSubtasks = allSubtasks.some(subtask => 
        subtask.task_id === masterTask.id && subtask.agent_address === agentAddress
      );
      
      return hasSubtasks;
    });

    // Format response in the original JSON structure
    const tasksInOriginalFormat = relevantTasks.map(masterTask => {
      const agenticTasks = allSubtasks
        .filter(subtask => subtask.task_id === masterTask.id)
        .map(subtask => ({
          id: parseInt(subtask.id.replace('subtask_', '')) || Math.floor(Math.random() * 1000),
          task_id: parseInt(masterTask.id.replace('master_', '')) || Math.floor(Math.random() * 1000),
          prompt: subtask.prompt,
          media_b64: subtask.media_b64,
          agent_address: subtask.agent_address,
          created_at: subtask.created_at
        }));

      return {
        id: parseInt(masterTask.id.replace('master_', '')) || Math.floor(Math.random() * 1000),
        user_id: parseInt(masterTask.user_id) || 1,
        agent_address: masterTask.agent_address,
        prompt: masterTask.prompt,
        media_b64: masterTask.media_b64,
        created_at: masterTask.created_at,
        agentic_tasks: agenticTasks
      };
    });

    res.status(200).json(tasksInOriginalFormat);

  } catch (error) {
    console.error('Error getting tasks for agent:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
