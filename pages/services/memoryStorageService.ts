interface AgentCommunication {
  id: string;
  sender_agent_id: string;
  receiver_agent_id?: string;
  message_type: 'direct' | 'broadcast' | 'task_related' | 'system';
  content: string;
  metadata?: any;
  task_id?: string;
  is_read: boolean;
  created_at: string;
}

interface AgentAction {
  id: string;
  agent_id: string;
  action_type: 'move' | 'interact' | 'task_complete' | 'message_sent' | 'building_assigned' | 'custom';
  action_data: any;
  building_id?: string;
  target_agent_id?: string;
  task_id?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

interface AgentSession {
  agent_id: string;
  last_active: string;
  current_position?: { x: number; y: number };
  current_activity?: string;
  session_data?: any;
}

interface AgentMetadata {
  id: string;
  description?: string;
  personality?: {
    traits: string[];
    communication_style: string;
    goals: string[];
    preferences: Record<string, any>;
  };
  capabilities: string[];
  status: 'active' | 'inactive' | 'busy' | 'offline';
  current_building_id?: string;
  assigned_building_ids: string[];
  avatar_url?: string;
  experience_points: number;
  level: number;
  reputation_score: number;
  last_active: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  creator_agent_id: string;
  assigned_agent_id?: string;
  task_type: 'communication' | 'building_management' | 'resource_gathering' | 'collaboration' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  requirements?: any;
  reward_amount?: number;
  reward_token?: string;
  deadline?: string;
  completion_data?: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

interface MasterTask {
  id: string;
  user_id: string;
  agent_address: string;
  prompt: string;
  media_b64?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  aggregated_results?: any[];
  final_output?: string;
  created_at: string;
  completed_at?: string;
}

interface Subtask {
  id: string;
  task_id: string;
  prompt: string;
  media_b64?: string;
  agent_address: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  output?: string;
  created_at: string;
  completed_at?: string;
}

class MemoryStorageService {
  private communications: Map<string, AgentCommunication> = new Map();
  private actions: Map<string, AgentAction> = new Map();
  private sessions: Map<string, AgentSession> = new Map();
  private agentMetadata: Map<string, AgentMetadata> = new Map();
  private tasks: Map<string, Task> = new Map();
  private masterTasks: Map<string, MasterTask> = new Map();
  private subtasks: Map<string, Subtask> = new Map();
  
  // Communication indexes for fast lookups
  private communicationsByAgent: Map<string, string[]> = new Map();
  private communicationsByTask: Map<string, string[]> = new Map();
  
  // Action indexes for fast lookups
  private actionsByAgent: Map<string, string[]> = new Map();
  private actionsByType: Map<string, string[]> = new Map();

  // Task indexes for fast lookups
  private tasksByAgent: Map<string, string[]> = new Map();
  private tasksByStatus: Map<string, string[]> = new Map();
  private tasksByPriority: Map<string, string[]> = new Map();

  // Master task indexes for fast lookups
  private masterTasksByAgent: Map<string, string[]> = new Map();
  private masterTasksByStatus: Map<string, string[]> = new Map();

  // Subtask indexes for fast lookups
  private subtasksByTask: Map<string, string[]> = new Map();
  private subtasksByAgent: Map<string, string[]> = new Map();
  private subtasksByStatus: Map<string, string[]> = new Map();

  // ===== COMMUNICATIONS =====

