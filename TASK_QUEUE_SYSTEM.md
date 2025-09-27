# Task Queue System

The Task Queue System allows agents in the game to submit tasks for specific AI agents, stores them in-memory, and processes them one by one when requested.

## System Overview

The system consists of:
1. **In-memory task queue service** (`taskQueueService.ts`)
2. **API endpoints** for queue management
3. **Integration** with existing agent and task systems
4. **Auto-building assignment** for new agents
5. **AI-powered agent selection** using Gemini API

## Core Components

### TaskQueueService

The main service that manages in-memory task queues for each agent.

**Key Features:**
- Simple FIFO task queuing (first in, first out)
- Per-agent task queues
- Processing status tracking
- Task lifecycle management (queued → processing → completed/failed)
- AI-powered agent selection and recommendations
- Task-to-agent matching intelligence

### API Endpoints

#### 1. Submit Task to Queue
**POST** `/api/queue/submit-task`

Submit a task to a specific agent's queue, with optional AI-powered agent selection.

**Manual Agent Selection:**
```json
{
  "targetAgentId": "uuid",
  "requestingAgentId": "uuid",
  "taskData": {
    "title": "Collect Resources",
    "description": "Gather wood from the forest area and bring it back to the base"
  }
}
```

**AI-Powered Agent Selection:**
```json
{
  "requestingAgentId": "uuid",
  "useAiSelection": true,
  "taskData": {
    "title": "Analyze market trends for crypto tokens",
    "description": "Need comprehensive analysis of current market conditions and predictions for next quarter. Should include technical analysis, sentiment analysis, and risk assessment."
  }
}
```

**Response:**
```json
{
  "success": true,
  "queuedTaskId": "task_1234567890_abc123",
  "targetAgentId": "selected-agent-uuid",
  "targetAgentName": "Agent Alpha",
  "aiRecommendation": {
    "recommendedAgentId": "selected-agent-uuid",
    "confidence": 0.92,
    "reasoning": "Agent Alpha has extensive experience in data analysis and market research, with high reputation score and relevant capabilities for this type of analytical work",
    "alternativeAgents": [
      {
        "agentId": "alternative-uuid",
        "confidence": 0.78,
        "reason": "Good analytical skills but less specialized experience"
      }
    ],
    "wasAiSelected": true
  },
  "message": "Task queued for agent Agent Alpha",
  "queueStatus": {
    "queueLength": 3,
    "processing": false,
    "tasks": [...]
  }
}
```

#### 2. Process Next Task
**POST** `/api/queue/process-next`

Process the next task in an agent's queue.

```json
{
  "agentId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "processedTask": {
    "queuedTaskId": "task_1234567890_abc123",
    "databaseTaskId": "uuid",
    "task": { /* Task object from database */ },
    "requestingAgent": "uuid"
  },
  "queueStatus": { /* Updated queue status */ }
}
```

**Special Responses:**
- `204`: No tasks in queue
- `409`: Agent is already processing a task

#### 3. Get Queue Status
**GET** `/api/queue/status?agentId=uuid`
**GET** `/api/queue/status?all=true`

Get queue status for a specific agent or all agents.

**Response (single agent):**
```json
{
  "success": true,
  "agentId": "uuid",
  "agentName": "Agent Name",
  "queueStatus": {
    "queueLength": 2,
    "processing": false,
    "tasks": [
      {
        "id": "task_1234567890_abc123",
        "targetAgentId": "uuid",
        "requestingAgentId": "uuid",
        "timestamp": 1234567890000,
        "status": "queued"
      }
    ]
  }
}
```

#### 4. Clear Queue
**DELETE** `/api/queue/clear`

Clear all tasks from an agent's queue.

```json
{
  "agentId": "uuid"
}
```

#### 5. AI Agent Analysis
**POST** `/api/ai/analyze-agents`

Get AI recommendations for which agent should handle a specific task.

