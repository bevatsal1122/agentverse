import { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../services/agentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { maxAgeHours = 168 } = req.body; // Default: 1 week

    // Clean up old data
    const result = agentService.cleanupOldMemoryData(maxAgeHours);
    
    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(200).json({
      success: true,
      message: `Cleaned up old memory data (older than ${maxAgeHours} hours)`,
      data: result.data
    });
  } catch (error) {
    console.error('Error cleaning up memory:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
