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
    const { agentAddress, finalOutput } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        error: 'Master task ID is required' 
      });
    }

    if (!agentAddress) {
      return res.status(400).json({ 
        error: 'Agent address is required' 
      });
    }

    if (!finalOutput) {
      return res.status(400).json({ 
        error: 'Final output is required' 
      });
    }

    // Get the master task
    const masterTask = memoryStorageService.getMasterTask(id);
    if (!masterTask) {
      return res.status(404).json({ 
        error: 'Master task not found' 
      });
    }

    // Verify the agent address matches
    if (masterTask.agent_address !== agentAddress) {
      return res.status(403).json({ 
        error: 'Agent address does not match master task assignment' 
      });
    }

    // Check if master task is already completed
    if (masterTask.status === 'completed') {
      return res.status(409).json({ 
        error: 'Master task is already completed',
        masterTask: {
          id: masterTask.id,
          status: masterTask.status,
          final_output: masterTask.final_output,
          completed_at: masterTask.completed_at
        }
      });
    }

    // Check if all subtasks are completed
    const allSubtasks = memoryStorageService.getSubtasksByTask(id);
    const completedSubtasks = allSubtasks.filter(st => st.status === 'completed');
    
    if (completedSubtasks.length !== allSubtasks.length) {
      return res.status(400).json({ 
        error: 'Not all subtasks are completed yet',
        details: {
          totalSubtasks: allSubtasks.length,
          completedSubtasks: completedSubtasks.length,
          pendingSubtasks: allSubtasks.length - completedSubtasks.length
        }
      });
    }

    // Verify aggregated results are available
    if (!masterTask.aggregated_results || masterTask.aggregated_results.length === 0) {
      return res.status(400).json({ 
        error: 'Aggregated results are not available for processing' 
      });
    }

    // Move master agent to their assigned building when they start processing (if not already there)
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
             gameState.moveAgentToLocation(agentAddress, building.x, building.y);
          }
        }
      }
    }

    // Update master task with final output and mark as completed
    const updatedMasterTask = memoryStorageService.updateMasterTask(id, {
      status: 'completed',
      final_output: finalOutput
    });

    if (!updatedMasterTask) {
      return res.status(500).json({ 
        error: 'Failed to update master task' 
      });
    }


    // Log the master task completion action
    await agentService.logAgentAction({
      agent_id: agentAddress,
      action_type: 'custom',
      action_data: { 
        type: 'master_task_completed',
        master_task_id: id,
        subtask_count: allSubtasks.length,
        final_output_length: finalOutput.length,
        aggregated_results_count: masterTask.aggregated_results.length
      },
      task_id: id,
      success: true,
    });

    // Create a communication to notify about task completion
    memoryStorageService.addCommunication({
      sender_agent_id: agentAddress,
      message_type: 'broadcast',
      content: `Master task "${masterTask.prompt}" has been completed successfully. Final output: ${finalOutput}`,
      metadata: {
        type: 'master_task_completion',
        master_task_id: id,
        subtask_count: allSubtasks.length
      },
      task_id: id,
      is_read: false
    });

    res.status(200).json({ 
      success: true,
      message: 'Master task completed successfully',
      masterTask: {
        id: updatedMasterTask.id,
        status: updatedMasterTask.status,
        final_output: updatedMasterTask.final_output,
        completed_at: updatedMasterTask.completed_at,
        original_prompt: masterTask.prompt
      },
      summary: {
        totalSubtasks: allSubtasks.length,
        aggregatedResults: masterTask.aggregated_results,
        finalOutputLength: finalOutput.length,
        completionTime: updatedMasterTask.completed_at
      },
      nextSteps: [
        'Task is now complete and available for review',
        'All subtasks have been processed and aggregated',
        'Final output is ready for display in UI'
      ]
    });

  } catch (error) {
    console.error('Error processing master task:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
