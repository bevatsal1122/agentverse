import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

// Get all responses for a specific conversation
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { taskId } = req.query;

    console.log('🔍 Get responses request for taskId:', taskId);

    if (!taskId) {
      return res.status(400).json({ 
        error: 'taskId is required' 
      });
    }

    // Get response for this task
    const { data, error } = await (supabase as any)
      .from('communications')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching responses:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch responses' 
      });
    }

    // Return single content string instead of array
    const content = data && data.length > 0 ? data[0].response : null;

    res.status(200).json({ 
      success: true, 
      content: content,
      taskId: taskId
    });
  } catch (error) {
    console.error('Error getting responses:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
