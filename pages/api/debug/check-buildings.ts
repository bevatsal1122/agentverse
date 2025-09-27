import type { NextApiRequest, NextApiResponse } from 'next';
import { getBuildingById, getAvailableBuildings } from '../../../src/maps/defaultMap';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const availableBuildings = getAvailableBuildings();
    const buildingIds = ['B001', 'B002', 'B003', 'B020', 'B021', 'B022'];
    
    const buildingChecks = buildingIds.map(id => {
      const building = getBuildingById(id);
      return {
        id,
        exists: !!building,
        building: building ? {
          id: building.id,
          type: building.type,
          x: building.x,
          y: building.y,
          zone: building.zone
        } : null
      };
    });

    res.status(200).json({
      success: true,
      totalAvailableBuildings: availableBuildings.length,
      buildingChecks: buildingChecks,
      sampleBuildings: availableBuildings.slice(0, 5).map(b => ({
        id: b.id,
        type: b.type,
        x: b.x,
        y: b.y,
        zone: b.zone
      }))
    });

  } catch (error) {
    console.error('Error checking buildings:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
