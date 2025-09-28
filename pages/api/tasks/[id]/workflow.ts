import type { NextApiRequest, NextApiResponse } from 'next';
import { memoryStorageService } from '../../../services/memoryStorageService';
import { agentService } from '../../../services/agentService';
import { getBuildingById } from '../../../../src/maps/defaultMap';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        error: 'Task ID is required' 
      });
    }

    // Get the master task and its subtasks
    const masterTask = memoryStorageService.getMasterTask(id);
    if (!masterTask) {
      return res.status(404).json({ 
        error: 'Master task not found' 
      });
    }

    const subtasks = memoryStorageService.getSubtasksByTask(id);
    if (subtasks.length === 0) {
      return res.status(404).json({ 
        error: 'No subtasks found for this task' 
      });
    }

    // Get building information for each agent
    const workflowSteps = [];
    for (const subtask of subtasks) {
      const agentData = await agentService.getAgentById(subtask.agent_address);
      if (agentData.success && agentData.data && agentData.data.current_building_id) {
        const building = getBuildingById(agentData.data.current_building_id);
        if (building) {
          workflowSteps.push({
            agentAddress: subtask.agent_address,
            agentName: agentData.data.name,
            buildingId: building.id,
            buildingName: building.type, // Use building type as name
            buildingX: building.x,
            buildingY: building.y,
            subtaskPrompt: subtask.prompt
          });
        }
      }
    }

    if (workflowSteps.length === 0) {
      return res.status(404).json({ 
        error: 'No valid workflow steps found' 
      });
    }

    console.log(`🎯 Created task workflow with ${workflowSteps.length} steps for task ${id}`);

    res.status(200).json({ 
      success: true,
      taskId: id,
      workflowSteps: workflowSteps,
      totalSteps: workflowSteps.length
    });

  } catch (error) {
    console.error('Error creating task workflow:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
