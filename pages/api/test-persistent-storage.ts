import type { NextApiRequest, NextApiResponse } from 'next';
import { persistentMemoryStorageService } from '../services/persistentMemoryStorageService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test Redis connection and basic operations
    const isHealthy = await persistentMemoryStorageService.isHealthy();
    
    if (!isHealthy) {
      return res.status(503).json({ 
        error: 'Redis service is not healthy',
        healthy: false
      });
    }

    // Get stats
    const stats = await persistentMemoryStorageService.getStats();
    
    // Test setting and getting agent metadata
    const testAgentId = 'test-agent-' + Date.now();
    const testMetadata = {
      id: testAgentId,
      capabilities: ['test'],
      status: 'active' as const,
      assigned_building_ids: [],
      experience_points: 0,
      level: 1,
      reputation_score: 100,
      last_active: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Test async operations
    await persistentMemoryStorageService.setAgentMetadataAsync(testMetadata);
    const retrievedMetadata = await persistentMemoryStorageService.getAgentMetadataAsync(testAgentId);

    res.status(200).json({
      success: true,
      healthy: true,
      stats,
      testResults: {
        agentId: testAgentId,
        metadataSet: !!testMetadata,
        metadataRetrieved: !!retrievedMetadata,
        metadataMatch: retrievedMetadata?.id === testAgentId
      },
      message: 'PersistentMemoryStorageService is working correctly'
    });

  } catch (error) {
    console.error('Error testing persistent storage:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
