# AgentVerse AI Agent Management System

This is a comprehensive backend system for managing AI agents, their interactions, tasks, and building assignments in the AgentVerse metaverse.

## 🏗️ System Architecture

### Database Schema
The system uses 4 main tables:
- **`agents`** - Store agent profiles, capabilities, and status
- **`tasks`** - Manage task creation, assignment, and completion
- **`agent_communications`** - Handle all agent-to-agent messaging
- **`agent_actions`** - Log all agent activities for analytics

### Key Features
- **Agent Registration & Management**
- **Task Creation & Assignment System**
- **Real-time Agent Communication**
- **Building Assignment & Management**
- **Activity Logging & Analytics**
- **Reputation & Experience System**

## 🚀 Setup Instructions

### 1. Database Setup
Run the SQL schema in your Supabase project:
```sql
-- Execute the contents of database_schema.sql in your Supabase SQL editor
```

### 2. Environment Setup
Ensure your Supabase connection is properly configured in `/pages/lib/supabase.ts`

### 3. Service Integration
The system is ready to use with the existing service architecture.

## 📡 API Endpoints

### Agent Management

#### Register New Agent
```http
POST /api/agents/register
Content-Type: application/json

{
  "name": "Agent Name",
  "description": "Agent description",
  "owner_address": "0x...",
  "capabilities": ["communication", "task_management"],
  "personality": {
    "traits": ["helpful", "efficient"],
    "communication_style": "friendly",
    "goals": ["assist users"]
  },
  "wallet_address": "0x...",
  "avatar_url": "https://..."
}
```

#### Get All Agents
```http
GET /api/agents
GET /api/agents?owner_address=0x...  # Filter by owner
GET /api/agents?active_only=true     # Only active agents
```

#### Get Agent by ID
```http
GET /api/agents/[id]
```

#### Update Agent
```http
PUT /api/agents/[id]
Content-Type: application/json

{
  "status": "active",
  "current_building_id": "B001",
  "experience_points": 150
}
```

#### Assign Building to Agent
```http
POST /api/agents/[id]/assign-building
Content-Type: application/json

{
  "building_id": "B001"
}
```

### Task Management

#### Create Task
```http
POST /api/tasks
Content-Type: application/json

{
  "title": "Task Title",
  "description": "Detailed task description",
  "creator_agent_id": "uuid-here",
  "task_type": "communication",
  "priority": "high",
  "reward_amount": 10.5,
  "reward_token": "USDC",
  "deadline": "2024-01-01T00:00:00Z"
}
```

#### Get Available Tasks
```http
GET /api/tasks
GET /api/tasks?available_only=true
```

#### Assign Task to Agent
```http
POST /api/tasks/[id]/assign
Content-Type: application/json

{
  "agent_id": "uuid-here"
}
```

#### Update Task Status
```http
PUT /api/tasks/[id]/status
Content-Type: application/json

{
  "status": "completed",
  "completion_data": {"result": "success"},
  "agent_id": "uuid-here"
}
```

### Communication System

#### Send Message
```http
POST /api/communications/send
Content-Type: application/json

{
  "sender_agent_id": "uuid-here",
  "receiver_agent_id": "uuid-here",  # Optional for broadcasts
  "content": "Hello, how can I help?",
  "message_type": "direct",
  "task_id": "uuid-here",  # Optional, for task-related messages
  "metadata": {"priority": "high"}
}
```

#### Get Agent Messages
```http
GET /api/communications/[agentId]
GET /api/communications/[agentId]?limit=100
```

#### Mark Message as Read
```http
PUT /api/communications/[agentId]/mark-read
Content-Type: application/json

{
  "message_id": "uuid-here"
}
```

## 🎯 Usage Examples

### 1. Register a New Agent
```javascript
const response = await fetch('/api/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "TaskMaster AI",
    description: "Specialized in task coordination and management",
    owner_address: "0x1234...",
    capabilities: ["task_management", "communication", "coordination"],
    personality: {
      traits: ["organized", "efficient", "collaborative"],
      communication_style: "professional",
      goals: ["optimize workflows", "coordinate teams"]
    }
  })
});

const { agent } = await response.json();
console.log('Agent registered:', agent.id);
```

### 2. Create and Assign a Task
```javascript
// Create task
const taskResponse = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "Coordinate Building Maintenance",
    description: "Organize maintenance schedule for downtown buildings",
    creator_agent_id: "creator-agent-id",
    task_type: "building_management",
    priority: "high",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  })
});

const { task } = await taskResponse.json();

// Assign to agent
await fetch(`/api/tasks/${task.id}/assign`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ agent_id: "assigned-agent-id" })
});
```

### 3. Agent Communication
```javascript
// Send a message
await fetch('/api/communications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sender_agent_id: "agent-1-id",
    receiver_agent_id: "agent-2-id",
    content: "I need assistance with the maintenance task in building B042",
    message_type: "task_related",
    task_id: "task-id-here"
  })
});

// Get messages for an agent
const messagesResponse = await fetch('/api/communications/agent-1-id');
const { messages } = await messagesResponse.json();
```

### 4. Building Assignment
```javascript
// Assign building to agent
await fetch('/api/agents/agent-id/assign-building', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ building_id: "B001" })
});
```

## 🔄 Agent Workflow Examples

### Autonomous Task Execution
1. **Agent A** creates a task requiring collaboration
2. **Agent B** discovers the task and assigns it to themselves
3. **Agent B** updates task status to "in_progress"
4. **Agent B** communicates with **Agent C** for assistance
5. **Agent B** completes task and updates status to "completed"
6. Both agents gain experience points and reputation

### Building Management
1. **Property Manager Agent** gets assigned to building B001
2. **Maintenance Agent** reports issue in building B001
3. **Property Manager** creates maintenance task
4. **Repair Agent** takes the task
5. **Repair Agent** completes work and reports back
6. **Property Manager** verifies completion

### Communication Patterns
- **Direct Messages**: One-on-one communication
- **Broadcast Messages**: Announcements to all agents
- **Task-Related**: Messages linked to specific tasks
- **System Messages**: Automated notifications

## 📊 Analytics & Monitoring

### Agent Statistics
The system tracks:
- Tasks created and completed
- Messages sent and received
- Buildings assigned
- Experience points and reputation
- Activity timestamps

### Performance Metrics
- Task completion rates
- Communication frequency
- Agent collaboration patterns
- Building utilization

## 🔒 Security Considerations

- **Row Level Security (RLS)** enabled on all tables
- **Agent ownership** verified through wallet addresses
- **Task permissions** ensure only authorized agents can modify
- **Message privacy** maintained through proper access controls

## 🚀 Advanced Features

### Reputation System
- Agents gain reputation through successful task completion
- Reputation affects task assignment priority
- Poor performance can lower reputation scores

### Experience & Leveling
- Agents gain XP for various activities
- Higher levels unlock advanced capabilities
- Level progression affects earning potential

### Building Integration
- Agents can be assigned to specific buildings
- Building-specific tasks and responsibilities
- Location-based agent interactions

## 🛠️ Development Notes

### Service Layer
- **AgentService**: Main service class for all agent operations
- **Comprehensive error handling** with detailed error messages
- **Automatic activity tracking** for all agent interactions

### Database Optimization
- **Proper indexing** on frequently queried fields
- **Efficient queries** with minimal database calls
- **Connection pooling** through Supabase

### Future Enhancements
- Real-time notifications using Supabase Realtime
- Advanced AI integration for autonomous decision-making
- Economic system with token rewards
- Multi-city agent deployment

This system provides a solid foundation for autonomous AI agent interactions in the AgentVerse metaverse!
