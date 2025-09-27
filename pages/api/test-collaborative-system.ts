import type { NextApiRequest, NextApiResponse } from 'next';
import { memoryStorageService } from '../services/memoryStorageService';
import { taskOrchestratorService } from '../services/taskOrchestratorService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create some test agents if none exist
    const activeAgents = memoryStorageService.getActiveAgents();
    
    if (activeAgents.length === 0) {
      // Create test agents
      const testAgents = [
        {
          id: 'test_agent_1',
          name: 'Research Agent',
          description: 'Specializes in gathering and analyzing information',
          capabilities: ['research', 'analysis', 'data_collection'],
          status: 'active' as const,
          assigned_building_ids: [],
          experience_points: 100,
          level: 5,
          reputation_score: 85,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'test_agent_2',
          name: 'Creative Agent',
          description: 'Focuses on creative tasks and content generation',
          capabilities: ['content_creation', 'design', 'writing'],
          status: 'active' as const,
          assigned_building_ids: [],
          experience_points: 120,
          level: 6,
          reputation_score: 90,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'test_agent_3',
          name: 'Coordinator Agent',
          description: 'Manages and coordinates team activities',
          capabilities: ['coordination', 'management', 'communication'],
          status: 'active' as const,
          assigned_building_ids: [],
          experience_points: 150,
          level: 7,
          reputation_score: 95,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      testAgents.forEach(agent => {
        memoryStorageService.setAgentMetadata(agent);
      });
    }

    // Get current system status
    const systemStatus = {
      activeAgents: memoryStorageService.getActiveAgents().length,
      pendingMasterTasks: memoryStorageService.getPendingMasterTasks().length,
      pendingSubtasks: memoryStorageService.getPendingSubtasks().length,
      memoryUsage: memoryStorageService.getMemoryUsage()
    };

    // Test ChatGPT orchestration (if API key is available)
    let orchestrationTest = null;
    if (process.env.OPENAI_API_KEY) {
      try {
        const testResult = await taskOrchestratorService.generateCollaborativeTask({
          availableAgents: memoryStorageService.getActiveAgents(),
          userId: 'test_user'
        });
        
        orchestrationTest = {
          success: testResult.success,
          error: testResult.error,
          hasTasks: testResult.tasks ? testResult.tasks.length > 0 : false
        };
      } catch (error) {
        orchestrationTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } else {
      orchestrationTest = {
        success: false,
        error: 'OpenAI API key not configured'
      };
    }

    res.status(200).json({
      success: true,
      message: 'Collaborative task system test completed',
      systemStatus,
      orchestrationTest,
      endpoints: {
        generateTask: 'POST /api/tasks/generate-collaborative',
        executeSubtask: 'POST /api/subtasks/[id]/execute',
        processMasterTask: 'POST /api/master-tasks/[id]/process',
        getPendingSubtasks: 'GET /api/subtasks/pending/[agentAddress]',
        getReadyMasterTasks: 'GET /api/master-tasks/ready/[agentAddress]',
        getStatus: 'GET /api/tasks/collaborative-status'
      },
      testAgents: memoryStorageService.getActiveAgents().map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        capabilities: agent.capabilities,
        status: agent.status
      }))
    });

  } catch (error) {
    console.error('Error testing collaborative system:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
