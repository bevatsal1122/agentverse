import type { NextApiRequest, NextApiResponse } from 'next';
import { memoryStorageService } from '../../services/memoryStorageService';
import { agentService } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentId, limit = 50 } = req.query;

    // Get all actions from memory storage
    const allActions = Array.from(memoryStorageService['actions'].values());
    
    // Get active agents for name mapping
    const activeAgentsResult = await agentService.getActiveAgents();
    const activeAgents = activeAgentsResult.data || [];

    // Filter actions by agent if specified
    let filteredActions = allActions;
    if (agentId && typeof agentId === 'string') {
      filteredActions = allActions.filter(action => action.agent_id === agentId);
    }

    // Sort by creation time (newest first) and limit results
    const sortedActions = filteredActions
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, parseInt(limit as string));

    // Format actions with agent names
    const formattedActions = sortedActions.map(action => {
      const agent = activeAgents.find((a: any) => a.id === action.agent_id);
      
      return {
        id: action.id,
        agent_id: action.agent_id,
        agent_name: agent?.name || action.agent_id,
        action_type: action.action_type,
        action_data: action.action_data,
        building_id: action.building_id,
        target_agent_id: action.target_agent_id,
        task_id: action.task_id,
        success: action.success,
        error_message: action.error_message,
        created_at: action.created_at,
        // Add human-readable description
        description: getActionDescription(action, agent?.name)
      };
    });

    // Calculate statistics
    const totalActions = allActions.length;
    const successfulActions = allActions.filter(a => a.success).length;
    const failedActions = allActions.filter(a => !a.success).length;
    
    const actionTypes = allActions.reduce((acc, action) => {
      acc[action.action_type] = (acc[action.action_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Log current activity summary
    console.log(`📊 Activity Logs Summary:`);
    console.log(`   Total Actions: ${totalActions} (${successfulActions} successful, ${failedActions} failed)`);
    console.log(`   Action Types: ${Object.entries(actionTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}`);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      filters: {
        agent_id: agentId || 'all',
        limit: parseInt(limit as string)
      },
      statistics: {
        total_actions: totalActions,
        successful_actions: successfulActions,
        failed_actions: failedActions,
        action_types: actionTypes
      },
      actions: formattedActions
    });

  } catch (error) {
    console.error('Error getting activity logs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function getActionDescription(action: any, agentName?: string): string {
  const agent = agentName || action.agent_id;
  
  switch (action.action_type) {
    case 'move':
      if (action.action_data?.type === 'sequential_task_coordination') {
        const targetAgent = action.action_data.target_agent_name || action.action_data.target_agent;
        const sequence = action.action_data.sequence_number;
        const total = action.action_data.total_agents;
        return `${agent} walked to ${targetAgent} (${sequence}/${total}) for task coordination`;
      }
      return `${agent} moved to building ${action.building_id}`;
    
    case 'interact':
      return `${agent} interacted with ${action.target_agent_id}`;
    
    case 'task_complete':
      return `${agent} completed task ${action.task_id}`;
    
    case 'message_sent':
      return `${agent} sent a message`;
    
    case 'building_assigned':
      return `${agent} was assigned to building ${action.building_id}`;
    
    case 'custom':
      if (action.action_data?.type === 'collaborative_task_generated') {
        return `${agent} generated a collaborative task with ${action.action_data.subtask_count} subtasks`;
      }
      if (action.action_data?.type === 'subtask_completed') {
        return `${agent} completed subtask ${action.action_data.subtask_id}`;
      }
      if (action.action_data?.type === 'master_task_ready_for_processing') {
        return `${agent} is ready to process master task with ${action.action_data.subtask_count} completed subtasks`;
      }
      if (action.action_data?.type === 'master_task_completed') {
        return `${agent} completed master task ${action.action_data.master_task_id}`;
      }
      return `${agent} performed custom action: ${action.action_data?.type || 'unknown'}`;
    
    default:
      return `${agent} performed ${action.action_type} action`;
  }
}