```json
{
  "taskData": {
    "title": "Build a trading bot",
    "description": "Create an automated trading system for cryptocurrency markets with real-time data analysis, risk management, and portfolio optimization features"
  },
  "excludeAgentId": "requesting-agent-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "recommendation": {
      "recommendedAgentId": "best-agent-uuid",
      "confidence": 0.95,
      "reasoning": "Agent Beta has strong programming capabilities and experience with automated systems development",
      "alternativeAgents": [...]
    },
    "recommendedAgent": {
      "id": "best-agent-uuid",
      "name": "Agent Beta",
      "capabilities": ["programming", "automation", "system_design"],
      "level": 8,
      "reputation_score": 950
    },
    "alternativeAgents": [...],
    "totalAgentsAnalyzed": 12,
    "analysisTimestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### 6. Agent Capabilities Overview
**GET** `/api/ai/agent-capabilities`

Get AI analysis of all agent capabilities and recommended use cases.

**Response:**
```json
{
  "success": true,
  "agentCount": 15,
  "analysis": "AI-generated analysis of agent strengths and recommended use cases",
  "agents": [
    {
      "id": "agent-uuid",
      "name": "Agent Alpha",
      "capabilities": ["data_analysis", "research", "communication"],
      "level": 6,
      "reputation_score": 850
    }
  ],
  "analysisTimestamp": "2024-01-15T10:30:00Z"
}
```

## Auto-Building Assignment

### New Agent Registration

When a new agent is registered, the system automatically:
1. **Finds available buildings** from the game map
2. **Prefers living quarters** for new agents (but assigns any available building if needed)
3. **Updates agent's database record** with building assignment
4. **Logs the assignment** for tracking

```javascript
// When registering a new agent
const response = await fetch('/api/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Agent Alpha',
    description: 'A helpful AI assistant',
    owner_address: '0x123...',
    capabilities: ['communication', 'task_management']
  })
});

const result = await response.json();
console.log('Agent registered with building:', result.agent.assigned_building_id);
```

### Building Information API

**GET** `/api/agents/[id]/building-info`

Get detailed building information for an agent.

**Response:**
```json
{
  "success": true,
  "buildingInfo": {
    "currentBuildingId": "B001",
    "assignedBuildingIds": ["B001"],
    "buildingDetails": [
      {
        "id": "B001",
        "type": "living_quarters",
        "x": 2,
        "y": 3,
        "zone": "Historic District",
        "assignedAgent": "agent-uuid"
      }
    ]
  }
}
```

## AI-Powered Agent Selection

### Gemini Integration

The system uses Google's Gemini API to intelligently match tasks with the most suitable agents based on:

- **Agent capabilities** and skill sets
- **Experience level** and reputation scores
- **Task requirements** and complexity
- **Agent personality** fit for the task type
- **Current agent status** and availability

### AI Selection Process

1. **Task Analysis**: AI analyzes the task requirements, type, and complexity
2. **Agent Evaluation**: Reviews all available agents' capabilities, experience, and status
3. **Matching Algorithm**: Uses advanced reasoning to find the best agent-task matches
4. **Confidence Scoring**: Provides confidence levels (0.0-1.0) for recommendations
5. **Alternative Suggestions**: Offers backup agent options with reasoning

### Configuration

Set your Gemini API key in environment variables:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

## Usage Examples

### 1. Manual Agent Assignment

```javascript
// Agent A wants to assign a task to specific Agent B
const response = await fetch('/api/queue/submit-task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetAgentId: 'agent-b-uuid',
    requestingAgentId: 'agent-a-uuid',
    taskData: {
      title: 'Collect Resources',
      description: 'Gather wood from the forest area and bring it back to the base storage'
    }
  })
});

const result = await response.json();
console.log('Task queued:', result.queuedTaskId);
console.log('AI recommendation:', result.aiRecommendation);
```

### 2. AI-Powered Agent Selection

```javascript
// Let AI choose the best agent for the task
const response = await fetch('/api/queue/submit-task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requestingAgentId: 'agent-a-uuid',
    useAiSelection: true,
    taskData: {
      title: 'Develop Smart Contract',
      description: 'Create a DeFi lending protocol with automated interest calculations, collateral management, and liquidation mechanisms. Should be secure, gas-optimized, and well-tested.'
    }
  })
});

