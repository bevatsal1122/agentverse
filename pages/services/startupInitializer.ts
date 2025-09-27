import { supabase } from '../lib/supabase';
import { agentService } from './agentService';
import { persistentMemoryStorageService } from './persistentMemoryStorageService';
import { getAvailableBuildings } from '../../src/maps/defaultMap';

class StartupInitializer {
  private static instance: StartupInitializer;
  private initialized = false;

  private constructor() {}

  static getInstance(): StartupInitializer {
    if (!StartupInitializer.instance) {
      StartupInitializer.instance = new StartupInitializer();
    }
    return StartupInitializer.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🚀 Startup initialization already completed');
      return;
    }

    try {
      console.log('🚀 Starting automatic agent assignment initialization...');

      // Get all active agents from database
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('status', 'active');

      if (agentsError) {
        console.error('❌ Error fetching agents:', agentsError);
        return;
      }

      if (!agents || agents.length === 0) {
        console.log('ℹ️ No active agents found');
        this.initialized = true;
        return;
      }

      console.log(`📋 Found ${agents.length} active agents`);

      // Get available buildings (only actual buildings, not roads/corridors)
      const availableBuildings = getAvailableBuildings();
      const buildingTypes = ['living_quarters', 'research_lab', 'engineering_bay', 'recreation', 'power_line'];
      const validBuildings = availableBuildings.filter(building => 
        buildingTypes.includes(building.type)
      );

      console.log(`🏢 Found ${validBuildings.length} available buildings`);

      if (validBuildings.length === 0) {
        console.error('❌ No valid buildings available for assignment');
        return;
      }

      let assignedCount = 0;

      // Assign each agent to a building (randomized)
      for (const agent of agents) {
        // Get all unassigned buildings and randomize selection
        const unassignedBuildings = validBuildings.filter(building => 
          !building.assignedAgent
        );

        if (unassignedBuildings.length === 0) {
          console.warn(`⚠️ No available buildings for agent ${agent.name} (${agent.id})`);
          continue;
        }

        // Randomly select a building from available ones
        const randomIndex = Math.floor(Math.random() * unassignedBuildings.length);
        const availableBuilding = unassignedBuildings[randomIndex];

        // Create metadata for agent if it doesn't exist
        let metadata = await persistentMemoryStorageService.getAgentMetadataAsync(agent.id);
        if (!metadata) {
          const newMetadata = {
            id: agent.id,
            assigned_building_ids: [],
            current_building_id: undefined,
            status: 'active' as const,
            experience_points: 0,
            level: 1,
            reputation_score: 0,
            capabilities: [],
            last_active: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          metadata = await persistentMemoryStorageService.setAgentMetadataAsync(newMetadata);
        }

        if (metadata) {
          // Assign building to agent
          const result = await agentService.assignBuildingToAgent(agent.id, availableBuilding.id);
          
          if (result.success) {
            // Mark building as assigned in the map
            availableBuilding.assignedAgent = agent.id;
            assignedCount++;
            console.log(`✅ Assigned agent ${agent.name} to building ${availableBuilding.id} (${availableBuilding.type}) at (${availableBuilding.x}, ${availableBuilding.y})`);
          } else {
            console.error(`❌ Failed to assign building to agent ${agent.name}:`, result.error);
          }
        }
      }

      console.log(`🎉 Automatic initialization complete! Assigned ${assignedCount} agents to buildings`);
      this.initialized = true;

    } catch (error) {
      console.error('❌ Error during automatic initialization:', error);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const startupInitializer = StartupInitializer.getInstance();
