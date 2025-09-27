import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { memoryStorageService } from '../../services/memoryStorageService';
import { getAvailableBuildings, getBuildingsByType } from '../../../src/maps/defaultMap';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all active agents from database
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('status', 'active');

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }

    // Get available buildings
    const availableBuildings = getAvailableBuildings();
    const buildingTypes = ['living_quarters', 'research_lab', 'engineering_bay', 'recreation', 'power_line'];
    const validBuildings = availableBuildings.filter(building => 
      buildingTypes.includes(building.type)
    );

    // Check memory storage for each agent
    const agentAssignments = [];
    for (const agent of agents || []) {
      const metadata = memoryStorageService.getAgentMetadata(agent.id);
      agentAssignments.push({
        agentId: agent.id,
        agentName: agent.name,
        dbCurrentBuilding: agent.current_building_id,
        dbAssignedBuildings: agent.assigned_building_ids,
        memoryCurrentBuilding: metadata?.current_building_id,
        memoryAssignedBuildings: metadata?.assigned_building_ids,
        hasMetadata: !!metadata
      });
    }

    res.status(200).json({
      success: true,
      totalAgents: agents?.length || 0,
      availableBuildings: validBuildings.length,
      totalBuildings: availableBuildings.length,
      agentAssignments: agentAssignments,
      buildingStats: {
        living_quarters: getBuildingsByType('living_quarters').length,
        research_lab: getBuildingsByType('research_lab').length,
        engineering_bay: getBuildingsByType('engineering_bay').length,
        recreation: getBuildingsByType('recreation').length,
        power_line: getBuildingsByType('power_line').length
      }
    });

  } catch (error) {
    console.error('Error debugging agent assignments:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
