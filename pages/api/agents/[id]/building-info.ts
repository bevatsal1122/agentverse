import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Agent ID is required' });
  }

  try {
    const result = await agentService.getAgentBuildingInfo(id);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.status(200).json({ 
      success: true, 
      buildingInfo: result.data 
    });
  } catch (error) {
    console.error('Error getting agent building info:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
