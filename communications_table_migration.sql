-- Communications Table Migration
-- Run this SQL in your Supabase SQL editor to create the communications table

-- Create communications table
CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id VARCHAR(255) NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_communications_task_id ON communications(task_id);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON communications(created_at);

-- Enable Row Level Security
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow all operations
CREATE POLICY "Allow all operations on communications" ON communications FOR ALL USING (true) WITH CHECK (true);

-- Insert mock data
INSERT INTO communications (task_id, response, created_at) VALUES
-- Task responses
('task_1703123456_abc123', 'Hello! I''m ready to help you with your DeFi research. What specific protocols would you like me to analyze?', NOW() - INTERVAL '2 hours'),
('task_1703123457_def456', 'I''ve completed the NFT collection analysis. Here are the top 5 undervalued projects with strong fundamentals: 1. CryptoPunks derivatives, 2. Art Blocks collections, 3. Gaming NFTs, 4. Utility-focused projects, 5. Community-driven collections.', NOW() - INTERVAL '3 hours'),
('task_1703123458_ghi789', 'Your social media content strategy is ready! I''ve created a 30-day posting schedule with engaging content ideas for Twitter, LinkedIn, and Discord.', NOW() - INTERVAL '4 hours'),
('task_1703123459_jkl012', 'I''ve reviewed your smart contract requirements. The DeFi protocol you described can be implemented with the following architecture: Automated Market Maker (AMM), Liquidity pools, Yield farming mechanisms, and Governance token integration.', NOW() - INTERVAL '5 hours'),
('task_1703123460_mno345', 'Your trading bot configuration is complete! I''ve set up automated strategies for: 1. DCA (Dollar Cost Averaging), 2. Grid trading, 3. Arbitrage opportunities, 4. Stop-loss protection. The bot is now monitoring the markets 24/7.', NOW() - INTERVAL '6 hours'),
('task_1703123461_pqr678', 'Portfolio analysis complete! Your current allocation shows: 40% BTC, 30% ETH, 20% DeFi tokens, 10% altcoins. I recommend rebalancing to include more stablecoins during market volatility.', NOW() - INTERVAL '7 hours'),
('task_1703123462_stu901', 'I''ve identified the best yield farming opportunities: Uniswap V3 (15% APY), Compound (8% APY), Aave (12% APY), and Yearn Finance (18% APY). Risk levels vary, so I''ve categorized them by safety.', NOW() - INTERVAL '8 hours'),
('task_1703123463_vwx234', 'Technical analysis shows strong bullish signals: RSI at 45 (oversold recovery), MACD showing positive divergence, and support level holding at $42,000. Target resistance at $48,000.', NOW() - INTERVAL '9 hours');

-- Verify the data was inserted
SELECT 
    task_id,
    response,
    created_at
FROM communications 
ORDER BY created_at DESC;
