import { redisService, AgentMetadata, AgentCommunication, AgentAction, Task } from './redisService';

// This service provides the same interface as the original memoryStorageService
// but uses Redis for persistence instead of in-memory storage

export class PersistentMemoryStorageService {
  // Agent Metadata Operations
  setAgentMetadata(data: AgentMetadata): AgentMetadata {
    // Use async/await in a sync wrapper for compatibility
    redisService.setAgentMetadata(data).catch(console.error);
    return data;
  }

  getAgentMetadata(agentId: string): AgentMetadata | null {
    // This is a sync method, but Redis is async
    // We'll need to handle this differently in the actual implementation
    // For now, return null and let the async methods handle it
    return null;
  }

  async getAgentMetadataAsync(agentId: string): Promise<AgentMetadata | null> {
    return await redisService.getAgentMetadata(agentId);
  }

  async setAgentMetadataAsync(data: AgentMetadata): Promise<AgentMetadata> {
    return await redisService.setAgentMetadata(data);
  }

  updateAgentMetadata(agentId: string, updates: Partial<Omit<AgentMetadata, 'id'>>): AgentMetadata | null {
    // Use async/await in a sync wrapper for compatibility
    redisService.updateAgentMetadata(agentId, updates).catch(console.error);
    return null; // We can't return the updated value synchronously
  }

  async updateAgentMetadataAsync(agentId: string, updates: Partial<Omit<AgentMetadata, 'id'>>): Promise<AgentMetadata | null> {
    return await redisService.updateAgentMetadata(agentId, updates);
  }

  getAllAgentMetadata(): AgentMetadata[] {
    // This is a sync method, but Redis is async
    // We'll need to handle this differently in the actual implementation
    return [];
  }

  async getAllAgentMetadataAsync(): Promise<AgentMetadata[]> {
    return await redisService.getAllAgentMetadata();
  }

  getActiveAgents(): AgentMetadata[] {
    // This is a sync method, but Redis is async
    // We'll need to handle this differently in the actual implementation
    return [];
  }

  async getActiveAgentsAsync(): Promise<AgentMetadata[]> {
    return await redisService.getActiveAgents();
  }

  // Agent Communication Operations
  addCommunication(communication: AgentCommunication): AgentCommunication {
    // Use async/await in a sync wrapper for compatibility
    redisService.addCommunication(communication).catch(console.error);
    return communication;
  }

  async addCommunicationAsync(communication: AgentCommunication): Promise<AgentCommunication> {
    return await redisService.addCommunication(communication);
  }

  getCommunications(agentId: string): AgentCommunication[] {
    // This is a sync method, but Redis is async
    // We'll need to handle this differently in the actual implementation
    return [];
  }

  async getCommunicationsAsync(agentId: string): Promise<AgentCommunication[]> {
    return await redisService.getCommunications(agentId);
  }

  // Agent Action Operations
  addAction(action: AgentAction): AgentAction {
    // Use async/await in a sync wrapper for compatibility
    redisService.addAction(action).catch(console.error);
    return action;
  }

  async addActionAsync(action: AgentAction): Promise<AgentAction> {
    return await redisService.addAction(action);
  }

  getActions(agentId: string): AgentAction[] {
    // This is a sync method, but Redis is async
    // We'll need to handle this differently in the actual implementation
    return [];
  }

  async getActionsAsync(agentId: string): Promise<AgentAction[]> {
    return await redisService.getActions(agentId);
  }

  // Task Operations
  setTask(task: Task): Task {
    // Use async/await in a sync wrapper for compatibility
    redisService.setTask(task).catch(console.error);
    return task;
  }

  async setTaskAsync(task: Task): Promise<Task> {
    return await redisService.setTask(task);
  }

  getTask(taskId: string): Task | null {
    // This is a sync method, but Redis is async
    // We'll need to handle this differently in the actual implementation
    return null;
  }

  async getTaskAsync(taskId: string): Promise<Task | null> {
    return await redisService.getTask(taskId);
  }

  getAllTasks(): Task[] {
    // This is a sync method, but Redis is async
    // We'll need to handle this differently in the actual implementation
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
}

export const persistentMemoryStorageService = new PersistentMemoryStorageService();
