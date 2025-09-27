import { Pathfinder } from './pathfinding';

export enum Tool {
  SELECT = 'select',
  BULLDOZER = 'bulldozer',
  CORRIDOR = 'corridor',
  LIVING_QUARTERS = 'living_quarters',
  RESEARCH_LAB = 'research_lab',
  ENGINEERING_BAY = 'engineering_bay',
  RECREATION = 'recreation',
  POWER = 'power'
}

export enum TileType {
  SPACE = 'space',
  CORRIDOR = 'corridor',
  LIVING_QUARTERS = 'living_quarters',
  RESEARCH_LAB = 'research_lab',
  ENGINEERING_BAY = 'engineering_bay',
  RECREATION = 'recreation',
  POWER_LINE = 'power_line',
  WATER = 'water'
}

export interface Position {
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  isMoving: boolean;
  animationFrame: number;
  direction: 'left' | 'right' | 'up' | 'down';
}

export interface Tile {
  type: TileType;
  x: number;
  y: number;
}

export enum CrewmateType {
  CREW = 'crew',
  SCIENTIST = 'scientist',
  ENGINEER = 'engineer',
  CAPTAIN = 'captain'
}

export enum CrewmateActivity {
  WALKING = 'walking',
  WORKING = 'working',
  RESTING = 'resting',
  EATING = 'eating',
  RESEARCHING = 'researching',
  MAINTAINING = 'maintaining'
}

export interface ChatMessage {
  id: string;
  agentId: string;
  message: string;
  timestamp: number;
  type: 'thinking' | 'action' | 'interaction';
}

export interface AIAgent {
  id: string;
  name: string;
  type: CrewmateType;
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  activity: CrewmateActivity;
  speed: number;
  direction: 'north' | 'south' | 'east' | 'west';
  animationFrame: number;
  lastMoveTime: number;
  homeX: number;
  homeY: number;
  workX: number;
  workY: number;
  personality: string;
  currentThought: string;
  chatBubble?: {
    message: string;
    timestamp: number;
    duration: number;
  };
  interactionTarget?: string; // ID of another agent they're interacting with
  lastInteractionTime: number;
  autonomyLevel: number; // 0-1, how autonomous this agent is
  goals: string[];
  currentGoal?: string;
  // New pathfinding properties
  currentPath?: Array<{x: number, y: number}>;
  pathIndex: number;
  isFollowingPath: boolean;
  targetBuilding?: {
    x: number;
    y: number;
    type: TileType;
    reason: string;
  };
  lastBuildingVisitTime: number;
  visitCooldown: number; // Time between building visits
  moveInterval: number; // Time between movement steps (ms)
}

// Keep Crewmate interface for backward compatibility
export interface Crewmate extends AIAgent {}

export interface GameState {
  selectedTool: Tool;
  mapData: Map<string, Tile>;
  playerPosition: Position;
  cameraPosition: { x: number; y: number };
  cameraFollowMode: 'player' | 'agent';
  cameraFollowAgentId: string | null;
  isManualCameraControl: boolean;
  gridSize: number;
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
  screenWidth: number;
  screenHeight: number;
  crewmates: Map<string, Crewmate>;
  lastCrewmateUpdate: number;
  aiAgents: Map<string, AIAgent>;
  chatMessages: ChatMessage[];
  maxChatMessages: number;
  playerPath?: Array<{x: number, y: number}>;
  playerPathIndex: number;
  isPlayerFollowingPath: boolean;
}

class GameStateManager {
  private state: GameState = {
    selectedTool: Tool.SELECT,
    mapData: new Map(),
    playerPosition: { x: 12, y: 12, pixelX: 768, pixelY: 768, isMoving: false, animationFrame: 0, direction: 'right' }, // Start at center of compact city
    cameraPosition: { x: 12, y: 12 }, // Start at player position (center of map)
    cameraFollowMode: 'player',
    cameraFollowAgentId: null,
    isManualCameraControl: false,
    gridSize: 64,
    tileSize: 64,
    mapWidth: 25, // Default from defaultMap
    mapHeight: 25, // Default from defaultMap
    screenWidth: 1024, // Default screen width
    screenHeight: 768, // Default screen height
    crewmates: new Map(),
    lastCrewmateUpdate: Date.now(),
    aiAgents: new Map(),
    chatMessages: [],
    maxChatMessages: 100,
    playerPath: undefined,
    playerPathIndex: 0,
    isPlayerFollowingPath: false
  };

  private listeners: Array<(state: GameState) => void> = [];
  private pathfinder: Pathfinder;

  constructor() {
    this.pathfinder = new Pathfinder(this.state);
  }

  getState(): GameState {
    return { ...this.state };
  }

  // Crewmate management methods
  addCrewmate(crewmate: Crewmate): void {
    this.state.crewmates.set(crewmate.id, crewmate);
    this.notifyListeners();
  }

  removeCrewmate(id: string): void {
    this.state.crewmates.delete(id);
    this.notifyListeners();
  }

  updateCrewmate(id: string, updates: Partial<Crewmate>): void {
    const crewmate = this.state.crewmates.get(id);
    if (crewmate) {
      this.state.crewmates.set(id, { ...crewmate, ...updates });
      this.notifyListeners();
    }
  }

  getCrewmates(): Map<string, Crewmate> {
    return new Map(this.state.crewmates);
  }

