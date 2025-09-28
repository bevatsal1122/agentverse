import type { NextApiRequest, NextApiResponse } from 'next';
import { taskOrchestratorService } from '../../services/taskOrchestratorService';
import { memoryStorageService } from '../../services/memoryStorageService';
import { agentService } from '../../services/agentService';
import { taskQueueService } from '../../services/taskQueueService';
import { gameState, CrewmateType, CrewmateActivity } from '../../../src/game/state';
import { getBuildingById } from '../../../src/maps/defaultMap';
import { Pathfinder } from '../../../src/game/pathfinding';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, taskDescription, targetAgentId } = req.body;
    
    console.log('🔍 User-assigned task request:', { userId, taskDescription, targetAgentId });

    if (!userId || !taskDescription || !targetAgentId) {
      return res.status(400).json({ 
        error: 'User ID, task description, and target agent ID are required' 
      });
    }

    // Get all agents from database and memory storage
    const agentResult = await agentService.getAgents();
    if (!agentResult.success || !agentResult.data) {
      return res.status(500).json({ 
        error: 'Failed to fetch agents from database',
        details: agentResult.error
      });
    }

    const availableAgents = agentResult.data.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description || 'AI Agent',
      personality: agent.personality || {
        traits: ['friendly'],
        communication_style: 'helpful',
        goals: ['complete tasks'],
        preferences: {}
      },
      capabilities: agent.capabilities || [],
      status: agent.status,
      current_building_id: agent.current_building_id,
      assigned_building_ids: agent.assigned_building_ids,
      avatar_url: agent.avatar_url,
      experience_points: agent.experience_points,
      level: agent.level,
      total_capital: agent.total_capital,
      reputation_score: agent.reputation_score,
      last_active: agent.last_active,
      updated_at: agent.updated_at,
      owner_address: agent.owner_address,
      created_at: agent.created_at,
    }));

    // Find the target agent
    const targetAgent = availableAgents.find(agent => agent.id === targetAgentId);
    if (!targetAgent) {
      return res.status(400).json({ 
        error: 'Target agent not found' 
      });
    }

    // Check if there are any pending master tasks
    const pendingMasterTasks = memoryStorageService.getPendingMasterTasks();
    if (pendingMasterTasks.length > 0) {
      return res.status(409).json({ 
        error: 'There are already pending master tasks. Please complete them first.',
        pendingTasks: pendingMasterTasks.length
      });
    }

    // Generate task using ChatGPT with user's task description and target agent
    console.log('🔍 Generating user-assigned task with:', {
      userTaskDescription: taskDescription,
      targetAgent: targetAgent.id,
      availableAgentsCount: availableAgents.length,
      userId: userId.toString()
    });
    
    const orchestrationResult = await taskOrchestratorService.generateUserAssignedTask({
      userTaskDescription: taskDescription,
      targetAgent: targetAgent,
      availableAgents: availableAgents,
      userId: userId.toString()
    });
    
    console.log('🔍 Task orchestration result:', orchestrationResult);

    if (!orchestrationResult.success || !orchestrationResult.tasks) {
      return res.status(500).json({ 
        error: 'Failed to generate user-assigned task',
        details: orchestrationResult.error
      });
    }

    const generatedTasks = orchestrationResult.tasks;
    
    // Store tasks in memory and database - only process the first task
    const storedTasks = [];
    
    // Only process the first task to avoid multiple variants
    const task = generatedTasks[0];
    if (task) {
      // Store master task in memory
      const masterTask = memoryStorageService.addMasterTask({
        user_id: task.user_id.toString(),
        agent_address: task.agent_address,
        prompt: task.prompt,
        media_b64: task.media_b64 || undefined,
        status: 'pending'
      });

      // Store subtasks in memory
      const storedSubtasks = [];
      for (const subtask of task.agentic_tasks) {
        const storedSubtask = memoryStorageService.addSubtask({
          task_id: masterTask.id,
          prompt: subtask.prompt,
          media_b64: subtask.media_b64 || undefined,
          agent_address: subtask.agent_address,
          status: 'pending'
        });
        storedSubtasks.push(storedSubtask);
      }

      storedTasks.push({
        masterTask,
        subtasks: storedSubtasks
      });

      // Log the task generation action
      await agentService.logAgentAction({
        agent_id: task.agent_address,
        action_type: 'custom',
        action_data: { 
          type: 'user_assigned_task_generated',
          master_task_id: masterTask.id,
          subtask_count: task.agentic_tasks.length,
          user_id: task.user_id,
          user_task_description: taskDescription
        },
        task_id: masterTask.id,
        success: true,
      });
    }

    // Log task generation for monitoring
    console.log(`📋 Generated ${storedTasks.length} user-assigned task(s) with ${storedTasks.reduce((sum, task) => sum + task.subtasks.length, 0)} total subtasks`);
    
    // Start the task workflow for the first task
    if (storedTasks.length > 0) {
      const firstTask = storedTasks[0];
      console.log(`🎯 Starting task workflow for master task ${firstTask.masterTask.id}`);
      
      // Create workflow data on server-side
      const workflowResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/tasks/${firstTask.masterTask.id}/workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (workflowResponse.ok) {
        const workflowData = await workflowResponse.json();
        console.log(`🎯 Workflow created with ${workflowData.totalSteps} steps`);
        
        // Import gameState and start workflow with server data
        const { gameState } = await import('../../../src/game/state');
        gameState.startTaskWorkflowFromData(workflowData.workflowSteps);
      } else {
        console.error('❌ Failed to create task workflow:', workflowResponse.statusText);
      }
    }
    
    // Check if agents are already in game state - if so, don't reload them
    const gameAgents = Array.from(gameState.getAIAgents().values());
    const existingAgentIds = gameAgents.map(agent => agent.id);
    
    // Only add agents that don't already exist in the game state
    const agentsToAdd = availableAgents.filter(agent => !existingAgentIds.includes(agent.id));
    
    if (agentsToAdd.length > 0) {
      console.log(`Loading ${agentsToAdd.length} new agents into game state...`);
      
      for (const agent of agentsToAdd) {
        // Create a simple game agent object
        const gameAgent = {
          id: agent.id,
          name: agent.name,
          type: CrewmateType.CREW,
          x: 0, // Will be set based on building location
          y: 0, // Will be set based on building location
          targetX: 0,
          targetY: 0,
          color: '#ff6b6b',
          activity: CrewmateActivity.RESTING,
          speed: 1,
          direction: 'north' as const,
          animationFrame: 0,
          lastMoveTime: Date.now(),
          homeX: 0,
          homeY: 0,
          workX: 0,
          workY: 0,
          personality: typeof agent.personality === 'string' ? agent.personality : 'Friendly and helpful',
          currentThought: 'Ready to work',
          lastInteractionTime: 0,
          autonomyLevel: 0.7,
          goals: agent.capabilities || ['Complete tasks'],
          pathIndex: 0,
          isFollowingPath: false,
          currentPath: undefined,
          lastBuildingVisitTime: 0,
          visitCooldown: 15000,
          moveInterval: 200,
          chatBubble: undefined,
          targetBuilding: undefined,
          experiencePoints: agent.experience_points || 0,
          level: agent.level || 1,
          totalInteractions: 0,
          playerInteractions: 0,
          // Capital system
          totalCapital: agent.total_capital || 1000,
          lastCapitalUpdate: Date.now()
        };

        // Set position based on assigned building
        if (agent.current_building_id) {
          const building = getBuildingById(agent.current_building_id);
          if (building) {
            gameAgent.x = building.x;
            gameAgent.y = building.y;
            gameAgent.targetX = building.x;
            gameAgent.targetY = building.y;
            gameAgent.homeX = building.x;
            gameAgent.homeY = building.y;
            gameAgent.workX = building.x;
            gameAgent.workY = building.y;
          }
        }

        gameState.addAIAgent(gameAgent);
      }
    } else {
      console.log('All agents already exist in game state, preserving their current positions and states');
    }

    // Schedule sequential movement for PLAYER AVATAR to visit child agents
    for (const task of storedTasks) {
      const masterAgentId = task.masterTask.agent_address;
      const masterAgent = availableAgents.find(agent => agent.id === masterAgentId);
      
      console.log(`🎯 User-Assigned Task: ${masterAgent?.name || masterAgentId} - "${task.masterTask.prompt.substring(0, 50)}..."`);
      console.log(`🎮 Player avatar will visit child agents in sequence`);
      
      // Schedule sequential movement for PLAYER AVATAR
      setTimeout(async () => {
        // Get current player position
        const playerState = gameState.getState();
        const playerX = Math.round(playerState.playerPosition.x);
        const playerY = Math.round(playerState.playerPosition.y);
        
        console.log(`🎮 Player avatar starting at position (${playerX}, ${playerY})`);

        // Walk to each child agent in sequence with path calculation
        for (let i = 0; i < task.subtasks.length; i++) {
          const subtask = task.subtasks[i];
          const childAgentId = subtask.agent_address;
          const childAgent = availableAgents.find(agent => agent.id === childAgentId);
          
          console.log(`🔍 Looking for child agent ${childAgentId}:`, childAgent ? `Found ${childAgent.name}` : 'Not found');
          console.log(`🔍 Available agent IDs:`, availableAgents.map(a => a.id));
          
          if (childAgent && childAgent.current_building_id) {
            const building = getBuildingById(childAgent.current_building_id);
            if (building) {
              // Calculate path from PLAYER to child agent's building
              console.log(`🔍 Calculating path from player (${playerX}, ${playerY}) to (${building.x}, ${building.y})`);
              const pathfinder = new Pathfinder(gameState.getState());
              const path = pathfinder.findPath(
                playerX, 
                playerY, 
                building.x, 
                building.y
              );
              console.log(`🗺️ Pathfinding result:`, path ? `Found path with ${path.nodes.length} nodes` : 'No path found');
              
              if (path && path.nodes.length > 0) {
                // Calculate path for client-side use (don't set on server)
                console.log(`🚀 Calculated path to child agent ${childAgent?.name || childAgentId} (${i + 1}/${task.subtasks.length})`);
                console.log(`🗺️ Path calculated for child agent ${childAgent?.name || childAgentId} (${i + 1}/${task.subtasks.length}) at building ${building.id} (${building.x}, ${building.y})`);
                console.log(`📍 Path has ${path.nodes.length} nodes:`, path.nodes.map(node => `(${node.x},${node.y})`).join(' -> '));
                
                // Log this movement action
                await agentService.logAgentAction({
                  agent_id: 'player_avatar',
                  action_type: 'move',
                  action_data: { 
                    type: 'player_sequential_user_task_coordination',
                    target_agent: childAgentId,
                    target_agent_name: childAgent?.name,
                    building_id: building.id,
                    building_coordinates: { x: building.x, y: building.y },
                    sequence_number: i + 1,
                    total_agents: task.subtasks.length,
                    task_id: task.masterTask.id,
                    path_nodes: path.nodes,
                    path_length: path.nodes.length,
                    user_task_description: taskDescription
                  },
                  building_id: building.id,
                  target_agent_id: childAgentId,
                  task_id: task.masterTask.id,
                  success: true,
                });
                
                // Wait for player to complete this path before moving to next agent
                // Check if player is still following path every 100ms
                while (gameState.getState().isPlayerFollowingPath) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
                console.log(`✅ Player completed path to ${childAgent?.name || childAgentId}`);
              } else {
                console.warn(`Failed to calculate path from player to child agent ${childAgentId} location`);
                // The pathfinding system now handles fallbacks internally, so we don't need to create a direct path here
                console.log(`❌ No path available to child agent ${childAgent?.name || childAgentId} (${i + 1}/${task.subtasks.length}) at building ${building.id} (${building.x}, ${building.y})`);
              }
            } else {
              console.warn(`Building ${childAgent.current_building_id} not found for child agent ${childAgentId}`);
            }
          } else {
            console.warn(`Child agent ${childAgentId} not found or has no assigned building`);
          }
          
          // Add delay between movements (1 second per movement)
          if (i < task.subtasks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        const subtaskAgents = task.subtasks.map(subtask => 
          availableAgents.find(agent => agent.id === subtask.agent_address)?.name || subtask.agent_address
        );
        console.log(`👥 Player avatar will visit: ${subtaskAgents.join(', ')}`);
      }, 1000); // Reduced initial delay to 1 second
    }

    // Add generated tasks to the queue in the specified format
    const queuedTasks = [];
    for (const task of storedTasks) {
      // Create the main task entry
      const mainTask = {
        id: parseInt(task.masterTask.id),
        user_id: 2, // Default user ID
        agent_address: task.masterTask.agent_address,
        prompt: task.masterTask.prompt,
        media_b64: null, // No media for now
        created_at: task.masterTask.created_at,
        agentic_tasks: []
      };

      // Add each subtask as an agentic_task
      for (const subtask of task.subtasks) {
        const agenticTask = {
          id: parseInt(subtask.id),
          task_id: parseInt(task.masterTask.id),
          prompt: subtask.prompt,
          media_b64: null as string | null, // No media for now
          agent_address: subtask.agent_address,
          created_at: subtask.created_at
        };
        (mainTask.agentic_tasks as any[]).push(agenticTask);

        // Add to hierarchical queue for processing
        const queueTaskId = taskQueueService.addHierarchicalTask(
          subtask.agent_address,
          {
            prompt: subtask.prompt,
            media_b64: undefined
          },
          'subtask',
          task.masterTask.id,
          'medium'
        );
        console.log(`📋 Added hierarchical task ${queueTaskId} to queue for agent ${subtask.agent_address}`);
      }

      queuedTasks.push(mainTask);
    }

    console.log(`📋 Added ${queuedTasks.length} user-assigned tasks to queue with ${queuedTasks.reduce((sum, task) => sum + task.agentic_tasks.length, 0)} subtasks`);

    // Set agent thoughts for assigned tasks
    for (const task of storedTasks) {
      // Set thought for master agent
      const masterAgent = gameState.getState().aiAgents.get(task.masterTask.agent_address);
      if (masterAgent) {
        masterAgent.currentThought = '🎯 I have a user-assigned task to coordinate';
        masterAgent.chatBubble = {
          message: '🎯 I have a user-assigned task to coordinate',
          timestamp: Date.now(),
          duration: 6000
        };
        console.log(`💭 Master agent ${masterAgent.name}: I have a user-assigned task to coordinate`);
      }

      // Set thoughts for subtask agents
      for (const subtask of task.subtasks) {
        const subtaskAgent = gameState.getState().aiAgents.get(subtask.agent_address);
        if (subtaskAgent) {
          const thought = `🎯 I have a new user task: ${subtask.prompt || 'User-assigned work'}`;
          subtaskAgent.currentThought = thought;
          subtaskAgent.chatBubble = {
            message: thought,
            timestamp: Date.now(),
            duration: 6000
          };
          console.log(`💭 Agent ${subtaskAgent.name}: ${thought}`);
        }
      }
    }

    res.status(200).json({ 
      success: true,
      message: 'User-assigned task generated successfully',
      tasks: storedTasks.map(task => ({
        masterTask: {
          id: task.masterTask.id,
          agent_address: task.masterTask.agent_address,
          prompt: task.masterTask.prompt,
          status: task.masterTask.status,
          created_at: task.masterTask.created_at
        },
        subtasks: task.subtasks.map(subtask => ({
          id: subtask.id,
          agent_address: subtask.agent_address,
          prompt: subtask.prompt,
          status: subtask.status,
          created_at: subtask.created_at
        }))
      })),
      queuedTasks: queuedTasks, // Added to queue in the specified format
      totalTasks: storedTasks.length,
      totalSubtasks: storedTasks.reduce((sum, task) => sum + task.subtasks.length, 0),
      targetAgent: {
        id: targetAgent.id,
        name: targetAgent.name,
        description: targetAgent.description
      }
    });

  } catch (error) {
    console.error('Error generating user-assigned task:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
