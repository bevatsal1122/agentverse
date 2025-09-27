import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { building_id } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Agent ID is required' });
  }

  if (!building_id) {
    return res.status(400).json({ error: 'Building ID is required' });
  }

  try {
    const result = await agentService.assignBuildingToAgent(id, building_id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Update last active time
    await agentService.updateAgentLastActive(id);

    res.status(200).json({ 
      success: true, 
      message: 'Building assigned successfully' 
    });
  } catch (error) {
    console.error('Error assigning building to agent:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
