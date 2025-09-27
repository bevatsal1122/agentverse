import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService, AgentRegistrationData } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const agentData: AgentRegistrationData = req.body;

    // Validate required fields
    if (!agentData.name || !agentData.owner_address) {
      return res.status(400).json({ 
        error: 'Missing required fields: name and owner_address are required' 
      });
    }

    const result = await agentService.registerAgent(agentData);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ 
      success: true, 
      agent: result.data 
    });
  } catch (error) {
    console.error('Error in agent registration:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
