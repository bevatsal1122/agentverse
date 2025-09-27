import type { NextApiRequest, NextApiResponse } from 'next';
import { memoryStorageService } from '../../../services/memoryStorageService';
import { agentService } from '../../../services/agentService';
import { gameState } from '../../../../src/game/state';
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
    const { agentAddress, output } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        error: 'Subtask ID is required' 
      });
    }

    if (!agentAddress) {
      return res.status(400).json({ 
        error: 'Agent address is required' 
      });
    }

    if (!output) {
      return res.status(400).json({ 
        error: 'Task output is required' 
      });
    }

    // Get the subtask
    const subtask = memoryStorageService.getSubtask(id);
    if (!subtask) {
      return res.status(404).json({ 
        error: 'Subtask not found' 
      });
    }

    // Verify the agent address matches
    if (subtask.agent_address !== agentAddress) {
      return res.status(403).json({ 
        error: 'Agent address does not match subtask assignment' 
      });
    }

    // Check if subtask is already completed
    if (subtask.status === 'completed') {
      return res.status(409).json({ 
        error: 'Subtask is already completed',
        subtask: {
          id: subtask.id,
          status: subtask.status,
          output: subtask.output,
          completed_at: subtask.completed_at
        }
      });
    }

    // Log subtask execution start
    console.log(`🚀 Agent ${agentAddress} executing subtask ${id}: "${subtask.prompt.substring(0, 50)}..."`);

    // Move agent to their assigned building when they start working (if not already there)
    const agent = gameState.getAIAgents().get(agentAddress);
    if (agent) {
      // Get agent's assigned building from the database
      const activeAgentsResult = await agentService.getActiveAgents();
      const agentData = activeAgentsResult.data?.find((a: any) => a.id === agentAddress);
      
      if (agentData && agentData.current_building_id) {
        const building = getBuildingById(agentData.current_building_id);
        if (building) {
          // Check if agent is already at their building
          const distanceFromBuilding = Math.abs(agent.x - building.x) + Math.abs(agent.y - building.y);
          if (distanceFromBuilding > 1) {
            console.log(`🏃 Agent ${agentAddress} moving to assigned building ${building.id} (${building.x}, ${building.y}) to start work`);
            gameState.moveAgentToLocation(agentAddress, building.x, building.y);
          } else {
            console.log(`📍 Agent ${agentAddress} already at assigned building ${building.id}, starting work`);
          }
        }
      }
    }

    // Update subtask with output and mark as completed
    const updatedSubtask = memoryStorageService.updateSubtask(id, {
      status: 'completed',
      output: output
    });

    if (!updatedSubtask) {
      return res.status(500).json({ 
        error: 'Failed to update subtask' 
      });
    }

    console.log(`✅ Subtask ${id} completed by agent ${agentAddress}`);

    // Get the master task to check if all subtasks are completed
    const masterTask = memoryStorageService.getMasterTask(subtask.task_id);
    if (!masterTask) {
      return res.status(404).json({ 
        error: 'Master task not found' 
      });
    }

    // Get all subtasks for this master task
    const allSubtasks = memoryStorageService.getSubtasksByTask(subtask.task_id);
    const completedSubtasks = allSubtasks.filter(st => st.status === 'completed');
    const allCompleted = completedSubtasks.length === allSubtasks.length;

    // Log the subtask completion action
    await agentService.logAgentAction({
      agent_id: agentAddress,
      action_type: 'custom',
      action_data: { 
        type: 'subtask_completed',
        subtask_id: id,
        master_task_id: subtask.task_id,
        output_length: output.length,
        all_subtasks_completed: allCompleted
      },
      task_id: subtask.task_id,
      success: true,
    });

    // If all subtasks are completed, prepare aggregated results for master agent
    let aggregatedResults = null;
    if (allCompleted) {
      console.log(`🎯 All subtasks completed for master task ${subtask.task_id}. Master agent ${masterTask.agent_address} can now process results.`);
      
      aggregatedResults = completedSubtasks.map(st => ({
        child_agent: st.agent_address,
        output: st.output
      }));

      // Update master task with aggregated results
      memoryStorageService.updateMasterTask(subtask.task_id, {
        status: 'in_progress',
        aggregated_results: aggregatedResults
      });

      // Log master task status change
      await agentService.logAgentAction({
        agent_id: masterTask.agent_address,
        action_type: 'custom',
        action_data: { 
          type: 'master_task_ready_for_processing',
          master_task_id: subtask.task_id,
          subtask_count: allSubtasks.length,
          aggregated_results_count: aggregatedResults.length
        },
        task_id: subtask.task_id,
        success: true,
      });
    }

    res.status(200).json({ 
      success: true,
      message: 'Subtask completed successfully',
      subtask: {
        id: updatedSubtask.id,
        status: updatedSubtask.status,
        output: updatedSubtask.output,
        completed_at: updatedSubtask.completed_at
      },
      masterTask: {
        id: masterTask.id,
        status: allCompleted ? 'in_progress' : masterTask.status,
        allSubtasksCompleted: allCompleted,
        totalSubtasks: allSubtasks.length,
        completedSubtasks: completedSubtasks.length
      },
      aggregatedResults: aggregatedResults,
      nextStep: allCompleted ? 
        `Master agent ${masterTask.agent_address} can now process the aggregated results` :
        `Waiting for ${allSubtasks.length - completedSubtasks.length} more subtasks to complete`
    });

  } catch (error) {
    console.error('Error executing subtask:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