  addCommunication(data: Omit<AgentCommunication, 'id' | 'created_at'>): AgentCommunication {
    const id = `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const communication: AgentCommunication = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };

    this.communications.set(id, communication);

    // Update indexes
    this.addToAgentCommunicationIndex(data.sender_agent_id, id);
    if (data.receiver_agent_id) {
      this.addToAgentCommunicationIndex(data.receiver_agent_id, id);
    }
    if (data.task_id) {
      this.addToTaskCommunicationIndex(data.task_id, id);
    }

    // Clean up old communications (keep only last 1000 per agent)
    this.cleanupOldCommunications();

    return communication;
  }

  private addToAgentCommunicationIndex(agentId: string, commId: string): void {
    if (!this.communicationsByAgent.has(agentId)) {
      this.communicationsByAgent.set(agentId, []);
    }
    this.communicationsByAgent.get(agentId)!.push(commId);
  }

  private addToTaskCommunicationIndex(taskId: string, commId: string): void {
    if (!this.communicationsByTask.has(taskId)) {
      this.communicationsByTask.set(taskId, []);
    }
    this.communicationsByTask.get(taskId)!.push(commId);
  }

  getCommunicationsForAgent(agentId: string, limit: number = 50): AgentCommunication[] {
    const commIds = this.communicationsByAgent.get(agentId) || [];
    return commIds
      .slice(-limit) // Get most recent
      .map(id => this.communications.get(id))
      .filter((comm): comm is AgentCommunication => comm !== undefined)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  markCommunicationAsRead(commId: string): boolean {
    const comm = this.communications.get(commId);
    if (comm) {
      comm.is_read = true;
      return true;
    }
    return false;
  }

  private cleanupOldCommunications(): void {
    // Keep only last 1000 communications per agent
    this.communicationsByAgent.forEach((commIds, agentId) => {
      if (commIds.length > 1000) {
        const toRemove = commIds.splice(0, commIds.length - 1000);
        toRemove.forEach(id => this.communications.delete(id));
      }
    });
  }

  // ===== ACTIONS =====

  addAction(data: Omit<AgentAction, 'id' | 'created_at'>): AgentAction {
    const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const action: AgentAction = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };

    this.actions.set(id, action);

    // Update indexes
    this.addToAgentActionIndex(data.agent_id, id);
    this.addToActionTypeIndex(data.action_type, id);

    // Clean up old actions (keep only last 500 per agent)
    this.cleanupOldActions();

    return action;
  }

  private addToAgentActionIndex(agentId: string, actionId: string): void {
    if (!this.actionsByAgent.has(agentId)) {
      this.actionsByAgent.set(agentId, []);
    }
    this.actionsByAgent.get(agentId)!.push(actionId);
  }

  private addToActionTypeIndex(actionType: string, actionId: string): void {
    if (!this.actionsByType.has(actionType)) {
      this.actionsByType.set(actionType, []);
    }
    this.actionsByType.get(actionType)!.push(actionId);
  }

  getActionsForAgent(agentId: string, limit: number = 100): AgentAction[] {
    const actionIds = this.actionsByAgent.get(agentId) || [];
    return actionIds
      .slice(-limit) // Get most recent
      .map(id => this.actions.get(id))
      .filter((action): action is AgentAction => action !== undefined)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getActionsByType(actionType: string, limit: number = 100): AgentAction[] {
    const actionIds = this.actionsByType.get(actionType) || [];
    return actionIds
      .slice(-limit)
      .map(id => this.actions.get(id))
      .filter((action): action is AgentAction => action !== undefined)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  private cleanupOldActions(): void {
    // Keep only last 500 actions per agent
    this.actionsByAgent.forEach((actionIds, agentId) => {
      if (actionIds.length > 500) {
        const toRemove = actionIds.splice(0, actionIds.length - 500);
        toRemove.forEach(id => this.actions.delete(id));
      }
    });
  }

  // ===== SESSIONS =====

  updateAgentSession(agentId: string, sessionData: Partial<Omit<AgentSession, 'agent_id'>>): AgentSession {
    const existing = this.sessions.get(agentId);
    const session: AgentSession = {
      agent_id: agentId,
      last_active: new Date().toISOString(),
      ...existing,
      ...sessionData,
    };

    this.sessions.set(agentId, session);
    return session;
  }

  getAgentSession(agentId: string): AgentSession | null {
    return this.sessions.get(agentId) || null;
  }

  getActiveSessions(maxAgeMinutes: number = 60): AgentSession[] {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - maxAgeMinutes);
    const cutoffTime = cutoff.getTime();

    return Array.from(this.sessions.values()).filter(session => {
      return new Date(session.last_active).getTime() > cutoffTime;
    });
  }

  removeAgentSession(agentId: string): boolean {
    return this.sessions.delete(agentId);
  }

  // ===== AGENT METADATA =====

  setAgentMetadata(data: AgentMetadata): AgentMetadata {
    this.agentMetadata.set(data.id, data);
    return data;
  }

  getAgentMetadata(agentId: string): AgentMetadata | null {
    return this.agentMetadata.get(agentId) || null;
  }

  updateAgentMetadata(agentId: string, updates: Partial<Omit<AgentMetadata, 'id'>>): AgentMetadata | null {
    const existing = this.agentMetadata.get(agentId);
    if (!existing) return null;

    const updated: AgentMetadata = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.agentMetadata.set(agentId, updated);
    return updated;
  }

  getAllAgentMetadata(): AgentMetadata[] {
    return Array.from(this.agentMetadata.values());
  }

  getActiveAgents(): AgentMetadata[] {
    return Array.from(this.agentMetadata.values()).filter(agent => agent.status === 'active');
  }

  removeAgentMetadata(agentId: string): boolean {
    return this.agentMetadata.delete(agentId);
  }

  // ===== TASKS =====

  addTask(data: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Task {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: Task = {
      ...data,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.tasks.set(id, task);

    // Update indexes
    this.addToTaskAgentIndex(data.creator_agent_id, id);
    if (data.assigned_agent_id) {
      this.addToTaskAgentIndex(data.assigned_agent_id, id);
    }
    this.addToTaskStatusIndex(data.status, id);
    this.addToTaskPriorityIndex(data.priority, id);

    return task;
  }

  private addToTaskAgentIndex(agentId: string, taskId: string): void {
    if (!this.tasksByAgent.has(agentId)) {
      this.tasksByAgent.set(agentId, []);
    }
    this.tasksByAgent.get(agentId)!.push(taskId);
  }

  private addToTaskStatusIndex(status: string, taskId: string): void {
    if (!this.tasksByStatus.has(status)) {
      this.tasksByStatus.set(status, []);
    }
    this.tasksByStatus.get(status)!.push(taskId);
  }

  private addToTaskPriorityIndex(priority: string, taskId: string): void {
    if (!this.tasksByPriority.has(priority)) {
      this.tasksByPriority.set(priority, []);
    }
    this.tasksByPriority.get(priority)!.push(taskId);
  }

  getTask(taskId: string): Task | null {
    return this.tasks.get(taskId) || null;
  }

  updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'created_at'>>): Task | null {
    const existing = this.tasks.get(taskId);
    if (!existing) return null;

    const updated: Task = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.status === 'completed' && !updated.completed_at) {
      updated.completed_at = new Date().toISOString();
    }

    this.tasks.set(taskId, updated);

    // Update indexes if status changed
    if (updates.status && updates.status !== existing.status) {
      this.removeFromTaskStatusIndex(existing.status, taskId);
      this.addToTaskStatusIndex(updates.status, taskId);
    }

    return updated;
  }

  private removeFromTaskStatusIndex(status: string, taskId: string): void {
    const statusTasks = this.tasksByStatus.get(status);
    if (statusTasks) {
      const index = statusTasks.indexOf(taskId);
      if (index > -1) {
        statusTasks.splice(index, 1);
      }
    }
  }

  getTasksByAgent(agentId: string): Task[] {
    const taskIds = this.tasksByAgent.get(agentId) || [];
    return taskIds
      .map(id => this.tasks.get(id))
      .filter((task): task is Task => task !== undefined)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getTasksByStatus(status: string): Task[] {
    const taskIds = this.tasksByStatus.get(status) || [];
    return taskIds
      .map(id => this.tasks.get(id))
      .filter((task): task is Task => task !== undefined)
      .sort((a, b) => {
        // Sort by priority first, then by creation date
        const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 5;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 5;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }

  getPendingTasks(): Task[] {
    return this.getTasksByStatus('pending');
  }

  // ===== MASTER TASKS =====

  addMasterTask(data: Omit<MasterTask, 'id' | 'created_at'>): MasterTask {
    const id = `master_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const masterTask: MasterTask = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };

