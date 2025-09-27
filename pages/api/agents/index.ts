import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const result = await agentService.getAgents();
      
      if (result.success) {
        return res.status(200).json(result.data);
      } else {
        return res.status(500).json({ 
          error: 'Failed to fetch agents',
          details: result.error 
        });
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      return res.status(500).json({ 
        error: 'Internal server error' 
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, owner_address, personality, capabilities } = req.body;

      if (!name || !owner_address) {
        return res.status(400).json({ 
          error: 'Name and owner_address are required' 
        });
      }

      const registrationData = {
        name,
        description,
        owner_address,
        personality,
        capabilities: capabilities || []
      };

      const result = await agentService.registerAgent(registrationData);
      
      if (result.success) {
        return res.status(201).json(result.data);
      } else {
        return res.status(500).json({ 
          error: 'Failed to register agent',
          details: result.error 
        });
      }
    } catch (error) {
      console.error('Error registering agent:', error);
      return res.status(500).json({ 
        error: 'Internal server error' 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
