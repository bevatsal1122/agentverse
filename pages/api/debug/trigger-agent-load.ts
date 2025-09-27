import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // This endpoint is just for testing - the actual agent loading happens on the client side
    // We can't directly trigger client-side functions from the server
    
    res.status(200).json({
      success: true,
      message: 'Agent loading is handled on the client side. Please refresh the game page or check the browser console for logs.',
      instructions: [
        '1. Open the game page in your browser',
        '2. Open the browser console (F12)',
        '3. Look for console logs starting with 🔄, 📡, ✅, etc.',
        '4. If agents are not loading, try calling window.refreshGameAgents() in the console'
      ]
    });

  } catch (error) {
    console.error('Error in trigger agent load:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