    this.masterTasks.set(id, masterTask);

    // Update indexes
    this.addToMasterTaskAgentIndex(data.agent_address, id);
    this.addToMasterTaskStatusIndex(data.status, id);

    return masterTask;
  }

  private addToMasterTaskAgentIndex(agentAddress: string, taskId: string): void {
    if (!this.masterTasksByAgent.has(agentAddress)) {
      this.masterTasksByAgent.set(agentAddress, []);
    }
    this.masterTasksByAgent.get(agentAddress)!.push(taskId);
  }

  private addToMasterTaskStatusIndex(status: string, taskId: string): void {
    if (!this.masterTasksByStatus.has(status)) {
      this.masterTasksByStatus.set(status, []);
    }
    this.masterTasksByStatus.get(status)!.push(taskId);
  }

  getMasterTask(taskId: string): MasterTask | null {
    return this.masterTasks.get(taskId) || null;
  }

  updateMasterTask(taskId: string, updates: Partial<Omit<MasterTask, 'id' | 'created_at'>>): MasterTask | null {
    const existing = this.masterTasks.get(taskId);
    if (!existing) return null;

    const updated: MasterTask = {
      ...existing,
      ...updates,
    };

    if (updates.status === 'completed' && !updated.completed_at) {
      updated.completed_at = new Date().toISOString();
    }

    this.masterTasks.set(taskId, updated);

    // Update indexes if status changed
    if (updates.status && updates.status !== existing.status) {
      this.removeFromMasterTaskStatusIndex(existing.status, taskId);
      this.addToMasterTaskStatusIndex(updates.status, taskId);
    }

    return updated;
  }

