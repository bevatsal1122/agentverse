-- AgentVerse Database Schema
-- Run this in your Supabase SQL editor to set up the agent system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_address VARCHAR(255) NOT NULL,
    personality JSONB,
    capabilities TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'busy', 'offline')),
    current_building_id VARCHAR(255),
    assigned_building_ids TEXT[] DEFAULT '{}',
    wallet_address VARCHAR(255),
    avatar_url TEXT,
    experience_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    reputation_score INTEGER DEFAULT 100,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    creator_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    task_type VARCHAR(50) DEFAULT 'custom' CHECK (task_type IN ('communication', 'building_management', 'resource_gathering', 'collaboration', 'custom')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    requirements JSONB,
    reward_amount DECIMAL(20, 8),
    reward_token VARCHAR(255),
    deadline TIMESTAMP WITH TIME ZONE,
    completion_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create agent_communications table
CREATE TABLE IF NOT EXISTS agent_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    receiver_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'direct' CHECK (message_type IN ('direct', 'broadcast', 'task_related', 'system')),
    content TEXT NOT NULL,
    metadata JSONB,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_actions table (for logging and analytics)
CREATE TABLE IF NOT EXISTS agent_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('move', 'interact', 'task_complete', 'message_sent', 'building_assigned', 'custom')),
    action_data JSONB DEFAULT '{}',
    building_id VARCHAR(255),
    target_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_owner_address ON agents(owner_address);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_last_active ON agents(last_active);

CREATE INDEX IF NOT EXISTS idx_tasks_creator_agent_id ON tasks(creator_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent_id ON tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_communications_sender ON agent_communications(sender_agent_id);
CREATE INDEX IF NOT EXISTS idx_communications_receiver ON agent_communications(receiver_agent_id);
CREATE INDEX IF NOT EXISTS idx_communications_task_id ON agent_communications(task_id);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON agent_communications(created_at);

CREATE INDEX IF NOT EXISTS idx_actions_agent_id ON agent_actions(agent_id);
CREATE INDEX IF NOT EXISTS idx_actions_action_type ON agent_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_actions_created_at ON agent_actions(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on agents" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on communications" ON agent_communications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on actions" ON agent_actions FOR ALL USING (true) WITH CHECK (true);

-- Create some useful views
CREATE OR REPLACE VIEW active_agents AS
SELECT *
FROM agents
WHERE status = 'active' 
  AND last_active > NOW() - INTERVAL '1 hour';

CREATE OR REPLACE VIEW pending_tasks AS
SELECT t.*, 
       ca.name as creator_name,
       aa.name as assigned_name
FROM tasks t
LEFT JOIN agents ca ON t.creator_agent_id = ca.id
LEFT JOIN agents aa ON t.assigned_agent_id = aa.id
WHERE t.status = 'pending'
ORDER BY 
  CASE t.priority 
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  t.created_at ASC;

-- Create a function to get agent statistics
CREATE OR REPLACE FUNCTION get_agent_stats(agent_uuid UUID)
RETURNS TABLE (
    total_tasks_created INTEGER,
    total_tasks_completed INTEGER,
    total_messages_sent INTEGER,
    total_messages_received INTEGER,
    buildings_assigned INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM tasks WHERE creator_agent_id = agent_uuid),
        (SELECT COUNT(*)::INTEGER FROM tasks WHERE assigned_agent_id = agent_uuid AND status = 'completed'),
        (SELECT COUNT(*)::INTEGER FROM agent_communications WHERE sender_agent_id = agent_uuid),
        (SELECT COUNT(*)::INTEGER FROM agent_communications WHERE receiver_agent_id = agent_uuid),
        (SELECT array_length(assigned_building_ids, 1) FROM agents WHERE id = agent_uuid);
END;
$$ LANGUAGE plpgsql;
