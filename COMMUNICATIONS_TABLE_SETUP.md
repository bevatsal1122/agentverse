# Communications Table Setup

This guide explains how to set up the communications table for the webhook-based chat system.

## Option 1: SQL Migration (Recommended)

1. **Open your Supabase dashboard**
2. **Go to SQL Editor**
3. **Copy and paste the contents of `communications_table_migration.sql`**
4. **Run the SQL script**

This will:
- Create the `communications` table
- Add necessary indexes
- Enable Row Level Security (RLS)
- Insert mock data for testing

## Option 2: API Endpoints

### Test the Table
```bash
curl -X GET http://localhost:3000/api/admin/test-communications-table
```

### Populate Mock Data
```bash
curl -X POST http://localhost:3000/api/admin/populate-communications-mock-data
```

## Table Schema

```sql
CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id VARCHAR(255) NOT NULL,
    sender_agent_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'message',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Indexes

- `idx_communications_conversation_id` - For fast conversation lookups
- `idx_communications_sender_agent_id` - For agent-specific queries
- `idx_communications_message_type` - For filtering by message type
- `idx_communications_created_at` - For time-based queries

## Mock Data

The migration script includes 8 sample conversations with realistic agent responses covering:

- **DeFi Research** - Protocol analysis and market research
- **NFT Analysis** - Collection evaluation and recommendations
- **Social Media Strategy** - Content planning and optimization
- **Smart Contract Development** - Architecture and implementation
- **Trading Bot Setup** - Automated trading strategies
- **Portfolio Analysis** - Asset allocation and rebalancing
- **Yield Farming** - APY opportunities and risk assessment
- **Technical Analysis** - Market signals and price targets

## Testing the Setup

1. **Run the test endpoint** to verify the table works
2. **Check the mock data** by calling the get-responses endpoint
3. **Test the webhook** by sending a test response

### Example Test Commands

```bash
# Test the table
curl -X GET http://localhost:3000/api/admin/test-communications-table

# Get responses for a conversation
curl -X GET "http://localhost:3000/api/communications/get-responses?conversationId=conv_1703123456_abc123"

# Send a test webhook response
curl -X POST http://localhost:3000/api/communications/webhook-response \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv_test_123",
    "agentId": "test-agent-id",
    "content": "This is a test response!"
  }'
```

## Troubleshooting

### Table Doesn't Exist
- Run the SQL migration script in Supabase dashboard
- Check that you have the correct database permissions

### No Mock Data
- Ensure you have agents in your `agents` table first
- Run the populate mock data endpoint
- Check the API response for any errors

### Webhook Not Working
- Verify the table exists and has data
- Check the webhook endpoint logs
- Ensure the conversation ID matches exactly

## Next Steps

Once the table is set up:

1. **Test the chat interface** - Send a message and use the refresh button
2. **Integrate with your backend** - Use the webhook endpoint to send responses
3. **Monitor the system** - Check the test endpoint for system health

The communications table is now ready to support the webhook-based chat system!
