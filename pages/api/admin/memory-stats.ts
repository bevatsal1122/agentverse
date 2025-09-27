import { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../services/agentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentId } = req.query;

    if (agentId && typeof agentId === 'string') {
      // Get stats for specific agent
      const result = agentService.getAgentMemoryStats(agentId);
      return res.status(200).json(result);
    } else {
      // Get system-wide memory usage
      const memoryUsage = agentService.getSystemMemoryUsage();
      const activeSessions = agentService.getActiveSessions();
      
      return res.status(200).json({
        success: true,
        data: {
          memoryUsage: memoryUsage.data,
          activeSessions: activeSessions.data,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Error getting memory stats:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
