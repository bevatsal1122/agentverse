import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Starting chat tables migration...');

    // Create conversations table
    const { error: conversationsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          agent_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255),
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
        CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
        
        ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow all operations on conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
      `
    });

    if (conversationsError) {
      console.error('❌ Error creating conversations table:', conversationsError);
      return res.status(500).json({ 
        error: 'Failed to create conversations table',
        details: conversationsError.message
      });
    }

    // Create chat_messages table
    const { error: messagesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS chat_messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'agent')),
          message_text TEXT NOT NULL,
          message_data JSONB,
          status VARCHAR(50) DEFAULT 'sent',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_type ON chat_messages(sender_type);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages(status);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
        
        ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow all operations on chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
      `
    });

    if (messagesError) {
      console.error('❌ Error creating chat_messages table:', messagesError);
      return res.status(500).json({ 
        error: 'Failed to create chat_messages table',
        details: messagesError.message
      });
    }

    console.log('✅ Chat tables migration completed successfully');

    res.status(200).json({
      success: true,
      message: 'Successfully created chat tables',
      tables: ['conversations', 'chat_messages']
    });

  } catch (error) {
    console.error('❌ Error during chat tables migration:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


