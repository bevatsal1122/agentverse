import type { NextApiRequest, NextApiResponse } from 'next';
import { agentService } from '../services/agentService';
import { gameState, CrewmateType, CrewmateActivity } from '../../src/game/state';
import { getBuildingById } from '../../src/maps/defaultMap';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing sequential movement system...');
    
    // Get active agents
    const activeAgentsResult = await agentService.getActiveAgents();
    const activeAgents = activeAgentsResult.data || [];
    
    if (activeAgents.length === 0) {
      return res.status(400).json({ error: 'No active agents found' });
    }

    console.log(`📋 Found ${activeAgents.length} active agents`);

    // Load agents into game state
    const gameAgents = Array.from(gameState.getAIAgents().values());
    if (gameAgents.length === 0) {
      console.log('Loading agents into game state...');
      
      for (const agent of activeAgents) {
        const gameAgent = {
          id: agent.id,
          name: agent.name,
          type: CrewmateType.CREW,
          x: 0,
          y: 0,
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
          personality: agent.personality || 'Friendly and helpful',
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
        console.log(`✅ Loaded agent ${agent.name} at building ${agent.current_building_id}`);
      }
    }

    // Simulate master agent walking to each child agent
    const masterAgent = activeAgents[0]; // Use first agent as master
    const childAgents = activeAgents.slice(1); // Use remaining agents as children

    console.log(`🎯 Master agent: ${masterAgent.name}`);
    console.log(`👥 Child agents: ${childAgents.map(a => a.name).join(', ')}`);

    const movementLog = [];

    for (let i = 0; i < childAgents.length; i++) {
      const childAgent = childAgents[i];
      
      if (childAgent.current_building_id) {
        const building = getBuildingById(childAgent.current_building_id);
        if (building) {
          // Move master agent to child agent's building location
          const success = gameState.moveAgentToLocation(masterAgent.id, building.x, building.y);
          if (success) {
            const logEntry = {
              sequence: i + 1,
              masterAgent: masterAgent.name,
              childAgent: childAgent.name,
              building: building.id,
              coordinates: { x: building.x, y: building.y },
              timestamp: new Date().toISOString()
            };
            
            movementLog.push(logEntry);
            
            console.log(`🚶 Master agent ${masterAgent.name} walking to child agent ${childAgent.name} (${i + 1}/${childAgents.length}) at building ${building.id} (${building.x}, ${building.y})`);
            
            // Log this movement action
            await agentService.logAgentAction({
              agent_id: masterAgent.id,
              action_type: 'move',
              action_data: { 
                type: 'sequential_task_coordination',
                target_agent: childAgent.id,
                target_agent_name: childAgent.name,
                building_id: building.id,
                building_coordinates: { x: building.x, y: building.y },
                sequence_number: i + 1,
                total_agents: childAgents.length,
                test_run: true
              },
              building_id: building.id,
              target_agent_id: childAgent.id,
              success: true,
            });
          }
        }
      }
    }

    console.log(`✅ Sequential movement test completed. Master agent visited ${movementLog.length} child agents.`);

    res.status(200).json({
      success: true,
      message: 'Sequential movement test completed',
      masterAgent: masterAgent.name,
      childAgents: childAgents.map(a => a.name),
      movementLog: movementLog,
      totalMovements: movementLog.length
    });

  } catch (error) {
    console.error('Error in sequential movement test:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
