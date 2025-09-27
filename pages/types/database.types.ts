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
