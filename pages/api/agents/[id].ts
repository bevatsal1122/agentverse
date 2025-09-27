import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Agent ID is required' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const result = await agentService.getAgentById(id);

        if (!result.success) {
          return res.status(404).json({ error: result.error });
        }

        res.status(200).json({ 
          success: true, 
          agent: result.data 
        });
      } catch (error) {
        console.error('Error fetching agent:', error);
        res.status(500).json({ 
          error: 'Internal server error' 
        });
      }
      break;

    case 'PUT':
      try {
        const updates = req.body;
        const result = await agentService.updateAgent(id, updates);

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        // Update last active time
        await agentService.updateAgentLastActive(id);

        res.status(200).json({ 
          success: true, 
          agent: result.data 
        });
      } catch (error) {
        console.error('Error updating agent:', error);
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
