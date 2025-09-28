# Webhook-Based Chat System

This document explains how the webhook-based chat system works for human-agent conversations.

## Overview

The chat system allows users to send messages to agents and receive responses via webhook calls. When a user sends a message, the system:

1. Creates a unique task ID
2. Sends the message as a task to the agent
3. Waits for the backend to call the webhook endpoint with the response
4. Displays agent responses when they arrive via webhook

## Key Components

### 1. Chat Page (`/pages/chat.tsx`)
- Generates unique task IDs for each chat session
- Displays loading indicators while waiting for responses
- Provides manual refresh button to check for new responses
- Automatically scrolls to show new messages

### 2. Webhook Response Endpoint (`/api/communications/webhook-response.ts`)
- Receives agent responses via webhook calls from backend
- Stores responses in the database with task ID tracking
- Used by backend systems to send agent replies

### 3. Get Responses Endpoint (`/api/communications/get-responses.ts`)
- Allows the chat page to fetch responses for a specific task
- Returns responses for the specified task ID
- Used by the refresh button to check for new messages

### 4. Task Assignment (`/api/tasks/assign-user-task.ts`)
- Updated to include task ID in task assignments
- Links user requests with agent responses through task tracking

## How It Works

### User Sends Message
1. User types a message in the chat interface
2. System generates a unique task ID (if not already exists)
3. Message is sent as a task to the target agent
4. Loading indicator shows "Waiting for agent response..."

### Backend Processes and Responds
1. Backend processes the task and generates a response
2. Backend calls `/api/communications/webhook-response` with:
   - `taskId`: Links response to the original task
   - `response`: The actual response message

### Response Display
1. Frontend automatically polls `/api/communications/get-responses` every 1 second
2. When backend calls webhook endpoint, response is stored in database
3. Next poll cycle detects new response and displays it immediately
4. Polling stops when response is received

## API Endpoints

### POST `/api/communications/webhook-response`
Webhook endpoint for backend to send agent responses.

**Request Body:**
```json
{
  "taskId": "task_1234567890_abc123",
  "response": "Agent response message"
}
```

### GET `/api/communications/get-responses`
Get responses for a specific task.

**Query Parameters:**
- `taskId`: The task ID to fetch responses for

**Response:**
```json
{
  "success": true,
  "responses": [...],
  "taskId": "task_1234567890_abc123"
}
```

### POST `/api/communications/test-response`
Test endpoint to simulate agent responses.

**Request Body:**
```json
{
  "taskId": "task_1234567890_abc123",
  "testMessage": "Optional custom test message"
}
```

## Database Schema

The system uses the `communications` table with these key fields:
- `task_id`: Links responses to specific tasks
- `response`: The agent response content
- `created_at`: Timestamp for ordering

## Testing

To test the webhook-based chat system:

1. Open a chat with an agent
2. Send a message (this will create a task)
3. Use the webhook endpoint to simulate a backend response:
   ```bash
   curl -X POST http://localhost:3000/api/communications/webhook-response \
     -H "Content-Type: application/json" \
     -d '{
       "taskId": "your-task-id",
       "response": "This is a test response from the backend!"
     }'
   ```
4. The response should appear automatically within 1 second (polling will detect it)

## Features

- **No History**: Each chat session starts fresh (no persistent message history)
- **Webhook-Based**: Backend calls webhook endpoint to send responses
- **Automatic Polling**: Frontend polls every 1 second when waiting for responses
- **Loading States**: Clear indication when waiting for responses
- **Error Handling**: Graceful handling of network issues and API errors
- **Task Tracking**: Each chat session has a unique task ID for proper response routing