  // AI Agent management methods
  addAIAgent(agent: AIAgent): void {
    this.state.aiAgents.set(agent.id, agent);
    this.notifyListeners();
  }

  removeAIAgent(id: string): void {
    this.state.aiAgents.delete(id);
    this.notifyListeners();
  }

  clearAllAIAgents(): void {
    this.state.aiAgents.clear();
    this.notifyListeners();
  }

  updateAIAgent(id: string, updates: Partial<AIAgent>): void {
    const agent = this.state.aiAgents.get(id);
    if (agent) {
      this.state.aiAgents.set(id, { ...agent, ...updates });
      
      // Update camera if we're following this agent
      if (this.state.cameraFollowMode === 'agent' && this.state.cameraFollowAgentId === id) {
        this.updateCamera();
      }
      
      this.notifyListeners();
    }
  }

  // Move an agent to a specific location
  moveAgentToLocation(agentId: string, targetX: number, targetY: number): boolean {
    const agent = this.state.aiAgents.get(agentId);
    if (!agent) {
      console.warn(`Agent ${agentId} not found in game state`);
      return false;
    }

    // Update agent's target coordinates
    this.updateAIAgent(agentId, {
      targetX: targetX,
      targetY: targetY,
      activity: CrewmateActivity.WALKING,
      isFollowingPath: false, // Use simple grid movement
      currentPath: undefined,
      pathIndex: 0
    });

    console.log(`Moving agent ${agent.name} (${agentId}) to location (${targetX}, ${targetY})`);
    return true;
  }

  getAIAgents(): Map<string, AIAgent> {
    return new Map(this.state.aiAgents);
  }

  // Chat message management
  addChatMessage(message: ChatMessage): void {
    this.state.chatMessages.push(message);
    if (this.state.chatMessages.length > this.state.maxChatMessages) {
      this.state.chatMessages = this.state.chatMessages.slice(-this.state.maxChatMessages);
    }
    this.notifyListeners();
  }

  getChatMessages(): ChatMessage[] {
    return [...this.state.chatMessages];
  }

  clearOldChatMessages(): void {
    const now = Date.now();
    this.state.chatMessages = this.state.chatMessages.filter(msg => now - msg.timestamp < 300000); // Keep messages for 5 minutes
    this.notifyListeners();
  }

  spawnRandomCrewmate(): Crewmate {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];
    const types = [CrewmateType.CREW, CrewmateType.SCIENTIST, CrewmateType.ENGINEER, CrewmateType.CAPTAIN];
    
