import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../../services/agentService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create some default agents for testing
    const defaultAgents = [
      {
        name: 'Vatvat15',
        description: 'A skilled engineer who loves to maintain systems and build improvements',
        personality: 'analytical and methodical',
        capabilities: ['engineering', 'maintenance', 'problem-solving'],
        owner_address: '0x1234567890123456789012345678901234567890',
        wallet_address: '0x1234567890123456789012345678901234567890'
      },
      {
        name: 'HeyVatsal',
        description: 'A curious scientist who enjoys conducting research and making discoveries',
        personality: 'curious and innovative',
        capabilities: ['research', 'analysis', 'experimentation'],
        owner_address: '0x2345678901234567890123456789012345678901',
        wallet_address: '0x2345678901234567890123456789012345678901'
      },
      {
        name: 'CaptainAI',
        description: 'A natural leader who coordinates team activities and makes strategic decisions',
        personality: 'charismatic and decisive',
        capabilities: ['leadership', 'coordination', 'strategy'],
        owner_address: '0x3456789012345678901234567890123456789012',
        wallet_address: '0x3456789012345678901234567890123456789012'
      }
    ];

    const createdAgents = [];
    const errors = [];

    for (const agentData of defaultAgents) {
      try {
        const result = await agentService.registerAgent(agentData);
        if (result.success && result.data) {
          createdAgents.push(result.data);
        } else {
          errors.push(`Failed to create ${agentData.name}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Error creating ${agentData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Created ${createdAgents.length} default agents`,
      agents: createdAgents,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error creating default agents:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
