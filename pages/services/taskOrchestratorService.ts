import { Agent } from "../types/database.types";
import { agentService } from "./agentService";

interface AgenticTask {
  id: number;
  task_id: number;
  prompt: string;
  media_b64: string | null;
  agent_address: string;
  created_at: string;
}

interface MasterTaskResponse {
  id: number;
  user_id: number;
  agent_address: string;
  prompt: string;
  media_b64: string | null;
  created_at: string;
  agentic_tasks: AgenticTask[];
}

interface TaskOrchestrationRequest {
  availableAgents: Agent[];
  userId: string;
}

interface UserAssignedTaskRequest {
  userTaskDescription: string;
  targetAgent: Agent;
  availableAgents: Agent[];
  userId: string;
}

interface TaskOrchestrationResponse {
  success: boolean;
  tasks?: MasterTaskResponse[];
  error?: string;
  details?: string;
}

class TaskOrchestratorService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    
    if (!this.apiKey) {
      console.warn('OPENAI_API_KEY not found in environment variables. Task orchestration will be disabled.');
    }
  }

  async generateCollaborativeTask(request: TaskOrchestrationRequest): Promise<TaskOrchestrationResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured'
      };
    }

    try {
      // Fetch full agent data from database for each agent
      const enrichedAgents = await Promise.all(
        request.availableAgents.map(async (agent) => {
          try {
            const fullAgentResult = await agentService.getAgentById(agent.id);
            if (fullAgentResult.success && fullAgentResult.data) {
              return fullAgentResult.data;
            } else {
              console.warn(`Failed to fetch full data for agent ${agent.id}, using provided data`);
              return agent;
            }
          } catch (error) {
            console.warn(`Error fetching agent ${agent.id}:`, error);
            return agent;
          }
        })
      );

      // Update the request with enriched agent data
      const enrichedRequest = {
        ...request,
        availableAgents: enrichedAgents
      };

      const prompt = this.buildOrchestrationPrompt(enrichedRequest);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2048,
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI API');
      }

      const aiResponse = data.choices[0].message.content;
      const tasks = this.parseTaskResponse(aiResponse, enrichedRequest.userId);

      // Validate agent addresses with enriched agent data
      const validation = this.validateAgentAddresses(tasks, enrichedAgents);
      if (!validation.valid) {
        return {
          success: false,
          error: 'Invalid agent addresses in generated tasks',
          details: validation.errors.join('; ')
        };
      }

      return {
        success: true,
        tasks: tasks.slice(0, 1) // Only return the first task
      };

    } catch (error) {
      console.error('Error calling OpenAI API for task orchestration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async generateUserAssignedTask(request: UserAssignedTaskRequest): Promise<TaskOrchestrationResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured'
      };
    }

    try {
      // Fetch full agent data from database for each agent
      const enrichedAgents = await Promise.all(
        request.availableAgents.map(async (agent) => {
          try {
            const fullAgentResult = await agentService.getAgentById(agent.id);
            if (fullAgentResult.success && fullAgentResult.data) {
              return fullAgentResult.data;
            } else {
              console.warn(`Failed to fetch full data for agent ${agent.id}, using provided data`);
              return agent;
            }
          } catch (error) {
            console.warn(`Error fetching agent ${agent.id}:`, error);
            return agent;
          }
        })
      );

      // Update the request with enriched agent data
      const enrichedRequest = {
        ...request,
        availableAgents: enrichedAgents
      };

      const prompt = this.buildUserAssignedTaskPrompt(enrichedRequest);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: this.getUserAssignedTaskSystemPrompt()
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2048,
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI API');
      }

      const aiResponse = data.choices[0].message.content;
      const tasks = this.parseTaskResponse(aiResponse, enrichedRequest.userId);

      // Validate agent addresses with enriched agent data
      const validation = this.validateAgentAddresses(tasks, enrichedAgents);
      if (!validation.valid) {
        return {
          success: false,
          error: 'Invalid agent addresses in generated tasks',
          details: validation.errors.join('; ')
        };
      }

      return {
        success: true,
        tasks: tasks.slice(0, 1) // Only return the first task
      };

    } catch (error) {
      console.error('Error calling OpenAI API for user-assigned task orchestration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private getSystemPrompt(): string {
    return `You are the task orchestrator for an AI agent metaverse.  
Your role is to design meaningful, collaborative tasks that a set of available agents (each with unique capabilities, personalities, and descriptions) can complete together end-to-end.  

CRITICAL OBJECTIVES:  
1. Use ONLY the provided agent IDs (NOT agent names), capabilities, and descriptions.  
2. Generate exactly one collaborative task where:  
   - One agent is designated as the parent (master) agent.  
   - One or more agents are designated as children with subtasks.  
3. Ensure the master task logically requires the child subtasks for successful completion.  
4. Write all prompts in first-person language (e.g., "I will...", "I need to...").  
5. Tasks must be realistically achievable by the given agents' capabilities and personalities.  

STRUCTURE & RULES:  
- Select the parent (master) agent based on leadership, orchestration, or coordination abilities.  
- Assign child agents subtasks that align directly with their skills and personalities.  
- Ensure every child task contributes to the master task's completion.  
- Make tasks engaging, cooperative, and non-trivial.  
- Always return output in the exact JSON schema below with **no extra text**:  

[
    {
        "id": <unique_task_id>,
        "user_id": <user_id>,
        "agent_address": "<parent_agent_id>",
        "prompt": "<master agent instruction in first-person view>",
        "media_b64": "<optional media base64 string or null>",
        "created_at": "<YYYY-MM-DD HH:MM:SS>",
        "agentic_tasks": [
            {
                "id": <unique_subtask_id>,
                "task_id": <unique_task_id>,
                "prompt": "<child agent instruction in first-person view>",
                "media_b64": "<optional media base64 string or null>",
                "agent_address": "<child_agent_id>",
                "created_at": "<YYYY-MM-DD HH:MM:SS>"
            }
        ]
    }
]

CONSTRAINTS:  
- No text outside of the JSON.  
- Use ONLY valid agent IDs from the provided list (NOT agent names like "CaptainAI" or "Vatvat15").  
- All timestamps must follow "YYYY-MM-DD HH:MM:SS" format.  
- Each task must be logically necessary for completion of the master task.  
- The JSON must be valid and parseable without modification.  
- IMPORTANT: agent_address must be the exact agent ID (UUID format), not the agent name.  
`;
  }

  private getUserAssignedTaskSystemPrompt(): string {
    return `You are the task orchestrator for an AI agent metaverse.  
Your role is to design meaningful, collaborative tasks based on a user's specific request and assign them to a target agent along with other available agents.

CRITICAL OBJECTIVES:  
1. Use ONLY the provided agent IDs (NOT agent names), capabilities, and descriptions.  
2. Generate exactly one collaborative task where:  
   - The target agent (specified by the user) is designated as the parent (master) agent.  
   - One or more agents (including the target agent and others) are designated as children with subtasks.  
3. Ensure the master task is based on the user's specific request and logically requires the child subtasks for successful completion.  
4. Write all prompts in first-person language (e.g., "I will...", "I need to...").  
5. Tasks must be realistically achievable by the given agents' capabilities and personalities.  
6. The target agent should be the master agent coordinating the user's request.

STRUCTURE & RULES:  
- The target agent (specified by user) becomes the parent (master) agent.  
- Assign child agents subtasks that align directly with their skills and personalities.  
- Ensure every child task contributes to the master task's completion.  
- Make tasks engaging, cooperative, and directly related to the user's request.  
- Always return output in the exact JSON schema below with **no extra text**:  

[
    {
        "id": <unique_task_id>,
        "user_id": <user_id>,
        "agent_address": "<target_agent_id>",
        "prompt": "<master agent instruction based on user request in first-person view>",
        "media_b64": "<optional media base64 string or null>",
        "created_at": "<YYYY-MM-DD HH:MM:SS>",
        "agentic_tasks": [
            {
                "id": <unique_subtask_id>,
                "task_id": <unique_task_id>,
                "prompt": "<child agent instruction in first-person view>",
                "media_b64": "<optional media base64 string or null>",
                "agent_address": "<child_agent_id>",
                "created_at": "<YYYY-MM-DD HH:MM:SS>"
            }
        ]
    }
]

CONSTRAINTS:  
- No text outside of the JSON.  
- Use ONLY valid agent IDs from the provided list (NOT agent names like "CaptainAI" or "Vatvat15").  
- All timestamps must follow "YYYY-MM-DD HH:MM:SS" format.  
- Each task must be logically necessary for completion of the master task.  
- The JSON must be valid and parseable without modification.  
- IMPORTANT: agent_address must be the exact agent ID (UUID format), not the agent name.  
- The target agent must be the master agent (agent_address in the main task object).
`;
  }

  private buildOrchestrationPrompt(request: TaskOrchestrationRequest): string {
    const agentSummaries = request.availableAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description || 'No description provided',
      capabilities: agent.capabilities || [],
      personality: agent.personality || 'friendly',
      level: agent.level || 1,
      experience_points: agent.experience_points || 0,
      reputation_score: agent.reputation_score || 100,
      owner_address: agent.owner_address,
      wallet_address: agent.wallet_address,
      created_at: agent.created_at
    }));

    return `Generate a collaborative task for these specific agents. 

CRITICAL: Use ONLY the agent IDs (not names) from the list below. The agent_address field must contain the exact agent ID (UUID format).

AVAILABLE AGENTS:
${JSON.stringify(agentSummaries, null, 2)}

USER ID: ${request.userId}

TASK REQUIREMENTS:
1. Create a task that these specific agents can complete end-to-end based on their capabilities
2. Choose a master agent who can coordinate the work (preferably one with leadership capabilities)
3. Assign subtasks to other agents that match their specific skills and personality
4. Ensure the task is realistic and achievable for these agents
5. Make sure all subtasks are necessary for the master task completion
6. Use the exact agent ID (UUID) in the agent_address field, NOT the agent name

EXAMPLES BASED ON AGENT TYPES:
- If you have an engineer: tasks involving maintenance, building, fixing, or technical work
- If you have a scientist: tasks involving research, analysis, experimentation, or discovery
- If you have a captain/leader: tasks involving coordination, planning, or strategic decisions
- If you have multiple types: create interdisciplinary tasks that require different expertise

REMEMBER: agent_address must be the UUID (like "6cbfaab7-b36c-4728-83c6-16dc24637c86"), NOT the name (like "CaptainAI").

Create a task that leverages the unique strengths of these specific agents and ensures they can work together effectively to complete it.`;
  }

  private buildUserAssignedTaskPrompt(request: UserAssignedTaskRequest): string {
    const agentSummaries = request.availableAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description || 'No description provided',
      capabilities: agent.capabilities || [],
      personality: agent.personality || 'friendly',
      level: agent.level || 1,
      experience_points: agent.experience_points || 0,
      reputation_score: agent.reputation_score || 100,
      owner_address: agent.owner_address,
      wallet_address: agent.wallet_address,
      created_at: agent.created_at
    }));

    return `Generate a collaborative task based on the user's specific request and assign it to the target agent.

CRITICAL: Use ONLY the agent IDs (not names) from the list below. The agent_address field must contain the exact agent ID (UUID format).

USER'S TASK REQUEST: "${request.userTaskDescription}"

TARGET AGENT (must be the master agent):
- ID: ${request.targetAgent.id}
- Name: ${request.targetAgent.name}
- Description: ${request.targetAgent.description || 'No description provided'}
- Capabilities: ${JSON.stringify(request.targetAgent.capabilities || [])}
- Personality: ${JSON.stringify(request.targetAgent.personality || 'friendly')}

AVAILABLE AGENTS:
${JSON.stringify(agentSummaries, null, 2)}

USER ID: ${request.userId}

TASK REQUIREMENTS:
1. Create a task based on the user's specific request: "${request.userTaskDescription}"
2. The target agent (${request.targetAgent.id}) must be the master agent coordinating this task
3. Assign subtasks to other agents that match their specific skills and personality
4. Ensure the task directly addresses the user's request and is realistic and achievable
5. Make sure all subtasks are necessary for the master task completion
6. Use the exact agent ID (UUID) in the agent_address field, NOT the agent name
7. The master task should be based on the user's request and assigned to the target agent

EXAMPLES BASED ON USER REQUESTS:
- If user asks for "research on DeFi protocols": create a research task with the target agent coordinating and others gathering data, analyzing, etc.
- If user asks for "build a trading strategy": create a development task with the target agent leading and others providing market analysis, risk assessment, etc.
- If user asks for "create content": create a content creation task with the target agent managing and others researching, writing, editing, etc.

REMEMBER: 
- agent_address must be the UUID (like "6cbfaab7-b36c-4728-83c6-16dc24637c86"), NOT the name (like "CaptainAI")
- The target agent (${request.targetAgent.id}) must be the master agent (agent_address in the main task object)
- The task must directly address the user's request: "${request.userTaskDescription}"

Create a task that directly fulfills the user's request and leverages the unique strengths of these specific agents, with the target agent coordinating the effort.`;
  }

  private parseTaskResponse(aiResponse: string, userId: string): MasterTaskResponse[] {
    try {
      // Clean the response to extract JSON
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON array found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Response is not a valid array or is empty');
      }

      // Validate and clean the response
      const validatedTasks = parsed.map((task: any, index: number) => {
        if (!task.id || !task.agent_address || !task.prompt) {
          throw new Error(`Task ${index} is missing required fields`);
        }

        return {
          id: parseInt(task.id) || (index + 1),
          user_id: parseInt(userId) || 1,
          agent_address: task.agent_address,
          prompt: task.prompt,
          media_b64: task.media_b64 || null,
          created_at: task.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19),
          agentic_tasks: (task.agentic_tasks || []).map((subtask: any, subIndex: number) => ({
            id: parseInt(subtask.id) || (subIndex + 1),
            task_id: parseInt(task.id) || (index + 1),
            prompt: subtask.prompt || '',
            media_b64: subtask.media_b64 || null,
            agent_address: subtask.agent_address || '',
            created_at: subtask.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19)
          }))
        };
      });

      return validatedTasks;

    } catch (error) {
      console.error('Error parsing AI response:', error);
      
      // Fallback: create a simple collaborative task
      const fallbackTask: MasterTaskResponse = {
        id: 1,
        user_id: parseInt(userId) || 1,
        agent_address: 'fallback_agent',
        prompt: 'I need to coordinate a team project. Please help me organize and execute this collaborative task.',
        media_b64: null,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        agentic_tasks: [
          {
            id: 1,
            task_id: 1,
            prompt: 'I will research and gather information for the project.',
            media_b64: null,
            agent_address: 'research_agent',
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
          },
          {
            id: 2,
            task_id: 1,
            prompt: 'I will organize and structure the gathered information.',
            media_b64: null,
            agent_address: 'organizer_agent',
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
          }
        ]
      };

      return [fallbackTask];
    }
  }

  // Helper method to validate agent addresses in the generated tasks
  validateAgentAddresses(tasks: MasterTaskResponse[], availableAgents: Agent[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const agentIds = availableAgents.map(agent => agent.id);
    const agentNames = availableAgents.map(agent => agent.name);

    tasks.forEach((task, taskIndex) => {
      if (!agentIds.includes(task.agent_address)) {
        errors.push(`Task ${taskIndex}: Master agent address '${task.agent_address}' not found in available agents. Available agents: ${agentIds.join(', ')}`);
      }

      task.agentic_tasks.forEach((subtask, subtaskIndex) => {
        if (!agentIds.includes(subtask.agent_address)) {
          errors.push(`Task ${taskIndex}, Subtask ${subtaskIndex}: Agent address '${subtask.agent_address}' not found in available agents. Available agents: ${agentIds.join(', ')}`);
        }
      });
    });

    // Additional validation: ensure tasks use agents appropriately based on their capabilities
    tasks.forEach((task, taskIndex) => {
      const masterAgent = availableAgents.find(agent => agent.id === task.agent_address);
      if (masterAgent) {
        // Check if master task makes sense for this agent's capabilities
        const hasLeadershipCapability = masterAgent.capabilities?.some(cap => 
          cap.toLowerCase().includes('leadership') || 
          cap.toLowerCase().includes('coordination') ||
          cap.toLowerCase().includes('management')
        );
        
        if (!hasLeadershipCapability && masterAgent.name?.toLowerCase().includes('captain')) {
          // Captain agents should have leadership tasks
          console.log(`Warning: Task ${taskIndex} assigned to ${masterAgent.name} but they don't have explicit leadership capabilities`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const taskOrchestratorService = new TaskOrchestratorService();
export type { MasterTaskResponse, AgenticTask, TaskOrchestrationRequest, UserAssignedTaskRequest, TaskOrchestrationResponse };
