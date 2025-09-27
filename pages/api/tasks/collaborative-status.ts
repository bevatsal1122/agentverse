import type { NextApiRequest, NextApiResponse } from 'next';
import { memoryStorageService } from '../../services/memoryStorageService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all master tasks
    const allMasterTasks = Array.from(memoryStorageService['masterTasks'].values());
    
    // Get all subtasks
    const allSubtasks = Array.from(memoryStorageService['subtasks'].values());

    // Group subtasks by master task
    const subtasksByMasterTask = new Map<string, any[]>();
    allSubtasks.forEach(subtask => {
      if (!subtasksByMasterTask.has(subtask.task_id)) {
        subtasksByMasterTask.set(subtask.task_id, []);
      }
      subtasksByMasterTask.get(subtask.task_id)!.push(subtask);
    });

    // Build comprehensive status
    const status = {
      summary: {
        totalMasterTasks: allMasterTasks.length,
        pendingMasterTasks: allMasterTasks.filter(t => t.status === 'pending').length,
        inProgressMasterTasks: allMasterTasks.filter(t => t.status === 'in_progress').length,
        completedMasterTasks: allMasterTasks.filter(t => t.status === 'completed').length,
        failedMasterTasks: allMasterTasks.filter(t => t.status === 'failed').length,
        totalSubtasks: allSubtasks.length,
        pendingSubtasks: allSubtasks.filter(t => t.status === 'pending').length,
        inProgressSubtasks: allSubtasks.filter(t => t.status === 'in_progress').length,
        completedSubtasks: allSubtasks.filter(t => t.status === 'completed').length,
        failedSubtasks: allSubtasks.filter(t => t.status === 'failed').length
      },
      masterTasks: allMasterTasks.map(masterTask => {
        const subtasks = subtasksByMasterTask.get(masterTask.id) || [];
        const completedSubtasks = subtasks.filter(st => st.status === 'completed');
        const allSubtasksCompleted = completedSubtasks.length === subtasks.length && subtasks.length > 0;
        
        return {
          id: masterTask.id,
          user_id: masterTask.user_id,
          agent_address: masterTask.agent_address,
          prompt: masterTask.prompt,
          status: masterTask.status,
          created_at: masterTask.created_at,
          completed_at: masterTask.completed_at,
          final_output: masterTask.final_output,
          aggregated_results: masterTask.aggregated_results,
          progress: {
            totalSubtasks: subtasks.length,
            completedSubtasks: completedSubtasks.length,
            allSubtasksCompleted,
            readyForMasterProcessing: masterTask.status === 'in_progress' && allSubtasksCompleted,
            completionPercentage: subtasks.length > 0 ? Math.round((completedSubtasks.length / subtasks.length) * 100) : 0
          },
          subtasks: subtasks.map(subtask => ({
            id: subtask.id,
            agent_address: subtask.agent_address,
            prompt: subtask.prompt,
            status: subtask.status,
            output: subtask.output,
            created_at: subtask.created_at,
            completed_at: subtask.completed_at
          }))
        };
      }),
      agentActivity: getAgentActivitySummary(allMasterTasks, allSubtasks),
      recentActivity: getRecentActivity(allMasterTasks, allSubtasks)
    };

    res.status(200).json({ 
      success: true,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting collaborative task status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function getAgentActivitySummary(masterTasks: any[], subtasks: any[]) {
  const agentActivity = new Map<string, {
    masterTasksAssigned: number;
    masterTasksCompleted: number;
    subtasksAssigned: number;
    subtasksCompleted: number;
    lastActivity: string | null;
  }>();

  // Process master tasks
  masterTasks.forEach(task => {
    if (!agentActivity.has(task.agent_address)) {
      agentActivity.set(task.agent_address, {
        masterTasksAssigned: 0,
        masterTasksCompleted: 0,
        subtasksAssigned: 0,
        subtasksCompleted: 0,
        lastActivity: null
      });
    }
    
    const activity = agentActivity.get(task.agent_address)!;
    activity.masterTasksAssigned++;
    if (task.status === 'completed') {
      activity.masterTasksCompleted++;
    }
    if (!activity.lastActivity || new Date(task.created_at) > new Date(activity.lastActivity)) {
      activity.lastActivity = task.created_at;
    }
  });

  // Process subtasks
  subtasks.forEach(subtask => {
    if (!agentActivity.has(subtask.agent_address)) {
      agentActivity.set(subtask.agent_address, {
        masterTasksAssigned: 0,
        masterTasksCompleted: 0,
        subtasksAssigned: 0,
        subtasksCompleted: 0,
        lastActivity: null
      });
    }
    
    const activity = agentActivity.get(subtask.agent_address)!;
    activity.subtasksAssigned++;
    if (subtask.status === 'completed') {
      activity.subtasksCompleted++;
    }
    if (!activity.lastActivity || new Date(subtask.created_at) > new Date(activity.lastActivity)) {
      activity.lastActivity = subtask.created_at;
    }
  });

  return Array.from(agentActivity.entries()).map(([agentAddress, activity]) => ({
    agentAddress,
    ...activity,
    masterTaskCompletionRate: activity.masterTasksAssigned > 0 ? 
      Math.round((activity.masterTasksCompleted / activity.masterTasksAssigned) * 100) : 0,
    subtaskCompletionRate: activity.subtasksAssigned > 0 ? 
      Math.round((activity.subtasksCompleted / activity.subtasksAssigned) * 100) : 0
  }));
}

function getRecentActivity(masterTasks: any[], subtasks: any[]) {
  const allActivities = [
    ...masterTasks.map(task => ({
      type: 'master_task',
      id: task.id,
      agent_address: task.agent_address,
      status: task.status,
      created_at: task.created_at,
      completed_at: task.completed_at
    })),
    ...subtasks.map(subtask => ({
      type: 'subtask',
      id: subtask.id,
      agent_address: subtask.agent_address,
      status: subtask.status,
      created_at: subtask.created_at,
      completed_at: subtask.completed_at
    }))
  ];

  return allActivities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20); // Last 20 activities
}
