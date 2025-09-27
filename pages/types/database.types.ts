// Database types
export interface Database {
  public: {
    Tables: {
      tokens: {
        Row: {
          id: string;
          name: string;
          symbol: string;
          contract_address: string;
          decimals: number;
          initial_supply: string;
          description: string | null;
          image_url: string | null;
          deployer_address: string;
          transaction_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          symbol: string;
          contract_address: string;
          decimals?: number;
          initial_supply?: string;
          description?: string | null;
          image_url?: string | null;
          deployer_address: string;
          transaction_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          symbol?: string;
          contract_address?: string;
          decimals?: number;
          initial_supply?: string;
          description?: string | null;
          image_url?: string | null;
          deployer_address?: string;
          transaction_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cities: {
        Row: {
          id: string;
          name: string;
          map_data: any;
          funds: number;
          population: number;
          created_at: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          map_data?: any;
          funds?: number;
          population?: number;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          map_data?: any;
          funds?: number;
          population?: number;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
        };
      };
      buildings: {
        Row: {
          id: string;
          city_id: string;
          type: string;
          x: number;
          y: number;
          level: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          city_id: string;
          type: string;
          x: number;
          y: number;
          level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          city_id?: string;
          type?: string;
          x?: number;
          y?: number;
          level?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_address: string;
          personality: any | null;
          capabilities: string[];
          status: 'active' | 'inactive' | 'busy' | 'offline';
          current_building_id: string | null;
          assigned_building_ids: string[];
          wallet_address: string | null;
          avatar_url: string | null;
          experience_points: number;
          level: number;
          reputation_score: number;
          last_active: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_address: string;
          personality?: any | null;
          capabilities?: string[];
          status?: 'active' | 'inactive' | 'busy' | 'offline';
          current_building_id?: string | null;
          assigned_building_ids?: string[];
          wallet_address?: string | null;
          avatar_url?: string | null;
          experience_points?: number;
          level?: number;
          reputation_score?: number;
          last_active?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_address?: string;
          personality?: any | null;
          capabilities?: string[];
          status?: 'active' | 'inactive' | 'busy' | 'offline';
          current_building_id?: string | null;
          assigned_building_ids?: string[];
          wallet_address?: string | null;
          avatar_url?: string | null;
          experience_points?: number;
          level?: number;
          reputation_score?: number;
          last_active?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          creator_agent_id: string;
          assigned_agent_id: string | null;
          task_type: 'communication' | 'building_management' | 'resource_gathering' | 'collaboration' | 'custom';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
          requirements: any | null;
          reward_amount: number | null;
          reward_token: string | null;
          deadline: string | null;
          completion_data: any | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          creator_agent_id: string;
          assigned_agent_id?: string | null;
          task_type?: 'communication' | 'building_management' | 'resource_gathering' | 'collaboration' | 'custom';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
          requirements?: any | null;
          reward_amount?: number | null;
          reward_token?: string | null;
          deadline?: string | null;
          completion_data?: any | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          creator_agent_id?: string;
          assigned_agent_id?: string | null;
          task_type?: 'communication' | 'building_management' | 'resource_gathering' | 'collaboration' | 'custom';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
          requirements?: any | null;
          reward_amount?: number | null;
          reward_token?: string | null;
          deadline?: string | null;
          completion_data?: any | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      agent_communications: {
        Row: {
          id: string;
          sender_agent_id: string;
          receiver_agent_id: string | null;
          message_type: 'direct' | 'broadcast' | 'task_related' | 'system';
          content: string;
          metadata: any | null;
          task_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_agent_id: string;
          receiver_agent_id?: string | null;
          message_type?: 'direct' | 'broadcast' | 'task_related' | 'system';
          content: string;
          metadata?: any | null;
          task_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_agent_id?: string;
          receiver_agent_id?: string | null;
          message_type?: 'direct' | 'broadcast' | 'task_related' | 'system';
          content?: string;
          metadata?: any | null;
          task_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      agent_actions: {
        Row: {
          id: string;
          agent_id: string;
          action_type: 'move' | 'interact' | 'task_complete' | 'message_sent' | 'building_assigned' | 'custom';
          action_data: any;
          building_id: string | null;
          target_agent_id: string | null;
          task_id: string | null;
          success: boolean;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          action_type: 'move' | 'interact' | 'task_complete' | 'message_sent' | 'building_assigned' | 'custom';
          action_data?: any;
          building_id?: string | null;
          target_agent_id?: string | null;
          task_id?: string | null;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          action_type?: 'move' | 'interact' | 'task_complete' | 'message_sent' | 'building_assigned' | 'custom';
          action_data?: any;
          building_id?: string | null;
          target_agent_id?: string | null;
          task_id?: string | null;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Type helpers
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Specific table types
export type Token = Tables<"tokens">;
export type TokenInsert = TablesInsert<"tokens">;
export type TokenUpdate = TablesUpdate<"tokens">;

export type City = Tables<"cities">;
export type CityInsert = TablesInsert<"cities">;
export type CityUpdate = TablesUpdate<"cities">;

export type Building = Tables<"buildings">;
export type BuildingInsert = TablesInsert<"buildings">;
export type BuildingUpdate = TablesUpdate<"buildings">;

export type Agent = Tables<"agents">;
export type AgentInsert = TablesInsert<"agents">;
export type AgentUpdate = TablesUpdate<"agents">;

export type Task = Tables<"tasks">;
export type TaskInsert = TablesInsert<"tasks">;
export type TaskUpdate = TablesUpdate<"tasks">;

export type AgentCommunication = Tables<"agent_communications">;
export type AgentCommunicationInsert = TablesInsert<"agent_communications">;
export type AgentCommunicationUpdate = TablesUpdate<"agent_communications">;

export type AgentAction = Tables<"agent_actions">;
export type AgentActionInsert = TablesInsert<"agent_actions">;
export type AgentActionUpdate = TablesUpdate<"agent_actions">;
