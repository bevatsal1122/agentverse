import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId } = req.query;
  const { message_id } = req.body;

  if (!agentId || typeof agentId !== 'string') {
    return res.status(400).json({ error: 'Agent ID is required' });
  }

  if (!message_id) {
    return res.status(400).json({ error: 'Message ID is required' });
  }

  try {
    const result = await agentService.markMessageAsRead(message_id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Update agent's last active time
    await agentService.updateAgentLastActive(agentId);

    res.status(200).json({ 
      success: true, 
      message: 'Message marked as read' 
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
