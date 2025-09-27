interface QueuedTask {
  id: string;
  targetAgentId: string;
  requestingAgentId: string;
  taskData: {
    title: string;
    description: string;
  };
  aiRecommendation?: {
    recommendedAgentId: string;
    confidence: number;
    reasoning: string;
    alternativeAgents?: {
      agentId: string;
      confidence: number;
      reason: string;
    }[];
    wasAiSelected: boolean; // true if the targetAgentId matches AI recommendation
  };
  timestamp: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

interface HierarchicalTask {
  id: string;
  type: 'master' | 'subtask';
  masterTaskId?: string; // Only for subtasks
  targetAgentId: string;
  taskData: {
    prompt: string;
    media_b64?: string;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  dependencies?: string[]; // For subtasks that depend on other subtasks
}

class TaskQueueService {
  private queues: Map<string, QueuedTask[]> = new Map();
  private processing: Map<string, boolean> = new Map();
  private hierarchicalQueues: Map<string, HierarchicalTask[]> = new Map();
  private hierarchicalProcessing: Map<string, boolean> = new Map();

  addTaskToQueue(
    targetAgentId: string, 
    requestingAgentId: string, 
    taskData: QueuedTask['taskData'],
    aiRecommendation?: QueuedTask['aiRecommendation']
  ): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedTask: QueuedTask = {
      id: taskId,
      targetAgentId,
      requestingAgentId,
      taskData,
      aiRecommendation,
      timestamp: Date.now(),
      status: 'queued'
    };

    if (!this.queues.has(targetAgentId)) {
      this.queues.set(targetAgentId, []);
    }

    const agentQueue = this.queues.get(targetAgentId)!;
    
    // Add task to end of queue (FIFO - first in, first out)
    agentQueue.push(queuedTask);
    
    console.log(`Task ${taskId} added to queue for agent ${targetAgentId}. Queue length: ${agentQueue.length}`);
    return taskId;
  }

  getNextTask(agentId: string): QueuedTask | null {
    const agentQueue = this.queues.get(agentId);
    if (!agentQueue || agentQueue.length === 0) {
      return null;
    }

    // Find the first queued task
    const taskIndex = agentQueue.findIndex(task => task.status === 'queued');
    if (taskIndex === -1) {
      return null;
    }

    const task = agentQueue[taskIndex];
    task.status = 'processing';
    
    return task;
  }

  markTaskCompleted(agentId: string, taskId: string): boolean {
    const agentQueue = this.queues.get(agentId);
    if (!agentQueue) {
      return false;
    }

    const taskIndex = agentQueue.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      return false;
    }

    const task = agentQueue[taskIndex];
    task.status = 'completed';
    
    // Remove completed task from queue after a short delay to allow for status checking
    setTimeout(() => {
      const currentIndex = agentQueue.findIndex(t => t.id === taskId);
      if (currentIndex !== -1) {
        agentQueue.splice(currentIndex, 1);
      }
    }, 5000);

    console.log(`Task ${taskId} marked as completed for agent ${agentId}`);
    return true;
  }

  markTaskFailed(agentId: string, taskId: string, error?: string): boolean {
    const agentQueue = this.queues.get(agentId);
    if (!agentQueue) {
      return false;
    }

    const taskIndex = agentQueue.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      return false;
    }

    const task = agentQueue[taskIndex];
    task.status = 'failed';
    
    console.log(`Task ${taskId} marked as failed for agent ${agentId}:`, error);
    
    // Remove failed task from queue after a delay
    setTimeout(() => {
      const currentIndex = agentQueue.findIndex(t => t.id === taskId);
      if (currentIndex !== -1) {
        agentQueue.splice(currentIndex, 1);
      }
    }, 10000);

    return true;
  }

  getQueueStatus(agentId: string): { 
    queueLength: number; 
    processing: boolean; 
    tasks: QueuedTask[] 
  } {
    const agentQueue = this.queues.get(agentId) || [];
    const isProcessing = this.processing.get(agentId) || false;
    
    return {
      queueLength: agentQueue.filter(task => task.status === 'queued').length,
      processing: isProcessing,
      tasks: agentQueue
    };
  }

  getAllQueues(): Record<string, { queueLength: number; processing: boolean; tasks: QueuedTask[] }> {
    const result: Record<string, any> = {};
    
    this.queues.forEach((_, agentId) => {
      result[agentId] = this.getQueueStatus(agentId);
    });
    
    return result;
  }

  getAllHierarchicalQueues(): Record<string, { queueLength: number; processing: boolean; tasks: HierarchicalTask[] }> {
    const result: Record<string, any> = {};
    
    console.log(`🔍 getAllHierarchicalQueues called - hierarchicalQueues size:`, this.hierarchicalQueues.size);
    console.log(`🔍 hierarchicalQueues keys:`, Array.from(this.hierarchicalQueues.keys()));
    
    this.hierarchicalQueues.forEach((queue, agentId) => {
      console.log(`🔍 Agent ${agentId} queue length:`, queue.length);
      result[agentId] = this.getHierarchicalQueueStatus(agentId);
    });
    
    return result;
  }

  setProcessingStatus(agentId: string, processing: boolean): void {
    this.processing.set(agentId, processing);
  }

  isProcessing(agentId: string): boolean {
    return this.processing.get(agentId) || false;
  }

  clearQueue(agentId: string): boolean {
    if (this.queues.has(agentId)) {
      this.queues.delete(agentId);
      this.processing.delete(agentId);
      console.log(`Queue cleared for agent ${agentId}`);
      return true;
    }
    return false;
  }

  getTaskById(agentId: string, taskId: string): QueuedTask | null {
    const agentQueue = this.queues.get(agentId);
    if (!agentQueue) {
      return null;
    }

    return agentQueue.find(task => task.id === taskId) || null;
  }

  // ===== HIERARCHICAL TASK MANAGEMENT =====

  addHierarchicalTask(
    targetAgentId: string,
    taskData: HierarchicalTask['taskData'],
    type: 'master' | 'subtask',
    masterTaskId?: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    dependencies?: string[]
  ): string {
    const taskId = `hierarchical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const hierarchicalTask: HierarchicalTask = {
      id: taskId,
      type,
      masterTaskId,
      targetAgentId,
      taskData,
      priority,
      timestamp: Date.now(),
      status: 'queued',
      dependencies
    };

    if (!this.hierarchicalQueues.has(targetAgentId)) {
      this.hierarchicalQueues.set(targetAgentId, []);
      console.log(`🔍 Created new hierarchical queue for agent ${targetAgentId}`);
    }

    const agentQueue = this.hierarchicalQueues.get(targetAgentId)!;
    
    // Add task to queue with priority ordering
    this.insertTaskByPriority(agentQueue, hierarchicalTask);
    
    console.log(`🔍 Hierarchical task ${taskId} (${type}) added to queue for agent ${targetAgentId}. Queue length: ${agentQueue.length}`);
    console.log(`🔍 Total hierarchical queues now:`, this.hierarchicalQueues.size);
    return taskId;
  }

  private insertTaskByPriority(queue: HierarchicalTask[], task: HierarchicalTask): void {
    const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
    const taskPriority = priorityOrder[task.priority];
    
    let insertIndex = queue.length;
    for (let i = 0; i < queue.length; i++) {
      const existingPriority = priorityOrder[queue[i].priority];
      if (taskPriority < existingPriority) {
        insertIndex = i;
        break;
      }
    }
    
    queue.splice(insertIndex, 0, task);
  }

  getNextHierarchicalTask(agentId: string): HierarchicalTask | null {
    const agentQueue = this.hierarchicalQueues.get(agentId);
    if (!agentQueue || agentQueue.length === 0) {
      return null;
    }

    // Find the first queued task that has no unmet dependencies
    for (let i = 0; i < agentQueue.length; i++) {
      const task = agentQueue[i];
      if (task.status === 'queued' && this.areDependenciesMet(task)) {
        task.status = 'processing';
        return task;
      }
    }

    return null;
  }

  private areDependenciesMet(task: HierarchicalTask): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    // Check if all dependencies are completed
    for (const depId of task.dependencies) {
      const depTask = this.findHierarchicalTaskById(depId);
      if (!depTask || depTask.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  private findHierarchicalTaskById(taskId: string): HierarchicalTask | null {
    for (const queue of Array.from(this.hierarchicalQueues.values())) {
      const task = queue.find((t: HierarchicalTask) => t.id === taskId);
      if (task) return task;
    }
    return null;
  }

  markHierarchicalTaskCompleted(agentId: string, taskId: string): boolean {
    const agentQueue = this.hierarchicalQueues.get(agentId);
    if (!agentQueue) {
      return false;
    }

    const taskIndex = agentQueue.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      return false;
    }

    const task = agentQueue[taskIndex];
    task.status = 'completed';
    
    console.log(`Hierarchical task ${taskId} marked as completed for agent ${agentId}`);
    return true;
  }

  markHierarchicalTaskFailed(agentId: string, taskId: string, error?: string): boolean {
    const agentQueue = this.hierarchicalQueues.get(agentId);
    if (!agentQueue) {
      return false;
    }

    const taskIndex = agentQueue.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      return false;
    }

    const task = agentQueue[taskIndex];
    task.status = 'failed';
    
    console.log(`Hierarchical task ${taskId} marked as failed for agent ${agentId}:`, error);
    return true;
  }

  getHierarchicalQueueStatus(agentId: string): { 
    queueLength: number; 
    processing: boolean; 
    tasks: HierarchicalTask[] 
  } {
    const agentQueue = this.hierarchicalQueues.get(agentId) || [];
    const isProcessing = this.hierarchicalProcessing.get(agentId) || false;
    
    return {
      queueLength: agentQueue.filter(task => task.status === 'queued').length,
      processing: isProcessing,
      tasks: agentQueue
    };
  }

  setHierarchicalProcessingStatus(agentId: string, processing: boolean): void {
    this.hierarchicalProcessing.set(agentId, processing);
  }

  isHierarchicalProcessing(agentId: string): boolean {
    return this.hierarchicalProcessing.get(agentId) || false;
  }

  clearHierarchicalQueue(agentId: string): boolean {
    if (this.hierarchicalQueues.has(agentId)) {
      this.hierarchicalQueues.delete(agentId);
      this.hierarchicalProcessing.delete(agentId);
      console.log(`Hierarchical queue cleared for agent ${agentId}`);
      return true;
    }
    return false;
  }

  getHierarchicalTaskById(agentId: string, taskId: string): HierarchicalTask | null {
    const agentQueue = this.hierarchicalQueues.get(agentId);
    if (!agentQueue) {
      return null;
    }

    return agentQueue.find(task => task.id === taskId) || null;
  }

  // Get all hierarchical tasks for a master task
  getHierarchicalTasksByMasterTask(masterTaskId: string): HierarchicalTask[] {
    const allTasks: HierarchicalTask[] = [];
    
    for (const queue of Array.from(this.hierarchicalQueues.values())) {
      queue.forEach((task: HierarchicalTask) => {
        if (task.masterTaskId === masterTaskId) {
          allTasks.push(task);
        }
      });
    }
    
    return allTasks.sort((a, b) => a.timestamp - b.timestamp);
  }
}

export const taskQueueService = new TaskQueueService();
export type { QueuedTask, HierarchicalTask };