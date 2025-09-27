import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { persistentMemoryStorageService } from '../../services/persistentMemoryStorageService';
import { getBuildingById } from '../../../src/maps/defaultMap';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing randomized building assignments...');

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
      return res.status(200).json({ 
        success: true, 
        message: 'No active agents found',
        assignments: []
      });
    }

    console.log(`Found ${agents.length} active agents`);

    const assignments = [];
    const buildingCoordinates = new Map<string, number[]>(); // Track building positions

    // Check each agent's building assignment
    for (const agent of agents) {
      const metadata = await persistentMemoryStorageService.getAgentMetadataAsync(agent.id);
      
      if (metadata && metadata.assigned_building_ids && metadata.assigned_building_ids.length > 0) {
        const buildingId = metadata.assigned_building_ids[0]; // Get first assigned building
        const building = getBuildingById(buildingId);
        
        if (building) {
          const coordinates = [building.x, building.y];
          buildingCoordinates.set(buildingId, coordinates);
          
          assignments.push({
            agentId: agent.id,
            agentName: agent.name,
            buildingId: building.id,
            buildingType: building.type,
            buildingZone: building.zone,
            coordinates: { x: building.x, y: building.y }
          });
        }
      }
    }

    // Analyze distribution
    const coordinateCounts = new Map<string, number>();
    const zoneDistribution = new Map<string, number>();
    const typeDistribution = new Map<string, number>();

    assignments.forEach(assignment => {
      // Count coordinates
      const coordKey = `${assignment.coordinates.x},${assignment.coordinates.y}`;
      coordinateCounts.set(coordKey, (coordinateCounts.get(coordKey) || 0) + 1);
      
      // Count zones
      zoneDistribution.set(assignment.buildingZone, (zoneDistribution.get(assignment.buildingZone) || 0) + 1);
      
      // Count types
      typeDistribution.set(assignment.buildingType, (typeDistribution.get(assignment.buildingType) || 0) + 1);
    });

    // Check if assignments are spread out (not all in same area)
    const uniqueCoordinates = coordinateCounts.size;
    const totalAssignments = assignments.length;
    const spreadRatio = uniqueCoordinates / totalAssignments;

    console.log(`📊 Assignment Analysis:`);
    console.log(`   - Total agents: ${agents.length}`);
    console.log(`   - Assigned agents: ${totalAssignments}`);
    console.log(`   - Unique building positions: ${uniqueCoordinates}`);
    console.log(`   - Spread ratio: ${spreadRatio.toFixed(2)} (1.0 = perfect spread)`);

    res.status(200).json({
      success: true,
      message: 'Randomized assignment test completed',
      analysis: {
        totalAgents: agents.length,
        assignedAgents: totalAssignments,
        uniqueBuildingPositions: uniqueCoordinates,
        spreadRatio: spreadRatio,
        isWellDistributed: spreadRatio > 0.8 // Consider well distributed if >80% unique positions
      },
      distribution: {
        zones: Object.fromEntries(zoneDistribution),
        types: Object.fromEntries(typeDistribution),
        coordinates: Object.fromEntries(coordinateCounts)
      },
      assignments: assignments
    });

  } catch (error) {
    console.error('Error testing randomized assignment:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
