import { supabase } from "../lib/supabase";
import {
  Agent,
  AgentInsert,
  AgentUpdate,
  Task,
  TaskInsert,
  TaskUpdate,
  AgentCommunication,
  AgentCommunicationInsert,
  AgentAction,
  AgentActionInsert,
} from "../types/database.types";

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
  task_type?: 'communication' | 'building_management' | 'resource_gathering' | 'collaboration' | 'custom';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  requirements?: any;
  reward_amount?: number;
  reward_token?: string;
  deadline?: string;
}

export interface MessageData {
  sender_agent_id: string;
  receiver_agent_id?: string;
  content: string;
  message_type?: 'direct' | 'broadcast' | 'task_related' | 'system';
  metadata?: any;
  task_id?: string;
}

export class AgentService {
  // ===== AGENT MANAGEMENT =====
  
  async registerAgent(
    agentData: AgentRegistrationData
  ): Promise<{ success: boolean; data?: Agent; error?: string }> {
    try {
      const insertData: AgentInsert = {
        name: agentData.name,
        description: agentData.description || null,
        owner_address: agentData.owner_address,
        personality: agentData.personality || null,
        capabilities: agentData.capabilities,
        status: 'active',
        assigned_building_ids: [],
        wallet_address: agentData.wallet_address || null,
        avatar_url: agentData.avatar_url || null,
        experience_points: 0,
        level: 1,
        reputation_score: 100,
        last_active: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("agents")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error registering agent:", error);
        return { success: false, error: error.message };
      }

      // Log the registration action
      await this.logAgentAction({
        agent_id: data.id,
        action_type: 'custom',
        action_data: { type: 'agent_registered' },
        success: true,
      });

      return { success: true, data };
    } catch (error) {
      console.error("Error registering agent:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getAgents(): Promise<{
    success: boolean;
    data?: Agent[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching agents:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error fetching agents:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getAgentById(
    id: string
  ): Promise<{ success: boolean; data?: Agent; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching agent:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error fetching agent:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getAgentsByOwner(
    ownerAddress: string
  ): Promise<{ success: boolean; data?: Agent[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("owner_address", ownerAddress)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching agents by owner:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error fetching agents by owner:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async updateAgent(
    id: string,
    updates: AgentUpdate
  ): Promise<{ success: boolean; data?: Agent; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("agents")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating agent:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error updating agent:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async assignBuildingToAgent(
    agentId: string,
    buildingId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current agent data
      const { data: agent, error: fetchError } = await supabase
        .from("agents")
        .select("assigned_building_ids")
        .eq("id", agentId)
        .single();

      if (fetchError) {
        return { success: false, error: fetchError.message };
      }

      // Add building to assigned list if not already there
      const currentBuildings = agent.assigned_building_ids || [];
      if (!currentBuildings.includes(buildingId)) {
        const updatedBuildings = [...currentBuildings, buildingId];
        
        const { error: updateError } = await supabase
          .from("agents")
          .update({ 
            assigned_building_ids: updatedBuildings,
            updated_at: new Date().toISOString()
          })
          .eq("id", agentId);

        if (updateError) {
          return { success: false, error: updateError.message };
        }

        // Log the action
        await this.logAgentAction({
          agent_id: agentId,
          action_type: 'building_assigned',
          action_data: { building_id: buildingId },
          building_id: buildingId,
          success: true,
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error assigning building to agent:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // ===== TASK MANAGEMENT =====

  async createTask(
    taskData: TaskCreationData
  ): Promise<{ success: boolean; data?: Task; error?: string }> {
    try {
      const insertData: TaskInsert = {
        title: taskData.title,
        description: taskData.description,
        creator_agent_id: taskData.creator_agent_id,
        task_type: taskData.task_type || 'custom',
        priority: taskData.priority || 'medium',
        status: 'pending',
        requirements: taskData.requirements || null,
        reward_amount: taskData.reward_amount || null,
        reward_token: taskData.reward_token || null,
        deadline: taskData.deadline || null,
      };

      const { data, error } = await supabase
        .from("tasks")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error creating task:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error creating task:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getAvailableTasks(): Promise<{
    success: boolean;
    data?: Task[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "pending")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching available tasks:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error fetching available tasks:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async assignTaskToAgent(
    taskId: string,
    agentId: string
  ): Promise<{ success: boolean; data?: Task; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          assigned_agent_id: agentId,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId)
        .eq("status", "pending") // Only assign if still pending
        .select()
        .single();

      if (error) {
        console.error("Error assigning task:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error assigning task:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async updateTaskStatus(
    taskId: string,
    status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled',
    completionData?: any
  ): Promise<{ success: boolean; data?: Task; error?: string }> {
    try {
      const updateData: TaskUpdate = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        if (completionData) {
          updateData.completion_data = completionData;
        }
      }

      const { data, error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", taskId)
        .select()
        .single();

      if (error) {
        console.error("Error updating task status:", error);
        return { success: false, error: error.message };
      }

      // Log task completion
      if (status === 'completed' && data.assigned_agent_id) {
        await this.logAgentAction({
          agent_id: data.assigned_agent_id,
          action_type: 'task_complete',
          action_data: { task_id: taskId, completion_data: completionData },
          task_id: taskId,
          success: true,
        });
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error updating task status:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // ===== COMMUNICATION SYSTEM =====

  async sendMessage(
    messageData: MessageData
  ): Promise<{ success: boolean; data?: AgentCommunication; error?: string }> {
    try {
      const insertData: AgentCommunicationInsert = {
        sender_agent_id: messageData.sender_agent_id,
        receiver_agent_id: messageData.receiver_agent_id || null,
        content: messageData.content,
        message_type: messageData.message_type || 'direct',
        metadata: messageData.metadata || null,
        task_id: messageData.task_id || null,
        is_read: false,
      };

      const { data, error } = await supabase
        .from("agent_communications")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        return { success: false, error: error.message };
      }

      // Log the message action
      await this.logAgentAction({
        agent_id: messageData.sender_agent_id,
        action_type: 'message_sent',
        action_data: { 
          message_id: data.id,
          receiver_id: messageData.receiver_agent_id,
          message_type: messageData.message_type 
        },
        target_agent_id: messageData.receiver_agent_id || null,
        task_id: messageData.task_id || null,
        success: true,
      });

      return { success: true, data };
    } catch (error) {
      console.error("Error sending message:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getMessagesForAgent(
    agentId: string,
    limit: number = 50
  ): Promise<{ success: boolean; data?: AgentCommunication[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("agent_communications")
        .select("*")
        .or(`sender_agent_id.eq.${agentId},receiver_agent_id.eq.${agentId}`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching messages:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error fetching messages:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async markMessageAsRead(
    messageId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("agent_communications")
        .update({ is_read: true })
        .eq("id", messageId);

      if (error) {
        console.error("Error marking message as read:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error marking message as read:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // ===== ACTION LOGGING =====

  async logAgentAction(
    actionData: AgentActionInsert
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("agent_actions")
        .insert(actionData);

      if (error) {
        console.error("Error logging agent action:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error logging agent action:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getAgentActions(
    agentId: string,
    limit: number = 100
  ): Promise<{ success: boolean; data?: AgentAction[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("agent_actions")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching agent actions:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error fetching agent actions:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // ===== UTILITY FUNCTIONS =====

  async updateAgentLastActive(
    agentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("agents")
        .update({ 
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", agentId);

      if (error) {
        console.error("Error updating agent last active:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating agent last active:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getActiveAgents(): Promise<{
    success: boolean;
    data?: Agent[];
    error?: string;
  }> {
    try {
      // Get agents active in the last hour
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("status", "active")
        .gte("last_active", oneHourAgo.toISOString())
        .order("last_active", { ascending: false });

      if (error) {
        console.error("Error fetching active agents:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error fetching active agents:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}

// Export a default instance
export const agentService = new AgentService();
