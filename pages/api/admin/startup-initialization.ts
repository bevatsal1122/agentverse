import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { agentService } from '../../services/agentService';
import { memoryStorageService } from '../../services/memoryStorageService';
import { getAvailableBuildings, getBuildingsByType } from '../../../src/maps/defaultMap';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Starting comprehensive initialization...');

    // Step 1: Get all active agents from database
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('status', 'active');

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }

    if (!agents || agents.length === 0) {
      console.log('No active agents found');
      return res.status(200).json({ 
        success: true, 
        message: 'No active agents found',
        results: {
          agentsAssigned: 0,
          agentsInMemory: 0,
          totalAgents: 0
        }
      });
    }

    console.log(`Found ${agents.length} active agents`);

    // Step 2: Get available buildings
    const availableBuildings = getAvailableBuildings();
    const buildingTypes = ['living_quarters', 'research_lab', 'engineering_bay', 'recreation', 'power_line'];
    const validBuildings = availableBuildings.filter(building => 
      buildingTypes.includes(building.type)
    );

    console.log(`Found ${validBuildings.length} available buildings`);

    if (validBuildings.length === 0) {
      return res.status(400).json({ 
        error: 'No valid buildings available for assignment' 
      });
    }

    // Step 3: Assign each agent to a building and create metadata
    const assignments = [];
    let assignedCount = 0;
    let memoryCount = 0;

    for (const agent of agents) {
      // Get all unassigned buildings and randomize selection
      const unassignedBuildings = validBuildings.filter(building => 
        !building.assignedAgent
      );

      if (unassignedBuildings.length === 0) {
        console.warn(`No available buildings for agent ${agent.name} (${agent.id})`);
        continue;
      }

      // Randomly select a building from available ones
      const randomIndex = Math.floor(Math.random() * unassignedBuildings.length);
      const availableBuilding = unassignedBuildings[randomIndex];

      // Create metadata for agent if it doesn't exist
      let metadata = memoryStorageService.getAgentMetadata(agent.id);
      if (!metadata) {
        const newMetadata = {
          id: agent.id,
          assigned_building_ids: [],
          current_building_id: null,
          status: 'active' as const,
          experience_points: 0,
          level: 1,
          reputation_score: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        memoryStorageService.setAgentMetadata(newMetadata);
        metadata = memoryStorageService.getAgentMetadata(agent.id);
        memoryCount++;
      }

      if (metadata) {
        // Assign building to agent
        const result = await agentService.assignBuildingToAgent(agent.id, availableBuilding.id);
        
        if (result.success) {
          // Mark building as assigned in the map
          availableBuilding.assignedAgent = agent.id;
          assignedCount++;
          
          assignments.push({
            agentId: agent.id,
            agentName: agent.name,
            buildingId: availableBuilding.id,
            buildingType: availableBuilding.type,
            buildingZone: availableBuilding.zone,
            coordinates: { x: availableBuilding.x, y: availableBuilding.y }
          });

          console.log(`✅ Assigned agent ${agent.name} to building ${availableBuilding.id} (${availableBuilding.type}) at (${availableBuilding.x}, ${availableBuilding.y})`);
        } else {
          console.error(`❌ Failed to assign building to agent ${agent.name}:`, result.error);
        }
      }
    }

    console.log(`🎉 Initialization complete!`);
    console.log(`   - ${assignedCount} agents assigned to buildings`);
    console.log(`   - ${memoryCount} new agent metadata created`);
    console.log(`   - ${agents.length} total agents processed`);

    res.status(200).json({
      success: true,
      message: 'Startup initialization completed successfully',
      results: {
        totalAgents: agents.length,
        agentsAssigned: assignedCount,
        agentsInMemory: memoryCount,
        availableBuildings: validBuildings.length,
        assignments: assignments
      }
    });

  } catch (error) {
    console.error('Error during startup initialization:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
