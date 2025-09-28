import { supabase } from "../lib/supabase";
import { taskQueueService } from "./taskQueueService";
import {
  memoryStorageService,
  AgentCommunication,
  AgentAction,
  AgentMetadata,
  Task,
} from "./memoryStorageService";
import { persistentMemoryStorageService } from "./persistentMemoryStorageService";
import {
  getAvailableBuildings,
  assignAgentToBuilding,
} from "../../src/maps/defaultMap";
import { redisService } from "./redisService";
import { startupInitializer } from "./startupInitializer";

// Minimal database agent interface (only what's stored in DB)
interface DbAgent {
  id: string;
  name: string;
  owner_address: string;
  wallet_address?: string;
  privy_wallet_address?: string;
  user_id?: string;
  created_at: string;
}

// Full agent interface (DB + Memory data combined)
interface Agent extends DbAgent {
  description?: string;
  personality?: {
    traits: string[];
    communication_style: string;
    goals: string[];
    preferences: Record<string, any>;
  };
  capabilities: string[];
  status: "active" | "inactive" | "busy" | "offline";
  current_building_id?: string;
  assigned_building_ids: string[];
  avatar_url?: string;
  experience_points: number;
  level: number;
  total_capital: number;
  reputation_score: number;
  last_active: string;
  updated_at: string;
}

// Type assertion helper for Supabase operations
const typedSupabase = supabase as any;

export interface AgentRegistrationData {
  name: string;
  description?: string;
  owner_address: string;
  personality?: {
    traits: string[];
    communication_style: string;
    goals: string[];
    preferences: Record<string, any>;
  };
  capabilities: string[];
  wallet_address?: string;
  avatar_url?: string;
}

export interface TaskCreationData {
  title: string;
  description: string;
  creator_agent_id: string;
  task_type?:
    | "communication"
    | "building_management"
    | "resource_gathering"
    | "collaboration"
    | "custom";
  priority?: "low" | "medium" | "high" | "urgent";
  requirements?: any;
  reward_amount?: number;
  reward_token?: string;
  deadline?: string;
}

export interface MessageData {
  sender_agent_id: string;
  receiver_agent_id?: string;
  content: string;
  message_type?: "direct" | "broadcast" | "task_related" | "system";
  metadata?: any;
  task_id?: string;
}

export class AgentService {
  // ===== AGENT MANAGEMENT =====

