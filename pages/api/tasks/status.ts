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
    // Get all master tasks and their subtasks
    const allMasterTasks = Array.from(memoryStorageService['masterTasks'].values());
    const allSubtasks = Array.from(memoryStorageService['subtasks'].values());

    // Get active agents for name mapping
    const activeAgentsResult = await agentService.getActiveAgents();
    const activeAgents = activeAgentsResult.data || [];

    // Process each master task
    const taskStatus = allMasterTasks.map(masterTask => {
      const subtasks = allSubtasks.filter(st => st.task_id === masterTask.id);
      const completedSubtasks = subtasks.filter(st => st.status === 'completed');
      const pendingSubtasks = subtasks.filter(st => st.status === 'pending');
      const inProgressSubtasks = subtasks.filter(st => st.status === 'in_progress');

      // Get agent names
      const masterAgent = activeAgents.find((agent: any) => agent.id === masterTask.agent_address);
      const subtaskAgents = subtasks.map(subtask => {
        const agent = activeAgents.find((a: any) => a.id === subtask.agent_address);
        return {
          id: subtask.id,
          agent_name: agent?.name || subtask.agent_address,
          agent_id: subtask.agent_address,
          status: subtask.status,
          prompt: subtask.prompt.substring(0, 50) + '...'
        };
      });

      return {
        master_task: {
          id: masterTask.id,
          agent_name: masterAgent?.name || masterTask.agent_address,
          agent_id: masterTask.agent_address,
          status: masterTask.status,
          prompt: masterTask.prompt.substring(0, 50) + '...',
          created_at: masterTask.created_at,
          completed_at: masterTask.completed_at
        },
        subtasks: subtaskAgents,
        summary: {
          total_subtasks: subtasks.length,
          completed: completedSubtasks.length,
          pending: pendingSubtasks.length,
          in_progress: inProgressSubtasks.length,
          progress_percentage: subtasks.length > 0 ? Math.round((completedSubtasks.length / subtasks.length) * 100) : 0
        }
      };
    });

    // Calculate overall statistics
    const totalMasterTasks = allMasterTasks.length;
    const completedMasterTasks = allMasterTasks.filter(mt => mt.status === 'completed').length;
    const inProgressMasterTasks = allMasterTasks.filter(mt => mt.status === 'in_progress').length;
    const pendingMasterTasks = allMasterTasks.filter(mt => mt.status === 'pending').length;

    const totalSubtasks = allSubtasks.length;
    const completedSubtasks = allSubtasks.filter(st => st.status === 'completed').length;
    const pendingSubtasks = allSubtasks.filter(st => st.status === 'pending').length;
    const inProgressSubtasks = allSubtasks.filter(st => st.status === 'in_progress').length;

    // Log current status
    console.log(`📊 Task Status Summary:`);
    console.log(`   Master Tasks: ${completedMasterTasks}/${totalMasterTasks} completed, ${inProgressMasterTasks} in progress, ${pendingMasterTasks} pending`);
    console.log(`   Subtasks: ${completedSubtasks}/${totalSubtasks} completed, ${inProgressSubtasks} in progress, ${pendingSubtasks} pending`);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      overall_stats: {
        master_tasks: {
          total: totalMasterTasks,
          completed: completedMasterTasks,
          in_progress: inProgressMasterTasks,
          pending: pendingMasterTasks
        },
        subtasks: {
          total: totalSubtasks,
          completed: completedSubtasks,
          in_progress: inProgressSubtasks,
          pending: pendingSubtasks
        }
      },
      tasks: taskStatus
    });

  } catch (error) {
    console.error('Error getting task status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