    const id = `crewmate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const type = types[Math.floor(Math.random() * types.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Find a random living quarters tile for home
    let homeX = 0, homeY = 0;
    for (const [key, tile] of Array.from(this.state.mapData.entries())) {
      if (tile.type === TileType.LIVING_QUARTERS) {
        homeX = tile.x;
        homeY = tile.y;
        break;
      }
    }
    
    // Find a random work location based on type
    let workX = homeX, workY = homeY;
    for (const [key, tile] of Array.from(this.state.mapData.entries())) {
      if ((type === CrewmateType.SCIENTIST && tile.type === TileType.RESEARCH_LAB) ||
          (type === CrewmateType.ENGINEER && tile.type === TileType.ENGINEERING_BAY) ||
          (type === CrewmateType.CREW && tile.type === TileType.RECREATION)) {
        workX = tile.x;
        workY = tile.y;
        break;
      }
    }
    
    const crewmate: Crewmate = {
      id,
      name: `Crew-${Math.floor(Math.random() * 1000)}`,
      type,
      color,
      x: homeX,
      y: homeY,
      targetX: workX,
      targetY: workY,
      activity: CrewmateActivity.WALKING,
      speed: 1.0 + Math.random() * 1.0, // Random speed between 1.0 and 2.0
      direction: 'east',
      animationFrame: 0,
      lastMoveTime: Date.now(),
      homeX,
      homeY,
      workX,
      workY,
      personality: 'Basic crew member',
      currentThought: 'Ready to work',
      lastInteractionTime: 0,
      autonomyLevel: 0.5,
      goals: ['Complete tasks', 'Help others'],
      // Initialize pathfinding properties for backward compatibility
      pathIndex: 0,
      isFollowingPath: false,
      lastBuildingVisitTime: 0,
      visitCooldown: 15000 + Math.random() * 30000,
      moveInterval: 200 + Math.random() * 200 // 0.2-0.4 seconds between steps
    };
    
    this.addCrewmate(crewmate);
    return crewmate;
  }

  spawnRandomAIAgent(): AIAgent | null {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#ff7675', '#74b9ff'];
    const types = [CrewmateType.CREW, CrewmateType.SCIENTIST, CrewmateType.ENGINEER, CrewmateType.CAPTAIN];
    const personalities = [
      'Curious and analytical', 'Friendly and outgoing', 'Focused and determined', 'Creative and innovative',
      'Methodical and precise', 'Energetic and enthusiastic', 'Calm and thoughtful', 'Ambitious and driven'
    ];
    const names = [
      'Alex', 'Morgan', 'Casey', 'Jordan', 'Taylor', 'Riley', 'Avery', 'Quinn',
      'Blake', 'Cameron', 'Drew', 'Emery', 'Finley', 'Harper', 'Indigo', 'Kai'
    ];
    
    const id = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const type = types[Math.floor(Math.random() * types.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const personality = personalities[Math.floor(Math.random() * personalities.length)];
    const name = names[Math.floor(Math.random() * names.length)] + '-' + Math.floor(Math.random() * 1000);
    
    // Get all available tiles from the loaded map
    const allTiles = Array.from(this.state.mapData.entries());
    
    if (allTiles.length === 0) {
      // No map loaded, can't spawn agents
      return null;
    }
    
    // Find a random living quarters tile for home (only buildings, not roads/corridors)
    let homeX = 0, homeY = 0;
    const livingQuarters = allTiles.filter(([key, tile]) => 
      tile.type === TileType.LIVING_QUARTERS && 
      tile.x >= 0 && tile.x < this.state.mapWidth && tile.y >= 0 && tile.y < this.state.mapHeight // Ensure within boundaries
    );
    if (livingQuarters.length > 0) {
      const randomHome = livingQuarters[Math.floor(Math.random() * livingQuarters.length)];
      homeX = randomHome[1].x;
      homeY = randomHome[1].y;
    } else {
      // If no living quarters, pick any random BUILDING tile from the map (not roads/corridors)
      const buildingTypes = [TileType.LIVING_QUARTERS, TileType.RESEARCH_LAB, TileType.ENGINEERING_BAY, TileType.RECREATION, TileType.POWER_LINE];
      const validBuildingTiles = allTiles.filter(([key, tile]) => 
        buildingTypes.includes(tile.type) &&
        tile.x >= 0 && tile.x < this.state.mapWidth && tile.y >= 0 && tile.y < this.state.mapHeight
      );
      if (validBuildingTiles.length > 0) {
        const randomTile = validBuildingTiles[Math.floor(Math.random() * validBuildingTiles.length)];
        homeX = randomTile[1].x;
        homeY = randomTile[1].y;
      } else {
        // No buildings available, can't spawn agent
        console.warn('No building tiles available for agent spawning');
        return null;
      }
    }
    
    // Ensure home position is within boundaries
    homeX = Math.max(0, Math.min(this.state.mapWidth - 1, homeX));
    homeY = Math.max(0, Math.min(this.state.mapHeight - 1, homeY));
    
    // Find a random work location based on type
    let workX = homeX, workY = homeY;
    let workTileType = TileType.RECREATION;
    if (type === CrewmateType.SCIENTIST) workTileType = TileType.RESEARCH_LAB;
    else if (type === CrewmateType.ENGINEER) workTileType = TileType.ENGINEERING_BAY;
    else if (type === CrewmateType.CAPTAIN) workTileType = TileType.RESEARCH_LAB;
    
    const workTiles = allTiles.filter(([key, tile]) => 
      tile.type === workTileType && 
      tile.x >= 0 && tile.x < this.state.mapWidth && tile.y >= 0 && tile.y < this.state.mapHeight // Ensure within boundaries
    );
    if (workTiles.length > 0) {
      const randomWork = workTiles[Math.floor(Math.random() * workTiles.length)];
      workX = randomWork[1].x;
      workY = randomWork[1].y;
    } else {
      // If no work tiles of preferred type, pick any random BUILDING tile from the map (not roads/corridors)
      const buildingTypes = [TileType.LIVING_QUARTERS, TileType.RESEARCH_LAB, TileType.ENGINEERING_BAY, TileType.RECREATION, TileType.POWER_LINE];
      const validBuildingTiles = allTiles.filter(([key, tile]) => 
        buildingTypes.includes(tile.type) &&
        tile.x >= 0 && tile.x < this.state.mapWidth && tile.y >= 0 && tile.y < this.state.mapHeight
      );
      if (validBuildingTiles.length > 0) {
        const randomTile = validBuildingTiles[Math.floor(Math.random() * validBuildingTiles.length)];
        workX = randomTile[1].x;
        workY = randomTile[1].y;
      } else {
        // No buildings available, use home position
        workX = homeX;
        workY = homeY;
      }
    }
    
    // Ensure work position is within boundaries
    workX = Math.max(0, Math.min(this.state.mapWidth - 1, workX));
    workY = Math.max(0, Math.min(this.state.mapHeight - 1, workY));
    
    const goals = this.generateGoalsForAgent(type);
    
    const agent: AIAgent = {
      id,
      name,
      type,
      color,
      x: homeX,
      y: homeY,
      targetX: workX,
      targetY: workY,
      activity: CrewmateActivity.WALKING,
      speed: 1.2 + Math.random() * 0.8, // Random speed between 1.2 and 2.0
      direction: 'east',
      animationFrame: 0,
      lastMoveTime: Date.now(),
      homeX,
      homeY,
      workX,
      workY,
      personality,
      currentThought: this.generateInitialThought(type, personality),
      lastInteractionTime: 0,
      autonomyLevel: 0.7 + Math.random() * 0.3, // High autonomy
      goals,
      currentGoal: goals[0],
      // Initialize pathfinding properties
      pathIndex: 0,
      isFollowingPath: false,
      lastBuildingVisitTime: 0,
      visitCooldown: 15000 + Math.random() * 30000, // 15-45 seconds between visits
      moveInterval: 150 + Math.random() * 150 // 0.15-0.3 seconds between steps
    };
    
    this.addAIAgent(agent);
    
    // Add initial chat message
    this.addChatMessage({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: agent.id,
      message: `${agent.name} has joined the metaverse!`,
      timestamp: Date.now(),
      type: 'action'
    });
    
    return agent;
  }

  private generateGoalsForAgent(type: CrewmateType): string[] {
    const commonGoals = ['Explore the metaverse', 'Meet other agents', 'Find interesting places'];
    
    switch (type) {
      case CrewmateType.SCIENTIST:
        return [...commonGoals, 'Conduct research', 'Visit laboratories', 'Share knowledge'];
      case CrewmateType.ENGINEER:
        return [...commonGoals, 'Maintain systems', 'Build improvements', 'Solve problems'];
      case CrewmateType.CAPTAIN:
        return [...commonGoals, 'Lead initiatives', 'Coordinate activities', 'Make decisions'];
      default:
        return [...commonGoals, 'Help others', 'Learn new skills', 'Have fun'];
    }
  }

  private generateInitialThought(type: CrewmateType, personality: string): string {
    const thoughts = [
      `Feeling ${personality.split(' ')[0].toLowerCase()} today`,
      'Wondering what adventures await',
      'Ready to explore this virtual world',
      'Excited to meet new friends',
      'Thinking about my next goal'
    ];
    
    switch (type) {
      case CrewmateType.SCIENTIST:
        thoughts.push('Curious about the research facilities here', 'Ready to make new discoveries');
        break;
      case CrewmateType.ENGINEER:
        thoughts.push('Looking for systems to improve', 'Ready to build something amazing');
        break;
      case CrewmateType.CAPTAIN:
        thoughts.push('Time to take charge', 'Ready to lead by example');
        break;
    }
    
    return thoughts[Math.floor(Math.random() * thoughts.length)];
  }

  setTool(tool: Tool) {
    this.state.selectedTool = tool;
    this.notifyListeners();
  }

  // Crewmate AI and movement
  updateCrewmates(): void {
    const now = Date.now();
    const deltaTime = now - this.state.lastCrewmateUpdate;
    this.state.lastCrewmateUpdate = now;

    for (const [id, crewmate] of Array.from(this.state.crewmates.entries())) {
      this.updateCrewmateAI(crewmate, deltaTime);
    }
    
    this.notifyListeners();
  }

  // Enhanced AI agent updates
  updateAIAgents(): void {
    const now = Date.now();
    const deltaTime = now - this.state.lastCrewmateUpdate;
    this.state.lastCrewmateUpdate = now;

    // Clamp deltaTime to reasonable values (max 100ms = 0.1s)
    const clampedDeltaTime = Math.min(deltaTime, 100);

    // Clear old chat messages
    if (now % 30000 < 100) { // Every 30 seconds
      this.clearOldChatMessages();
    }

    // No longer automatically spawn random agents - only real agents from backend should appear

    // Update player path following (convert deltaTime from ms to seconds)
    this.updatePlayerPathFollowing(clampedDeltaTime / 1000);

    for (const [id, agent] of Array.from(this.state.aiAgents.entries())) {
      this.updateAIAgentBehavior(agent, deltaTime, now);
    }
    
    this.notifyListeners();
  }

  private updateAIAgentBehavior(agent: AIAgent, deltaTime: number, now: number): void {
    // Update animation frame
    agent.animationFrame = (agent.animationFrame + 1) % 8;
    
    // Clear expired chat bubble
    if (agent.chatBubble && now - agent.chatBubble.timestamp > agent.chatBubble.duration) {
      agent.chatBubble = undefined;
    }
    
    if (agent.isFollowingPath && agent.currentPath) {
      // Debug: Log when agent is following path
      if (now % 1000 < 50) { // Log once per second
        console.log(`🤖 Agent ${agent.name} following path: ${agent.pathIndex}/${agent.currentPath.length} at (${Math.round(agent.x)}, ${Math.round(agent.y)})`);
      }
      this.followPath(agent, deltaTime, now);
    } else {
      // Random roaming removed - agents only move when following ChatGPT tasks
      
      // Grid-based movement towards target (road-only)
      const currentX = Math.round(agent.x);
      const currentY = Math.round(agent.y);
      const targetX = Math.round(agent.targetX);
      const targetY = Math.round(agent.targetY);
      
      if (currentX === targetX && currentY === targetY) {
        // Reached target, stop moving (no random activity switching)
        agent.activity = CrewmateActivity.RESTING;
      } else {
        // Check if enough time has passed for the next movement step
        if (now - agent.lastMoveTime >= agent.moveInterval) {
          // Calculate movement direction (only horizontal or vertical, no diagonals)
          const dx = targetX - currentX;
          const dy = targetY - currentY;
          
          // Move one step at a time in a single direction (no diagonal movement)
          if (Math.abs(dx) > Math.abs(dy)) {
            // Move horizontally
            const newX = agent.x + (dx > 0 ? 1 : -1);
            if (newX >= 0 && newX < this.state.mapWidth) { // Keep within map boundaries
              agent.x = newX;
              agent.direction = dx > 0 ? 'east' : 'west';
            }
          } else if (dy !== 0) {
            // Move vertically
            const newY = agent.y + (dy > 0 ? 1 : -1);
            if (newY >= 0 && newY < this.state.mapHeight) { // Keep within map boundaries
              agent.y = newY;
              agent.direction = dy > 0 ? 'south' : 'north';
            }
          }
          
          // Ensure agent stays on grid and within boundaries
          agent.x = Math.max(0, Math.min(24, Math.round(agent.x)));
          agent.y = Math.max(0, Math.min(24, Math.round(agent.y)));
          
          // Update last move time
          agent.lastMoveTime = now;
        }
      }
    }
    
    // Agent interactions removed - agents only respond to ChatGPT tasks
    
    this.state.aiAgents.set(agent.id, agent);
  }






  private followPath(agent: AIAgent, deltaTime: number, now: number): void {
    if (!agent.currentPath || agent.pathIndex >= agent.currentPath.length) {
      // Path completed
      agent.isFollowingPath = false;
      agent.currentPath = undefined;
      agent.pathIndex = 0;
      
      if (agent.targetBuilding) {
        this.arriveAtBuilding(agent, now);
      }
      return;
    }
    
    // Check if enough time has passed for the next movement step
    if (now - agent.lastMoveTime < agent.moveInterval) {
      return; // Wait for next movement step
    }
    
    
    const currentTarget = agent.currentPath[agent.pathIndex];
    const currentX = Math.round(agent.x);
    const currentY = Math.round(agent.y);
    
    // Check if we've reached the current target node
    if (currentX === currentTarget.x && currentY === currentTarget.y) {
      // Move to next path node
      agent.pathIndex++;
      agent.lastMoveTime = now;
      return;
    }
    
    // Calculate movement direction (only horizontal or vertical, no diagonals)
    const dx = currentTarget.x - currentX;
    const dy = currentTarget.y - currentY;
    
    // Move one step at a time in a single direction (no diagonal movement)
    if (Math.abs(dx) > Math.abs(dy)) {
      // Move horizontally
      const newX = agent.x + (dx > 0 ? 1 : -1);
      if (newX >= 0 && newX < 25) { // Keep within map boundaries
        agent.x = newX;
        agent.direction = dx > 0 ? 'east' : 'west';
      }
    } else if (dy !== 0) {
      // Move vertically
      const newY = agent.y + (dy > 0 ? 1 : -1);
      if (newY >= 0 && newY < 25) { // Keep within map boundaries
        agent.y = newY;
        agent.direction = dy > 0 ? 'south' : 'north';
      }
    }
    
    // Ensure agent stays on grid and within boundaries
    agent.x = Math.max(0, Math.min(this.state.mapWidth - 1, Math.round(agent.x)));
    agent.y = Math.max(0, Math.min(this.state.mapHeight - 1, Math.round(agent.y)));
    
    // Update last move time
    agent.lastMoveTime = now;
  }

  private arriveAtBuilding(agent: AIAgent, now: number): void {
    if (!agent.targetBuilding) return;
    
    const buildingName = 'Building';
    
    // Set appropriate activity based on building type
    switch (agent.targetBuilding.type) {
      case TileType.RESEARCH_LAB:
        agent.activity = CrewmateActivity.RESEARCHING;
        break;
      case TileType.ENGINEERING_BAY:
        agent.activity = CrewmateActivity.MAINTAINING;
        break;
      case TileType.LIVING_QUARTERS:
        agent.activity = CrewmateActivity.RESTING;
        break;
      case TileType.RECREATION:
        agent.activity = CrewmateActivity.EATING;
        break;
      default:
        agent.activity = CrewmateActivity.WORKING;
    }
    
    // Add arrival message
    agent.chatBubble = {
      message: `${agent.name} arrives at ${buildingName}`,
      timestamp: now,
      duration: 3000
    };
    
    this.addChatMessage({
      id: `arrive_${now}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: agent.id,
      message: `${agent.name} arrives at ${buildingName} and starts ${agent.activity}`,
      timestamp: now,
      type: 'action'
    });
    
    // Schedule departure after some time
    const stayDuration = 5000 + Math.random() * 10000; // 5-15 seconds
    setTimeout(() => {
      agent.activity = CrewmateActivity.WALKING;
      agent.targetBuilding = undefined;
      // Reset visit cooldown
      agent.visitCooldown = 15000 + Math.random() * 30000;
    }, stayDuration);
  }



  private updateCrewmateAI(crewmate: Crewmate, deltaTime: number): void {
    const currentTile = this.state.mapData.get(`${crewmate.x},${crewmate.y}`);
    const now = Date.now();
    
    // Update animation frame
    crewmate.animationFrame = (crewmate.animationFrame + 1) % 8;
    
    // Grid-based movement towards target (road-only)
    const currentX = Math.round(crewmate.x);
    const currentY = Math.round(crewmate.y);
    const targetX = Math.round(crewmate.targetX);
    const targetY = Math.round(crewmate.targetY);
    
    if (currentX === targetX && currentY === targetY) {
      // Reached target, stop moving (no random activity switching)
      crewmate.activity = CrewmateActivity.RESTING;
    } else {
      // Check if enough time has passed for the next movement step
      if (now - crewmate.lastMoveTime >= crewmate.moveInterval) {
        // Calculate movement direction (only horizontal or vertical, no diagonals)
        const dx = targetX - currentX;
        const dy = targetY - currentY;
        
        // Move one step at a time in a single direction (no diagonal movement)
        if (Math.abs(dx) > Math.abs(dy)) {
          // Move horizontally
          const newX = crewmate.x + (dx > 0 ? 1 : -1);
          if (newX >= 0 && newX < 25) { // Keep within map boundaries
            crewmate.x = newX;
            crewmate.direction = dx > 0 ? 'east' : 'west';
          }
        } else if (dy !== 0) {
          // Move vertically
          const newY = crewmate.y + (dy > 0 ? 1 : -1);
          if (newY >= 0 && newY < 25) { // Keep within map boundaries
            crewmate.y = newY;
            crewmate.direction = dy > 0 ? 'south' : 'north';
          }
        }
        
        // Ensure crewmate stays on grid and within boundaries
        crewmate.x = Math.max(0, Math.min(24, Math.round(crewmate.x)));
        crewmate.y = Math.max(0, Math.min(24, Math.round(crewmate.y)));
        
        // Update last move time
        crewmate.lastMoveTime = now;
      }
    }
    
    this.state.crewmates.set(crewmate.id, crewmate);
  }


  placeTile(x: number, y: number, type: TileType) {
    const key = `${x},${y}`;
    this.state.mapData.set(key, { type, x, y });
    this.notifyListeners();
  }

  deleteTile(x: number, y: number) {
    const key = `${x},${y}`;
    this.state.mapData.delete(key);
    this.notifyListeners();
  }

  getTile(x: number, y: number): Tile | undefined {
    const key = `${x},${y}`;
    return this.state.mapData.get(key);
  }

  setPlayerPosition(x: number, y: number, pixelX?: number, pixelY?: number) {
    this.state.playerPosition = { 
      x, 
      y, 
      pixelX: pixelX ?? this.state.playerPosition.pixelX, 
      pixelY: pixelY ?? this.state.playerPosition.pixelY,
      isMoving: this.state.playerPosition.isMoving,
      animationFrame: this.state.playerPosition.animationFrame,
      direction: this.state.playerPosition.direction
    };
    
    // Update camera based on current follow mode if pixel position changed
    if (pixelX !== undefined || pixelY !== undefined) {
      this.updateCamera();
    }
    this.notifyListeners();
  }

  setPlayerPath(path: Array<{x: number, y: number}>) {
    this.state.playerPath = path;
    this.state.playerPathIndex = 0;
    this.state.isPlayerFollowingPath = true;
    this.notifyListeners();
  }

  // Hardcoded test path for immediate testing
  setHardcodedTestPath() {
    const testPath = [
      { x: 12, y: 12 }, // Start at player position
      { x: 13, y: 12 }, // Move right
      { x: 14, y: 12 }, // Move right
      { x: 14, y: 13 }, // Move down
      { x: 14, y: 14 }, // Move down
      { x: 13, y: 14 }, // Move left
      { x: 12, y: 14 }, // Move left
      { x: 12, y: 13 }, // Move up
      { x: 12, y: 12 }  // Back to start
    ];
    
    console.log(`🎯 Setting hardcoded test path with ${testPath.length} nodes`);
    this.setPlayerPath(testPath);
  }

  clearPlayerPath() {
    this.state.playerPath = undefined;
    this.state.playerPathIndex = 0;
    this.state.isPlayerFollowingPath = false;
    this.notifyListeners();
  }

  private updatePlayerPathFollowing(deltaTime: number): void {
    if (!this.state.isPlayerFollowingPath || !this.state.playerPath || this.state.playerPath.length === 0) {
      return;
    }

    console.log(`🔄 Player path following: deltaTime=${deltaTime.toFixed(3)}s, pathIndex=${this.state.playerPathIndex}/${this.state.playerPath.length}`);

    const currentPos = this.state.playerPosition;
    const pathIndex = this.state.playerPathIndex;
    
    if (pathIndex >= this.state.playerPath.length) {
      // Reached end of path
      console.log(`🏁 Player reached end of path at (${Math.round(currentPos.pixelX / this.state.tileSize)}, ${Math.round(currentPos.pixelY / this.state.tileSize)})`);
      this.clearPlayerPath();
      return;
    }

    const targetNode = this.state.playerPath[pathIndex];
    const targetPixelX = targetNode.x * this.state.tileSize;
    const targetPixelY = targetNode.y * this.state.tileSize;
    
    const dx = targetPixelX - currentPos.pixelX;
    const dy = targetPixelY - currentPos.pixelY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If close enough to current target, move to next node
    if (distance < 8) { // 8 pixel threshold for smoother movement
      this.state.playerPathIndex++;
      console.log(`📍 Player reached path node ${pathIndex + 1}/${this.state.playerPath.length} at (${targetNode.x}, ${targetNode.y})`);
      return;
    }
    
    // Move towards target with faster speed for more responsive movement
    const moveSpeed = 300; // pixels per second (increased from 200)
    const moveDistance = moveSpeed * deltaTime; // deltaTime is already in seconds
    
    if (distance > 0) {
      const moveX = (dx / distance) * moveDistance;
      const moveY = (dy / distance) * moveDistance;
      
      const newPixelX = currentPos.pixelX + moveX;
      const newPixelY = currentPos.pixelY + moveY;
      
      console.log(`🚶 Player moving: from (${currentPos.pixelX.toFixed(1)}, ${currentPos.pixelY.toFixed(1)}) to (${newPixelX.toFixed(1)}, ${newPixelY.toFixed(1)}) - distance: ${distance.toFixed(1)}px, moveDistance: ${moveDistance.toFixed(1)}px`);
      
      // Update player position and animation
      this.setPlayerPixelPosition(newPixelX, newPixelY);
      
      // Update animation direction based on movement
      let direction: 'left' | 'right' | 'up' | 'down' = 'right';
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }
      this.updatePlayerAnimation(true, direction);
    }
  }

  setPlayerPixelPosition(pixelX: number, pixelY: number) {
    const tileSize = this.state.tileSize;
    
    // Apply map boundary constraints using actual map dimensions
    const mapWidth = this.state.mapWidth;
    const mapHeight = this.state.mapHeight;
    const maxPixelX = (mapWidth - 1) * tileSize;
    const maxPixelY = (mapHeight - 1) * tileSize;
    
    // Debug logging to see what's happening
    
    // TEMPORARILY DISABLE BOUNDARY CONSTRAINTS FOR TESTING
    const constrainedPixelX = pixelX;
    const constrainedPixelY = pixelY;
    
    const tileX = Math.floor(constrainedPixelX / tileSize);
    const tileY = Math.floor(constrainedPixelY / tileSize);
    
    this.state.playerPosition = { 
      x: tileX, 
      y: tileY, 
      pixelX: constrainedPixelX, 
      pixelY: constrainedPixelY,
      isMoving: this.state.playerPosition.isMoving,
      animationFrame: this.state.playerPosition.animationFrame,
      direction: this.state.playerPosition.direction
    };
    
    console.log(`📍 Player position updated: tile(${tileX}, ${tileY}) pixel(${constrainedPixelX.toFixed(1)}, ${constrainedPixelY.toFixed(1)})`);
    
    // Update camera based on current follow mode
    this.updateCamera();
    this.notifyListeners();
  }

  setCameraPosition(x: number, y: number) {
    const constrainedCamera = this.constrainCameraToMapBounds(x, y);
    this.state.cameraPosition = constrainedCamera;
    this.notifyListeners();
  }

  updatePlayerAnimation(isMoving: boolean, direction?: 'left' | 'right' | 'up' | 'down') {
    if (isMoving) {
      this.state.playerPosition.animationFrame = (this.state.playerPosition.animationFrame + 1) % 8;
    }
    this.state.playerPosition.isMoving = isMoving;
    if (direction) {
      this.state.playerPosition.direction = direction;
    }
    this.notifyListeners();
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    // If no tile exists, treat as grass (walkable)
    return !tile || tile.type === TileType.SPACE || tile.type === TileType.CORRIDOR || tile.type === TileType.RECREATION || tile.type === TileType.WATER;
  }

  // Initialize the map with space terrain
  initializeSpaceTerrain(width: number, height: number) {
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        this.placeTile(x, y, TileType.SPACE);
      }
    }
  }

  // Ensure space terrain exists around a position
  ensureSpaceAround(centerX: number, centerY: number, radius: number = 10) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        if (!this.getTile(x, y)) {
          this.placeTile(x, y, TileType.SPACE);
        }
      }
    }
  }

  loadMapData(mapData: Array<[string, Tile]>) {
    this.state.mapData = new Map(mapData);
    this.notifyListeners();
  }

  setMapDimensions(width: number, height: number) {
    console.log(`Setting map dimensions: ${width}x${height} (was ${this.state.mapWidth}x${this.state.mapHeight})`);
    this.state.mapWidth = width;
    this.state.mapHeight = height;
    this.notifyListeners();
  }

  getMapDataArray(): Array<[string, Tile]> {
    return Array.from(this.state.mapData.entries());
  }

  clearMap() {
    this.state.mapData.clear();
    this.notifyListeners();
  }

  private constrainCameraToMapBounds(cameraX: number, cameraY: number): { x: number, y: number } {
    if (typeof window === 'undefined') {
      return { x: cameraX, y: cameraY };
    }
    
    // Map boundaries using actual map dimensions
    const mapWidth = this.state.mapWidth;
    const mapHeight = this.state.mapHeight;
    const mapPixelWidth = mapWidth * this.state.tileSize;
    const mapPixelHeight = mapHeight * this.state.tileSize;
    
    // Screen dimensions
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Calculate camera bounds
    // Camera X: left edge should not go beyond 0, right edge should not show past map
    const minCameraX = Math.min(0, screenWidth - mapPixelWidth);
    const maxCameraX = 0;
    
    // Camera Y: top edge should not go beyond 0, bottom edge should not show past map
    const minCameraY = Math.min(0, screenHeight - mapPixelHeight);
    const maxCameraY = 0;
    
    // Constrain camera position
    const constrainedX = Math.max(minCameraX, Math.min(maxCameraX, cameraX));
    const constrainedY = Math.max(minCameraY, Math.min(maxCameraY, cameraY));
    
    return { x: constrainedX, y: constrainedY };
  }


  updateCameraToFollowPlayer() {
    if (typeof window !== 'undefined') {
      const playerPos = this.state.playerPosition;
      const playerTileX = playerPos.pixelX / this.state.tileSize;
      const playerTileY = playerPos.pixelY / this.state.tileSize;
      
      // Center the camera on the player
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;
      
      const cameraX = playerTileX - (screenCenterX / this.state.tileSize);
      const cameraY = playerTileY - (screenCenterY / this.state.tileSize);
      
      // Constrain camera to map boundaries
      const constrainedCamera = this.constrainCameraToMapBounds(cameraX, cameraY);
      
      // Only update camera if position changed significantly (reduces unnecessary renders)
      const threshold = 0.1; // 0.1 tile threshold for smoother camera
      if (Math.abs(this.state.cameraPosition.x - constrainedCamera.x) > threshold || 
          Math.abs(this.state.cameraPosition.y - constrainedCamera.y) > threshold) {
        this.state.cameraPosition = constrainedCamera;
      }
    }
  }

  updateCameraToFollowAgent(agentId: string) {
    if (typeof window !== 'undefined') {
      const agent = this.state.aiAgents.get(agentId);
      if (agent) {
        const agentPixelX = agent.x * this.state.tileSize;
        const agentPixelY = agent.y * this.state.tileSize;
        
        // Center camera on agent's position
        const cameraX = -agentPixelX + (window.innerWidth / 2) - 16; // 16 is half agent size
        const cameraY = -agentPixelY + (window.innerHeight / 2) - 16;
        
        // Constrain camera to map boundaries
        const constrainedCamera = this.constrainCameraToMapBounds(cameraX, cameraY);
        
        // Only update camera if position changed significantly (reduces unnecessary renders)
        const threshold = 0.5; // 0.5 pixel threshold for smoother camera
        if (Math.abs(this.state.cameraPosition.x - constrainedCamera.x) > threshold || 
            Math.abs(this.state.cameraPosition.y - constrainedCamera.y) > threshold) {
          this.state.cameraPosition = constrainedCamera;
        }
      }
    }
  }

  setCameraFollowMode(mode: 'player' | 'agent', agentId?: string) {
    this.state.cameraFollowMode = mode;
    this.state.cameraFollowAgentId = mode === 'agent' ? (agentId || null) : null;
    
    // Update camera position based on new mode
    if (mode === 'player') {
      this.updateCameraToFollowPlayer();
    } else if (mode === 'agent' && agentId) {
      this.updateCameraToFollowAgent(agentId);
    }
    
    this.notifyListeners();
  }

  // Manual camera movement controls
  moveCamera(deltaX: number, deltaY: number) {
    this.state.isManualCameraControl = true; // Enable manual control
    
    const oldX = this.state.cameraPosition.x;
    const oldY = this.state.cameraPosition.y;
    
    this.state.cameraPosition.x += deltaX;
    this.state.cameraPosition.y += deltaY;
    
    // Apply map boundaries to camera
    const mapWidth = this.state.mapWidth;
    const mapHeight = this.state.mapHeight;
    const screenWidth = this.state.screenWidth;
    const screenHeight = this.state.screenHeight;
    const tileSize = this.state.tileSize;
    
    const maxCameraX = Math.max(0, mapWidth - (screenWidth / tileSize));
    const maxCameraY = Math.max(0, mapHeight - (screenHeight / tileSize));
    
    this.state.cameraPosition.x = Math.max(0, Math.min(maxCameraX, this.state.cameraPosition.x));
    this.state.cameraPosition.y = Math.max(0, Math.min(maxCameraY, this.state.cameraPosition.y));
    
    console.log(`📷 Camera moved from (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) to (${this.state.cameraPosition.x.toFixed(1)}, ${this.state.cameraPosition.y.toFixed(1)}) - delta: (${deltaX.toFixed(2)}, ${deltaY.toFixed(2)})`);
    this.notifyListeners();
  }

  resetCameraToPlayer() {
    this.state.isManualCameraControl = false; // Disable manual control, return to auto-follow
    
    if (typeof window === 'undefined') {
      this.state.cameraPosition.x = 12;
      this.state.cameraPosition.y = 12;
      return;
    }

    const playerPos = this.state.playerPosition;
    const playerTileX = playerPos.pixelX / this.state.tileSize;
    const playerTileY = playerPos.pixelY / this.state.tileSize;
    
    // Center the camera on the player
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    
    const cameraX = playerTileX - (screenCenterX / this.state.tileSize);
    const cameraY = playerTileY - (screenCenterY / this.state.tileSize);
    
    this.state.cameraPosition.x = cameraX;
    this.state.cameraPosition.y = cameraY;
    
    console.log(`📷 Camera reset to center player: player(${playerTileX.toFixed(1)}, ${playerTileY.toFixed(1)}) camera(${cameraX.toFixed(1)}, ${cameraY.toFixed(1)}) - auto-follow enabled`);
    this.notifyListeners();
  }

  // Initialize camera to player position (call this when the game starts)
  initializeCamera() {
    if (typeof window === 'undefined') {
      // Fallback for server-side rendering
      this.state.cameraPosition.x = 12;
      this.state.cameraPosition.y = 12;
      return;
    }

    const playerPos = this.state.playerPosition;
    const playerTileX = playerPos.pixelX / this.state.tileSize;
    const playerTileY = playerPos.pixelY / this.state.tileSize;
    
    // Center the camera on the player
    // Camera position should be offset to center the player on screen
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    
    // Calculate camera position to center player on screen
    const cameraX = playerTileX - (screenCenterX / this.state.tileSize);
    const cameraY = playerTileY - (screenCenterY / this.state.tileSize);
    
    this.state.cameraPosition.x = cameraX;
    this.state.cameraPosition.y = cameraY;
    
    console.log(`📷 Camera initialized to center player on screen: player(${playerTileX.toFixed(1)}, ${playerTileY.toFixed(1)}) camera(${cameraX.toFixed(1)}, ${cameraY.toFixed(1)})`);
    this.notifyListeners();
  }

  updateCamera() {
    // Only auto-follow if not in manual control mode
    if (!this.state.isManualCameraControl) {
      if (this.state.cameraFollowMode === 'player') {
        this.updateCameraToFollowPlayer();
      } else if (this.state.cameraFollowMode === 'agent' && this.state.cameraFollowAgentId) {
        this.updateCameraToFollowAgent(this.state.cameraFollowAgentId);
      }
    }
  }

  subscribe(listener: (state: GameState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()));
  }
}

export const gameState = new GameStateManager();
