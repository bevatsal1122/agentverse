-- AgentVerse Minimal Database Schema
-- This schema only keeps essential persistent data
-- Logs, communications, and temporary data are now stored in memory

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create agents table (ULTRA-MINIMAL - only ownership and identity)
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_address VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REMOVED TABLES (now in-memory):
-- tasks - moved to memoryStorageService (not critical for ownership)
-- All agent metadata (description, personality, capabilities, status, buildings, stats, etc.)

-- REMOVED TABLES (now in-memory):
-- agent_communications - moved to memoryStorageService
-- agent_actions - moved to memoryStorageService
-- tokens - not used in current codebase
-- cities - not used in current codebase  
-- buildings - not used in current codebase (using defaultMap.ts instead)

-- Create indexes for better performance (minimal)
CREATE INDEX IF NOT EXISTS idx_agents_owner_address ON agents(owner_address);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on agents" ON agents FOR ALL USING (true) WITH CHECK (true);

-- Migration script comments:
-- To migrate from the old schema to this ULTRA-MINIMAL one:
-- 1. Export any important data if needed (optional - most data is recreatable)
-- 2. Drop ALL unused tables: agent_communications, agent_actions, tasks, tokens, cities, buildings  
-- 3. Remove most columns from agents table (keep only: id, name, owner_address, wallet_address, created_at)
-- 4. ALL other data now stored in memory via memoryStorageService:
--    - Agent metadata (description, personality, capabilities, status, buildings, stats, etc.)
--    - Tasks (all task data)
--    - Communications (all messages)
--    - Actions (all logs)
--    - Sessions (activity tracking)
-- 5. Database now only stores ESSENTIAL ownership/identity data
-- 6. System is extremely fast with minimal database load
