import { createClient, RedisClientType } from 'redis';

export interface AgentMetadata {
  id: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'busy' | 'offline';
  assigned_building_ids: string[];
  current_building_id?: string;
  experience_points: number;
  level: number;
  reputation_score: number;
  last_active: string;
  created_at: string;
  updated_at: string;
}

export interface AgentCommunication {
  id: string;
  sender_agent_id: string;
  receiver_agent_id?: string;
  content: string;
  message_type: 'direct' | 'broadcast' | 'task_related' | 'system';
  metadata?: any;
  task_id?: string;
  timestamp: string;
  read: boolean;
}

export interface AgentAction {
  id: string;
  agent_id: string;
  action_type: string;
  action_data: any;
  building_id?: string;
  success: boolean;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  creator_agent_id: string;
  assigned_agent_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  task_type: 'communication' | 'building_management' | 'resource_gathering' | 'collaboration' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requirements?: any;
  reward_amount?: number;
  reward_token?: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Connected to Redis');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.log('❌ Disconnected from Redis');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected || !this.client) {
      await this.connect();
    }
  }

  // Agent Metadata Operations
  async setAgentMetadata(data: AgentMetadata): Promise<AgentMetadata> {
    await this.ensureConnected();
    if (!this.client) throw new Error('Redis client not available');
    
    const key = `agent_metadata:${data.id}`;
    await this.client.set(key, JSON.stringify(data));
    return data;
  }

  async getAgentMetadata(agentId: string): Promise<AgentMetadata | null> {
    await this.ensureConnected();
    if (!this.client) throw new Error('Redis client not available');
    
    const key = `agent_metadata:${agentId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async updateAgentMetadata(agentId: string, updates: Partial<Omit<AgentMetadata, 'id'>>): Promise<AgentMetadata | null> {
    await this.ensureConnected();
    if (!this.client) throw new Error('Redis client not available');
    
    const existing = await this.getAgentMetadata(agentId);
    if (!existing) return null;

    const updated: AgentMetadata = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    await this.setAgentMetadata(updated);
    return updated;
  }

  async getAllAgentMetadata(): Promise<AgentMetadata[]> {
    await this.ensureConnected();
    if (!this.client) throw new Error('Redis client not available');
    
    const keys = await this.client.keys('agent_metadata:*');
    const agents: AgentMetadata[] = [];
    
    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        agents.push(JSON.parse(data));
      }
    }
    
    return agents;
  }

  async getActiveAgents(): Promise<AgentMetadata[]> {
    const allAgents = await this.getAllAgentMetadata();
    return allAgents.filter(agent => agent.status === 'active');
  }

  // Agent Communication Operations
  async addCommunication(communication: AgentCommunication): Promise<AgentCommunication> {
    await this.ensureConnected();
    if (!this.client) throw new Error('Redis client not available');
    
    const key = `agent_communication:${communication.id}`;
    await this.client.set(key, JSON.stringify(communication));
    
    // Add to sender's communication list
    const senderKey = `agent_communications:${communication.sender_agent_id}`;
    await this.client.lPush(senderKey, communication.id);
    
    // Add to receiver's communication list if specified
    if (communication.receiver_agent_id) {
      const receiverKey = `agent_communications:${communication.receiver_agent_id}`;
      await this.client.lPush(receiverKey, communication.id);
    }
    
    return communication;
  }

  async getCommunications(agentId: string): Promise<AgentCommunication[]> {
    await this.ensureConnected();
    if (!this.client) throw new Error('Redis client not available');
    
    const key = `agent_communications:${agentId}`;
    const communicationIds = await this.client.lRange(key, 0, -1);
    const communications: AgentCommunication[] = [];
    
    for (const id of communicationIds) {
      const data = await this.client.get(`agent_communication:${id}`);
      if (data) {
        communications.push(JSON.parse(data));
      }
    }
    
    return communications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Agent Action Operations
  async addAction(action: AgentAction): Promise<AgentAction> {
    await this.ensureConnected();
    if (!this.client) throw new Error('Redis client not available');
    
    const key = `agent_action:${action.id}`;
    await this.client.set(key, JSON.stringify(action));
    
    // Add to agent's action list
    const agentKey = `agent_actions:${action.agent_id}`;
    await this.client.lPush(agentKey, action.id);
    
    return action;
  }

  async getActions(agentId: string): Promise<AgentAction[]> {
    await this.ensureConnected();
    if (!this.client) throw new Error('Redis client not available');
    
    const key = `agent_actions:${agentId}`;
    const actionIds = await this.client.lRange(key, 0, -1);
    const actions: AgentAction[] = [];
    
    for (const id of actionIds) {
      const data = await this.client.get(`agent_action:${id}`);
      if (data) {
        actions.push(JSON.parse(data));
      }
    }
    
    return actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Task Operations
  async setTask(task: Task): Promise<Task> {
    await this.ensureConnected();
    if (!this.client) throw new Error('Redis client not available');
    
    const key = `task:${task.id}`;
    await this.client.set(key, JSON.stringify(task));
    return task;
  }

  async getTask(taskId: string): Promise<Task | null> {
    await this.ensureConnected();
    if (!this.client) throw new Error('Redis client not available');
    
    const key = `task:${taskId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getAllTasks(): Promise<Task[]> {
    await this.ensureConnected();
    if (!this.client) throw new Error('Redis client not available');
    
    const keys = await this.client.keys('task:*');
    const tasks: Task[] = [];
    
    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        tasks.push(JSON.parse(data));
      }
    }
    
    return tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Utility Operations
  async clearAll(): Promise<void> {
    await this.ensureConnected();
    if (!this.client) throw new Error('Redis client not available');
    
    await this.client.flushAll();
    console.log('🧹 Cleared all Redis data');
  }

  async getStats(): Promise<{ agents: number; communications: number; actions: number; tasks: number }> {
    await this.ensureConnected();
    if (!this.client) throw new Error('Redis client not available');
    
    const agentKeys = await this.client.keys('agent_metadata:*');
    const communicationKeys = await this.client.keys('agent_communication:*');
    const actionKeys = await this.client.keys('agent_action:*');
    const taskKeys = await this.client.keys('task:*');
    
    return {
      agents: agentKeys.length,
      communications: communicationKeys.length,
      actions: actionKeys.length,
      tasks: taskKeys.length
    };
  }
}

export const redisService = new RedisService();
