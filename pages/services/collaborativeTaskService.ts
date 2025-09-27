import { Notification } from '../hooks/useNotifications';

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

  setNotificationCallback(callback: (notification: Omit<Notification, 'id' | 'timestamp'>) => void) {
    this.onNotification = callback;
  }

  private notify(notification: Omit<Notification, 'id' | 'timestamp'>) {
    if (this.onNotification) {
      this.onNotification(notification);
    }
  }

  async generateCollaborativeTask(request: CollaborativeTaskRequest): Promise<CollaborativeTaskResponse> {
    try {
      // Show notification that ChatGPT is being asked for a task
      this.notify({
        type: 'info',
        title: '🤖 ChatGPT Task Generation',
        message: 'Asking ChatGPT to generate a collaborative task...',
        duration: 3000
      });

      const response = await fetch('/api/tasks/generate-collaborative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        this.notify({
          type: 'error',
          title: '❌ Task Generation Failed',
          message: data.error || 'Failed to generate collaborative task',
          duration: 5000
        });
        return { success: false, error: data.error };
      }

      // Show success notification
      this.notify({
        type: 'success',
        title: '✅ Task Generated Successfully',
        message: `ChatGPT created ${data.totalTasks} master task(s) with ${data.totalSubtasks} subtasks`,
        duration: 4000
      });

      return {
        success: true,
        message: data.message,
        tasks: data.tasks,
        totalTasks: data.totalTasks,
        totalSubtasks: data.totalSubtasks
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.notify({
        type: 'error',
        title: '❌ Network Error',
        message: `Failed to connect to ChatGPT: ${errorMessage}`,
        duration: 5000
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async submitTaskResult(agentAddress: string, taskId: string, result: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.notify({
        type: 'info',
        title: '🔄 Submitting Task Result',
        message: `Agent ${agentAddress} is submitting their task result...`,
        duration: 2000
      });

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
        this.notify({
          type: 'error',
          title: '❌ Task Submission Failed',
          message: data.error || 'Failed to submit task result',
          duration: 4000
        });
        return { success: false, error: data.error };
      }

      this.notify({
        type: 'success',
        title: '✅ Task Completed',
        message: data.message || 'Task completed successfully',
        duration: 3000
      });

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.notify({
        type: 'error',
        title: '❌ Network Error',
        message: `Failed to submit task result: ${errorMessage}`,
        duration: 4000
      });

      return { success: false, error: errorMessage };
    }
  }

  async processMasterTask(request: MasterTaskProcessingRequest): Promise<{ success: boolean; error?: string }> {
    try {
      this.notify({
        type: 'info',
        title: '🎯 Processing Master Task',
        message: `Master agent ${request.agentAddress} is processing aggregated results...`,
        duration: 2000
      });

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
        this.notify({
          type: 'error',
          title: '❌ Master Task Failed',
          message: data.error || 'Failed to process master task',
          duration: 4000
        });
        return { success: false, error: data.error };
      }

      this.notify({
        type: 'success',
        title: '🎉 Master Task Completed',
        message: data.message || 'Master task completed successfully',
        duration: 4000
      });

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.notify({
        type: 'error',
        title: '❌ Network Error',
        message: `Failed to process master task: ${errorMessage}`,
        duration: 4000
      });

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
