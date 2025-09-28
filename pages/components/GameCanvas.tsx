import React, { useEffect, useRef, useState } from 'react';
import { gameState, Tool, TileType, GameState, Crewmate, CrewmateType, CrewmateActivity, AIAgent } from '../../src/game/state';
import { MapLoader } from '../../src/maps/mapLoader';
import { playerController } from '../../src/game/player';
// Removed direct agentService import to avoid client-side Redis import issues
import { collaborativeTaskService } from '../services/collaborativeTaskService';
import { useNotifications } from '../hooks/useNotifications';
import NotificationSystem from './NotificationSystem';
import LiveFeed from './LiveFeed';
import AgentsList from './AgentsList';
import { useRouter } from 'next/router';
import { getBuildingById, getBuildingsAssignedToAgent } from '../../src/maps/defaultMap';



interface GameCanvasProps {
  selectedTool: Tool;
}

interface TrafficElement {
  x: number;
  y: number;
  direction: 'north' | 'south' | 'east' | 'west';
  type: 'car' | 'bus' | 'pedestrian';
  speed: number;
  color: string;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ selectedTool }) => {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [gameStateSnapshot, setGameStateSnapshot] = useState(gameState.getState());
  const [trafficElements, setTrafficElements] = useState<TrafficElement[]>([]);
  const [backgroundCanvas, setBackgroundCanvas] = useState<HTMLCanvasElement | null>(null);
  const [showAgentsList, setShowAgentsList] = useState(false);
  const animationFrameRef = useRef<number>();
  const lastRenderTime = useRef<number>(0);
  
  // Notification system
  const { notifications, addNotification, removeNotification } = useNotifications();

  // Set up notification callback for collaborative task service
  useEffect(() => {
    collaborativeTaskService.setNotificationCallback(addNotification);
  }, [addNotification]);

  // Automatic collaborative task generation
  const generateCollaborativeTask = async () => {
    try {
      const result = await collaborativeTaskService.generateCollaborativeTask({
        userId: 'game_user' // You might want to get this from auth context
      });
      
      if (result.success) {
        // Task generation handles agent movement internally, no need to reload agents
        console.log('🤖 Automatic task generated successfully, agents will move sequentially');
        
        // Set path to the specific agent that was assigned the task
        // The server calculates the path but we need to set it on the client side
        try {
          gameState.setPathToRandomAgent();
          console.log('🎮 Avatar path set to target agent');
        } catch (error) {
          console.log('🎮 Could not set avatar path:', error);
        }
      } else if (result.error && result.error.includes('Rate limited')) {
        // Handle rate limiting gracefully - just log and continue
        console.log('⏳ Task generation rate limited:', result.error);
      } else {
        console.error('❌ Task generation failed:', result.error);
      }
    } catch (error) {
      console.error('Error generating collaborative task:', error);
    }
  };

  // Automatic task generation system
  const startAutomaticTaskGeneration = () => {
    console.log('🤖 Starting automatic task generation system...');
    
    // Generate first task after 5 seconds (to ensure everything is loaded)
    setTimeout(() => {
      console.log('🤖 Generating initial automatic task...');
      generateCollaborativeTask();
    }, 5000);
    
    // Then generate tasks every 2 minutes (120,000ms)
    const taskInterval = setInterval(() => {
      console.log('🤖 Generating automatic task (every 2 minutes)...');
      generateCollaborativeTask();
    }, 120000); // 2 minutes
    
    // Store interval ID for cleanup
    (window as any).automaticTaskInterval = taskInterval;
    
    console.log('🤖 Automatic task generation system started - tasks will generate every 2 minutes');
  };

  // Load real agents from backend
  const loadRealAgents = async () => {
    try {
      console.log('🔄 Starting to load real agents from backend...');
      const response = await fetch('/api/agents');
      const agentsResult = await response.json();
      console.log('📡 API response:', agentsResult);
      
      if (agentsResult.agents && agentsResult.agents.length > 0) {
        console.log(`✅ Loading ${agentsResult.agents.length} real agents from backend`);
        
        // Clear existing agents first
        gameState.clearAllAIAgents();
        
        let loadedCount = 0;
        for (const agent of agentsResult.agents) {
          console.log(`🔄 Converting agent: ${agent.name} (ID: ${agent.id})`);
          // Convert backend agent to game AI agent
          const gameAgent = convertBackendAgentToGameAgent(agent);
          if (gameAgent) {
            gameState.addAIAgent(gameAgent);
            loadedCount++;
            console.log(`✅ Loaded agent ${agent.name} at (${gameAgent.x}, ${gameAgent.y})`);
          } else {
            console.warn(`❌ Failed to convert agent ${agent.name} to game agent`);
          }
        }
        console.log(`🎉 Successfully loaded ${loadedCount} agents into game state`);
        
        // Verify agents are in game state
        const finalState = gameState.getState();
        console.log(`🔍 Final verification: ${finalState.aiAgents.size} agents in game state`);
      } else {
        console.log('❌ No agents found in backend, no agents will spawn on map');
        console.log('API response:', agentsResult);
        // Clear existing agents if no agents in backend
        gameState.clearAllAIAgents();
      }
    } catch (error) {
      console.error('❌ Error loading agents from backend:', error);
    }
  };

  // Convert backend agent to game AI agent
  const convertBackendAgentToGameAgent = (backendAgent: any): AIAgent | null => {
    console.log(`🔄 Converting agent ${backendAgent.name}...`);
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#ff7675', '#74b9ff'];
    const types = [CrewmateType.CREW, CrewmateType.SCIENTIST, CrewmateType.ENGINEER, CrewmateType.CAPTAIN];
    
    // Get all available tiles from the loaded map
    const allTiles = Array.from(gameState.getState().mapData.entries());
    console.log(`🗺️ Map tiles loaded: ${allTiles.length}`);
    if (allTiles.length === 0) {
      console.error('❌ No map loaded, cannot place agent');
      return null; // No map loaded
    }

    let x: number, y: number;

    // Check if agent has an assigned building
    if (backendAgent.current_building_id) {
      // Import the building lookup function
      const { getBuildingById } = require('../../src/maps/defaultMap');
      const building = getBuildingById(backendAgent.current_building_id);
      
      if (building) {
        // Place agent at their assigned building
        x = building.x;
        y = building.y;
        console.log(`Placing agent ${backendAgent.name} at assigned building ${backendAgent.current_building_id} (${x}, ${y})`);
      } else {
        // Building not found, fall back to random building placement (not roads/corridors)
        console.warn(`Building ${backendAgent.current_building_id} not found for agent ${backendAgent.name}, using random building placement`);
        const buildingTypes = [TileType.LIVING_QUARTERS, TileType.RESEARCH_LAB, TileType.ENGINEERING_BAY, TileType.RECREATION, TileType.POWER_LINE];
        const buildingTiles = allTiles.filter(([_, tile]) => 
          buildingTypes.includes(tile.type)
        );
        
        if (buildingTiles.length === 0) {
          console.error('No building tiles available for agent placement');
          return null; // No building tiles
        }

        const [tileKey, tile] = buildingTiles[Math.floor(Math.random() * buildingTiles.length)];
        [x, y] = tileKey.split(',').map(Number);
      }
    } else {
      // No assigned building, find a random building tile (not roads/corridors)
      console.log(`🏠 No assigned building for ${backendAgent.name}, finding random building...`);
      const buildingTypes = [TileType.LIVING_QUARTERS, TileType.RESEARCH_LAB, TileType.ENGINEERING_BAY, TileType.RECREATION, TileType.POWER_LINE];
      const buildingTiles = allTiles.filter(([_, tile]) => 
        buildingTypes.includes(tile.type)
      );
      
      console.log(`🏠 Found ${buildingTiles.length} building tiles available`);
      if (buildingTiles.length === 0) {
        console.error('No building tiles available for agent placement');
        return null; // No building tiles
      }

      const [tileKey, tile] = buildingTiles[Math.floor(Math.random() * buildingTiles.length)];
      [x, y] = tileKey.split(',').map(Number);
      console.log(`🏠 Placing ${backendAgent.name} at random building (${x}, ${y})`);
    }

    const type = types[Math.floor(Math.random() * types.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];

    console.log(`✅ Successfully converted ${backendAgent.name} to game agent at (${x}, ${y})`);

    return {
      id: backendAgent.id,
      name: backendAgent.name,
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
      personality: backendAgent.personality?.traits?.join(', ') || 'Friendly and helpful',
      currentThought: 'Initializing and exploring the space station',
      lastInteractionTime: 0,
      autonomyLevel: 0.7,
      goals: backendAgent.personality?.goals || ['Explore', 'Help others'],
      pathIndex: 0,
      isFollowingPath: false,
      lastBuildingVisitTime: 0,
      visitCooldown: 5000,
      moveInterval: 200 + Math.random() * 200,
      // XP and interaction system
      experiencePoints: 0,
      level: 1,
      totalInteractions: 0,
      playerInteractions: 0
    };
  };
  const lastGameUpdateTime = useRef<number>(0);
  const lastTrafficUpdateTime = useRef<number>(0);
  const targetFPS = 60;
  const targetGameUpdateFPS = 30;
  const targetTrafficUpdateFPS = 10; // Even slower for traffic

  const initializeTilesetBackground = async () => {
    if (!canvasRef.current) return;
    
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // Get 2D context
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D context');
      return;
    }

    ctxRef.current = ctx;

    // Set up canvas to cover full screen
    canvasRef.current.width = window.innerWidth;
    canvasRef.current.height = window.innerHeight;

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;
    (ctx as any).webkitImageSmoothingEnabled = false;
    (ctx as any).mozImageSmoothingEnabled = false;
    (ctx as any).msImageSmoothingEnabled = false;

    // Setup click handler for tile placement
    canvasRef.current.addEventListener('click', handleCanvasClick);

    // Setup mouse drag controls for camera movement
    canvasRef.current.addEventListener('mousedown', handleMouseDown);
    canvasRef.current.addEventListener('mousemove', handleMouseMove);
    canvasRef.current.addEventListener('mouseup', handleMouseUp);
    canvasRef.current.addEventListener('mouseleave', handleMouseUp);

    window.addEventListener('keydown', handleKeyDown);

    // Initialize camera to center on player
    gameState.initializeCamera();

    // Initialize tileset background
    initializeTilesetBackground();

    // Start player activity system
    startPlayerActivitySystem();

    // Start wallet simulation system
    startWalletSimulation();

    // Auto-load default map if no map is loaded
    const state = gameState.getState();
    console.log('Initial map data size:', state.mapData.size);
    if (state.mapData.size === 0) {
      console.log('Loading default map...');
      MapLoader.loadDefaultMap();
      console.log('Map loaded, new size:', gameState.getState().mapData.size);
    }

    // Subscribe to game state changes
    const unsubscribe = gameState.subscribe((state) => {
      setGameStateSnapshot(state);
      updateCanvas(state);
    });

    // Initial render
    updateCanvas(gameState.getState());
    
    // Generate initial traffic
    generateTraffic(gameState.getState());
    
    // Load real agents from backend instead of spawning random ones
    // Wait a bit to ensure map is fully loaded
    setTimeout(() => {
      const currentState = gameState.getState();
      console.log('🔍 Checking if agents need to be loaded. Current agents:', currentState.aiAgents.size);
      if (currentState.aiAgents.size === 0) {
        console.log('🚀 Loading real agents...');
        loadRealAgents();
      } else {
        console.log('✅ Agents already loaded, skipping');
      }
      
      // Start automatic task generation system
      startAutomaticTaskGeneration();
    }, 100);

    // Expose loadRealAgents function globally for manual refresh
    (window as any).refreshGameAgents = loadRealAgents;
    
    // Optimized animation loop with separate rendering and game logic updates
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastRenderTime.current;
      const gameDeltaTime = currentTime - lastGameUpdateTime.current;
      const trafficDeltaTime = currentTime - lastTrafficUpdateTime.current;
      
      // Update traffic at 10 FPS for better performance
      if (trafficDeltaTime >= 1000 / targetTrafficUpdateFPS) {
        updateTraffic();
        lastTrafficUpdateTime.current = currentTime;
      }
      
      // Update game logic at 30 FPS for better performance
      if (gameDeltaTime >= 1000 / targetGameUpdateFPS) {
        // Update player movement
        playerController.update(gameDeltaTime / 1000);
        gameState.updateAIAgents();
        lastGameUpdateTime.current = currentTime;
      }
      
      // Render at 60 FPS for smooth visuals
      if (deltaTime >= 1000 / targetFPS) {
        updateCanvas(gameState.getState());
        lastRenderTime.current = currentTime;
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      unsubscribe();
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('click', handleCanvasClick);
        canvasRef.current.removeEventListener('mousedown', handleMouseDown);
        canvasRef.current.removeEventListener('mousemove', handleMouseMove);
        canvasRef.current.removeEventListener('mouseup', handleMouseUp);
        canvasRef.current.removeEventListener('mouseleave', handleMouseUp);
      }
      window.removeEventListener('keydown', handleKeyDown);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clean up automatic task generation interval
      if ((window as any).automaticTaskInterval) {
        clearInterval((window as any).automaticTaskInterval);
        console.log('🤖 Automatic task generation system stopped');
      }
    };
  }, []);

  const handlePlayerInteraction = (gridX: number, gridY: number, screenX: number, screenY: number) => {
    const state = gameState.getState();
    const effectiveTileSize = gameState.getEffectiveTileSize();
    
    // Check if clicking on an agent
    const clickedAgent = findAgentAtPosition(gridX, gridY, state);
    if (clickedAgent) {
      // Interact with agent
      interactWithAgent(clickedAgent);
      return;
    }
    
    // Check if clicking on a building
    const clickedBuilding = findBuildingAtPosition(gridX, gridY, state);
    if (clickedBuilding) {
      // Move to building and interact
      movePlayerToBuilding(gridX, gridY, clickedBuilding);
      return;
    }
    
    // Default: move player to clicked location
    movePlayerToLocation(gridX, gridY);
  };

  const findAgentAtPosition = (gridX: number, gridY: number, state: any) => {
    for (const [_, agent] of state.aiAgents.entries()) {
      const agentGridX = Math.round(agent.x);
      const agentGridY = Math.round(agent.y);
      if (agentGridX === gridX && agentGridY === gridY) {
        return agent;
      }
    }
    return null;
  };

  const findBuildingAtPosition = (gridX: number, gridY: number, state: any) => {
    const tile = state.mapData.get(`${gridX},${gridY}`);
    if (tile && (tile.type === TileType.LIVING_QUARTERS || 
                 tile.type === TileType.RESEARCH_LAB || 
                 tile.type === TileType.ENGINEERING_BAY || 
                 tile.type === TileType.RECREATION)) {
      return tile;
    }
    return null;
  };

  const interactWithAgent = (agent: any) => {
    // Give XP to the agent for player interaction
    const xpGain = 10 + Math.floor(Math.random() * 20); // 10-30 XP per interaction
    agent.experiencePoints += xpGain;
    agent.totalInteractions += 1;
    agent.playerInteractions += 1;
    
    // Check for level up
    const newLevel = Math.floor(agent.experiencePoints / 100) + 1;
    if (newLevel > agent.level) {
      agent.level = newLevel;
      gameState.addChatMessage({
        id: `agent_levelup_${agent.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: agent.id,
        message: `🎉 ${agent.name} leveled up to level ${newLevel}!`,
        timestamp: Date.now(),
        type: 'action'
      });
    }
    
    // Give player XP for interacting
    const state = gameState.getState();
    const playerXpGain = 5 + Math.floor(Math.random() * 10); // 5-15 XP for player
    state.playerWallet.experiencePoints += playerXpGain;
    
    // Show floating XP gain notification
    showFloatingNotification(`+${playerXpGain} XP`, '#2196F3');
    
    // Check for player level up
    const playerNewLevel = Math.floor(state.playerWallet.experiencePoints / 200) + 1;
    if (playerNewLevel > state.playerWallet.level) {
      state.playerWallet.level = playerNewLevel;
      
      // Show prominent level up notification
      showFloatingNotification(`LEVEL UP! ${playerNewLevel}`, '#FFD700');
      
      gameState.addChatMessage({
        id: `player_levelup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: 'player',
        message: `🎉 Player leveled up to level ${playerNewLevel}!`,
        timestamp: Date.now(),
        type: 'action'
      });
    }
    
    // Save wallet to Redis
    savePlayerWalletToRedis();
    
    // Add player interaction message
    gameState.addChatMessage({
      id: `player_interact_${agent.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: 'player',
      message: `👋 Player approaches ${agent.name} (+${xpGain} XP to ${agent.name}, +${playerXpGain} XP to player)`,
      timestamp: Date.now(),
      type: 'interaction'
    });

    // Trigger agent response
    setTimeout(() => {
      const responses = [
        `Hello! Nice to meet you!`,
        `Hi there! How can I help you?`,
        `Good to see you! What brings you here?`,
        `Hello! I'm ${agent.name}, nice to meet you!`,
        `Hi! I'm working on some interesting projects.`,
        `Hello! Welcome to our space station!`
      ];
      
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      // Add agent response
      gameState.addChatMessage({
        id: `agent_response_${agent.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: agent.id,
        message: `💬 ${agent.name}: "${response}"`,
        timestamp: Date.now(),
        type: 'interaction'
      });

      // Set agent chat bubble
      agent.chatBubble = {
        message: response,
        timestamp: Date.now(),
        duration: 5000
      };
    }, 1000);
  };

  const movePlayerToBuilding = (gridX: number, gridY: number, building: any) => {
    const buildingNames: Record<string, string> = {
      [TileType.LIVING_QUARTERS]: 'Living Quarters',
      [TileType.RESEARCH_LAB]: 'Research Lab',
      [TileType.ENGINEERING_BAY]: 'Engineering Bay',
      [TileType.RECREATION]: 'Recreation Area'
    };

    const buildingName = buildingNames[building.type] || 'Building';
    
    // Move player to building
    gameState.setPlayerPath([{x: gridX, y: gridY}], {
      type: 'building',
      name: buildingName
    });

    // Add interaction message
    gameState.addChatMessage({
      id: `player_building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: 'player',
      message: `🏢 Player is going to ${buildingName}`,
      timestamp: Date.now(),
      type: 'action'
    });
  };

  const startPlayerActivitySystem = () => {
    // Give player random activities every 30-60 seconds
    const scheduleNextActivity = () => {
      const delay = 30000 + Math.random() * 30000; // 30-60 seconds
      setTimeout(() => {
        triggerRandomPlayerActivity();
        scheduleNextActivity();
      }, delay);
    };
    
    scheduleNextActivity();
  };

  const triggerRandomPlayerActivity = () => {
    const state = gameState.getState();
    
    // Don't trigger if player is already moving
    if (state.isPlayerFollowingPath) return;
    
    const activities = [
      () => exploreNearbyArea(),
      () => visitRandomBuilding(),
      () => checkOnAgents(),
      () => patrolStation(),
      () => takeBreak()
    ];
    
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    randomActivity();
  };

  const exploreNearbyArea = () => {
    const state = gameState.getState();
    const playerX = Math.round(state.playerPosition.pixelX / state.tileSize);
    const playerY = Math.round(state.playerPosition.pixelY / state.tileSize);
    
    // Find a random nearby location
    const offsetX = (Math.random() - 0.5) * 10; // Within 5 tiles
    const offsetY = (Math.random() - 0.5) * 10;
    const targetX = Math.max(0, Math.min(state.mapWidth - 1, playerX + offsetX));
    const targetY = Math.max(0, Math.min(state.mapHeight - 1, playerY + offsetY));
    
    gameState.setPlayerPath([{x: targetX, y: targetY}], {
      type: 'building',
      name: 'nearby area'
    });

    gameState.addChatMessage({
      id: `player_explore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: 'player',
      message: `🔍 Player decides to explore the nearby area`,
      timestamp: Date.now(),
      type: 'action'
    });
  };

  const visitRandomBuilding = () => {
    const state = gameState.getState();
    const buildings = [];
    
    // Find all buildings
    for (let x = 0; x < state.mapWidth; x++) {
      for (let y = 0; y < state.mapHeight; y++) {
        const tile = state.mapData.get(`${x},${y}`);
        if (tile && (tile.type === TileType.LIVING_QUARTERS || 
                     tile.type === TileType.RESEARCH_LAB || 
                     tile.type === TileType.ENGINEERING_BAY || 
                     tile.type === TileType.RECREATION)) {
          buildings.push({x, y, type: tile.type});
        }
      }
    }
    
    if (buildings.length > 0) {
      const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
      const buildingNames = {
        [TileType.LIVING_QUARTERS]: 'Living Quarters',
        [TileType.RESEARCH_LAB]: 'Research Lab',
        [TileType.ENGINEERING_BAY]: 'Engineering Bay',
        [TileType.RECREATION]: 'Recreation Area'
      };
      
      gameState.setPlayerPath([{x: randomBuilding.x, y: randomBuilding.y}], {
        type: 'building',
        name: buildingNames[randomBuilding.type]
      });

      gameState.addChatMessage({
        id: `player_visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: 'player',
        message: `🏢 Player decides to visit the ${buildingNames[randomBuilding.type]}`,
        timestamp: Date.now(),
        type: 'action'
      });
    }
  };

  const checkOnAgents = () => {
    const state = gameState.getState();
    const agents = Array.from(state.aiAgents.values());
    
    if (agents.length > 0) {
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const agentX = Math.round(randomAgent.x);
      const agentY = Math.round(randomAgent.y);
      
      gameState.setPlayerPath([{x: agentX, y: agentY}], {
        type: 'agent',
        name: randomAgent.name
      });

      gameState.addChatMessage({
        id: `player_check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: 'player',
        message: `👥 Player goes to check on ${randomAgent.name}`,
        timestamp: Date.now(),
        type: 'action'
      });
    }
  };

  const patrolStation = () => {
    const state = gameState.getState();
    const patrolPoints = [
      {x: 5, y: 5}, {x: 20, y: 5}, {x: 20, y: 20}, {x: 5, y: 20}
    ];
    
    const randomPoint = patrolPoints[Math.floor(Math.random() * patrolPoints.length)];
    
    gameState.setPlayerPath([{x: randomPoint.x, y: randomPoint.y}], {
      type: 'building',
      name: 'station perimeter'
    });

    gameState.addChatMessage({
      id: `player_patrol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: 'player',
      message: `🚶‍♂️ Player starts a patrol of the station`,
      timestamp: Date.now(),
      type: 'action'
    });
  };

  const takeBreak = () => {
    gameState.addChatMessage({
      id: `player_break_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: 'player',
      message: `☕ Player takes a moment to rest and observe the station`,
      timestamp: Date.now(),
      type: 'action'
    });
  };

  const startWalletSimulation = () => {
    // Simulate wallet updates every 10-30 seconds
    const scheduleNextUpdate = () => {
      const delay = 10000 + Math.random() * 20000; // 10-30 seconds
      setTimeout(() => {
        updateWallet();
        scheduleNextUpdate();
      }, delay);
    };
    
    scheduleNextUpdate();
  };

  const updateWallet = () => {
    const state = gameState.getState();
    const wallet = state.playerWallet;
    
    // Simulate money earning from activities
    const moneyEarned = 10 + Math.floor(Math.random() * 50); // 10-60 money
    wallet.totalMoney += moneyEarned;
    wallet.lastUpdated = Date.now();
    
    // Show floating money gain notification
    showFloatingNotification(`+$${moneyEarned}`, '#4CAF50');
    
    // Add money earning message
    gameState.addChatMessage({
      id: `wallet_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: 'player',
      message: `💰 Player earned $${moneyEarned} from station activities (Total: $${wallet.totalMoney})`,
      timestamp: Date.now(),
      type: 'action'
    });
    
    // Save wallet to Redis
    savePlayerWalletToRedis();
  };

  const savePlayerWalletToRedis = async () => {
    try {
      const state = gameState.getState();
      const response = await fetch('/api/player/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: 'default_player',
          action: 'update',
          totalMoney: state.playerWallet.totalMoney,
          experiencePoints: state.playerWallet.experiencePoints,
          level: state.playerWallet.level
        })
      });
      
      if (response.ok) {
        console.log('💰 Saved player wallet to Redis');
      } else {
        console.error('Failed to save player wallet to Redis');
      }
    } catch (error) {
      console.error('Failed to save player wallet to Redis:', error);
    }
  };

  const showFloatingNotification = (text: string, color: string) => {
    // Create a temporary floating notification
    const notification = {
      text,
      color,
      x: Math.random() * 400 + 200, // Random position in center area
      y: Math.random() * 200 + 200,
      startTime: Date.now(),
      duration: 2000 // 2 seconds
    };
    
    // Store notification for rendering
    if (!(window as any).floatingNotifications) {
      (window as any).floatingNotifications = [];
    }
    (window as any).floatingNotifications.push(notification);
    
    // Remove notification after duration
    setTimeout(() => {
      if ((window as any).floatingNotifications) {
        (window as any).floatingNotifications = (window as any).floatingNotifications.filter((n: any) => n !== notification);
      }
    }, notification.duration);
  };

  const drawFloatingNotifications = (ctx: CanvasRenderingContext2D) => {
    const notifications = (window as any).floatingNotifications || [];
    const now = Date.now();
    
    ctx.save();
    
    notifications.forEach((notification: any) => {
      const elapsed = now - notification.startTime;
      const progress = elapsed / notification.duration;
      
      if (progress >= 1) return; // Skip expired notifications
      
      // Fade out effect
      const alpha = 1 - progress;
      const yOffset = progress * 50; // Move up over time
      
      // Draw notification with glow effect
      ctx.fillStyle = notification.color;
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      
      // Add shadow/glow
      ctx.shadowColor = notification.color;
      ctx.shadowBlur = 10;
      ctx.globalAlpha = alpha;
      
      ctx.fillText(
        notification.text,
        notification.x,
        notification.y - yOffset
      );
      
      // Reset shadow
      ctx.shadowBlur = 0;
    });
    
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  const movePlayerToLocation = (gridX: number, gridY: number) => {
    // Move player to clicked location
    gameState.setPlayerPath([{x: gridX, y: gridY}], {
      type: 'building',
      name: `location (${gridX}, ${gridY})`
    });

    // Add movement message with more variety
    const movementMessages = [
      `🚶 Player is moving to (${gridX}, ${gridY})`,
      `👣 Player walks to (${gridX}, ${gridY})`,
      `🏃 Player heads to (${gridX}, ${gridY})`,
      `🚶‍♂️ Player explores towards (${gridX}, ${gridY})`,
      `👤 Player navigates to (${gridX}, ${gridY})`
    ];
    
    const message = movementMessages[Math.floor(Math.random() * movementMessages.length)];

    gameState.addChatMessage({
      id: `player_move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: 'player',
      message: message,
      timestamp: Date.now(),
      type: 'action'
    });
  };

  const handleCanvasClick = (event: MouseEvent) => {
    if (!canvasRef.current) return;

    const state = gameState.getState();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert screen coordinates to grid coordinates using effective tile size
    const effectiveTileSize = gameState.getEffectiveTileSize();
    const gridX = Math.floor((x + state.cameraPosition.x * effectiveTileSize) / effectiveTileSize);
    const gridY = Math.floor((y + state.cameraPosition.y * effectiveTileSize) / effectiveTileSize);

    // Get the current selected tool from game state instead of closure
    const currentTool = state.selectedTool;

    // Handle different tools
    switch (currentTool) {
      case Tool.SELECT:
        // Player interaction mode - move to location or interact with agents
        handlePlayerInteraction(gridX, gridY, x, y);
        break;
      case Tool.BULLDOZER:
        gameState.placeTile(gridX, gridY, TileType.SPACE);
        break;
      case Tool.CORRIDOR:
        gameState.placeTile(gridX, gridY, TileType.CORRIDOR);
        break;
      case Tool.LIVING_QUARTERS:
        gameState.placeTile(gridX, gridY, TileType.LIVING_QUARTERS);
        break;
      case Tool.RESEARCH_LAB:
        gameState.placeTile(gridX, gridY, TileType.RESEARCH_LAB);
        break;
      case Tool.ENGINEERING_BAY:
        gameState.placeTile(gridX, gridY, TileType.ENGINEERING_BAY);
        break;
      case Tool.RECREATION:
        gameState.placeTile(gridX, gridY, TileType.RECREATION);
        break;
      case Tool.POWER:
        gameState.placeTile(gridX, gridY, TileType.POWER_LINE);
        break;
    }
  };


  // Mouse drag state
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (event: MouseEvent) => {
    if (event.button === 0) { // Left mouse button
      setIsDragging(true);
      setLastMousePos({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (isDragging) {
      const deltaX = event.clientX - lastMousePos.x;
      const deltaY = event.clientY - lastMousePos.y;
      
      // Convert pixel movement to tile movement (invert Y for natural scrolling)
      const tileDeltaX = deltaX / gameState.getEffectiveTileSize();
      const tileDeltaY = -deltaY / gameState.getEffectiveTileSize(); // Invert Y
      
      gameState.moveCamera(tileDeltaX, tileDeltaY);
      
      setLastMousePos({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // Only handle zoom keys if not typing in an input field
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        gameState.moveCamera(0, -0.5); // Move camera up (negative Y)
        break;
      case 'ArrowDown':
        event.preventDefault();
        gameState.moveCamera(0, 0.5); // Move camera down (positive Y)
        break;
      case 'ArrowLeft':
        event.preventDefault();
        gameState.moveCamera(-0.5, 0); // Move camera left (negative X)
        break;
      case 'ArrowRight':
        event.preventDefault();
        gameState.moveCamera(0.5, 0); // Move camera right (positive X)
        break;
      case 'w':
      case 'W':
        event.preventDefault();
        gameState.moveCamera(0, -0.5); // Move camera up
        break;
      case 's':
      case 'S':
        event.preventDefault();
        gameState.moveCamera(0, 0.5); // Move camera down
        break;
      case 'a':
      case 'A':
        event.preventDefault();
        gameState.moveCamera(-0.5, 0); // Move camera left
        break;
      case 'd':
      case 'D':
        event.preventDefault();
        gameState.moveCamera(0.5, 0); // Move camera right
        break;
      case 'e':
      case 'E':
        event.preventDefault();
        exploreNearbyArea();
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        gameState.toggleFreeCameraMode();
        break;
      case 'b':
      case 'B':
        event.preventDefault();
        gameState.moveCameraToBottom();
        break;
      case 'r':
      case 'R':
        event.preventDefault();
        gameState.moveCameraToTopRight();
        break;
      case 'g':
      case 'G':
        event.preventDefault();
        gameState.debugCameraBounds();
        break;
      case 'v':
      case 'V':
        event.preventDefault();
        visitRandomBuilding();
        break;
      case 'c':
      case 'C':
        event.preventDefault();
        checkOnAgents();
        break;
      case 'p':
      case 'P':
        event.preventDefault();
        patrolStation();
        break;
      case 'r':
      case 'R':
        event.preventDefault();
        takeBreak();
        break;
    }
  };

  const getTileColor = (type: TileType): string => {
    switch (type) {
      case TileType.SPACE:
        return '#228B22'; // SimCity grass green
      case TileType.CORRIDOR:
        return '#404040'; // Dark asphalt
      case TileType.LIVING_QUARTERS:
        return '#8B4513'; // Brown residential
      case TileType.RESEARCH_LAB:
        return '#4169E1'; // Blue commercial
      case TileType.ENGINEERING_BAY:
        return '#696969'; // Gray industrial
      case TileType.RECREATION:
        return '#228B22'; // Green parks
      case TileType.POWER_LINE:
        return '#FFD700'; // Yellow power
      case TileType.WATER:
        return '#4682B4'; // Steel blue water
      default:
        return '#228B22'; // Default to grass
    }
  };

  const drawGrassTexture = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    // SimCity-style grass texture
    ctx.fillStyle = '#228B22'; // Base grass green
    ctx.fillRect(x, y, size, size);
    
    // Add grass texture pattern (bigger for Minecraft style)
    ctx.fillStyle = '#32CD32'; // Lighter grass
    for (let gx = 0; gx < size; gx += 4) {
      for (let gy = 0; gy < size; gy += 4) {
        if ((gx + gy + x + y) % 8 === 0) {
          ctx.fillRect(x + gx, y + gy, 2, 2);
        }
      }
    }
    
    // Add darker grass spots for variation (bigger)
    ctx.fillStyle = '#1F7A1F';
    for (let gx = 2; gx < size; gx += 8) {
      for (let gy = 2; gy < size; gy += 8) {
        if ((gx + gy + x + y) % 16 === 0) {
          ctx.fillRect(x + gx, y + gy, 2, 2);
        }
      }
    }
    
    // Add subtle grid lines like SimCity
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(x, y, size, 1); // Top border
    ctx.fillRect(x, y, 1, size); // Left border
  };

  const isCorridorType = (type: TileType | undefined): boolean => {
    return type === TileType.CORRIDOR;
  };

  const lightenColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  const drawAIAgent = (ctx: CanvasRenderingContext2D, agent: AIAgent, x: number, y: number, tileSize: number) => {
    const centerX = x + tileSize / 2;
    const centerY = y + tileSize / 2;
    const size = tileSize * 0.8; // Make crewmates bigger
    
    // Minecraft-style chunky agent body
    ctx.fillStyle = agent.color;
    ctx.fillRect(centerX - size * 0.3, centerY - size * 0.2, size * 0.6, size * 0.8);
    
    // Agent head (square)
    ctx.fillStyle = agent.color;
    ctx.fillRect(centerX - size * 0.25, centerY - size * 0.4, size * 0.5, size * 0.3);
    
    // Agent visor (white, rectangular)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(centerX - size * 0.2, centerY - size * 0.35, size * 0.4, size * 0.15);
    
    // Simple eyes (black squares)
    ctx.fillStyle = '#000000';
    ctx.fillRect(centerX - size * 0.12, centerY - size * 0.3, size * 0.06, size * 0.06);
    ctx.fillRect(centerX + size * 0.06, centerY - size * 0.3, size * 0.06, size * 0.06);
    
    // Activity indicator (bigger)
    if (agent.activity !== CrewmateActivity.WALKING) {
      const indicatorColor = getActivityColor(agent.activity);
      ctx.fillStyle = indicatorColor;
      ctx.fillRect(centerX + size * 0.2, centerY - size * 0.3, size * 0.15, size * 0.15);
    }
    
    // Walking animation - slight bounce
    if (agent.activity === CrewmateActivity.WALKING) {
      const bounce = Math.sin(agent.animationFrame * 0.5) * 3;
      ctx.translate(0, bounce);
    }
    
    // Interaction indicator
    if (agent.interactionTarget) {
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(centerX - size * 0.4, centerY - size * 0.5, size * 0.1, size * 0.1);
    }
  };

  const getActivityColor = (activity: CrewmateActivity): string => {
    switch (activity) {
      case CrewmateActivity.WORKING:
        return '#ffaa00';
      case CrewmateActivity.RESTING:
        return '#00ff88';
      case CrewmateActivity.EATING:
        return '#ff6b6b';
      case CrewmateActivity.RESEARCHING:
        return '#aa88ff';
      case CrewmateActivity.MAINTAINING:
        return '#ff8800';
      default:
        return '#ffffff';
    }
  };

  const drawActivityStatus = (ctx: CanvasRenderingContext2D, agent: AIAgent, x: number, y: number, tileSize: number) => {
    // Only show activity status if agent is not in a chat bubble
    if (agent.chatBubble) return;
    
    const statusText = agent.currentThought || getActivityText(agent.activity);
    if (!statusText) return;
    
    const fontSize = 10;
    const padding = 4;
    
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    
    // Measure text width
    const textWidth = ctx.measureText(statusText).width;
    const textHeight = fontSize + 2;
    
    // Position above agent
    const statusX = x + tileSize / 2;
    const statusY = y - 15;
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(
      statusX - textWidth / 2 - padding,
      statusY - textHeight - padding,
      textWidth + padding * 2,
      textHeight + padding * 2
    );
    
    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(statusText, statusX, statusY);
  };

  const drawAgentXP = (ctx: CanvasRenderingContext2D, agent: AIAgent, x: number, y: number, tileSize: number) => {
    const fontSize = 9;
    const padding = 3;
    
    // XP and level info
    const xpText = `Lv.${agent.level} (${agent.experiencePoints} XP)`;
    const interactionText = `${agent.totalInteractions} interactions`;
    
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    
    // Measure text widths
    const xpWidth = ctx.measureText(xpText).width;
    const interactionWidth = ctx.measureText(interactionText).width;
    const maxWidth = Math.max(xpWidth, interactionWidth);
    const textHeight = fontSize + 2;
    
    // Position above agent (below activity status if present)
    const xpX = x + tileSize / 2;
    const xpY = y - 35; // Higher up to avoid overlap with activity status
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(
      xpX - maxWidth / 2 - padding,
      xpY - (textHeight * 2) - padding * 2,
      maxWidth + padding * 2,
      (textHeight * 2) + padding * 2
    );
    
    // Draw XP text
    ctx.fillStyle = '#4CAF50'; // Green for XP
    ctx.fillText(xpText, xpX, xpY - textHeight);
    
    // Draw interaction text
    ctx.fillStyle = '#2196F3'; // Blue for interactions
    ctx.fillText(interactionText, xpX, xpY);
  };

  const getActivityText = (activity: CrewmateActivity): string => {
    switch (activity) {
      case CrewmateActivity.WORKING:
        return 'Working';
      case CrewmateActivity.RESTING:
        return 'Resting';
      case CrewmateActivity.EATING:
        return 'Taking break';
      case CrewmateActivity.RESEARCHING:
        return 'Researching';
      case CrewmateActivity.MAINTAINING:
        return 'Maintaining';
      case CrewmateActivity.WALKING:
        return 'Walking';
      default:
        return 'Active';
    }
  };

  const drawChatBubble = (ctx: CanvasRenderingContext2D, agent: AIAgent, x: number, y: number, tileSize: number) => {
    if (!agent.chatBubble) return;
    
    const message = agent.chatBubble.message;
    const maxWidth = 150;
    const padding = 8;
    const fontSize = 12;
    
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'left';
    
    // Word wrap the message
    const words = message.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth - padding * 2) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    const lineHeight = fontSize + 2;
    const bubbleHeight = lines.length * lineHeight + padding * 2;
    const bubbleWidth = Math.min(maxWidth, Math.max(...lines.map(line => ctx.measureText(line).width)) + padding * 2);
    
    // Position bubble above agent
    const bubbleX = x + tileSize / 2 - bubbleWidth / 2;
    const bubbleY = y - bubbleHeight - 10;
    
    // Draw bubble background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
    
    // Draw bubble border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
    
    // Draw bubble tail
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.moveTo(bubbleX + bubbleWidth / 2 - 5, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + bubbleWidth / 2 + 5, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight + 8);
    ctx.closePath();
    ctx.fill();
    
    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    
    lines.forEach((line, index) => {
      ctx.fillText(
        line,
        bubbleX + padding,
        bubbleY + padding + (index + 1) * lineHeight - 2
      );
    });
    
    // Draw agent name tag
    ctx.font = '10px Arial';
    ctx.fillStyle = agent.color;
    const nameWidth = ctx.measureText(agent.name).width;
    ctx.fillText(
      agent.name,
      bubbleX + bubbleWidth / 2 - nameWidth / 2,
      bubbleY - 5
    );
  };

  const drawRoadTile = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, state: GameState, tileX: number, tileY: number, roadType: TileType) => {
    // Enhanced retro bitmap road colors - single road type
    const baseColor = '#2A2A2A'; // Dark asphalt
    const lineColor = '#4d4d4d'; // White lines
    const edgeColor = '#1A1A1A'; // Darker edge
    const highlightColor = '#404040'; // Lighter highlight
    
    // Draw base asphalt with retro bitmap texture
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, size, size);
    
    // Add retro bitmap asphalt texture pattern
    ctx.fillStyle = lightenColor(baseColor, 20);
    for (let ax = 0; ax < size; ax += 2) {
      for (let ay = 0; ay < size; ay += 2) {
        if ((ax + ay + x + y) % 4 === 0) {
          ctx.fillRect(x + ax, y + ay, 1, 1);
        }
      }
    }
    
    // Add darker texture spots for more detail
    ctx.fillStyle = lightenColor(baseColor, -20);
    for (let ax = 1; ax < size; ax += 3) {
      for (let ay = 1; ay < size; ay += 3) {
        if ((ax + ay + x + y) % 6 === 0) {
          ctx.fillRect(x + ax, y + ay, 1, 1);
        }
      }
    }
    
    // Check adjacent tiles for road connections
    const hasRoadNorth = isCorridorType(state.mapData.get(`${tileX},${tileY - 1}`)?.type);
    const hasRoadSouth = isCorridorType(state.mapData.get(`${tileX},${tileY + 1}`)?.type);
    const hasRoadEast = isCorridorType(state.mapData.get(`${tileX + 1},${tileY}`)?.type);
    const hasRoadWest = isCorridorType(state.mapData.get(`${tileX - 1},${tileY}`)?.type);
    
    // Count road connections to determine intersection type
    const connectionCount = [hasRoadNorth, hasRoadSouth, hasRoadEast, hasRoadWest].filter(Boolean).length;
    
    // Draw road markings based on connection pattern (avoiding plus signs)
    ctx.fillStyle = lineColor;
    
    if (connectionCount === 2) {
      // Straight road
      if (hasRoadNorth && hasRoadSouth) {
        // Dashed center line for vertical road
        for (let i = 0; i < size; i += 8) {
          ctx.fillRect(x + size/2 - 1, y + i, 2, 5);
        }
      } else if (hasRoadEast && hasRoadWest) {
        // Dashed center line for horizontal road
        for (let i = 0; i < size; i += 8) {
          ctx.fillRect(x + i, y + size/2 - 1, 5, 2);
        }
      }
    } else if (connectionCount >= 3) {
      // Intersection - draw dashed lines but avoid center
      if (hasRoadNorth && hasRoadSouth) {
        // Vertical dashed lines (avoid center)
        for (let i = 0; i < size/2 - 6; i += 8) {
          ctx.fillRect(x + size/2 - 1, y + i, 2, 5);
        }
        for (let i = size/2 + 6; i < size; i += 8) {
          ctx.fillRect(x + size/2 - 1, y + i, 2, 5);
        }
      }
      if (hasRoadEast && hasRoadWest) {
        // Horizontal dashed lines (avoid center)
        for (let i = 0; i < size/2 - 6; i += 8) {
          ctx.fillRect(x + i, y + size/2 - 1, 5, 2);
        }
        for (let i = size/2 + 6; i < size; i += 8) {
          ctx.fillRect(x + i, y + size/2 - 1, 5, 2);
        }
      }
    }
    
    // Enhanced road edges
    ctx.fillStyle = edgeColor;
    if (!hasRoadNorth) {
      ctx.fillRect(x, y, size, 2);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y + 2, size, 1);
    }
    if (!hasRoadSouth) {
      ctx.fillStyle = edgeColor;
      ctx.fillRect(x, y + size - 2, size, 2);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y + size - 3, size, 1);
    }
    if (!hasRoadEast) {
      ctx.fillStyle = edgeColor;
      ctx.fillRect(x + size - 2, y, 2, size);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + size - 3, y, 1, size);
    }
    if (!hasRoadWest) {
      ctx.fillStyle = edgeColor;
      ctx.fillRect(x, y, 2, size);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 2, y, 1, size);
    }
    
    // Add intersection center marking (only for 4-way intersections)
    if (connectionCount === 4) {
      // Retro bitmap intersection center - small diamond pattern
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + size/2 - 2, y + size/2 - 2, 4, 4);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + size/2 - 1, y + size/2 - 1, 2, 2);
      
      // Add corner markings for better intersection visibility
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + 2, y + 2, 2, 2);
      ctx.fillRect(x + size - 4, y + 2, 2, 2);
      ctx.fillRect(x + 2, y + size - 4, 2, 2);
      ctx.fillRect(x + size - 4, y + size - 4, 2, 2);
    }
  };

  const generateTraffic = (state: GameState) => {
    const newTraffic: TrafficElement[] = [];
    const roadTiles: Array<{x: number, y: number, type: TileType}> = [];
    
    // Find all road tiles
    state.mapData.forEach((tile) => {
      if (isCorridorType(tile.type)) {
        roadTiles.push(tile);
      }
    });
    
    // Generate random traffic on roads (further reduced for performance)
    for (let i = 0; i < Math.min(3, roadTiles.length / 12); i++) {
      const randomRoad = roadTiles[Math.floor(Math.random() * roadTiles.length)];
      if (randomRoad) {
        const directions: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
        const types: Array<'car' | 'bus' | 'pedestrian'> = ['car', 'car', 'car', 'bus', 'pedestrian', 'pedestrian'];
        const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];
        
        newTraffic.push({
          x: randomRoad.x * state.tileSize + Math.random() * state.tileSize,
          y: randomRoad.y * state.tileSize + Math.random() * state.tileSize,
          direction: directions[Math.floor(Math.random() * directions.length)],
          type: types[Math.floor(Math.random() * types.length)],
          speed: Math.random() * 0.5 + 0.2,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    }
    
    setTrafficElements(newTraffic);
  };

  const updateTraffic = () => {
    setTrafficElements(prev => prev.map(element => {
      let newX = element.x;
      let newY = element.y;
      
      switch (element.direction) {
        case 'north':
          newY -= element.speed;
          break;
        case 'south':
          newY += element.speed;
          break;
        case 'east':
          newX += element.speed;
          break;
        case 'west':
          newX -= element.speed;
          break;
      }
      
      // Wrap around or change direction at boundaries
      if (newX < -50 || newX > 2000 || newY < -50 || newY > 2000) {
        // Reset to a random position
        newX = Math.random() * 1000;
        newY = Math.random() * 1000;
      }
      
      return { ...element, x: newX, y: newY };
    }));
  };

  const drawPlayerPath = (ctx: CanvasRenderingContext2D, state: GameState) => {
    if (!state.playerPath || state.playerPath.length < 2) return;
    
    // Only draw remaining path segments (from current position onwards)
    const startIndex = Math.max(0, state.playerPathIndex);
    const remainingPath = state.playerPath.slice(startIndex);
    
    if (remainingPath.length < 1) return; // No remaining path to draw
    
    // Player path - bright blue highlighted path
    ctx.strokeStyle = '#00BFFF'; // Bright blue color for player path
    ctx.lineWidth = 6;
    ctx.setLineDash([]); // Solid line
    ctx.lineCap = 'round';
    ctx.shadowColor = '#00BFFF';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.beginPath();
    
    // Start from player's current position
    const playerWorldX = state.playerPosition.x * state.tileSize + state.tileSize / 2;
    const playerWorldY = state.playerPosition.y * state.tileSize + state.tileSize / 2;
    ctx.moveTo(playerWorldX, playerWorldY);
    
    // Draw line to remaining path nodes
    for (let i = 0; i < remainingPath.length; i++) {
      const node = remainingPath[i];
      const worldX = node.x * state.tileSize + state.tileSize / 2;
      const worldY = node.y * state.tileSize + state.tileSize / 2;
      ctx.lineTo(worldX, worldY);
    }
    
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash pattern
    ctx.shadowBlur = 0; // Reset shadow
    
    // Draw path nodes with enhanced highlighting (only remaining nodes)
    for (let i = 0; i < remainingPath.length; i++) {
      const node = remainingPath[i];
      const worldX = node.x * state.tileSize + state.tileSize / 2;
      const worldY = node.y * state.tileSize + state.tileSize / 2;
      
      // Draw node circle
      ctx.fillStyle = '#00BFFF';
      ctx.shadowColor = '#00BFFF';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(worldX, worldY, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw node number (adjusted for remaining path)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.fillText((startIndex + i + 1).toString(), worldX, worldY);
    }
    
    ctx.shadowBlur = 0; // Reset shadow
  };

  const drawAgentPath = (ctx: CanvasRenderingContext2D, agent: AIAgent, state: GameState) => {
    if (!agent.currentPath || agent.currentPath.length < 2) return;
    
    // Determine path style based on agent activity and destination
    let pathStyle = {
      color: `${agent.color}80`, // Default semi-transparent agent color
      width: 3,
      dash: [5, 5],
      shadow: 'transparent',
      shadowBlur: 0
    };
    
    // Check if this is a master agent (has a task-related thought)
    const isMasterAgent = agent.currentThought && agent.currentThought.includes('Walking to');
    
    if (isMasterAgent) {
      // Master agent path - bright highlighted path
      pathStyle = {
        color: '#FFD700',
        width: 5,
        dash: [],
        shadow: '#FFD700',
        shadowBlur: 10
      };
    } else if (agent.activity === 'walking' && agent.currentThought) {
      // Regular agent with specific destination - colored based on activity
      if (agent.currentThought.includes('work') || agent.currentThought.includes('Heading to work')) {
        pathStyle = {
          color: '#4CAF50', // Green for work
          width: 3,
          dash: [8, 4],
          shadow: '#4CAF50',
          shadowBlur: 8
        };
      } else if (agent.currentThought.includes('home') || agent.currentThought.includes('returning')) {
        pathStyle = {
          color: '#2196F3', // Blue for home
          width: 3,
          dash: [8, 4],
          shadow: '#2196F3',
          shadowBlur: 8
        };
      } else if (agent.currentThought.includes('explore') || agent.currentThought.includes('Exploring')) {
        pathStyle = {
          color: '#FF9800', // Orange for exploration
          width: 3,
          dash: [8, 4],
          shadow: '#FF9800',
          shadowBlur: 8
        };
      }
    }
    
    // Apply path style
    ctx.strokeStyle = pathStyle.color;
    ctx.lineWidth = pathStyle.width;
    ctx.setLineDash(pathStyle.dash);
    ctx.lineCap = 'round';
    ctx.shadowColor = pathStyle.shadow;
    ctx.shadowBlur = pathStyle.shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.beginPath();
    
    for (let i = agent.pathIndex; i < agent.currentPath.length; i++) {
      const node = agent.currentPath[i];
      // Use world coordinates - camera transformation is already applied
      const worldX = node.x * state.tileSize + state.tileSize / 2;
      const worldY = node.y * state.tileSize + state.tileSize / 2;
      
      if (i === agent.pathIndex) {
        // Start from agent's current position for the first segment
        const agentWorldX = agent.x * state.tileSize + state.tileSize / 2;
        const agentWorldY = agent.y * state.tileSize + state.tileSize / 2;
        ctx.moveTo(agentWorldX, agentWorldY);
        ctx.lineTo(worldX, worldY);
      } else {
        ctx.lineTo(worldX, worldY);
      }
    }
    
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash pattern
    ctx.shadowBlur = 0; // Reset shadow
    
    // Draw path nodes with enhanced highlighting for master agents
    if (isMasterAgent) {
      // Master agent path nodes - bright gold circles
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 8;
    } else {
      // Regular agent path nodes
      ctx.fillStyle = `${agent.color}40`; // Very transparent agent color
      ctx.shadowBlur = 0;
    }
    
    for (let i = agent.pathIndex + 1; i < agent.currentPath.length; i++) {
      const node = agent.currentPath[i];
      // Use world coordinates - camera transformation is already applied
      const worldX = node.x * state.tileSize + state.tileSize / 2;
      const worldY = node.y * state.tileSize + state.tileSize / 2;
      
      ctx.beginPath();
      ctx.arc(worldX, worldY, isMasterAgent ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.shadowBlur = 0; // Reset shadow
  };

  const drawTargetBuildingIndicator = (ctx: CanvasRenderingContext2D, agent: AIAgent, state: GameState) => {
    if (!agent.targetBuilding) return;
    
    // Use world coordinates - camera transformation is already applied
    const buildingWorldX = agent.targetBuilding.x * state.tileSize;
    const buildingWorldY = agent.targetBuilding.y * state.tileSize;
    
    // Pulsing highlight around target building
    const time = Date.now() * 0.005;
    const pulse = Math.sin(time) * 0.3 + 0.7; // Pulse between 0.4 and 1.0
    
    ctx.strokeStyle = `${agent.color}${Math.floor(pulse * 255).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 4]);
    
    ctx.strokeRect(
      buildingWorldX - 2, 
      buildingWorldY - 2, 
      state.tileSize + 4, 
      state.tileSize + 4
    );
    
    ctx.setLineDash([]);
    
    // Draw destination icon above the building
    const iconX = buildingWorldX + state.tileSize / 2;
    const iconY = buildingWorldY - 10;
    
    ctx.fillStyle = agent.color;
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎯', iconX, iconY);
    
    // Draw building type text
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 2;
    
    const buildingName = getBuildingDisplayName(agent.targetBuilding.type);
    ctx.strokeText(buildingName, iconX, iconY - 15);
    ctx.fillText(buildingName, iconX, iconY - 15);
  };

  const getBuildingDisplayName = (type: TileType): string => {
    switch (type) {
      case TileType.RESEARCH_LAB: return 'Research Lab';
      case TileType.ENGINEERING_BAY: return 'Engineering';
      case TileType.LIVING_QUARTERS: return 'Housing';
      case TileType.RECREATION: return 'Recreation';
      default: return 'Building';
    }
  };

  const drawAgentNameOnBuilding = (ctx: CanvasRenderingContext2D, tile: any, x: number, y: number, state: GameState) => {
    // Check if this tile is a building that can have agents assigned
    if (tile.type !== TileType.LIVING_QUARTERS && 
        tile.type !== TileType.RESEARCH_LAB && 
        tile.type !== TileType.ENGINEERING_BAY) {
      return;
    }

    // Find which agent is assigned to this building
    const agents = Array.from(state.aiAgents.values());
    const assignedAgent = agents.find(agent => {
      // Check if agent is at this building location
      return Math.round(agent.x) === tile.x && Math.round(agent.y) === tile.y;
    });

    if (assignedAgent) {
      // Set up text styling
      ctx.font = 'bold 12px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      // Calculate position (above the building)
      const textX = x + state.tileSize / 2;
      const textY = y - 5;

      // Draw text with outline for better visibility
      ctx.strokeText(assignedAgent.name, textX, textY);
      ctx.fillText(assignedAgent.name, textX, textY);

      // Draw a small background rectangle for better readability
      const textMetrics = ctx.measureText(assignedAgent.name);
      const textWidth = textMetrics.width;
      const padding = 4;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(
        textX - textWidth / 2 - padding, 
        textY - 16, 
        textWidth + padding * 2, 
        14
      );

      // Redraw the text on top of the background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillText(assignedAgent.name, textX, textY);
    }
  };

  const drawTraffic = (ctx: CanvasRenderingContext2D, state: GameState) => {
    trafficElements.forEach(element => {
      // Use world coordinates - camera transformation is already applied
      const worldX = element.x;
      const worldY = element.y;
      
      ctx.fillStyle = element.color;
      
      if (element.type === 'car') {
        // Draw car
        if (element.direction === 'north' || element.direction === 'south') {
          ctx.fillRect(worldX - 2, worldY - 4, 4, 8);
        } else {
          ctx.fillRect(worldX - 4, worldY - 2, 8, 4);
        }
      } else if (element.type === 'bus') {
        // Draw bus (larger)
        if (element.direction === 'north' || element.direction === 'south') {
          ctx.fillRect(worldX - 3, worldY - 6, 6, 12);
        } else {
          ctx.fillRect(worldX - 6, worldY - 3, 12, 6);
        }
      } else if (element.type === 'pedestrian') {
        // Draw pedestrian (small dot)
        ctx.fillRect(worldX - 1, worldY - 1, 2, 2);
      }
    });
  };

  const updateCanvas = (state: GameState) => {
    if (!ctxRef.current || !canvasRef.current) return;

    const ctx = ctxRef.current;
    const canvas = canvasRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill with grass background (matches map empty areas)
    ctx.fillStyle = '#32CD32'; // Grass green background to match map
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render tileset background if available
    if (backgroundCanvas) {
      ctx.drawImage(backgroundCanvas, state.cameraPosition.x, state.cameraPosition.y);
    }

    // Save context for transformations
    ctx.save();

    // Apply camera transformation (convert tile coordinates to pixel coordinates)
    const effectiveTileSize = gameState.getEffectiveTileSize();
    const cameraPixelX = -state.cameraPosition.x * effectiveTileSize;
    const cameraPixelY = -state.cameraPosition.y * effectiveTileSize;
    ctx.translate(cameraPixelX, cameraPixelY);

    // Calculate visible area to optimize rendering
    const viewportLeft = Math.floor(state.cameraPosition.x) - 2;
    const viewportRight = Math.floor(state.cameraPosition.x + canvas.width / effectiveTileSize) + 2;
    const viewportTop = Math.floor(state.cameraPosition.y) - 2;
    const viewportBottom = Math.floor(state.cameraPosition.y + canvas.height / effectiveTileSize) + 2;

    // Use actual map dimensions from game state
    const mapWidth = state.mapWidth;
    const mapHeight = state.mapHeight;
    
    // Draw map background within boundaries
    ctx.fillStyle = '#228B22'; // Grass green background for map area
    ctx.fillRect(0, 0, mapWidth * effectiveTileSize, mapHeight * effectiveTileSize);
    
    // Render background grass for empty areas within map boundaries only
    for (let tileX = Math.max(0, viewportLeft); tileX <= Math.min(mapWidth - 1, viewportRight); tileX++) {
      for (let tileY = Math.max(0, viewportTop); tileY <= Math.min(mapHeight - 1, viewportBottom); tileY++) {
        const x = tileX * effectiveTileSize;
        const y = tileY * effectiveTileSize;
        
        // If no tile exists at this position within map boundaries, render grass
        if (!state.mapData.has(`${tileX},${tileY}`)) {
          drawGrassTexture(ctx, x, y, effectiveTileSize);
        }
      }
    }
    
    // Draw map boundary
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, mapWidth * effectiveTileSize, mapHeight * effectiveTileSize);

    // Render existing tiles
    state.mapData.forEach((tile) => {
      // Only render tiles in viewport
      if (tile.x < viewportLeft || tile.x > viewportRight || 
          tile.y < viewportTop || tile.y > viewportBottom) {
        return;
      }

      const x = tile.x * effectiveTileSize;
      const y = tile.y * effectiveTileSize;

      // Special rendering for different tile types
      if (tile.type === TileType.SPACE) {
        drawGrassTexture(ctx, x, y, effectiveTileSize);
      } else if (isCorridorType(tile.type)) {
        drawRoadTile(ctx, x, y, effectiveTileSize, state, tile.x, tile.y, tile.type);
      } else {
        // Fill zoning background color for districts
        ctx.fillStyle = getTileColor(tile.type);
        ctx.fillRect(x, y, effectiveTileSize, effectiveTileSize);
        
        // Add subtle zoning pattern
        if (tile.type === TileType.LIVING_QUARTERS) {
          ctx.fillStyle = 'rgba(100, 150, 200, 0.3)'; // Semi-transparent blue overlay
          ctx.fillRect(x, y, effectiveTileSize, effectiveTileSize);
        } else if (tile.type === TileType.RESEARCH_LAB) {
          ctx.fillStyle = 'rgba(150, 100, 200, 0.3)'; // Semi-transparent purple overlay
          ctx.fillRect(x, y, effectiveTileSize, effectiveTileSize);
        } else if (tile.type === TileType.ENGINEERING_BAY) {
          ctx.fillStyle = 'rgba(200, 150, 100, 0.3)'; // Semi-transparent orange overlay
          ctx.fillRect(x, y, effectiveTileSize, effectiveTileSize);
        } else if (tile.type === TileType.RECREATION) {
          ctx.fillStyle = 'rgba(100, 200, 150, 0.3)'; // Semi-transparent green overlay
          ctx.fillRect(x, y, effectiveTileSize, effectiveTileSize);
        }

        // Add SimCity-style building sprites
        if (tile.type === TileType.LIVING_QUARTERS) {
          // Create variety in residential buildings based on position
          const buildingType = (tile.x + tile.y) % 4;
          
          if (buildingType === 0) {
            // Small house (Minecraft-sized)
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 8, y + 32, 48, 24);
            
            // House base (brown)
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 6, y + 28, 48, 24);
            
            // Roof (dark red)
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(x + 2, y + 20, 56, 12);
            
            // Roof peak
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 6, y + 16, 48, 8);
            
            // Windows (yellow, bigger)
            ctx.fillStyle = '#FFFF99';
            ctx.fillRect(x + 12, y + 32, 8, 8);
            ctx.fillRect(x + 26, y + 32, 8, 8);
            ctx.fillRect(x + 40, y + 32, 8, 8);
            
            // Door (dark brown, bigger)
            ctx.fillStyle = '#654321';
            ctx.fillRect(x + 26, y + 40, 8, 12);
            
          } else if (buildingType === 1) {
            // Medium house (scaled for 64px)
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 6, y + 28, 52, 32);
            
            // House base (tan)
            ctx.fillStyle = '#D2B48C';
            ctx.fillRect(x + 4, y + 24, 52, 32);
            
            // Roof (blue)
            ctx.fillStyle = '#4682B4';
            ctx.fillRect(x + 0, y + 16, 60, 12);
            
            // Chimney (bigger)
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 44, y + 12, 8, 16);
            
            // Windows (yellow, bigger)
            ctx.fillStyle = '#FFFF99';
            ctx.fillRect(x + 8, y + 28, 8, 8);
            ctx.fillRect(x + 20, y + 28, 8, 8);
            ctx.fillRect(x + 32, y + 28, 8, 8);
            ctx.fillRect(x + 8, y + 40, 8, 8);
            ctx.fillRect(x + 32, y + 40, 8, 8);
            
            // Door (brown, bigger)
            ctx.fillStyle = '#654321';
            ctx.fillRect(x + 20, y + 36, 8, 16);
            
          } else if (buildingType === 2) {
            // Large house (scaled for 64px)
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 2, y + 24, 60, 36);
            
            // House base (gray)
            ctx.fillStyle = '#A9A9A9';
            ctx.fillRect(x + 0, y + 20, 60, 36);
            
            // Roof (green)
            ctx.fillStyle = '#228B22';
            ctx.fillRect(x + 0, y + 12, 60, 12);
            
            // Multiple chimneys (bigger)
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 12, y + 8, 6, 16);
            ctx.fillRect(x + 42, y + 8, 6, 16);
            
            // Windows (yellow, bigger grid)
            ctx.fillStyle = '#FFFF99';
            for (let i = 0; i < 5; i++) {
              ctx.fillRect(x + 6 + i * 10, y + 28, 6, 6);
              if (i !== 2) { // Skip middle for door
                ctx.fillRect(x + 6 + i * 10, y + 40, 6, 6);
              }
            }
            
            // Door (dark brown, bigger)
            ctx.fillStyle = '#654321';
            ctx.fillRect(x + 26, y + 36, 8, 20);
            
          } else {
            // Apartment building (scaled for 64px)
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 6, y + 16, 52, 44);
            
            // Building base (brick red)
            ctx.fillStyle = '#B22222';
            ctx.fillRect(x + 4, y + 12, 52, 44);
            
            // Roof (dark gray)
            ctx.fillStyle = '#2F2F2F';
            ctx.fillRect(x + 2, y + 8, 56, 8);
            
            // Windows in grid pattern (yellow, bigger)
            ctx.fillStyle = '#FFFF99';
            for (let wx = 0; wx < 4; wx++) {
              for (let wy = 0; wy < 4; wy++) {
                ctx.fillRect(x + 8 + wx * 10, y + 16 + wy * 8, 6, 4);
              }
            }
            
            // Entrance (brown, bigger)
            ctx.fillStyle = '#654321';
            ctx.fillRect(x + 26, y + 48, 8, 8);
          }
          
        } else if (tile.type === TileType.RESEARCH_LAB) {
          // Create variety in commercial buildings
          const buildingType = (tile.x * 3 + tile.y * 2) % 3;
          
          if (buildingType === 0) {
            // Office building (scaled for 64px)
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 4, y + 12, 56, 48);
            
            // Building base (blue)
            ctx.fillStyle = '#4169E1';
            ctx.fillRect(x + 2, y + 8, 56, 48);
            
            // Roof (dark blue)
            ctx.fillStyle = '#191970';
            ctx.fillRect(x + 0, y + 4, 60, 8);
            
            // Windows in grid pattern (yellow, bigger)
            ctx.fillStyle = '#FFFF99';
            for (let wx = 0; wx < 5; wx++) {
              for (let wy = 0; wy < 5; wy++) {
                ctx.fillRect(x + 6 + wx * 8, y + 12 + wy * 8, 6, 4);
              }
            }
            
            // Entrance (dark blue, bigger)
            ctx.fillStyle = '#000080';
            ctx.fillRect(x + 26, y + 48, 8, 8);
            
          } else if (buildingType === 1) {
            // Shopping center (scaled for 64px)
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 2, y + 32, 60, 28);
            
            // Building base (cyan)
            ctx.fillStyle = '#00CED1';
            ctx.fillRect(x + 0, y + 28, 60, 28);
            
            // Roof (teal)
            ctx.fillStyle = '#008B8B';
            ctx.fillRect(x + 0, y + 24, 60, 8);
            
            // Store windows (yellow, bigger)
            ctx.fillStyle = '#FFFF99';
            ctx.fillRect(x + 4, y + 36, 16, 12);
            ctx.fillRect(x + 24, y + 36, 16, 12);
            ctx.fillRect(x + 44, y + 36, 12, 12);
            
            // Store signs (red, bigger)
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(x + 6, y + 32, 12, 4);
            ctx.fillRect(x + 26, y + 32, 12, 4);
            ctx.fillRect(x + 46, y + 32, 8, 4);
            
          } else {
            // High-rise office (scaled for 64px)
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 6, y + 4, 52, 56);
            
            // Building base (purple)
            ctx.fillStyle = '#9370DB';
            ctx.fillRect(x + 4, y + 0, 52, 56);
            
            // Roof (dark purple)
            ctx.fillStyle = '#4B0082';
            ctx.fillRect(x + 2, y + 0, 56, 6);
            
            // Windows in dense grid (yellow, bigger)
            ctx.fillStyle = '#FFFF99';
            for (let gx = 0; gx < 6; gx++) {
              for (let gy = 0; gy < 7; gy++) {
                ctx.fillRect(x + 8 + gx * 6, y + 8 + gy * 6, 4, 4);
              }
            }
            
            // Entrance (dark purple, bigger)
            ctx.fillStyle = '#4B0082';
            ctx.fillRect(x + 26, y + 48, 8, 8);
          }
          
        } else if (tile.type === TileType.ENGINEERING_BAY) {
          // Create variety in industrial buildings
          const buildingType = (tile.x * 2 + tile.y) % 3;
          
          if (buildingType === 0) {
            // Heavy factory with smokestacks (scaled for 64px)
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 4, y + 24, 56, 36);
            
            // Factory body (gray)
            ctx.fillStyle = '#696969';
            ctx.fillRect(x + 2, y + 20, 56, 36);
            
            // Factory roof (dark gray)
            ctx.fillStyle = '#2F2F2F';
            ctx.fillRect(x + 0, y + 16, 60, 8);
            
            // Multiple smokestacks (bigger)
            ctx.fillStyle = '#A9A9A9';
            ctx.fillRect(x + 12, y + 4, 6, 16);
            ctx.fillRect(x + 24, y + 2, 8, 18);
            ctx.fillRect(x + 40, y + 6, 6, 14);
            ctx.fillRect(x + 52, y + 4, 6, 16);
            
            // Smoke (light gray, bigger)
            ctx.fillStyle = '#D3D3D3';
            ctx.fillRect(x + 14, y + 0, 4, 6);
            ctx.fillRect(x + 26, y + 0, 4, 4);
            ctx.fillRect(x + 42, y + 2, 4, 6);
            ctx.fillRect(x + 54, y + 0, 4, 6);
            
            // Factory windows (orange glow, bigger)
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(x + 8, y + 28, 6, 6);
            ctx.fillRect(x + 24, y + 28, 6, 6);
            ctx.fillRect(x + 40, y + 28, 6, 6);
            
          } else if (buildingType === 1) {
            // Warehouse (scaled for 64px)
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 2, y + 32, 60, 28);
            
            // Warehouse body (brown)
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 0, y + 28, 60, 28);
            
            // Roof (dark brown)
            ctx.fillStyle = '#654321';
            ctx.fillRect(x + 0, y + 24, 60, 8);
            
            // Loading docks (dark gray, bigger)
            ctx.fillStyle = '#2F2F2F';
            ctx.fillRect(x + 4, y + 44, 12, 12);
            ctx.fillRect(x + 24, y + 44, 12, 12);
            ctx.fillRect(x + 44, y + 44, 12, 12);
            
            // Office section (light blue, bigger)
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(x + 52, y + 36, 6, 12);
            
          } else {
            // Power plant (scaled for 64px)
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 6, y + 28, 52, 32);
            
            // Plant body (steel blue)
            ctx.fillStyle = '#4682B4';
            ctx.fillRect(x + 4, y + 24, 52, 32);
            
            // Roof (dark gray)
            ctx.fillStyle = '#2F2F2F';
            ctx.fillRect(x + 2, y + 20, 56, 8);
            
            // Cooling towers (bigger)
            ctx.fillStyle = '#A9A9A9';
            ctx.fillRect(x + 16, y + 8, 12, 16);
            ctx.fillRect(x + 36, y + 8, 12, 16);
            
            // Steam (white, bigger)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x + 20, y + 4, 4, 8);
            ctx.fillRect(x + 40, y + 4, 4, 8);
            
            // Industrial windows (blue, bigger)
            ctx.fillStyle = '#87CEEB';
            for (let iw = 0; iw < 5; iw++) {
              ctx.fillRect(x + 8 + iw * 8, y + 32, 4, 6);
              ctx.fillRect(x + 8 + iw * 8, y + 44, 4, 6);
            }
          }
          
        } else if (tile.type === TileType.RECREATION) {
          // SimCity-style parks
          const parkType = (tile.x + tile.y * 2) % 4;
          
          if (parkType === 0) {
            // Dense tree park
            // Base grass
            ctx.fillStyle = '#228B22';
            ctx.fillRect(x, y, state.tileSize, state.tileSize);
            
            // Add grass texture
            ctx.fillStyle = '#32CD32';
            for (let gx = 0; gx < state.tileSize; gx += 2) {
              for (let gy = 0; gy < state.tileSize; gy += 2) {
                if ((gx + gy + x + y) % 4 === 0) {
                  ctx.fillRect(x + gx, y + gy, 1, 1);
                }
              }
            }
            
            // Minecraft-style chunky trees
            for (let tx = 0; tx < 2; tx++) {
              for (let ty = 0; ty < 2; ty++) {
                const treeX = x + 8 + tx * 24;
                const treeY = y + 8 + ty * 24;
                
                // Tree trunk (brown, thicker)
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(treeX + 8, treeY + 16, 8, 16);
                
                // Tree foliage (dark green, bigger)
                ctx.fillStyle = '#006400';
                ctx.fillRect(treeX, treeY, 24, 24);
                
                // Tree highlights (bright green)
                ctx.fillStyle = '#228B22';
                ctx.fillRect(treeX + 4, treeY + 4, 16, 16);
              }
            }
            
          } else {
            // Simple grass park
            // Base grass
            ctx.fillStyle = '#228B22';
            ctx.fillRect(x, y, state.tileSize, state.tileSize);
            
            // Add grass texture
            ctx.fillStyle = '#32CD32';
            for (let gx = 0; gx < state.tileSize; gx += 3) {
              for (let gy = 0; gy < state.tileSize; gy += 3) {
                if ((gx + gy + x + y) % 6 === 0) {
                  ctx.fillRect(x + gx, y + gy, 1, 1);
                }
              }
            }
            
            // Bigger park features for 64px tiles
            if (parkType === 1) {
              // Bigger fountain
              ctx.fillStyle = '#4682B4';
              ctx.fillRect(x + 20, y + 20, 24, 24);
              ctx.fillStyle = '#87CEEB';
              ctx.fillRect(x + 24, y + 24, 16, 16);
              // Fountain rim
              ctx.fillStyle = '#D3D3D3';
              ctx.fillRect(x + 20, y + 20, 24, 4);
              ctx.fillRect(x + 20, y + 40, 24, 4);
              ctx.fillRect(x + 20, y + 20, 4, 24);
              ctx.fillRect(x + 40, y + 20, 4, 24);
            } else if (parkType === 2) {
              // Bigger flower bed
              ctx.fillStyle = '#FF69B4';
              ctx.fillRect(x + 16, y + 16, 32, 32);
              ctx.fillStyle = '#FFD700';
              ctx.fillRect(x + 20, y + 20, 24, 24);
              ctx.fillStyle = '#FF0000';
              ctx.fillRect(x + 24, y + 24, 16, 16);
            } else {
              // Bigger single tree
              ctx.fillStyle = '#8B4513';
              ctx.fillRect(x + 28, y + 40, 8, 16);
              ctx.fillStyle = '#006400';
              ctx.fillRect(x + 16, y + 16, 32, 32);
              ctx.fillStyle = '#228B22';
              ctx.fillRect(x + 20, y + 20, 24, 24);
              ctx.fillStyle = '#90EE90';
              ctx.fillRect(x + 24, y + 24, 16, 16);
            }
          }
          
        } else if (tile.type === TileType.POWER_LINE) {
          // Enhanced retro bitmap power lines with better styling
          ctx.fillStyle = '#2A2A2A'; // Dark base
          ctx.fillRect(x, y, state.tileSize, state.tileSize);
          
          // Add retro bitmap ground texture
          ctx.fillStyle = '#1A1A1A';
          for (let px = 0; px < state.tileSize; px += 2) {
            for (let py = 0; py < state.tileSize; py += 2) {
              if ((px + py + x + y) % 4 === 0) {
                ctx.fillRect(x + px, y + py, 1, 1);
              }
            }
          }
          
          // Check adjacent tiles for power line connections
          const hasPowerNorth = state.mapData.get(`${tile.x},${tile.y - 1}`)?.type === TileType.POWER_LINE;
          const hasPowerSouth = state.mapData.get(`${tile.x},${tile.y + 1}`)?.type === TileType.POWER_LINE;
          const hasPowerEast = state.mapData.get(`${tile.x + 1},${tile.y}`)?.type === TileType.POWER_LINE;
          const hasPowerWest = state.mapData.get(`${tile.x - 1},${tile.y}`)?.type === TileType.POWER_LINE;
          
          // Power pole (retro bitmap style)
          ctx.fillStyle = '#8B4513'; // Brown pole
          ctx.fillRect(x + 28, y + 8, 8, 48);
          
          // Add pole texture
          ctx.fillStyle = '#654321';
          ctx.fillRect(x + 30, y + 10, 4, 44);
          ctx.fillStyle = '#A0522D';
          ctx.fillRect(x + 29, y + 12, 6, 2);
          ctx.fillRect(x + 29, y + 20, 6, 2);
          ctx.fillRect(x + 29, y + 28, 6, 2);
          ctx.fillRect(x + 29, y + 36, 6, 2);
          ctx.fillRect(x + 29, y + 44, 6, 2);
          
          // Cross beam (retro bitmap style)
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(x + 16, y + 16, 32, 4);
          
          // Add cross beam texture
          ctx.fillStyle = '#654321';
          ctx.fillRect(x + 18, y + 17, 28, 2);
          ctx.fillStyle = '#A0522D';
          ctx.fillRect(x + 20, y + 18, 2, 1);
          ctx.fillRect(x + 24, y + 18, 2, 1);
          ctx.fillRect(x + 28, y + 18, 2, 1);
          ctx.fillRect(x + 32, y + 18, 2, 1);
          ctx.fillRect(x + 36, y + 18, 2, 1);
          ctx.fillRect(x + 40, y + 18, 2, 1);
          
          // Power lines with retro bitmap styling
          ctx.fillStyle = '#000000';
          ctx.fillRect(x + 0, y + 24, state.tileSize, 2);
          ctx.fillRect(x + 0, y + 32, state.tileSize, 2);
          ctx.fillRect(x + 0, y + 40, state.tileSize, 2);
          
          // Add power line texture (dashed effect)
          ctx.fillStyle = '#333333';
          for (let i = 0; i < state.tileSize; i += 4) {
            ctx.fillRect(x + i, y + 25, 2, 1);
            ctx.fillRect(x + i, y + 33, 2, 1);
            ctx.fillRect(x + i, y + 41, 2, 1);
          }
          
          // Power insulators (retro bitmap style)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x + 20, y + 22, 4, 6);
          ctx.fillRect(x + 40, y + 22, 4, 6);
          ctx.fillRect(x + 20, y + 30, 4, 6);
          ctx.fillRect(x + 40, y + 30, 4, 6);
          ctx.fillRect(x + 20, y + 38, 4, 6);
          ctx.fillRect(x + 40, y + 38, 4, 6);
          
          // Add insulator details
          ctx.fillStyle = '#CCCCCC';
          ctx.fillRect(x + 21, y + 23, 2, 4);
          ctx.fillRect(x + 41, y + 23, 2, 4);
          ctx.fillRect(x + 21, y + 31, 2, 4);
          ctx.fillRect(x + 41, y + 31, 2, 4);
          ctx.fillRect(x + 21, y + 39, 2, 4);
          ctx.fillRect(x + 41, y + 39, 2, 4);
          
          // Add connection lines to adjacent power lines
          if (hasPowerNorth) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 20, y, 2, 8);
            ctx.fillRect(x + 40, y, 2, 8);
            ctx.fillStyle = '#333333';
            ctx.fillRect(x + 20, y + 2, 2, 2);
            ctx.fillRect(x + 40, y + 2, 2, 2);
          }
          if (hasPowerSouth) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 20, y + 56, 2, 8);
            ctx.fillRect(x + 40, y + 56, 2, 8);
            ctx.fillStyle = '#333333';
            ctx.fillRect(x + 20, y + 60, 2, 2);
            ctx.fillRect(x + 40, y + 60, 2, 2);
          }
          if (hasPowerEast) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 56, y + 24, 8, 2);
            ctx.fillRect(x + 56, y + 32, 8, 2);
            ctx.fillRect(x + 56, y + 40, 8, 2);
            ctx.fillStyle = '#333333';
            ctx.fillRect(x + 60, y + 24, 2, 2);
            ctx.fillRect(x + 60, y + 32, 2, 2);
            ctx.fillRect(x + 60, y + 40, 2, 2);
          }
          if (hasPowerWest) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(x, y + 24, 8, 2);
            ctx.fillRect(x, y + 32, 8, 2);
            ctx.fillRect(x, y + 40, 8, 2);
            ctx.fillStyle = '#333333';
            ctx.fillRect(x + 2, y + 24, 2, 2);
            ctx.fillRect(x + 2, y + 32, 2, 2);
            ctx.fillRect(x + 2, y + 40, 2, 2);
          }
          
          // Add warning stripes on pole
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(x + 26, y + 50, 12, 2);
          ctx.fillRect(x + 26, y + 52, 12, 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x + 26, y + 51, 12, 1);
        }
      
      }

      // Add enhanced 3D tile borders and depth
      if (tile.type === TileType.LIVING_QUARTERS || tile.type === TileType.RESEARCH_LAB || tile.type === TileType.ENGINEERING_BAY) {
        // 3D building effect - highlight top and left edges
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + state.tileSize);
        ctx.lineTo(x, y);
        ctx.lineTo(x + state.tileSize, y);
        ctx.stroke();
        
        // Shadow on bottom and right edges
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.moveTo(x + state.tileSize, y);
        ctx.lineTo(x + state.tileSize, y + state.tileSize);
        ctx.lineTo(x, y + state.tileSize);
        ctx.stroke();
      } else {
        // Regular subtle borders for other tiles
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, state.tileSize, state.tileSize);
      }

      // Draw agent name on building if agent is assigned
      drawAgentNameOnBuilding(ctx, tile, x, y, state);
    });

    // Render player with Minecraft-style sprite and walking animation
    // Use world coordinates - camera transformation is already applied
    const playerX = state.playerPosition.pixelX * (effectiveTileSize / state.tileSize) + 8;
    const playerY = state.playerPosition.pixelY * (effectiveTileSize / state.tileSize) + 8;
    const playerSize = 48 * (effectiveTileSize / state.tileSize);

    // Calculate walking animation offsets
    const walkCycle = Math.sin(state.playerPosition.animationFrame * 0.5) * 3;
    const leftLegOffset = state.playerPosition.isMoving ? walkCycle : 0;
    const rightLegOffset = state.playerPosition.isMoving ? -walkCycle : 0;
    const armSwing = state.playerPosition.isMoving ? Math.sin(state.playerPosition.animationFrame * 0.3) * 2 : 0;

    // Player shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(playerX + 4, playerY + 40, playerSize - 4, 8);

    // Minecraft-style chunky player body
    ctx.fillStyle = '#0066CC'; // Blue shirt
    ctx.fillRect(playerX + 12, playerY + 20, 24, 24);
    
    // Player head (bigger and chunkier) - slight bob when walking
    const headBob = state.playerPosition.isMoving ? Math.abs(walkCycle) * 0.3 : 0;
    ctx.fillStyle = '#FFDBAC'; // Skin tone
    ctx.fillRect(playerX + 16, playerY + 4 - headBob, 16, 16);
    
    // Player hair (chunky) - follows head
    ctx.fillStyle = '#8B4513'; // Brown hair
    ctx.fillRect(playerX + 14, playerY + 2 - headBob, 20, 8);
    
    // Player arms (thicker) - swing when walking
    ctx.fillStyle = '#FFDBAC'; // Skin arms
    ctx.fillRect(playerX + 4, playerY + 20 + armSwing, 8, 16);
    ctx.fillRect(playerX + 36, playerY + 20 - armSwing, 8, 16);
    
    // Player shirt sleeves - follow arms
    ctx.fillStyle = '#0066CC';
    ctx.fillRect(playerX + 6, playerY + 22 + armSwing, 4, 12);
    ctx.fillRect(playerX + 38, playerY + 22 - armSwing, 4, 12);
    
    // Player legs (chunky) - walking animation
    ctx.fillStyle = '#333333'; // Dark pants
    ctx.fillRect(playerX + 16, playerY + 36 + leftLegOffset, 8, 12);
    ctx.fillRect(playerX + 24, playerY + 36 + rightLegOffset, 8, 12);
    
    // Player shoes (bigger) - follow legs
    ctx.fillStyle = '#000000';
    ctx.fillRect(playerX + 14, playerY + 44 + leftLegOffset, 12, 4);
    ctx.fillRect(playerX + 22, playerY + 44 + rightLegOffset, 12, 4);
    
    // Player face details - follow head
    ctx.fillStyle = '#000000'; // Eyes
    ctx.fillRect(playerX + 20, playerY + 8 - headBob, 2, 2);
    ctx.fillRect(playerX + 26, playerY + 8 - headBob, 2, 2);
    
    // Simple smile - follow head
    ctx.fillRect(playerX + 22, playerY + 14 - headBob, 4, 1);

    // Direction indicator (optional - face direction)
    if (state.playerPosition.direction === 'left') {
      // Flip eyes slightly for left direction
      ctx.fillStyle = '#000000';
      ctx.fillRect(playerX + 18, playerY + 8 - headBob, 2, 2);
      ctx.fillRect(playerX + 24, playerY + 8 - headBob, 2, 2);
    }

    // Draw player path first (so it appears behind everything)
    if (state.playerPath && state.playerPath.length > 1) {
      drawPlayerPath(ctx, state);
    }

    // Draw agent paths (so they appear behind agents)
    // Note: Paths are drawn in world coordinates, so they will be transformed with the camera
    state.aiAgents.forEach((agent) => {
      // Show paths for all agents that have a current path, regardless of isFollowingPath
      if (agent.currentPath && agent.currentPath.length > 1) {
        drawAgentPath(ctx, agent, state);
      }
    });

    // Draw AI agents
    state.aiAgents.forEach((agent) => {
      // Use world coordinates - camera transformation is already applied
      const worldX = agent.x * effectiveTileSize;
      const worldY = agent.y * effectiveTileSize;
      
      ctx.save();
      drawAIAgent(ctx, agent, worldX, worldY, effectiveTileSize);
      ctx.restore();
      
      // Draw target building indicator if exists
      if (agent.targetBuilding) {
        ctx.save();
        drawTargetBuildingIndicator(ctx, agent, state);
        ctx.restore();
      }
      
      // Draw chat bubble if exists
      ctx.save();
      drawChatBubble(ctx, agent, worldX, worldY, effectiveTileSize);
      ctx.restore();
      
      // Draw activity status text
      ctx.save();
      drawActivityStatus(ctx, agent, worldX, worldY, effectiveTileSize);
      ctx.restore();
      
      // Draw agent XP and level info
      ctx.save();
      drawAgentXP(ctx, agent, worldX, worldY, effectiveTileSize);
      ctx.restore();
    });

    // Draw traffic elements
    drawTraffic(ctx, state);

    // Restore context
    ctx.restore();

    // Draw zoom indicator
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 120, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.restore();

    // Draw rate limit indicator
    const rateLimitStatus = collaborativeTaskService.getRateLimitStatus();
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 50, 150, 30);
    ctx.fillStyle = rateLimitStatus.isLimited ? '#ff6b6b' : '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    const rateLimitText = `Tasks: ${rateLimitStatus.requestsUsed}/${rateLimitStatus.maxRequests}/min`;
    ctx.fillText(rateLimitText, 15, 68);
    if (rateLimitStatus.isLimited) {
      const timeUntilNext = Math.ceil(rateLimitStatus.timeUntilNext / 1000);
      ctx.fillStyle = '#ff6b6b';
      ctx.font = '10px Arial';
      ctx.fillText(`Wait ${timeUntilNext}s`, 15, 80);
    }
    ctx.restore();

    // Draw prominent player wallet info in top-right corner
    const wallet = state.playerWallet;
    const canvasWidth = canvasRef.current?.width || 1024;
    const walletWidth = 280;
    const walletHeight = 100;
    const walletX = canvasWidth - walletWidth - 20;
    const walletY = 20;
    
    ctx.save();
    
    // Draw main wallet background with gradient effect
    const gradient = ctx.createLinearGradient(walletX, walletY, walletX + walletWidth, walletY + walletHeight);
    gradient.addColorStop(0, 'rgba(30, 30, 30, 0.95)');
    gradient.addColorStop(1, 'rgba(50, 50, 50, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(walletX, walletY, walletWidth, walletHeight);
    
    // Draw border with glow effect
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    ctx.strokeRect(walletX, walletY, walletWidth, walletHeight);
    
    // Add inner border
    ctx.strokeStyle = '#66BB6A';
    ctx.lineWidth = 1;
    ctx.strokeRect(walletX + 2, walletY + 2, walletWidth - 4, walletHeight - 4);
    
    // Draw title with larger, more prominent text
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('💰 PLAYER WALLET', walletX + walletWidth / 2, walletY + 25);
    
    // Draw level with prominent styling
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`LEVEL ${wallet.level}`, walletX + 15, walletY + 50);
    
    // Draw XP with progress bar
    ctx.fillStyle = '#2196F3';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`XP: ${wallet.experiencePoints}`, walletX + 15, walletY + 70);
    
    // Draw XP progress bar
    const xpForCurrentLevel = (wallet.level - 1) * 200;
    const xpForNextLevel = wallet.level * 200;
    const xpProgress = (wallet.experiencePoints - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel);
    const progressBarWidth = 120;
    const progressBarHeight = 8;
    const progressBarX = walletX + 15;
    const progressBarY = walletY + 75;
    
    // Progress bar background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
    
    // Progress bar fill
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(progressBarX, progressBarY, progressBarWidth * xpProgress, progressBarHeight);
    
    // Draw money with prominent styling
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`$${wallet.totalMoney.toLocaleString()}`, walletX + walletWidth - 15, walletY + 50);
    
    // Draw money icon
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('💰', walletX + walletWidth - 35, walletY + 50);
    
    // Draw next level XP requirement
    ctx.fillStyle = '#888888';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Next: ${xpForNextLevel - wallet.experiencePoints} XP`, walletX + 15, walletY + 90);
    
    ctx.restore();

    // Draw floating notifications
    drawFloatingNotifications(ctx);
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        // Re-initialize camera position after resize
        gameState.initializeCamera();
        updateCanvas(gameState.getState());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
      

      <LiveFeed />
      
      {/* Free Camera Mode Indicator */}
      {gameStateSnapshot.freeCameraMode && (
        <div className="fixed top-20 left-4 bg-red-600 text-white px-3 py-2 rounded border-2 border-red-400 font-bold text-sm" style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
          FREE CAMERA MODE
        </div>
      )}
      
      {/* Agents List Modal */}
      <AgentsList 
        isVisible={showAgentsList} 
        onClose={() => setShowAgentsList(false)} 
      />
      
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
};

export default GameCanvas;