  async registerAgent(
    agentData: AgentRegistrationData
  ): Promise<{ success: boolean; data?: Agent; error?: string }> {
    try {
      // Store only essential data in database
      const dbInsertData = {
        name: agentData.name,
        owner_address: agentData.owner_address,
        wallet_address: agentData.wallet_address || null,
      };

      const { data: dbData, error } = await typedSupabase
        .from("agents")
        .insert(dbInsertData)
        .select()
        .single();

      if (error) {
        console.error("Error registering agent:", error);
        return { success: false, error: error.message };
      }

      if (!dbData) {
        return { success: false, error: "No data returned from insert" };
      }

      // Auto-assign a building to the new agent
      const availableBuildings = getAvailableBuildings();
      let assignedBuildingId: string | null = null;

      if (availableBuildings.length > 0) {
        // Prefer living_quarters for new agents, but assign any available building if none
        const livingQuarters = availableBuildings.filter(
          (b) => b.type === "living_quarters"
        );
        const buildingToAssign =
          livingQuarters.length > 0 ? livingQuarters[0] : availableBuildings[0];

        if (assignAgentToBuilding(buildingToAssign.id, dbData.id)) {
          assignedBuildingId = buildingToAssign.id;
          console.log(
            `Auto-assigned building ${buildingToAssign.id} (${buildingToAssign.type}) to agent ${dbData.name}`
          );
        }
      }

      // Store all other data in memory
      const agentMetadata: AgentMetadata = {
        id: dbData.id,
        description: agentData.description,
        personality: agentData.personality,
        capabilities: agentData.capabilities,
        status: "active",
        current_building_id: assignedBuildingId || undefined,
        assigned_building_ids: assignedBuildingId ? [assignedBuildingId] : [],
        avatar_url: agentData.avatar_url,
        experience_points: Math.floor(Math.random() * 500) + 50, // 50-550 XP
        level: Math.floor(Math.random() * 5) + 1, // Level 1-5
        total_capital: Math.floor(Math.random() * 10000) + 1000, // $1,000 - $11,000
        reputation_score: 100,
        last_active: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store agent metadata in Redis
      try {
        await redisService.setAgentMetadata(agentMetadata);
        console.log(`✅ Stored agent ${agentMetadata.id} metadata in Redis`);
      } catch (error) {
        console.error(`❌ Failed to store agent ${agentMetadata.id} metadata in Redis:`, error);
      }

      memoryStorageService.setAgentMetadata(agentMetadata);

      // Log the registration action in memory
      memoryStorageService.addAction({
        agent_id: dbData.id,
        action_type: "custom",
        action_data: {
          type: "agent_registered",
          auto_assigned_building: assignedBuildingId,
          building_type: assignedBuildingId
            ? availableBuildings.find((b) => b.id === assignedBuildingId)?.type
            : null,
        },
        building_id: assignedBuildingId || undefined,
        success: true,
      });

      // Combine DB and memory data for return
      const fullAgent: Agent = {
        ...dbData,
        ...agentMetadata,
      };

      return { success: true, data: fullAgent };
    } catch (error) {
      console.error("Error registering agent:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getAgents(): Promise<{
    success: boolean;
    data?: Agent[];
    error?: string;
  }> {
    try {
      // Auto-initialize agent assignments on first call
      if (!startupInitializer.isInitialized()) {
        await startupInitializer.initialize();
      }

      // Get basic agent data from database
      const { data: dbAgents, error } = await typedSupabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching agents:", error);
        return { success: false, error: error.message };
      }

      // Combine with persistent memory data
      const fullAgents: Agent[] = [];
      for (const dbAgent of dbAgents || []) {
        const metadata =
          await persistentMemoryStorageService.getAgentMetadataAsync(
            dbAgent.id
          );

        // If no metadata in persistent storage, create default
        if (!metadata) {
          const defaultMetadata: AgentMetadata = {
            id: dbAgent.id,
            capabilities: [],
            status: "active",
            assigned_building_ids: [],
            experience_points: Math.floor(Math.random() * 500) + 50, // 50-550 XP
            level: Math.floor(Math.random() * 5) + 1, // Level 1-5
            total_capital: Math.floor(Math.random() * 10000) + 1000, // $1,000 - $11,000
            reputation_score: 100,
            last_active: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          // Store agent metadata in Redis
          try {
            await redisService.setAgentMetadata(defaultMetadata);
            console.log(`✅ Stored default agent ${defaultMetadata.id} metadata in Redis`);
          } catch (error) {
            console.error(`❌ Failed to store default agent ${defaultMetadata.id} metadata in Redis:`, error);
          }
          
          await persistentMemoryStorageService.setAgentMetadataAsync(defaultMetadata);
          fullAgents.push({ ...dbAgent, ...defaultMetadata });
        } else {
          fullAgents.push({ ...dbAgent, ...metadata });
        }
      }

      return { success: true, data: fullAgents };
    } catch (error) {
      console.error("Error fetching agents:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getAgentById(
    id: string
  ): Promise<{ success: boolean; data?: Agent; error?: string }> {
    try {
      // Get basic agent data from database
      const { data: dbAgent, error } = await typedSupabase
        .from("agents")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching agent:", error);
        return { success: false, error: error.message };
      }

      // Get metadata from memory
      const metadata = memoryStorageService.getAgentMetadata(id);

      // If no metadata in memory, create default
      if (!metadata) {
        const defaultMetadata: AgentMetadata = {
          id: dbAgent.id,
          capabilities: [],
          status: "active",
          assigned_building_ids: [],
          experience_points: Math.floor(Math.random() * 500) + 50, // 50-550 XP
          level: Math.floor(Math.random() * 5) + 1, // Level 1-5
          total_capital: Math.floor(Math.random() * 10000) + 1000, // $1,000 - $11,000
          reputation_score: 100,
          last_active: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        // Store agent metadata in Redis
        try {
          await redisService.setAgentMetadata(defaultMetadata);
          console.log(`✅ Stored default agent ${defaultMetadata.id} metadata in Redis`);
        } catch (error) {
          console.error(`❌ Failed to store default agent ${defaultMetadata.id} metadata in Redis:`, error);
        }
        
        memoryStorageService.setAgentMetadata(defaultMetadata);
        return { success: true, data: { ...dbAgent, ...defaultMetadata } };
      }

      return { success: true, data: { ...dbAgent, ...metadata } };
    } catch (error) {
      console.error("Error fetching agent:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getAgentsByOwner(
    ownerAddress: string
  ): Promise<{ success: boolean; data?: Agent[]; error?: string }> {
    try {
      // Get basic agent data from database
      const { data: dbAgents, error } = await typedSupabase
        .from("agents")
        .select("*")
        .eq("owner_address", ownerAddress)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching agents by owner:", error);
        return { success: false, error: error.message };
      }

      // Combine with memory data
      const fullAgents: Agent[] = [];
      for (const dbAgent of dbAgents || []) {
        const metadata = memoryStorageService.getAgentMetadata(dbAgent.id);

        if (!metadata) {
          const defaultMetadata: AgentMetadata = {
            id: dbAgent.id,
            capabilities: [],
            status: "active",
            assigned_building_ids: [],
            experience_points: Math.floor(Math.random() * 500) + 50, // 50-550 XP
            level: Math.floor(Math.random() * 5) + 1, // Level 1-5
            total_capital: Math.floor(Math.random() * 10000) + 1000, // $1,000 - $11,000
            reputation_score: 100,
            last_active: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          // Store agent metadata in Redis
          try {
            await redisService.setAgentMetadata(defaultMetadata);
            console.log(`✅ Stored default agent ${defaultMetadata.id} metadata in Redis`);
          } catch (error) {
            console.error(`❌ Failed to store default agent ${defaultMetadata.id} metadata in Redis:`, error);
          }
          
          memoryStorageService.setAgentMetadata(defaultMetadata);
          fullAgents.push({ ...dbAgent, ...defaultMetadata });
        } else {
          fullAgents.push({ ...dbAgent, ...metadata });
        }
      }

      return { success: true, data: fullAgents };
    } catch (error) {
      console.error("Error fetching agents by owner:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async updateAgent(
    id: string,
    updates: Partial<Agent>
  ): Promise<{ success: boolean; data?: Agent; error?: string }> {
    try {
      // Separate DB updates (only essential fields) from memory updates
      const dbUpdates: Partial<DbAgent> = {};
      const memoryUpdates: Partial<AgentMetadata> = {};

      // Only update database for essential fields
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.wallet_address !== undefined)
        dbUpdates.wallet_address = updates.wallet_address;

      // Everything else goes to memory
      const memoryFields = [
        "description",
        "personality",
        "capabilities",
        "status",
        "current_building_id",
        "assigned_building_ids",
        "avatar_url",
        "experience_points",
        "level",
        "total_capital",
        "reputation_score",
      ] as const;

      memoryFields.forEach((field) => {
        if (updates[field] !== undefined) {
          (memoryUpdates as any)[field] = updates[field];
        }
      });

      // Update database if needed
      let dbData = null;
      if (Object.keys(dbUpdates).length > 0) {
        const { data, error } = await typedSupabase
          .from("agents")
          .update(dbUpdates)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error("Error updating agent in database:", error);
          return { success: false, error: error.message };
        }
        dbData = data;
      } else {
        // Get current DB data
        const { data, error } = await typedSupabase
          .from("agents")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching agent:", error);
          return { success: false, error: error.message };
        }
        dbData = data;
      }

      // Update memory
      const updatedMetadata = memoryStorageService.updateAgentMetadata(
        id,
        memoryUpdates
      );
      if (!updatedMetadata) {
        return { success: false, error: "Agent not found in memory" };
      }

      // Combine for return
      const fullAgent: Agent = {
        ...dbData,
        ...updatedMetadata,
      };

      return { success: true, data: fullAgent };
    } catch (error) {
      console.error("Error updating agent:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async deleteAgent(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete from database
      const { error } = await typedSupabase
        .from("agents")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting agent from database:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting agent:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async assignBuildingToAgent(
    agentId: string,
    buildingId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate that the building ID exists and is a valid building (not road/corridor)
      const { getBuildingById } = await import("../../src/maps/defaultMap");
      const building = getBuildingById(buildingId);

      if (!building) {
        return { success: false, error: "Building not found" };
      }

      // Ensure only actual buildings can be assigned (not roads/corridors/water/space)
      const validBuildingTypes = [
        "living_quarters",
        "research_lab",
        "engineering_bay",
        "recreation",
        "power_line",
      ];
      if (!validBuildingTypes.includes(building.type)) {
        return {
          success: false,
          error: `Cannot assign ${building.type} to agent - only buildings are allowed, not roads or corridors`,
        };
      }

      // Check if building is already assigned to another agent
      if (building.assignedAgent && building.assignedAgent !== agentId) {
        return {
          success: false,
          error: `Building ${buildingId} is already assigned to another agent`,
        };
      }

      // Get current agent metadata from persistent storage, create if doesn't exist
      let metadata = await persistentMemoryStorageService.getAgentMetadataAsync(
        agentId
      );
      if (!metadata) {
        // Create initial metadata for the agent
        const newMetadata = {
          id: agentId,
          assigned_building_ids: [],
          current_building_id: undefined,
          status: "active" as const,
          experience_points: Math.floor(Math.random() * 500) + 50, // 50-550 XP
          level: Math.floor(Math.random() * 5) + 1, // Level 1-5
          total_capital: Math.floor(Math.random() * 10000) + 1000, // $1,000 - $11,000
          reputation_score: 0,
          capabilities: [],
          last_active: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        // Store agent metadata in Redis
        try {
          await redisService.setAgentMetadata(newMetadata);
          console.log(`✅ Stored new agent ${newMetadata.id} metadata in Redis`);
        } catch (error) {
          console.error(`❌ Failed to store new agent ${newMetadata.id} metadata in Redis:`, error);
        }
        metadata = await persistentMemoryStorageService.setAgentMetadataAsync(newMetadata);
        if (!metadata) {
          return { success: false, error: "Failed to create agent metadata" };
        }
      }

      // Add building to assigned list if not already there
      const currentBuildings = metadata.assigned_building_ids || [];
      if (!currentBuildings.includes(buildingId)) {
        const updatedBuildings = [...currentBuildings, buildingId];

        // Update in persistent storage
        await persistentMemoryStorageService.updateAgentMetadataAsync(agentId, {
          assigned_building_ids: updatedBuildings,
          current_building_id: buildingId, // Also set as current
        });

        // Mark building as assigned in the map
        building.assignedAgent = agentId;

        // Log the action in persistent storage
        await persistentMemoryStorageService.addActionAsync({
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          agent_id: agentId,
          action_type: "building_assigned",
          action_data: {
            building_id: buildingId,
            building_type: building.type,
          },
          building_id: buildingId,
          success: true,
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error assigning building to agent:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // ===== TASK MANAGEMENT =====
  // DISABLED: Old task creation - only ChatGPT collaborative tasks are allowed

  async createTask(
    taskData: TaskCreationData
  ): Promise<{ success: boolean; data?: Task; error?: string }> {
    return {
      success: false,
      error:
        "Old task creation is disabled. Use ChatGPT collaborative tasks only.",
    };
  }

  async getAvailableTasks(): Promise<{
    success: boolean;
    data?: Task[];
    error?: string;
  }> {
    return {
      success: false,
      error:
        "Old task system is disabled. Use collaborative task status endpoints.",
    };
  }

  async assignTaskToAgent(
    taskId: string,
    agentId: string
  ): Promise<{ success: boolean; data?: Task; error?: string }> {
    return {
      success: false,
      error: "Old task assignment is disabled. Use collaborative task system.",
    };
  }

  async updateTaskStatus(
    taskId: string,
    status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled",
    completionData?: any
  ): Promise<{ success: boolean; data?: Task; error?: string }> {
    try {
      // Get current task from memory
      const task = memoryStorageService.getTask(taskId);
      if (!task) {
        return { success: false, error: "Task not found" };
      }

      // Update task in memory
      const updates: Partial<Task> = { status };
      if (completionData) {
        updates.completion_data = completionData;
      }

      const updatedTask = memoryStorageService.updateTask(taskId, updates);
      if (!updatedTask) {
        return { success: false, error: "Failed to update task" };
      }

      // Log task completion in memory
      if (status === "completed" && updatedTask.assigned_agent_id) {
        memoryStorageService.addAction({
          agent_id: updatedTask.assigned_agent_id,
          action_type: "task_complete",
          action_data: { task_id: taskId, completion_data: completionData },
          task_id: taskId,
          success: true,
        });
      }

      return { success: true, data: updatedTask };
    } catch (error) {
      console.error("Error updating task status:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // ===== COMMUNICATION SYSTEM =====

  async sendMessage(
    messageData: MessageData
  ): Promise<{ success: boolean; data?: AgentCommunication; error?: string }> {
    try {
      // Store message in memory
      const communication = memoryStorageService.addCommunication({
        sender_agent_id: messageData.sender_agent_id,
        receiver_agent_id: messageData.receiver_agent_id,
        content: messageData.content,
        message_type: messageData.message_type || "direct",
        metadata: messageData.metadata,
        task_id: messageData.task_id,
        is_read: false,
      });

      // Log the message action in memory
      memoryStorageService.addAction({
        agent_id: messageData.sender_agent_id,
        action_type: "message_sent",
        action_data: {
          message_id: communication.id,
          receiver_id: messageData.receiver_agent_id,
          message_type: messageData.message_type,
        },
        target_agent_id: messageData.receiver_agent_id,
        task_id: messageData.task_id,
        success: true,
      });

      // Update sender session
      memoryStorageService.updateAgentSession(messageData.sender_agent_id, {
        current_activity: "messaging",
      });

      return { success: true, data: communication };
    } catch (error) {
      console.error("Error sending message:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getMessagesForAgent(
    agentId: string,
    limit: number = 50
  ): Promise<{
    success: boolean;
    data?: AgentCommunication[];
    error?: string;
  }> {
    try {
      const messages = memoryStorageService.getCommunicationsForAgent(
        agentId,
        limit
      );
      return { success: true, data: messages };
    } catch (error) {
      console.error("Error fetching messages:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async markMessageAsRead(
    messageId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const success = memoryStorageService.markCommunicationAsRead(messageId);
      if (!success) {
        return { success: false, error: "Message not found" };
      }
      return { success: true };
    } catch (error) {
      console.error("Error marking message as read:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // ===== ACTION LOGGING (IN-MEMORY) =====

  async logAgentAction(
    actionData: Omit<AgentAction, "id" | "created_at">
  ): Promise<{ success: boolean; error?: string }> {
    try {
      memoryStorageService.addAction(actionData);
      return { success: true };
    } catch (error) {
      console.error("Error logging agent action:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getAgentActions(
    agentId: string,
    limit: number = 100
  ): Promise<{ success: boolean; data?: AgentAction[]; error?: string }> {
    try {
      const actions = memoryStorageService.getActionsForAgent(agentId, limit);
      return { success: true, data: actions };
    } catch (error) {
      console.error("Error fetching agent actions:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // ===== TASK QUEUE INTEGRATION =====
  // DISABLED: Old task queue system - only ChatGPT collaborative tasks are allowed

  async submitTaskToQueue(
    targetAgentId: string,
    requestingAgentId: string,
    taskData: {
      title: string;
      description: string;
    },
    aiRecommendation?: any
  ): Promise<{ success: boolean; queuedTaskId?: string; error?: string }> {
    return {
      success: false,
      error:
        "Old task queue system is disabled. Use ChatGPT collaborative tasks only.",
    };
  }

  getAgentQueueStatus(agentId: string) {
    return taskQueueService.getQueueStatus(agentId);
  }

  getAllQueueStatuses() {
    return taskQueueService.getAllQueues();
  }

  // ===== AI-POWERED TASK ASSIGNMENT =====

  async submitTaskWithAiSelection(
    requestingAgentId: string,
    taskData: {
      title: string;
      description: string;
    }
  ): Promise<{
    success: boolean;
    queuedTaskId?: string;
    targetAgentId?: string;
    aiRecommendation?: any;
    error?: string;
  }> {
    return {
      success: false,
      error:
        "Old task queue system is disabled. Use ChatGPT collaborative tasks only.",
    };
  }

  // ===== BUILDING MANAGEMENT HELPERS =====

  async getAgentBuildingInfo(agentId: string): Promise<{
    success: boolean;
    data?: {
      currentBuildingId: string | null;
      assignedBuildingIds: string[];
      buildingDetails?: any[];
    };
    error?: string;
  }> {
    try {
      const agentResult = await this.getAgentById(agentId);
      if (!agentResult.success || !agentResult.data) {
        return { success: false, error: "Agent not found" };
      }

      const agent = agentResult.data;
      const buildingDetails = [];

      // Get details for assigned buildings
      if (
        agent.assigned_building_ids &&
        agent.assigned_building_ids.length > 0
      ) {
        const { getBuildingById } = await import("../../src/maps/defaultMap");
        for (const buildingId of agent.assigned_building_ids) {
          const building = getBuildingById(buildingId);
          if (building) {
            buildingDetails.push(building);
          }
        }
      }

      return {
        success: true,
        data: {
          currentBuildingId: agent.current_building_id || null,
          assignedBuildingIds: agent.assigned_building_ids || [],
          buildingDetails,
        },
      };
    } catch (error) {
      console.error("Error getting agent building info:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async updateAgentLastActive(
    agentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update only in memory (last_active is no longer in database)
      memoryStorageService.updateAgentSession(agentId, {});
      memoryStorageService.updateAgentMetadata(agentId, {
        last_active: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating agent last active:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getActiveAgents(): Promise<{
    success: boolean;
    data?: Agent[];
    error?: string;
  }> {
    try {
      // Get all agents and filter by active status and recent activity from memory
      const allAgents = await this.getAgents();
      if (!allAgents.success || !allAgents.data) {
        return { success: false, error: "Failed to fetch agents" };
      }

      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      const cutoffTime = oneHourAgo.getTime();

      const activeAgents = allAgents.data.filter((agent) => {
        return (
          agent.status === "active" &&
          new Date(agent.last_active).getTime() > cutoffTime
        );
      });

      // Sort by last active time
      activeAgents.sort(
        (a, b) =>
          new Date(b.last_active).getTime() - new Date(a.last_active).getTime()
      );

      return { success: true, data: activeAgents };
    } catch (error) {
      console.error("Error fetching active agents:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // ===== MEMORY ANALYTICS & STATS =====

  getAgentMemoryStats(agentId: string): {
    success: boolean;
    data?: {
      totalMessages: number;
      messagesLast24h: number;
      totalActions: number;
      actionsLast24h: number;
      lastActive?: string;
    };
    error?: string;
  } {
    try {
      const stats = memoryStorageService.getAgentStats(agentId);
      return { success: true, data: stats };
    } catch (error) {
      console.error("Error getting agent memory stats:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  getSystemMemoryUsage(): {
    success: boolean;
    data?: {
      communications: number;
      actions: number;
      sessions: number;
      totalItems: number;
    };
    error?: string;
  } {
    try {
      const usage = memoryStorageService.getMemoryUsage();
      return { success: true, data: usage };
    } catch (error) {
      console.error("Error getting memory usage:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  cleanupOldMemoryData(maxAgeHours: number = 168): {
    success: boolean;
    data?: { communications: number; actions: number };
    error?: string;
  } {
    try {
      const result = memoryStorageService.clearOldData(maxAgeHours);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error cleaning up old memory data:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  getActiveSessions(maxAgeMinutes: number = 60) {
    try {
      const sessions = memoryStorageService.getActiveSessions(maxAgeMinutes);
      return { success: true, data: sessions };
    } catch (error) {
      console.error("Error getting active sessions:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // ===== BUILDING ASSIGNMENT =====

  async assignAgentToBuilding(
    agentId: string,
    buildingId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update agent metadata in memory
      const metadata = memoryStorageService.getAgentMetadata(agentId);
      if (metadata) {
        metadata.current_building_id = buildingId;
        if (!metadata.assigned_building_ids.includes(buildingId)) {
          metadata.assigned_building_ids.push(buildingId);
        }
        memoryStorageService.setAgentMetadata(metadata);
      }

      // Update building assignment in map
      const assignmentSuccess = assignAgentToBuilding(buildingId, agentId);
      if (!assignmentSuccess) {
        return { success: false, error: "Building assignment failed" };
      }

      console.log(`✅ Assigned agent ${agentId} to building ${buildingId}`);
      return { success: true };
    } catch (error) {
      console.error("Error assigning agent to building:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}

// Export a default instance
export const agentService = new AgentService();
