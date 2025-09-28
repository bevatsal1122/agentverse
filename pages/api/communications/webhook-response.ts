import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

// Webhook endpoint for backend to send responses directly to chat
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { task_id, content } = req.body;

    console.log('🔍 Webhook received:', { task_id, content: content?.substring(0, 50) + '...' });

    // Validate required fields
    if (!task_id || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields: task_id and content are required' 
      });
    }

    // Store the response in the database
    const { data, error } = await (supabase as any)
      .from('communications')
      .insert({
        task_id: task_id,
        response: content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing webhook response:', error);
      return res.status(500).json({ 
        error: 'Failed to store response' 
      });
    }

    // Log the successful response
    console.log(`📨 Webhook response received for task ${task_id}`);

    res.status(201).json({ 
      success: true, 
      response: data,
      message: 'Response sent successfully'
    });
  } catch (error) {
    console.error('Error processing webhook response:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
