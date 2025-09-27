import type { NextApiRequest, NextApiResponse } from 'next';
import { taskQueueService } from '../../services/taskQueueService';
import { agentService } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
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

    // Check if agent is already processing a task
    if (taskQueueService.isProcessing(agentId)) {
      return res.status(409).json({ 
        error: 'Agent is already processing a task',
        queueStatus: taskQueueService.getQueueStatus(agentId)
      });
    }

    // Get next task from queue
    const nextTask = taskQueueService.getNextTask(agentId);
    
    if (!nextTask) {
      return res.status(204).json({ 
        message: 'No tasks in queue',
        queueStatus: taskQueueService.getQueueStatus(agentId)
      });
    }

    // Set agent as processing
    taskQueueService.setProcessingStatus(agentId, true);

    try {
      // Create actual task in database
      const taskCreationResult = await agentService.createTask({
        title: nextTask.taskData.title,
        description: nextTask.taskData.description,
        creator_agent_id: nextTask.requestingAgentId,
        task_type: 'custom',
        priority: 'medium'
      });

      if (!taskCreationResult.success) {
        // Mark task as failed and release processing status
        taskQueueService.markTaskFailed(agentId, nextTask.id, taskCreationResult.error);
        taskQueueService.setProcessingStatus(agentId, false);
        
        return res.status(500).json({ 
          error: 'Failed to create task in database',
          details: taskCreationResult.error,
          queuedTaskId: nextTask.id
        });
      }

      // Assign task to the target agent
      const assignResult = await agentService.assignTaskToAgent(
        taskCreationResult.data!.id, 
        agentId
      );

      if (!assignResult.success) {
        // Mark task as failed and release processing status
        taskQueueService.markTaskFailed(agentId, nextTask.id, assignResult.error);
        taskQueueService.setProcessingStatus(agentId, false);
        
        return res.status(500).json({ 
          error: 'Failed to assign task to agent',
          details: assignResult.error,
          queuedTaskId: nextTask.id
        });
      }

      // Mark queued task as completed and release processing status
      taskQueueService.markTaskCompleted(agentId, nextTask.id);
      taskQueueService.setProcessingStatus(agentId, false);

      // Update agent's last active time
      await agentService.updateAgentLastActive(agentId);

      // Get agent's building information for context
      const buildingInfo = await agentService.getAgentBuildingInfo(agentId);

      // Log the processing action
      await agentService.logAgentAction({
        agent_id: agentId,
        action_type: 'custom',
        action_data: { 
          type: 'queued_task_processed',
          queued_task_id: nextTask.id,
          database_task_id: taskCreationResult.data!.id,
          requesting_agent_id: nextTask.requestingAgentId,
          agent_building: buildingInfo.success ? buildingInfo.data?.currentBuildingId : null
        },
        building_id: buildingInfo.success ? buildingInfo.data?.currentBuildingId || undefined : undefined,
        task_id: taskCreationResult.data!.id,
        success: true,
      });

      res.status(200).json({ 
        success: true,
        processedTask: {
          queuedTaskId: nextTask.id,
          databaseTaskId: taskCreationResult.data!.id,
          task: assignResult.data,
          requestingAgent: nextTask.requestingAgentId,
          agentBuilding: buildingInfo.success ? buildingInfo.data : null
        },
        queueStatus: taskQueueService.getQueueStatus(agentId)
      });

    } catch (processingError) {
      // Mark task as failed and release processing status
      taskQueueService.markTaskFailed(agentId, nextTask.id, 
        processingError instanceof Error ? processingError.message : 'Unknown processing error'
      );
      taskQueueService.setProcessingStatus(agentId, false);
      throw processingError;
    }

  } catch (error) {
    console.error('Error processing next task:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
