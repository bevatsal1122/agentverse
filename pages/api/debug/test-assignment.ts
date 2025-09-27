import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { agentService } from '../../services/agentService';
import { memoryStorageService } from '../../services/memoryStorageService';
import { getAvailableBuildings, getBuildingById } from '../../../src/maps/defaultMap';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get first agent
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('status', 'active')
      .limit(1);

    if (agentsError || !agents || agents.length === 0) {
      return res.status(400).json({ error: 'No agents found' });
    }

    const agent = agents[0];
    console.log(`Testing assignment for agent: ${agent.name} (${agent.id})`);

    // Get first available building
    const availableBuildings = getAvailableBuildings();
    const buildingTypes = ['living_quarters', 'research_lab', 'engineering_bay', 'recreation', 'power_line'];
    const validBuildings = availableBuildings.filter(building => 
      buildingTypes.includes(building.type)
    );

    if (validBuildings.length === 0) {
      return res.status(400).json({ error: 'No valid buildings available' });
    }

    const building = validBuildings[0];
    console.log(`Testing assignment to building: ${building.id} (${building.type}) at (${building.x}, ${building.y})`);

    // Check if agent has metadata
    let metadata = memoryStorageService.getAgentMetadata(agent.id);
    console.log(`Agent metadata exists: ${!!metadata}`);

    if (!metadata) {
      console.log('Creating metadata for agent...');
      memoryStorageService.updateAgentMetadata(agent.id, {
        assigned_building_ids: [],
        current_building_id: null,
        status: 'active',
        experience_points: 0,
        level: 1,
        reputation_score: 0
      });
      metadata = memoryStorageService.getAgentMetadata(agent.id);
      console.log(`Metadata created: ${!!metadata}`);
    }

    // Test building assignment
    console.log('Attempting building assignment...');
    const result = await agentService.assignBuildingToAgent(agent.id, building.id);
    console.log(`Assignment result:`, result);

    // Check final state
    const finalMetadata = memoryStorageService.getAgentMetadata(agent.id);
    const finalBuilding = getBuildingById(building.id);

    res.status(200).json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name
      },
      building: {
        id: building.id,
        type: building.type,
        coordinates: { x: building.x, y: building.y }
      },
      assignmentResult: result,
      finalMetadata: {
        current_building_id: finalMetadata?.current_building_id,
        assigned_building_ids: finalMetadata?.assigned_building_ids
      },
      finalBuilding: {
        assignedAgent: finalBuilding?.assignedAgent
      }
    });

  } catch (error) {
    console.error('Error testing assignment:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
