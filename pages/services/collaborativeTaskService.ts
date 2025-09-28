import { Notification } from '../hooks/useNotifications';
import { gameState } from '../../src/game/state';

export interface CollaborativeTaskRequest {
  userId: string;
}

export interface CollaborativeTaskResponse {
  success: boolean;
  message?: string;
  tasks?: any[];
  error?: string;
  totalTasks?: number;
  totalSubtasks?: number;
}

export interface SubtaskExecutionRequest {
  subtaskId: string;
  agentAddress: string;
  output: string;
}

export interface MasterTaskProcessingRequest {
  masterTaskId: string;
  agentAddress: string;
  finalOutput: string;
}

class CollaborativeTaskService {
  private onNotification?: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  
  // Rate limiting configuration
  private readonly MAX_REQUESTS_PER_MINUTE = 3; // Maximum 3 task generation requests per minute
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
  private requestTimestamps: number[] = []; // Track request timestamps

  setNotificationCallback(callback: (notification: Omit<Notification, 'id' | 'timestamp'>) => void) {
    this.onNotification = callback;
  }

  private notify(notification: Omit<Notification, 'id' | 'timestamp'>) {
    if (this.onNotification) {
      this.onNotification(notification);
    }
  }

  private setAgentThought(agentId: string, thought: string, duration: number = 5000) {
    const agent = gameState.getState().aiAgents.get(agentId);
    if (agent) {
      agent.currentThought = thought;
      agent.chatBubble = {
        message: thought,
        timestamp: Date.now(),
        duration: duration
      };
      console.log(`💭 Agent ${agent.name}: ${thought}`);
    }
  }

  private isRateLimited(): boolean {
    const now = Date.now();
    
    // Remove timestamps older than the rate limit window
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.RATE_LIMIT_WINDOW_MS
    );
    
    // Check if we've exceeded the rate limit
    return this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE;
  }

  private recordRequest(): void {
    const now = Date.now();
    this.requestTimestamps.push(now);
    console.log(`📊 Rate limit: ${this.requestTimestamps.length}/${this.MAX_REQUESTS_PER_MINUTE} requests in the last minute`);
  }

  private getTimeUntilNextRequest(): number {
    if (this.requestTimestamps.length === 0) return 0;
    
    const oldestRequest = Math.min(...this.requestTimestamps);
    const timeUntilOldestExpires = this.RATE_LIMIT_WINDOW_MS - (Date.now() - oldestRequest);
    return Math.max(0, timeUntilOldestExpires);
  }

  // Public method to get current rate limit status
  public getRateLimitStatus(): { isLimited: boolean; requestsUsed: number; maxRequests: number; timeUntilNext: number } {
    const now = Date.now();
    
    // Clean up old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.RATE_LIMIT_WINDOW_MS
    );
    
    return {
      isLimited: this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE,
      requestsUsed: this.requestTimestamps.length,
      maxRequests: this.MAX_REQUESTS_PER_MINUTE,
      timeUntilNext: this.getTimeUntilNextRequest()
    };
  }

  async generateCollaborativeTask(request: CollaborativeTaskRequest): Promise<CollaborativeTaskResponse> {
    try {
      // Check rate limiting first
      if (this.isRateLimited()) {
        const timeUntilNext = this.getTimeUntilNextRequest();
        const secondsUntilNext = Math.ceil(timeUntilNext / 1000);
        
        // Show rate limit message as agent thought
        const agents = Array.from(gameState.getState().aiAgents.values());
        if (agents.length > 0) {
          const randomAgent = agents[Math.floor(Math.random() * agents.length)];
          this.setAgentThought(randomAgent.id, `⏳ Rate limited: ${secondsUntilNext}s until next request`, 5000);
        }
        
        return {
          success: false,
          error: `Rate limited: Please wait ${secondsUntilNext} seconds before generating another task. Maximum ${this.MAX_REQUESTS_PER_MINUTE} requests per minute.`
        };
      }

      // Record this request
      this.recordRequest();

      // Set a general agent thought about task generation
      const agents = Array.from(gameState.getState().aiAgents.values());
      if (agents.length > 0) {
        const randomAgent = agents[Math.floor(Math.random() * agents.length)];
        this.setAgentThought(randomAgent.id, '🤖 Thinking about new collaborative tasks...', 3000);
      }

      const response = await fetch('/api/tasks/generate-collaborative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show error as agent thought
        if (agents.length > 0) {
          const randomAgent = agents[Math.floor(Math.random() * agents.length)];
          this.setAgentThought(randomAgent.id, '❌ Failed to generate new tasks', 5000);
        }
        return { success: false, error: data.error };
      }

      // Show success as agent thoughts - set thoughts for agents who will be involved
      if (data.tasks && data.tasks.length > 0) {
        // Get agents involved in the first task
        const firstTask = data.tasks[0];
        if (firstTask.agentic_tasks && firstTask.agentic_tasks.length > 0) {
          firstTask.agentic_tasks.forEach((subtask: any, index: number) => {
            const agent = gameState.getState().aiAgents.get(subtask.agent_address);
            if (agent) {
              const thought = `🎯 I have a new task: ${subtask.prompt || 'Collaborative work assignment'}`;
              this.setAgentThought(agent.id, thought, 6000);
            }
          });
        }
      }

      return {
        success: true,
        message: data.message,
        tasks: data.tasks,
        totalTasks: data.totalTasks,
        totalSubtasks: data.totalSubtasks
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Show error as agent thought
      const agents = Array.from(gameState.getState().aiAgents.values());
      if (agents.length > 0) {
        const randomAgent = agents[Math.floor(Math.random() * agents.length)];
        this.setAgentThought(randomAgent.id, '❌ Network error during task generation', 5000);
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async submitTaskResult(agentAddress: string, taskId: string, result: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Show agent thought about submitting task result
      this.setAgentThought(agentAddress, '📤 Submitting my task result...', 2000);

      const response = await fetch('/api/tasks/submit-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentAddress: agentAddress,
          taskId: taskId,
          result: result
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.setAgentThought(agentAddress, '❌ Failed to submit task result', 4000);
        return { success: false, error: data.error };
      }

      this.setAgentThought(agentAddress, '✅ Task completed successfully!', 3000);

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.setAgentThought(agentAddress, '❌ Network error during submission', 4000);

      return { success: false, error: errorMessage };
    }
  }

  async processMasterTask(request: MasterTaskProcessingRequest): Promise<{ success: boolean; error?: string }> {
    try {
      this.setAgentThought(request.agentAddress, '🎯 Processing master task results...', 2000);

      const response = await fetch(`/api/master-tasks/${request.masterTaskId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentAddress: request.agentAddress,
          finalOutput: request.finalOutput
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.setAgentThought(request.agentAddress, '❌ Failed to process master task', 4000);
        return { success: false, error: data.error };
      }

      this.setAgentThought(request.agentAddress, '🎉 Master task completed successfully!', 4000);

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.setAgentThought(request.agentAddress, '❌ Network error during master task processing', 4000);

      return { success: false, error: errorMessage };
    }
  }

  async getTasksForAgent(agentAddress: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await fetch(`/api/subtasks/pending/${agentAddress}`);
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      // Data is already in the original JSON format
      return { success: true, data: data };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async getReadyMasterTasks(agentAddress: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await fetch(`/api/master-tasks/ready/${agentAddress}`);
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true, data: data.readyTasks };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async getCollaborativeTaskStatus(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch('/api/tasks/collaborative-status');
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true, data: data.status };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
}

export const collaborativeTaskService = new CollaborativeTaskService();
