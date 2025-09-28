import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseService } from '../../services/supabaseService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationId, agentId, content, messageType = 'response' } = req.body;

    // Validate required fields
    if (!conversationId || !agentId || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields: conversationId, agentId, and content are required' 
      });
    }

    // Store the response in the database
    const { data, error } = await supabaseService.supabase
      .from('communications')
      .insert({
        conversation_id: conversationId,
        sender_agent_id: agentId,
        content: content,
        message_type: messageType,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing response:', error);
      return res.status(500).json({ 
        error: 'Failed to store response' 
      });
    }

    res.status(201).json({ 
      success: true, 
      response: data 
    });
  } catch (error) {
    console.error('Error processing response:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
