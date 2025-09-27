import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId } = req.query;
  const { limit } = req.query;

  if (!agentId || typeof agentId !== 'string') {
    return res.status(400).json({ error: 'Agent ID is required' });
  }

  try {
    const messageLimit = limit ? parseInt(limit as string, 10) : 50;
    const result = await agentService.getMessagesForAgent(agentId, messageLimit);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({ 
      success: true, 
      messages: result.data 
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