const result = await response.json();
console.log('AI selected agent:', result.targetAgentName);
console.log('Confidence:', result.aiRecommendation.confidence);
console.log('Reasoning:', result.aiRecommendation.reasoning);
```

### 3. Get AI Analysis Before Task Assignment

```javascript
// Analyze which agent would be best before actually assigning
const analysisResponse = await fetch('/api/ai/analyze-agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskData: {
      title: 'Market Research Analysis',
      description: 'Analyze current crypto market trends, identify emerging patterns, and provide detailed investment recommendations with risk assessments'
    },
    excludeAgentId: 'requesting-agent-uuid'
  })
});

const analysis = await analysisResponse.json();
console.log('Best agent:', analysis.analysis.recommendedAgent.name);
console.log('Alternatives:', analysis.analysis.alternativeAgents);

// Then submit the task with the recommended agent
if (analysis.success) {
  const taskResponse = await fetch('/api/queue/submit-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetAgentId: analysis.analysis.recommendation.recommendedAgentId,
      requestingAgentId: 'agent-a-uuid',
      taskData: { /* same task data */ }
    })
  });
}
```

### 4. Agent Processing Next Task

```javascript
// Agent B processes their next task
const response = await fetch('/api/queue/process-next', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'agent-b-uuid'
  })
});

if (response.status === 204) {
  console.log('No tasks to process');
} else if (response.status === 200) {
  const result = await response.json();
  console.log('Processing task:', result.processedTask.task);
  console.log('Agent building:', result.processedTask.agentBuilding);
  
  // Check if this task was AI-selected
  if (result.processedTask.task.aiRecommendation?.wasAiSelected) {
    console.log('This task was AI-assigned with confidence:', 
                result.processedTask.task.aiRecommendation.confidence);
  }
}
```

### 5. Checking Queue Status

```javascript
// Check Agent B's queue status
const response = await fetch('/api/queue/status?agentId=agent-b-uuid');
const result = await response.json();

console.log(`Queue length: ${result.queueStatus.queueLength}`);
console.log(`Currently processing: ${result.queueStatus.processing}`);

// Get agent's building information
const buildingResponse = await fetch(`/api/agents/${agentId}/building-info`);
const buildingResult = await buildingResponse.json();
console.log('Agent building:', buildingResult.buildingInfo);
```

## Integration with AgentService

The `AgentService` now includes helper methods for queue operations:

```javascript
import { agentService } from './services/agentService';

// Submit task to queue
const result = await agentService.submitTaskToQueue(
  'target-agent-id',
  'requesting-agent-id',
  taskData
);

// Get queue status
const status = agentService.getAgentQueueStatus('agent-id');

// Get all queue statuses
const allStatuses = agentService.getAllQueueStatuses();

// Get agent building information
const buildingInfo = await agentService.getAgentBuildingInfo('agent-id');

// Submit task with AI selection
const aiTaskResult = await agentService.submitTaskWithAiSelection('requesting-agent-id', {
  title: 'Complex Data Analysis',
  description: 'Analyze large dataset, identify patterns, correlations, and generate actionable insights with visualizations'
});
```

## Task Lifecycle

1. **Agent Registration**: New agents are automatically assigned buildings (preferably living quarters)
2. **Submission**: Agent submits task to target agent's queue
3. **Queuing**: Task is added to priority-ordered queue
4. **Processing**: Target agent requests next task from their assigned building location
   - System creates database task and assigns it
   - Agent's building context is included in processing logs
5. **Completion**: Task is marked as completed and removed from queue
6. **Failure**: If processing fails, task is marked as failed and removed

### Building Context in Tasks

Agents now have a "home base" building where they:
- **Receive and process tasks** from their queue
- **Stay when not actively working** on assigned tasks
- **Have a permanent location** for other agents to find them

## Queue System

Tasks are processed in simple **FIFO (First In, First Out)** order:
- Tasks are added to the end of each agent's queue
- The oldest task is always processed first
- No priority system - keeps it simple and fair

## Error Handling

The system handles various error conditions:
- Non-existent agents
- Failed task creation
- Failed task assignment
- Processing conflicts (agent already busy)
- Queue management errors

All errors are logged and appropriate HTTP status codes are returned.

## Monitoring and Logging

All queue operations are logged through the existing `AgentAction` system:
- Task submissions
- Task processing
- Queue clearing
- Processing failures

Use the existing agent action endpoints to monitor queue activity.
