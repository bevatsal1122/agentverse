import { Agent } from "../types/database.types";

interface TaskAnalysisRequest {
  taskTitle: string;
  taskDescription: string;
  availableAgents: Agent[];
}

interface AgentRecommendation {
  recommendedAgentId: string;
  confidence: number;
  reasoning: string;
  alternativeAgents?: {
    agentId: string;
    confidence: number;
    reason: string;
  }[];
}

interface ChatGPTResponse {
  success: boolean;
  recommendation?: AgentRecommendation;
  error?: string;
}

class ChatGPTService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    
    if (!this.apiKey) {
      console.warn('OPENAI_API_KEY not found in environment variables. AI agent selection will be disabled.');
    }
  }

  async selectBestAgent(request: TaskAnalysisRequest): Promise<ChatGPTResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured'
      };
    }

    try {
      const prompt = this.buildPrompt(request);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1024,
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
      const recommendation = this.parseAIResponse(aiResponse, request.availableAgents);

      return {
        success: true,
        recommendation
      };

    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private buildPrompt(request: TaskAnalysisRequest): string {
    const agentSummaries = request.availableAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description || 'No description provided',
      capabilities: agent.capabilities || [],
      status: agent.status,
      reputation_score: agent.reputation_score,
      experience_points: agent.experience_points,
      level: agent.level,
      personality: agent.personality
    }));

    return `You are an AI task assignment specialist for AgentVerse. Your job is to analyze a task and recommend the best agent to handle it.

TASK TO ASSIGN:
- Title: ${request.taskTitle}
- Description: ${request.taskDescription}

AVAILABLE AGENTS:
${JSON.stringify(agentSummaries, null, 2)}

Please analyze the task requirements and agent capabilities to recommend the best agent. Consider:
1. Agent capabilities matching the task description
2. Agent experience level and reputation
3. Agent personality fit for the task
4. Agent current status (prefer 'active' agents)
5. Overall agent suitability for the described work

Respond ONLY with a JSON object in this exact format:
{
  "recommendedAgentId": "agent-uuid-here",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this agent is best suited",
  "alternativeAgents": [
    {
      "agentId": "alternative-agent-uuid",
      "confidence": 0.65,
      "reason": "Why this agent is a good alternative"
    }
  ]
}

Confidence should be between 0.0 and 1.0. Include up to 2 alternative agents if available.`;
  }

  private parseAIResponse(aiResponse: string, availableAgents: Agent[]): AgentRecommendation {
    try {
      // Clean the response to extract JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate that recommended agent exists
      const recommendedAgent = availableAgents.find(agent => agent.id === parsed.recommendedAgentId);
      if (!recommendedAgent) {
        throw new Error('Recommended agent not found in available agents');
      }

      // Validate alternatives exist
      if (parsed.alternativeAgents) {
        parsed.alternativeAgents = parsed.alternativeAgents.filter((alt: any) => 
          availableAgents.find(agent => agent.id === alt.agentId)
        );
      }

      return {
        recommendedAgentId: parsed.recommendedAgentId,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'AI recommendation without detailed reasoning',
        alternativeAgents: parsed.alternativeAgents || []
      };

    } catch (error) {
      console.error('Error parsing AI response:', error);
      
      // Fallback: return first available agent
      const fallbackAgent = availableAgents.find(agent => agent.status === 'active') || availableAgents[0];
      
      return {
        recommendedAgentId: fallbackAgent.id,
        confidence: 0.3,
        reasoning: 'Fallback selection due to AI parsing error',
        alternativeAgents: []
      };
    }
  }

  // Helper method to get agent analysis without task assignment
  async analyzeAgentCapabilities(agents: Agent[]): Promise<{ success: boolean; analysis?: any; error?: string }> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured'
      };
    }

    try {
      const prompt = `Analyze these AgentVerse agents and provide a capability summary:

${JSON.stringify(agents.map(agent => ({
  id: agent.id,
  name: agent.name,
  description: agent.description,
  capabilities: agent.capabilities,
  level: agent.level,
  reputation_score: agent.reputation_score
})), null, 2)}

Provide a JSON response with agent strengths and recommended use cases for each agent.`;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.4,
          max_tokens: 1024,
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = data.choices[0].message.content;

      return {
        success: true,
        analysis
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const chatGPTService = new ChatGPTService();
export type { TaskAnalysisRequest, AgentRecommendation, ChatGPTResponse };
