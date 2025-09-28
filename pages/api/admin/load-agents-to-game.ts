import type { NextApiRequest, NextApiResponse } from 'next';
import { gameState } from '../../../src/game/state';
import { agentService } from '../../services/agentService';
import { memoryStorageService } from '../../services/memoryStorageService';
import { getAvailableBuildings, getBuildingById } from '../../../src/maps/defaultMap';
import { TileType, CrewmateType, CrewmateActivity } from '../../../src/game/state';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🎮 Loading agents into game state...');

    // Get all agents from database
    const agentsResult = await agentService.getAgents();
    if (!agentsResult.success || !agentsResult.data) {
      return res.status(400).json({ error: 'Failed to fetch agents from database' });
    }

    const agents = agentsResult.data;
    console.log(`Found ${agents.length} agents in database`);

    // Clear existing agents first
    gameState.clearAllAIAgents();

    // Get all available tiles from the loaded map
    const allTiles = Array.from(gameState.getState().mapData.entries());
    if (allTiles.length === 0) {
      return res.status(400).json({ error: 'No map loaded in game state' });
    }

    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#ff7675', '#74b9ff'];
    const types = [CrewmateType.CREW, CrewmateType.SCIENTIST, CrewmateType.ENGINEER, CrewmateType.CAPTAIN];
    
    let loadedCount = 0;
    const loadedAgents = [];

    for (const agent of agents) {
      let x: number = 0, y: number = 0;
      let buildingId: string | null = null;

      // Check if agent has an assigned building in memory
      const metadata = memoryStorageService.getAgentMetadata(agent.id);
      if (metadata && metadata.current_building_id) {
        const building = getBuildingById(metadata.current_building_id);
        if (building) {
          x = building.x;
          y = building.y;
          buildingId = building.id;
          console.log(`Placing agent ${agent.name} at assigned building ${buildingId} (${x}, ${y})`);
        }
      }

      // If no assigned building, find a random building tile (not roads/corridors)
      if (!buildingId) {
        const buildingTypes = [TileType.LIVING_QUARTERS, TileType.RESEARCH_LAB, TileType.ENGINEERING_BAY, TileType.RECREATION, TileType.POWER_LINE];
        const buildingTiles = allTiles.filter(([_, tile]) => 
          buildingTypes.includes(tile.type)
        );
        
        if (buildingTiles.length === 0) {
          console.warn(`No building tiles available for agent ${agent.name}`);
          continue;
        }

        const [tileKey, tile] = buildingTiles[Math.floor(Math.random() * buildingTiles.length)];
        [x, y] = tileKey.split(',').map(Number);
        console.log(`Placing agent ${agent.name} at random building (${x}, ${y})`);
      }

      const type = types[Math.floor(Math.random() * types.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const gameAgent = {
        id: agent.id,
        name: agent.name,
        type,
        x,
        y,
        targetX: x,
        targetY: y,
        color,
        activity: CrewmateActivity.RESTING, // Start at rest when at their building
        speed: 1,
        direction: 'north' as const,
        animationFrame: 0,
        lastMoveTime: Date.now(),
        homeX: x, // Set home to current position (their assigned building)
        homeY: y,
        workX: x, // Set work to current position (their assigned building)
        workY: y,
        personality: agent.personality?.traits?.join(', ') || 'Friendly and helpful',
        currentThought: 'Exploring the space station',
        lastInteractionTime: 0,
        autonomyLevel: 0.7,
        goals: agent.personality?.goals || ['Explore', 'Help others'],
        pathIndex: 0,
        isFollowingPath: false,
        lastBuildingVisitTime: 0,
        visitCooldown: 5000,
        moveInterval: 200 + Math.random() * 200,
        experiencePoints: agent.experience_points || 0,
        level: agent.level || 1,
        totalInteractions: 0,
        playerInteractions: 0
      };

      gameState.addAIAgent(gameAgent);
      loadedCount++;
      loadedAgents.push({
        id: agent.id,
        name: agent.name,
        coordinates: { x, y },
        buildingId: buildingId || 'random'
      });
    }

    console.log(`✅ Successfully loaded ${loadedCount} agents into game state`);

    res.status(200).json({
      success: true,
      message: `Successfully loaded ${loadedCount} agents into game state`,
      totalAgents: agents.length,
      loadedAgents: loadedCount,
      agents: loadedAgents
    });

  } catch (error) {
    console.error('Error loading agents to game state:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
