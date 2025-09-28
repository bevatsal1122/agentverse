import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Testing communications table...');

    // Test 1: Check if table exists by trying to select from it
    const { data: testData, error: testError } = await (supabase as any)
      .from('communications')
      .select('*')
      .limit(1);

    if (testError) {
      if (testError.code === 'PGRST116') {
        return res.status(404).json({ 
          error: 'Communications table does not exist',
          message: 'Please run the SQL migration script first or create the table manually',
          sqlScript: 'communications_table_migration.sql'
        });
      } else {
        return res.status(500).json({ 
          error: 'Error accessing communications table',
          details: testError.message
        });
      }
    }

    console.log('✅ Communications table exists and is accessible');

    // Test 2: Get total count
    const { count, error: countError } = await (supabase as any)
      .from('communications')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.warn('Warning: Could not get count:', countError);
    }

    // Test 3: Get recent messages
    const { data: recentMessages, error: recentError } = await (supabase as any)
      .from('communications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.warn('Warning: Could not get recent messages:', recentError);
    }

    // Test 4: Get conversation summary
    const { data: conversationData, error: conversationError } = await (supabase as any)
      .from('communications')
      .select('conversation_id, message_type')
      .order('created_at', { ascending: false });

    let conversationSummary = {};
    if (!conversationError && conversationData) {
      conversationSummary = conversationData.reduce((acc: any, item) => {
        if (!acc[item.conversation_id]) {
          acc[item.conversation_id] = { total: 0, responses: 0, messages: 0 };
        }
        acc[item.conversation_id].total++;
        if (item.message_type === 'response') {
          acc[item.conversation_id].responses++;
        } else {
          acc[item.conversation_id].messages++;
        }
        return acc;
      }, {});
    }

    // Test 5: Test webhook endpoint functionality
    const testConversationId = 'conv_test_' + Date.now();
    const { data: testInsert, error: insertError } = await (supabase as any)
      .from('communications')
      .insert({
        conversation_id: testConversationId,
        sender_agent_id: 'test_agent',
        content: 'This is a test message to verify the table works',
        message_type: 'response'
      })
      .select()
      .single();

    if (insertError) {
      console.warn('Warning: Could not insert test message:', insertError);
    } else {
      console.log('✅ Test message inserted successfully');
      
      // Clean up test message
      await (supabase as any)
        .from('communications')
        .delete()
        .eq('id', testInsert.id);
    }

    res.status(200).json({ 
      success: true,
      message: 'Communications table test completed successfully',
      details: {
        tableExists: true,
        totalRecords: count || 0,
        recentMessages: recentMessages || [],
        conversationSummary: conversationSummary,
        testInsert: insertError ? { error: insertError.message } : { success: true },
        uniqueConversations: Object.keys(conversationSummary).length
      }
    });

  } catch (error) {
    console.error('Error testing communications table:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
