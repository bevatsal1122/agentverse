import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { agentService } from '../../services/agentService';
import { memoryStorageService } from '../../services/memoryStorageService';
import { getAvailableBuildings, getBuildingsByType, unassignAgentFromBuilding } from '../../../src/maps/defaultMap';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Initializing agent building assignments...');

    // Get all active agents from database
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
        assignments: []
      });
    }

    console.log(`Found ${agents.length} active agents`);

    // Get available buildings (only actual buildings, not roads/corridors)
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

    const assignments = [];
    let assignedCount = 0;

    // Assign each agent to a building
    for (const agent of agents) {
      // Find an available building
      const availableBuilding = validBuildings.find(building => 
        !building.assignedAgent
      );

      if (!availableBuilding) {
        console.warn(`No available buildings for agent ${agent.name} (${agent.id})`);
        continue;
      }

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

    console.log(`🎉 Successfully assigned ${assignedCount} agents to buildings`);

    res.status(200).json({
      success: true,
      message: `Successfully assigned ${assignedCount} agents to buildings`,
      totalAgents: agents.length,
      assignedAgents: assignedCount,
      availableBuildings: validBuildings.length,
      assignments: assignments
    });

  } catch (error) {
    console.error('Error initializing agent assignments:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
