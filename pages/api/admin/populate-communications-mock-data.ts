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
    console.log('🚀 Starting communications mock data population...');

    // Get some existing agents to use for mock data
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name')
      .limit(10);

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return res.status(500).json({ 
        error: 'Failed to fetch agents',
        details: agentsError.message
      });
    }

    if (!agents || agents.length === 0) {
      return res.status(400).json({ 
        error: 'No agents found. Please create some agents first.' 
      });
    }

    console.log(`📊 Found ${agents.length} agents for mock data`);

    // Create mock conversation data
    const mockConversations = [
      {
        conversationId: 'conv_1703123456_abc123',
        messages: [
          {
            sender_agent_id: agents[0].id,
            content: 'Hello! I\'m ready to help you with your DeFi research. What specific protocols would you like me to analyze?',
            message_type: 'response'
          },
          {
            sender_agent_id: agents[1]?.id || agents[0].id,
            content: 'I can assist with market analysis and risk assessment. Let me know what trading strategies you\'re interested in.',
            message_type: 'response'
          }
        ]
      },
      {
        conversationId: 'conv_1703123457_def456',
        messages: [
          {
            sender_agent_id: agents[2]?.id || agents[0].id,
            content: 'I\'ve completed the NFT collection analysis. Here are the top 5 undervalued projects with strong fundamentals: 1. CryptoPunks derivatives, 2. Art Blocks collections, 3. Gaming NFTs, 4. Utility-focused projects, 5. Community-driven collections.',
            message_type: 'response'
          }
        ]
      },
      {
        conversationId: 'conv_1703123458_ghi789',
        messages: [
          {
            sender_agent_id: agents[3]?.id || agents[0].id,
            content: 'Your social media content strategy is ready! I\'ve created a 30-day posting schedule with engaging content ideas for Twitter, LinkedIn, and Discord.',
            message_type: 'response'
          },
          {
            sender_agent_id: agents[4]?.id || agents[0].id,
            content: 'I can help optimize your content for better engagement. Would you like me to analyze your current metrics and suggest improvements?',
            message_type: 'response'
          }
        ]
      },
      {
        conversationId: 'conv_1703123459_jkl012',
        messages: [
          {
            sender_agent_id: agents[0].id,
            content: 'I\'ve reviewed your smart contract requirements. The DeFi protocol you described can be implemented with the following architecture: Automated Market Maker (AMM), Liquidity pools, Yield farming mechanisms, and Governance token integration.',
            message_type: 'response'
          }
        ]
      },
      {
        conversationId: 'conv_1703123460_mno345',
        messages: [
          {
            sender_agent_id: agents[1]?.id || agents[0].id,
            content: 'Your trading bot configuration is complete! I\'ve set up automated strategies for: 1. DCA (Dollar Cost Averaging), 2. Grid trading, 3. Arbitrage opportunities, 4. Stop-loss protection. The bot is now monitoring the markets 24/7.',
            message_type: 'response'
          }
        ]
      },
      {
        conversationId: 'conv_1703123461_pqr678',
        messages: [
          {
            sender_agent_id: agents[2]?.id || agents[0].id,
            content: 'Portfolio analysis complete! Your current allocation shows: 40% BTC, 30% ETH, 20% DeFi tokens, 10% altcoins. I recommend rebalancing to include more stablecoins during market volatility.',
            message_type: 'response'
          }
        ]
      },
      {
        conversationId: 'conv_1703123462_stu901',
        messages: [
          {
            sender_agent_id: agents[3]?.id || agents[0].id,
            content: 'I\'ve identified the best yield farming opportunities: Uniswap V3 (15% APY), Compound (8% APY), Aave (12% APY), and Yearn Finance (18% APY). Risk levels vary, so I\'ve categorized them by safety.',
            message_type: 'response'
          }
        ]
      },
      {
        conversationId: 'conv_1703123463_vwx234',
        messages: [
          {
            sender_agent_id: agents[4]?.id || agents[0].id,
            content: 'Technical analysis shows strong bullish signals: RSI at 45 (oversold recovery), MACD showing positive divergence, and support level holding at $42,000. Target resistance at $48,000.',
            message_type: 'response'
          }
        ]
      }
    ];

    // Insert mock data
    let totalInserted = 0;
    let totalErrors = 0;

    for (const conversation of mockConversations) {
      for (const message of conversation.messages) {
        const { error: insertError } = await (supabase as any)
          .from('communications')
          .insert({
            conversation_id: conversation.conversationId,
            sender_agent_id: message.sender_agent_id,
            content: message.content,
            message_type: message.message_type,
            created_at: new Date(Date.now() - Math.random() * 86400000).toISOString() // Random time in last 24 hours
          });

        if (insertError) {
          console.error('Error inserting mock message:', insertError);
          totalErrors++;
        } else {
          totalInserted++;
        }
      }
    }

    console.log(`✅ Inserted ${totalInserted} mock messages, ${totalErrors} errors`);

    // Verify the data was inserted
    const { data: insertedData, error: verifyError } = await (supabase as any)
      .from('communications')
      .select('*')
      .order('created_at', { ascending: false });

    if (verifyError) {
      console.error('Error verifying inserted data:', verifyError);
    } else {
      console.log(`📊 Total communications records: ${insertedData?.length || 0}`);
    }

    // Get conversation summary
    const { data: conversationSummary, error: summaryError } = await (supabase as any)
      .from('communications')
      .select('conversation_id')
      .order('created_at', { ascending: false });

    const uniqueConversations = new Set(conversationSummary?.map(item => item.conversation_id) || []);

    res.status(200).json({ 
      success: true,
      message: 'Communications mock data populated successfully',
      details: {
        mockDataInserted: totalInserted,
        errors: totalErrors,
        totalRecords: insertedData?.length || 0,
        uniqueConversations: uniqueConversations.size,
        agentsUsed: agents.length,
        conversations: Array.from(uniqueConversations)
      }
    });

  } catch (error) {
    console.error('Error in communications mock data population:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
