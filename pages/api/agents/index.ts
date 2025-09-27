import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      try {
        const { owner_address, active_only } = req.query;

        let result;
        if (owner_address) {
          result = await agentService.getAgentsByOwner(owner_address as string);
        } else if (active_only === 'true') {
          result = await agentService.getActiveAgents();
        } else {
          result = await agentService.getAgents();
        }

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        res.status(200).json({ 
          success: true, 
          agents: result.data 
        });
      } catch (error) {
        console.error('Error fetching agents:', error);
        res.status(500).json({ 
          error: 'Internal server error' 
        });
      }
      break;

    default:
      res.status(405).json({ error: 'Method not allowed' });
      break;
  }
}
