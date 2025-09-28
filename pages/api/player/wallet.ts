import { NextApiRequest, NextApiResponse } from 'next';
import { redisService, PlayerWallet } from '../../services/redisService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { playerId } = req.query;
      
      if (!playerId || typeof playerId !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: 'Player ID is required' 
        });
      }

      const wallet = await redisService.getPlayerWallet(playerId);
      
      if (!wallet) {
        // Create default wallet if it doesn't exist
        const defaultWallet: PlayerWallet = {
          playerId,
          totalMoney: 1000,
          experiencePoints: 0,
          level: 1,
          lastUpdated: Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const newWallet = await redisService.setPlayerWallet(defaultWallet);
        return res.status(200).json({ 
          success: true, 
          wallet: newWallet 
        });
      }

      return res.status(200).json({ 
        success: true, 
        wallet 
      });
    } catch (error) {
      console.error('Error getting player wallet:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get player wallet' 
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { playerId, action, amount } = req.body;
      
      if (!playerId || !action) {
        return res.status(400).json({ 
          success: false, 
          error: 'Player ID and action are required' 
        });
      }

      let updatedWallet: PlayerWallet | null = null;

      switch (action) {
        case 'add_xp':
          if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ 
              success: false, 
              error: 'Valid XP amount is required' 
            });
          }
          updatedWallet = await redisService.addPlayerXP(playerId, amount);
          break;

        case 'add_money':
          if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ 
              success: false, 
              error: 'Valid money amount is required' 
            });
          }
          updatedWallet = await redisService.addPlayerMoney(playerId, amount);
          break;

        case 'update':
          const { totalMoney, experiencePoints, level } = req.body;
          updatedWallet = await redisService.updatePlayerWallet(playerId, {
            totalMoney,
            experiencePoints,
            level,
            lastUpdated: Date.now()
          });
          break;

        default:
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid action. Use: add_xp, add_money, or update' 
          });
      }

      if (!updatedWallet) {
        return res.status(404).json({ 
          success: false, 
          error: 'Player wallet not found' 
        });
      }

      return res.status(200).json({ 
        success: true, 
        wallet: updatedWallet 
      });
    } catch (error) {
      console.error('Error updating player wallet:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update player wallet' 
      });
    }
  }

  return res.status(405).json({ 
    success: false, 
    error: 'Method not allowed' 
  });
}
