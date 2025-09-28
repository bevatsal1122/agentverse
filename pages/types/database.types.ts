export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Agent interface for the ultra-minimal database + memory approach
export interface Agent {
  id: string;
  name: string;
  owner_address: string;
  wallet_address?: string;
  created_at: string;
  // Memory-only fields
  description?: string;
  personality?: {
    traits: string[];
    communication_style: string;
    goals: string[];
    preferences: Record<string, any>;
  };
  capabilities: string[];
  status: 'active' | 'inactive' | 'busy' | 'offline';
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

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_actions: {
        Row: {
          action_data: Json | null
          action_type: string
          agent_id: string
          building_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          success: boolean | null
          target_agent_id: string | null
          task_id: string | null
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          agent_id: string
          building_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          success?: boolean | null
          target_agent_id?: string | null
          task_id?: string | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          agent_id?: string
          building_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          success?: boolean | null
          target_agent_id?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "active_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "active_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "pending_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_communications: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          metadata: Json | null
          receiver_agent_id: string | null
          sender_agent_id: string
          task_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          receiver_agent_id?: string | null
          sender_agent_id: string
          task_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          receiver_agent_id?: string | null
          sender_agent_id?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_communications_receiver_agent_id_fkey"
            columns: ["receiver_agent_id"]
            isOneToOne: false
            referencedRelation: "active_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_communications_receiver_agent_id_fkey"
            columns: ["receiver_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_communications_sender_agent_id_fkey"
            columns: ["sender_agent_id"]
            isOneToOne: false
            referencedRelation: "active_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_communications_sender_agent_id_fkey"
            columns: ["sender_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_communications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "pending_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_communications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          assigned_building_ids: string[] | null
          avatar_url: string | null
          capabilities: string[] | null
          created_at: string | null
          current_building_id: string | null
          description: string | null
          ens: string | null
          experience_points: number | null
          id: string
          last_active: string | null
          level: number | null
          name: string
          owner_address: string
          personality: Json | null
          privy_wallet_address: string | null
          reputation_score: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          assigned_building_ids?: string[] | null
          avatar_url?: string | null
          capabilities?: string[] | null
          created_at?: string | null
          current_building_id?: string | null
          description?: string | null
          ens?: string | null
          experience_points?: number | null
          id?: string
          last_active?: string | null
          level?: number | null
          name: string
          owner_address: string
          personality?: Json | null
          privy_wallet_address?: string | null
          reputation_score?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          assigned_building_ids?: string[] | null
          avatar_url?: string | null
          capabilities?: string[] | null
          created_at?: string | null
          current_building_id?: string | null
          description?: string | null
          ens?: string | null
          experience_points?: number | null
          id?: string
          last_active?: string | null
          level?: number | null
          name?: string
          owner_address?: string
          personality?: Json | null
          privy_wallet_address?: string | null
          reputation_score?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_agent_id: string | null
          completed_at: string | null
          completion_data: Json | null
          created_at: string | null
          creator_agent_id: string
          deadline: string | null
          description: string
          id: string
          priority: string | null
          requirements: Json | null
          reward_amount: number | null
          reward_token: string | null
          status: string | null
          task_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          completed_at?: string | null
          completion_data?: Json | null
          created_at?: string | null
          creator_agent_id: string
          deadline?: string | null
          description: string
          id?: string
          priority?: string | null
          requirements?: Json | null
          reward_amount?: number | null
          reward_token?: string | null
          status?: string | null
          task_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          completed_at?: string | null
          completion_data?: Json | null
          created_at?: string | null
          creator_agent_id?: string
          deadline?: string | null
          description?: string
          id?: string
          priority?: string | null
          requirements?: Json | null
          reward_amount?: number | null
          reward_token?: string | null
          status?: string | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "active_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_creator_agent_id_fkey"
            columns: ["creator_agent_id"]
            isOneToOne: false
            referencedRelation: "active_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_creator_agent_id_fkey"
            columns: ["creator_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          privy_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          privy_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          privy_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_agents: {
        Row: {
          assigned_building_ids: string[] | null
          avatar_url: string | null
          capabilities: string[] | null
          created_at: string | null
          current_building_id: string | null
          description: string | null
          experience_points: number | null
          id: string | null
          last_active: string | null
          level: number | null
          name: string | null
          owner_address: string | null
          personality: Json | null
          reputation_score: number | null
          status: string | null
          updated_at: string | null
          wallet_address: string | null
        }
        Insert: {
          assigned_building_ids?: string[] | null
          avatar_url?: string | null
          capabilities?: string[] | null
          created_at?: string | null
          current_building_id?: string | null
          description?: string | null
          experience_points?: number | null
          id?: string | null
          last_active?: string | null
          level?: number | null
          name?: string | null
          owner_address?: string | null
          personality?: Json | null
          reputation_score?: number | null
          status?: string | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Update: {
          assigned_building_ids?: string[] | null
          avatar_url?: string | null
          capabilities?: string[] | null
          created_at?: string | null
          current_building_id?: string | null
          description?: string | null
          experience_points?: number | null
          id?: string | null
          last_active?: string | null
          level?: number | null
          name?: string | null
          owner_address?: string | null
          personality?: Json | null
          reputation_score?: number | null
          status?: string | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      pending_tasks: {
        Row: {
          assigned_agent_id: string | null
          assigned_name: string | null
          completed_at: string | null
          completion_data: Json | null
          created_at: string | null
          creator_agent_id: string | null
          creator_name: string | null
          deadline: string | null
          description: string | null
          id: string | null
          priority: string | null
          requirements: Json | null
          reward_amount: number | null
          reward_token: string | null
          status: string | null
          task_type: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "active_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_creator_agent_id_fkey"
            columns: ["creator_agent_id"]
            isOneToOne: false
            referencedRelation: "active_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_creator_agent_id_fkey"
            columns: ["creator_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_agent_stats: {
        Args: { agent_txt: string }
        Returns: {
          buildings_assigned: number
          total_messages_received: number
          total_messages_sent: number
          total_tasks_completed: number
          total_tasks_created: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
