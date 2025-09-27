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

class TaskQueueService {
  private queues: Map<string, QueuedTask[]> = new Map();
  private processing: Map<string, boolean> = new Map();

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
    tasks: Omit<QueuedTask, 'taskData'>[] 
  } {
    const agentQueue = this.queues.get(agentId) || [];
    const isProcessing = this.processing.get(agentId) || false;
    
    return {
      queueLength: agentQueue.filter(task => task.status === 'queued').length,
      processing: isProcessing,
      tasks: agentQueue.map(({ taskData, ...task }) => task)
    };
  }

  getAllQueues(): Record<string, { queueLength: number; processing: boolean; tasks: Omit<QueuedTask, 'taskData'>[] }> {
    const result: Record<string, any> = {};
    
    this.queues.forEach((_, agentId) => {
      result[agentId] = this.getQueueStatus(agentId);
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
}

export const taskQueueService = new TaskQueueService();
export type { QueuedTask };
