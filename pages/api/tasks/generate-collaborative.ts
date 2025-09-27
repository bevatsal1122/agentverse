import type { NextApiRequest, NextApiResponse } from 'next';
import { taskOrchestratorService } from '../../services/taskOrchestratorService';
import { memoryStorageService } from '../../services/memoryStorageService';
import { agentService } from '../../services/agentService';
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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    // Get all agents from database and memory storage (not just recently active ones)
    const agentResult = await agentService.getAgents();
    if (!agentResult.success || !agentResult.data) {
      return res.status(500).json({ 
        error: 'Failed to fetch agents from database',
        details: agentResult.error
      });
    }

    const activeAgents = agentResult.data.map(agent => ({
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
      reputation_score: agent.reputation_score,
      last_active: agent.last_active,
      updated_at: agent.updated_at,
      owner_address: agent.owner_address,
      created_at: agent.created_at,
    }));
    
    if (activeAgents.length === 0) {
      return res.status(400).json({ 
        error: 'No active agents available for task generation' 
      });
    }
    
    // Debug: Log all agents and their building assignments
    console.log(`📋 Found ${activeAgents.length} agents for task generation:`);
    activeAgents.forEach(agent => {
      console.log(`  - ${agent.name} (${agent.id}): building=${agent.current_building_id || 'none'}, status=${agent.status}`);
    });

    // Check if there are any pending master tasks
    const pendingMasterTasks = memoryStorageService.getPendingMasterTasks();
    if (pendingMasterTasks.length > 0) {
      return res.status(409).json({ 
        error: 'There are already pending master tasks. Please complete them first.',
        pendingTasks: pendingMasterTasks.length
      });
    }

    // Generate collaborative task using ChatGPT
    const orchestrationResult = await taskOrchestratorService.generateCollaborativeTask({
      availableAgents: activeAgents,
      userId: userId.toString()
    });

    if (!orchestrationResult.success || !orchestrationResult.tasks) {
      return res.status(500).json({ 
        error: 'Failed to generate collaborative task',
        details: orchestrationResult.error
      });
    }

    const generatedTasks = orchestrationResult.tasks;
    
    // Note: Agent address validation is now handled internally by the task orchestrator service
    // which fetches full agent data from the database

    // Store tasks in memory and database
    const storedTasks = [];
    
    for (const task of generatedTasks) {
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
          type: 'collaborative_task_generated',
          master_task_id: masterTask.id,
          subtask_count: task.agentic_tasks.length,
          user_id: task.user_id
        },
        task_id: masterTask.id,
        success: true,
      });
    }

    // Log task generation for monitoring
    console.log(`📋 Generated ${storedTasks.length} collaborative task(s) with ${storedTasks.reduce((sum, task) => sum + task.subtasks.length, 0)} total subtasks`);
    
    // Check if agents are already in game state - if so, don't reload them
    const gameAgents = Array.from(gameState.getAIAgents().values());
    const existingAgentIds = gameAgents.map(agent => agent.id);
    
    // Only add agents that don't already exist in the game state
    const agentsToAdd = activeAgents.filter(agent => !existingAgentIds.includes(agent.id));
    
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
          targetBuilding: undefined
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
      const masterAgent = activeAgents.find(agent => agent.id === masterAgentId);
      
      console.log(`🎯 Master Task: ${masterAgent?.name || masterAgentId} - "${task.masterTask.prompt.substring(0, 50)}..."`);
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
          const childAgent = activeAgents.find(agent => agent.id === childAgentId);
          
          console.log(`🔍 Looking for child agent ${childAgentId}:`, childAgent ? `Found ${childAgent.name}` : 'Not found');
          console.log(`🔍 Available agent IDs:`, activeAgents.map(a => a.id));
          
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
                // Set player path for visualization and movement
                console.log(`🚀 Setting player path to child agent ${childAgent?.name || childAgentId} (${i + 1}/${task.subtasks.length})`);
                
                // Set the calculated path for the player
                gameState.setPlayerPath(path.nodes);
                
                console.log(`🗺️ Player avatar path set to child agent ${childAgent?.name || childAgentId} (${i + 1}/${task.subtasks.length}) at building ${building.id} (${building.x}, ${building.y})`);
                console.log(`📍 Path has ${path.nodes.length} nodes:`, path.nodes.map(node => `(${node.x},${node.y})`).join(' -> '));
                
                // Log this movement action
                await agentService.logAgentAction({
                  agent_id: 'player_avatar',
                  action_type: 'move',
                  action_data: { 
                    type: 'player_sequential_task_coordination',
                    target_agent: childAgentId,
                    target_agent_name: childAgent?.name,
                    building_id: building.id,
                    building_coordinates: { x: building.x, y: building.y },
                    sequence_number: i + 1,
                    total_agents: task.subtasks.length,
                    task_id: task.masterTask.id,
                    path_nodes: path.nodes,
                    path_length: path.nodes.length
                  },
                  building_id: building.id,
                  target_agent_id: childAgentId,
                  task_id: task.masterTask.id,
                  success: true,
                });
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
          
          // Add delay between movements (3 seconds per movement)
          if (i < task.subtasks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
        
        const subtaskAgents = task.subtasks.map(subtask => 
          activeAgents.find(agent => agent.id === subtask.agent_address)?.name || subtask.agent_address
        );
        console.log(`👥 Player avatar will visit: ${subtaskAgents.join(', ')}`);
      }, 2000); // Initial 2-second delay before starting movement
    }

    res.status(200).json({ 
      success: true,
      message: 'Collaborative task generated successfully',
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
      totalTasks: storedTasks.length,
      totalSubtasks: storedTasks.reduce((sum, task) => sum + task.subtasks.length, 0)
    });

  } catch (error) {
    console.error('Error generating collaborative task:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
