import type { NextApiRequest, NextApiResponse } from 'next';
import { redisService } from '../../services/redisService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all hierarchical queue keys from Redis
    const redisKeys = await redisService.keys('hierarchical_queue:*');
    console.log('🔍 Found Redis queue keys to clear:', redisKeys);
    
    let clearedQueues = 0;
    
    // Clear each queue
    for (const key of redisKeys) {
      await redisService.set(key, []);
      clearedQueues++;
      console.log(`🧹 Cleared queue: ${key}`);
    }
    
    console.log(`🧹 Cleared ${clearedQueues} hierarchical queues`);
    
    res.status(200).json({ 
      success: true,
      message: `Cleared ${clearedQueues} hierarchical queues`,
      clearedQueues: clearedQueues,
      clearedKeys: redisKeys
    });

  } catch (error) {
    console.error('Error clearing queues:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}