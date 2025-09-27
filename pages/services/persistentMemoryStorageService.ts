import { redisService, AgentMetadata, AgentCommunication, AgentAction, Task } from './redisService';

// This service provides the same interface as the original memoryStorageService
// but uses Redis for persistence instead of in-memory storage
// Note: Redis operations are async, so sync methods will return default values
// Use the async versions for proper Redis integration

export class PersistentMemoryStorageService {
  // Agent Metadata Operations
  setAgentMetadata(data: AgentMetadata): AgentMetadata {
    // Fire and forget - Redis operation happens in background
    redisService.setAgentMetadata(data).catch(error => {
      console.error('Failed to set agent metadata in Redis:', error);
    });
    return data;
  }

  getAgentMetadata(agentId: string): AgentMetadata | null {
    // Sync method cannot return Redis data - use getAgentMetadataAsync instead
    console.warn('getAgentMetadata is sync but Redis is async. Use getAgentMetadataAsync instead.');
    return null;
  }

  async getAgentMetadataAsync(agentId: string): Promise<AgentMetadata | null> {
    return await redisService.getAgentMetadata(agentId);
  }

  async setAgentMetadataAsync(data: AgentMetadata): Promise<AgentMetadata> {
    return await redisService.setAgentMetadata(data);
  }

  updateAgentMetadata(agentId: string, updates: Partial<Omit<AgentMetadata, 'id'>>): AgentMetadata | null {
    // Fire and forget - Redis operation happens in background
    redisService.updateAgentMetadata(agentId, updates).catch(error => {
      console.error('Failed to update agent metadata in Redis:', error);
    });
    return null; // We can't return the updated value synchronously
  }

  async updateAgentMetadataAsync(agentId: string, updates: Partial<Omit<AgentMetadata, 'id'>>): Promise<AgentMetadata | null> {
    return await redisService.updateAgentMetadata(agentId, updates);
  }

  getAllAgentMetadata(): AgentMetadata[] {
    // Sync method cannot return Redis data - use getAllAgentMetadataAsync instead
    console.warn('getAllAgentMetadata is sync but Redis is async. Use getAllAgentMetadataAsync instead.');
    return [];
  }

  async getAllAgentMetadataAsync(): Promise<AgentMetadata[]> {
    return await redisService.getAllAgentMetadata();
  }

  getActiveAgents(): AgentMetadata[] {
    // Sync method cannot return Redis data - use getActiveAgentsAsync instead
    console.warn('getActiveAgents is sync but Redis is async. Use getActiveAgentsAsync instead.');
    return [];
  }

  async getActiveAgentsAsync(): Promise<AgentMetadata[]> {
    return await redisService.getActiveAgents();
  }

  // Agent Communication Operations
  addCommunication(communication: AgentCommunication): AgentCommunication {
    // Fire and forget - Redis operation happens in background
    redisService.addCommunication(communication).catch(error => {
      console.error('Failed to add communication in Redis:', error);
    });
    return communication;
  }

  async addCommunicationAsync(communication: AgentCommunication): Promise<AgentCommunication> {
    return await redisService.addCommunication(communication);
  }

  getCommunications(agentId: string): AgentCommunication[] {
    // Sync method cannot return Redis data - use getCommunicationsAsync instead
    console.warn('getCommunications is sync but Redis is async. Use getCommunicationsAsync instead.');
    return [];
  }

  async getCommunicationsAsync(agentId: string): Promise<AgentCommunication[]> {
    return await redisService.getCommunications(agentId);
  }

  // Agent Action Operations
  addAction(action: AgentAction): AgentAction {
    // Fire and forget - Redis operation happens in background
    redisService.addAction(action).catch(error => {
      console.error('Failed to add action in Redis:', error);
    });
    return action;
  }

  async addActionAsync(action: AgentAction): Promise<AgentAction> {
    return await redisService.addAction(action);
  }

  getActions(agentId: string): AgentAction[] {
    // Sync method cannot return Redis data - use getActionsAsync instead
    console.warn('getActions is sync but Redis is async. Use getActionsAsync instead.');
    return [];
  }

  async getActionsAsync(agentId: string): Promise<AgentAction[]> {
    return await redisService.getActions(agentId);
  }

  // Task Operations
  setTask(task: Task): Task {
    // Fire and forget - Redis operation happens in background
    redisService.setTask(task).catch(error => {
      console.error('Failed to set task in Redis:', error);
    });
    return task;
  }

  async setTaskAsync(task: Task): Promise<Task> {
    return await redisService.setTask(task);
  }

  getTask(taskId: string): Task | null {
    // Sync method cannot return Redis data - use getTaskAsync instead
    console.warn('getTask is sync but Redis is async. Use getTaskAsync instead.');
    return null;
  }

  async getTaskAsync(taskId: string): Promise<Task | null> {
    return await redisService.getTask(taskId);
  }

  getAllTasks(): Task[] {
    // Sync method cannot return Redis data - use getAllTasksAsync instead
    console.warn('getAllTasks is sync but Redis is async. Use getAllTasksAsync instead.');
    return [];
  }

  async getAllTasksAsync(): Promise<Task[]> {
    return await redisService.getAllTasks();
  }

  // Utility Operations
  async clearAll(): Promise<void> {
    await redisService.clearAll();
  }

  async getStats(): Promise<{ agents: number; communications: number; actions: number; tasks: number }> {
    return await redisService.getStats();
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      await redisService.getStats();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Batch operations for better performance
  async setMultipleAgentMetadata(metadataList: AgentMetadata[]): Promise<AgentMetadata[]> {
    const promises = metadataList.map(metadata => redisService.setAgentMetadata(metadata));
    return await Promise.all(promises);
  }

  async getMultipleAgentMetadata(agentIds: string[]): Promise<(AgentMetadata | null)[]> {
    const promises = agentIds.map(id => redisService.getAgentMetadata(id));
    return await Promise.all(promises);
  }

  // Connection management
  async connect(): Promise<void> {
    // Redis connection is handled by the redisService
    // This method exists for interface compatibility
    console.log('PersistentMemoryStorageService: Redis connection managed by redisService');
  }

  async disconnect(): Promise<void> {
    // Redis disconnection is handled by the redisService
    // This method exists for interface compatibility
    console.log('PersistentMemoryStorageService: Redis disconnection managed by redisService');
  }
}

export const persistentMemoryStorageService = new PersistentMemoryStorageService();
