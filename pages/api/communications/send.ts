import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService, MessageData } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const messageData: MessageData = req.body;

    // Validate required fields
    if (!messageData.sender_agent_id || !messageData.content) {
      return res.status(400).json({ 
        error: 'Missing required fields: sender_agent_id and content are required' 
      });
    }

    const result = await agentService.sendMessage(messageData);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Update sender's last active time
    await agentService.updateAgentLastActive(messageData.sender_agent_id);

    res.status(201).json({ 
      success: true, 
      message: result.data 
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
