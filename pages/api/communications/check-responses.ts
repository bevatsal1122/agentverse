import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseService } from '../../services/supabaseService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationId, lastChecked } = req.query;

    if (!conversationId) {
      return res.status(400).json({ 
        error: 'conversationId is required' 
      });
    }

    // Build query to get new responses since last check
    let query = supabaseService.supabase
      .from('communications')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('message_type', 'response')
      .order('created_at', { ascending: true });

    // If lastChecked is provided, only get messages after that timestamp
    if (lastChecked) {
      query = query.gt('created_at', lastChecked);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching responses:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch responses' 
      });
    }

    res.status(200).json({ 
      success: true, 
      responses: data || [],
      hasNewResponses: (data || []).length > 0
    });
  } catch (error) {
    console.error('Error checking responses:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
