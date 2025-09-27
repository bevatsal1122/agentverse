import { supabase } from "../lib/supabase";
import {
  Token,
  TokenInsert,
  TokenUpdate,
  City,
  CityInsert,
  CityUpdate,
  Building,
  BuildingInsert,
  BuildingUpdate,
} from "../types/database.types";

export class SupabaseService {
  // Token operations
  async createToken(
    tokenData: TokenInsert
  ): Promise<{ success: boolean; data?: Token; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("tokens")
        .insert(tokenData)
        .select()
        .single();

      if (error) {
        console.error("Error creating token:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error creating token:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getTokens(): Promise<{
    success: boolean;
    data?: Token[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from("tokens")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching tokens:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error fetching tokens:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getTokenById(
    id: string
  ): Promise<{ success: boolean; data?: Token; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("tokens")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching token:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error fetching token:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async updateToken(
    id: string,
    updates: TokenUpdate
  ): Promise<{ success: boolean; data?: Token; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("tokens")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating token:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error updating token:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async deleteToken(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from("tokens").delete().eq("id", id);

      if (error) {
        console.error("Error deleting token:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting token:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // City operations
  async createCity(
    cityData: CityInsert
  ): Promise<{ success: boolean; data?: City; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("cities")
        .insert(cityData)
        .select()
        .single();

      if (error) {
        console.error("Error creating city:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error creating city:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getCities(): Promise<{
    success: boolean;
    data?: City[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching cities:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error fetching cities:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async updateCity(
    id: string,
    updates: CityUpdate
  ): Promise<{ success: boolean; data?: City; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("cities")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating city:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error updating city:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Building operations
  async createBuilding(
    buildingData: BuildingInsert
  ): Promise<{ success: boolean; data?: Building; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("buildings")
        .insert(buildingData)
        .select()
        .single();

      if (error) {
        console.error("Error creating building:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error creating building:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getBuildingsByCity(
    cityId: string
  ): Promise<{ success: boolean; data?: Building[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .eq("city_id", cityId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching buildings:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error fetching buildings:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async updateBuilding(
    id: string,
    updates: BuildingUpdate
  ): Promise<{ success: boolean; data?: Building; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("buildings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating building:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error updating building:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async deleteBuilding(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from("buildings").delete().eq("id", id);

      if (error) {
        console.error("Error deleting building:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting building:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}

// Export a default instance
export const supabaseService = new SupabaseService();