  private removeFromMasterTaskStatusIndex(status: string, taskId: string): void {
    const statusTasks = this.masterTasksByStatus.get(status);
    if (statusTasks) {
      const index = statusTasks.indexOf(taskId);
      if (index > -1) {
        statusTasks.splice(index, 1);
      }
    }
  }

  getMasterTasksByAgent(agentAddress: string): MasterTask[] {
    const taskIds = this.masterTasksByAgent.get(agentAddress) || [];
    return taskIds
      .map(id => this.masterTasks.get(id))
      .filter((task): task is MasterTask => task !== undefined)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getMasterTasksByStatus(status: string): MasterTask[] {
    const taskIds = this.masterTasksByStatus.get(status) || [];
    return taskIds
      .map(id => this.masterTasks.get(id))
      .filter((task): task is MasterTask => task !== undefined)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  getPendingMasterTasks(): MasterTask[] {
    return this.getMasterTasksByStatus('pending');
  }

  // ===== SUBTASKS =====

  addSubtask(data: Omit<Subtask, 'id' | 'created_at'>): Subtask {
    const id = `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const subtask: Subtask = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };

    this.subtasks.set(id, subtask);

    // Update indexes
    this.addToSubtaskTaskIndex(data.task_id, id);
    this.addToSubtaskAgentIndex(data.agent_address, id);
    this.addToSubtaskStatusIndex(data.status, id);

    return subtask;
  }

  private addToSubtaskTaskIndex(taskId: string, subtaskId: string): void {
    if (!this.subtasksByTask.has(taskId)) {
      this.subtasksByTask.set(taskId, []);
    }
    this.subtasksByTask.get(taskId)!.push(subtaskId);
  }

  private addToSubtaskAgentIndex(agentAddress: string, subtaskId: string): void {
    if (!this.subtasksByAgent.has(agentAddress)) {
      this.subtasksByAgent.set(agentAddress, []);
    }
    this.subtasksByAgent.get(agentAddress)!.push(subtaskId);
  }

  private addToSubtaskStatusIndex(status: string, subtaskId: string): void {
    if (!this.subtasksByStatus.has(status)) {
      this.subtasksByStatus.set(status, []);
    }
    this.subtasksByStatus.get(status)!.push(subtaskId);
  }

  getSubtask(subtaskId: string): Subtask | null {
    return this.subtasks.get(subtaskId) || null;
  }

  updateSubtask(subtaskId: string, updates: Partial<Omit<Subtask, 'id' | 'created_at'>>): Subtask | null {
    const existing = this.subtasks.get(subtaskId);
    if (!existing) return null;

    const updated: Subtask = {
      ...existing,
      ...updates,
    };

    if (updates.status === 'completed' && !updated.completed_at) {
      updated.completed_at = new Date().toISOString();
    }

    this.subtasks.set(subtaskId, updated);

    // Update indexes if status changed
    if (updates.status && updates.status !== existing.status) {
      this.removeFromSubtaskStatusIndex(existing.status, subtaskId);
      this.addToSubtaskStatusIndex(updates.status, subtaskId);
    }

    return updated;
  }

  private removeFromSubtaskStatusIndex(status: string, subtaskId: string): void {
    const statusSubtasks = this.subtasksByStatus.get(status);
    if (statusSubtasks) {
      const index = statusSubtasks.indexOf(subtaskId);
      if (index > -1) {
        statusSubtasks.splice(index, 1);
      }
    }
  }

  getSubtasksByTask(taskId: string): Subtask[] {
    const subtaskIds = this.subtasksByTask.get(taskId) || [];
    return subtaskIds
      .map(id => this.subtasks.get(id))
      .filter((subtask): subtask is Subtask => subtask !== undefined)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  getSubtasksByAgent(agentAddress: string): Subtask[] {
    const subtaskIds = this.subtasksByAgent.get(agentAddress) || [];
    return subtaskIds
      .map(id => this.subtasks.get(id))
      .filter((subtask): subtask is Subtask => subtask !== undefined)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getSubtasksByStatus(status: string): Subtask[] {
    const subtaskIds = this.subtasksByStatus.get(status) || [];
    return subtaskIds
      .map(id => this.subtasks.get(id))
      .filter((subtask): subtask is Subtask => subtask !== undefined)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  getPendingSubtasks(): Subtask[] {
    return this.getSubtasksByStatus('pending');
  }

  // ===== ANALYTICS & STATS =====

  getAgentStats(agentId: string): {
    totalMessages: number;
    messagesLast24h: number;
    totalActions: number;
    actionsLast24h: number;
    lastActive?: string;
  } {
    const commIds = this.communicationsByAgent.get(agentId) || [];
    const actionIds = this.actionsByAgent.get(agentId) || [];
    const session = this.sessions.get(agentId);

    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    const cutoffTime = last24h.getTime();

    const recentComms = commIds.map(id => this.communications.get(id))
      .filter((comm): comm is AgentCommunication => comm !== undefined)
      .filter(comm => new Date(comm.created_at).getTime() > cutoffTime);

    const recentActions = actionIds.map(id => this.actions.get(id))
      .filter((action): action is AgentAction => action !== undefined)
      .filter(action => new Date(action.created_at).getTime() > cutoffTime);

    return {
      totalMessages: commIds.length,
      messagesLast24h: recentComms.length,
      totalActions: actionIds.length,
      actionsLast24h: recentActions.length,
      lastActive: session?.last_active,
    };
  }

  // ===== CLEANUP =====

  clearOldData(maxAgeHours: number = 168): { // Default: 1 week
    communications: number;
    actions: number;
  } {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - maxAgeHours);
    const cutoffTime = cutoff.getTime();

    let removedComms = 0;
    let removedActions = 0;

    // Clean communications
    this.communications.forEach((comm, id) => {
      if (new Date(comm.created_at).getTime() < cutoffTime) {
        this.communications.delete(id);
        removedComms++;
      }
    });

    // Clean actions
    this.actions.forEach((action, id) => {
      if (new Date(action.created_at).getTime() < cutoffTime) {
        this.actions.delete(id);
        removedActions++;
      }
    });

    // Rebuild indexes
    this.rebuildIndexes();

    return { communications: removedComms, actions: removedActions };
  }

  private rebuildIndexes(): void {
    // Rebuild communication indexes
    this.communicationsByAgent.clear();
    this.communicationsByTask.clear();
    this.communications.forEach((comm, id) => {
      this.addToAgentCommunicationIndex(comm.sender_agent_id, id);
      if (comm.receiver_agent_id) {
        this.addToAgentCommunicationIndex(comm.receiver_agent_id, id);
      }
      if (comm.task_id) {
        this.addToTaskCommunicationIndex(comm.task_id, id);
      }
    });

    // Rebuild action indexes
    this.actionsByAgent.clear();
    this.actionsByType.clear();
    this.actions.forEach((action, id) => {
      this.addToAgentActionIndex(action.agent_id, id);
      this.addToActionTypeIndex(action.action_type, id);
    });
  }

  // ===== DEBUG/ADMIN =====

  getMemoryUsage(): {
    communications: number;
    actions: number;
    sessions: number;
    agentMetadata: number;
    tasks: number;
    masterTasks: number;
    subtasks: number;
    totalItems: number;
  } {
    return {
      communications: this.communications.size,
      actions: this.actions.size,
      sessions: this.sessions.size,
      agentMetadata: this.agentMetadata.size,
      tasks: this.tasks.size,
      masterTasks: this.masterTasks.size,
      subtasks: this.subtasks.size,
      totalItems: this.communications.size + this.actions.size + this.sessions.size + this.agentMetadata.size + this.tasks.size + this.masterTasks.size + this.subtasks.size,
    };
  }

  clearAllData(): void {
    this.communications.clear();
    this.actions.clear();
    this.sessions.clear();
    this.agentMetadata.clear();
    this.tasks.clear();
    this.masterTasks.clear();
    this.subtasks.clear();
    this.communicationsByAgent.clear();
    this.communicationsByTask.clear();
    this.actionsByAgent.clear();
    this.actionsByType.clear();
    this.tasksByAgent.clear();
    this.tasksByStatus.clear();
    this.tasksByPriority.clear();
    this.masterTasksByAgent.clear();
    this.masterTasksByStatus.clear();
    this.subtasksByTask.clear();
    this.subtasksByAgent.clear();
    this.subtasksByStatus.clear();
  }
}

export const memoryStorageService = new MemoryStorageService();
export type { AgentCommunication, AgentAction, AgentSession, AgentMetadata, Task, MasterTask, Subtask };
