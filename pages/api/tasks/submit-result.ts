import type { NextApiRequest, NextApiResponse } from 'next';
import { memoryStorageService } from '../../services/memoryStorageService';
import { agentService } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentAddress, taskId, result } = req.body;

    if (!agentAddress || !taskId || !result) {
      return res.status(400).json({ 
        error: 'Missing required fields: agentAddress, taskId, and result are required' 
      });
    }

    // Find the task (could be master task or subtask)
    const masterTask = memoryStorageService.getMasterTask(taskId);
    const subtask = memoryStorageService.getSubtask(taskId);

    if (!masterTask && !subtask) {
      return res.status(404).json({ 
        error: 'Task not found' 
      });
    }

    // Handle subtask completion
    if (subtask) {
      // Verify the agent address matches
      if (subtask.agent_address !== agentAddress) {
        return res.status(403).json({ 
          error: 'Agent address does not match subtask assignment' 
        });
      }

      // Update subtask with result
      const updatedSubtask = memoryStorageService.updateSubtask(taskId, {
        status: 'completed',
        output: result
      });

      if (!updatedSubtask) {
        return res.status(500).json({ 
          error: 'Failed to update subtask' 
        });
      }

      // Log the action
      await agentService.logAgentAction({
        agent_id: agentAddress,
        action_type: 'custom',
        action_data: { 
          type: 'subtask_completed',
          subtask_id: taskId,
          master_task_id: subtask.task_id,
          result_length: result.length
        },
        task_id: subtask.task_id,
        success: true,
      });

      res.status(200).json({ 
        success: true,
        message: 'Subtask completed successfully',
        task: {
          id: updatedSubtask.id,
          status: updatedSubtask.status,
          output: updatedSubtask.output,
          completed_at: updatedSubtask.completed_at
        }
      });

    } else if (masterTask) {
      // Handle master task completion
      if (masterTask.agent_address !== agentAddress) {
        return res.status(403).json({ 
          error: 'Agent address does not match master task assignment' 
        });
      }

      // Update master task with final result
      const updatedMasterTask = memoryStorageService.updateMasterTask(taskId, {
        status: 'completed',
        final_output: result
      });

      if (!updatedMasterTask) {
        return res.status(500).json({ 
          error: 'Failed to update master task' 
        });
      }

      // Log the action
      await agentService.logAgentAction({
        agent_id: agentAddress,
        action_type: 'custom',
        action_data: { 
          type: 'master_task_completed',
          master_task_id: taskId,
          result_length: result.length
        },
        task_id: taskId,
        success: true,
      });

      res.status(200).json({ 
        success: true,
        message: 'Master task completed successfully',
        task: {
          id: updatedMasterTask.id,
          status: updatedMasterTask.status,
          final_output: updatedMasterTask.final_output,
          completed_at: updatedMasterTask.completed_at
        }
      });
    }

  } catch (error) {
    console.error('Error submitting task result:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
