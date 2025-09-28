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
  ens?: string;
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
  lastActionTime?: number;
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
  // XP and interaction system
  experiencePoints: number;
  level: number;
  totalInteractions: number;
  playerInteractions: number; // Interactions specifically with the player
  // Capital system
  totalCapital: number;
  lastCapitalUpdate: number;
}

// Keep Crewmate interface for backward compatibility
export interface Crewmate extends AIAgent {}

export interface PlayerWallet {
  totalMoney: number;
  experiencePoints: number;
  level: number;
  lastUpdated: number;
}

export interface GameState {
  selectedTool: Tool;
  mapData: Map<string, Tile>;
  playerPosition: Position;
  cameraPosition: { x: number; y: number };
  cameraFollowMode: 'player' | 'agent';
  cameraFollowAgentId: string | null;
  isManualCameraControl: boolean;
  freeCameraMode: boolean;
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
  playerLastMoveTime?: number;
  playerWallet: PlayerWallet;
  currentWorkflow?: {
    steps: any[];
    currentStep: number;
    taskId: number;
  };
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
    freeCameraMode: false,
    gridSize: 64,
    tileSize: 64,
    mapWidth: 30, // Default from defaultMap
    mapHeight: 350, // Default from defaultMap
    screenWidth: 1024, // Default screen width
    screenHeight: 768, // Default screen height
    crewmates: new Map(),
    lastCrewmateUpdate: Date.now(),
    aiAgents: new Map(),
    chatMessages: [],
    maxChatMessages: 100,
    playerPath: undefined,
    playerPathIndex: 0,
    isPlayerFollowingPath: false,
    playerLastMoveTime: undefined,
    playerWallet: {
      totalMoney: 1000, // Starting money
      experiencePoints: 0,
      level: 1,
      lastUpdated: Date.now()
    }
  };

  private listeners: Array<(state: GameState) => void> = [];
  private pathfinder: Pathfinder;
  private playerId: string = 'default_player';

  constructor() {
    this.pathfinder = new Pathfinder(this.state);
    // Only load wallet in browser environment
    if (typeof window !== 'undefined') {
      this.loadPlayerWallet();
    }
  }

  getState(): GameState {
    return { ...this.state };
  }

  private async loadPlayerWallet(): Promise<void> {
    try {
      const response = await fetch(`/api/player/wallet?playerId=${this.playerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.wallet) {
          this.state.playerWallet = {
            totalMoney: data.wallet.totalMoney,
            experiencePoints: data.wallet.experiencePoints,
            level: data.wallet.level,
            lastUpdated: data.wallet.lastUpdated
          };
          console.log('💰 Loaded player wallet from Redis:', this.state.playerWallet);
        }
      }
    } catch (error) {
      console.error('Failed to load player wallet from Redis:', error);
    }
  }

  private async savePlayerWallet(): Promise<void> {
    try {
      const response = await fetch('/api/player/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: this.playerId,
          action: 'update',
          totalMoney: this.state.playerWallet.totalMoney,
          experiencePoints: this.state.playerWallet.experiencePoints,
          level: this.state.playerWallet.level
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
      visitCooldown: 5000 + Math.random() * 10000, // 5-15 seconds between visits (was 15-45)
      moveInterval: 200 + Math.random() * 200, // 0.2-0.4 seconds between steps
      // XP and interaction system
      experiencePoints: Math.floor(Math.random() * 500) + 50, // 50-550 XP
      level: Math.floor(Math.random() * 5) + 1, // Level 1-5
      totalInteractions: Math.floor(Math.random() * 20) + 5, // 5-25 interactions
      playerInteractions: Math.floor(Math.random() * 10), // 0-10 player interactions
      // Capital system
      totalCapital: Math.floor(Math.random() * 10000) + 1000, // $1,000 - $11,000
      lastCapitalUpdate: Date.now()
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
      visitCooldown: 5000 + Math.random() * 10000, // 5-15 seconds between visits (was 15-45) // 15-45 seconds between visits
      moveInterval: 150 + Math.random() * 150, // 0.15-0.3 seconds between steps
      // XP and interaction system
      experiencePoints: Math.floor(Math.random() * 500) + 50, // 50-550 XP
      level: Math.floor(Math.random() * 5) + 1, // Level 1-5
      totalInteractions: Math.floor(Math.random() * 20) + 5, // 5-25 interactions
      playerInteractions: Math.floor(Math.random() * 10), // 0-10 player interactions
      // Capital system
      totalCapital: Math.floor(Math.random() * 10000) + 1000, // $1,000 - $11,000
      lastCapitalUpdate: Date.now()
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
    
    // Update agent capital
    this.updateAgentCapital(agent, now);
    
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
      // Intelligent roaming with guidelines
      const currentX = Math.round(agent.x);
      const currentY = Math.round(agent.y);
      const targetX = Math.round(agent.targetX);
      const targetY = Math.round(agent.targetY);
      
      if (currentX === targetX && currentY === targetY) {
        // Reached target, decide next action based on guidelines
        this.decideNextAgentAction(agent, now);
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
    
    // Trigger natural conversations between agents
    this.triggerAgentConversation(agent, now);
    
    // Also check for conversations when agents are walking and meet each other
    if (agent.activity === CrewmateActivity.WALKING) {
      this.checkForWalkingConversations(agent, now);
    }
    
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
      } else {
        // Check if agent has returned home
        const currentX = Math.round(agent.x);
        const currentY = Math.round(agent.y);
        const homeX = Math.round(agent.homeX);
        const homeY = Math.round(agent.homeY);
        
        if (currentX === homeX && currentY === homeY) {
          // Agent has returned home
          agent.activity = CrewmateActivity.RESTING;
          agent.currentThought = 'Resting and recharging at home';
          
          agent.chatBubble = {
            message: `${agent.name} is back home`,
            timestamp: now,
            duration: 3000
          };
          
          this.addChatMessage({
            id: `home_arrival_${now}_${Math.random().toString(36).substr(2, 9)}`,
            agentId: agent.id,
            message: `${agent.name} has returned home and is resting`,
            timestamp: now,
            type: 'action'
          });
          
          console.log(`🏠 Agent ${agent.name} has successfully returned home and is now resting`);
          
          // Trigger a conversation after returning home
          setTimeout(() => {
            this.triggerAgentConversation(agent, Date.now());
          }, 8000); // Wait 8 seconds after arriving homess
        }
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
    
    // Set appropriate activity based on building type with specific tasks
    switch (agent.targetBuilding.type) {
      case TileType.RESEARCH_LAB:
        agent.activity = CrewmateActivity.RESEARCHING;
        agent.currentThought = this.getResearchTask();
        break;
      case TileType.ENGINEERING_BAY:
        agent.activity = CrewmateActivity.MAINTAINING;
        agent.currentThought = this.getEngineeringTask();
        break;
      case TileType.LIVING_QUARTERS:
        agent.activity = CrewmateActivity.RESTING;
        agent.currentThought = 'Resting and recharging at home';
        break;
      case TileType.RECREATION:
        agent.activity = CrewmateActivity.EATING;
        agent.currentThought = 'Taking a break in recreation area';
        break;
      default:
        agent.activity = CrewmateActivity.WORKING;
        agent.currentThought = this.getGeneralTask();
    }
    
    // Add arrival message
    agent.chatBubble = {
      message: `${agent.name} arrives at ${buildingName}`,
      timestamp: now,
      duration: 3000
    };

    // Show specific task activities when agents start working
    if (agent.activity === CrewmateActivity.WORKING || agent.activity === CrewmateActivity.RESEARCHING || agent.activity === CrewmateActivity.MAINTAINING) {
      const activityMessages = {
        [CrewmateActivity.WORKING]: `🔧 ${agent.name} started working: ${agent.currentThought}`,
        [CrewmateActivity.RESEARCHING]: `🔬 ${agent.name} began research: ${agent.currentThought}`,
        [CrewmateActivity.MAINTAINING]: `⚙️ ${agent.name} started maintenance: ${agent.currentThought}`
    };
    
    this.addChatMessage({
        id: `agent_activity_${agent.id}_${now}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: agent.id,
        message: activityMessages[agent.activity],
      timestamp: now,
      type: 'action'
    });
    }
    
    // Schedule departure after some time
    const stayDuration = 3000 + Math.random() * 5000; // 3-8 seconds (was 5-15)
    
    // Trigger a work-related conversation after arriving
    setTimeout(() => {
      this.triggerAgentConversation(agent, Date.now());
    }, 2000); // Wait 2 seconds after arriving (was 6)
    
    setTimeout(() => {
      // Work is done, now return to home
      this.returnAgentToHome(agent, now);
    }, stayDuration);
  }

  // Public method to manually trigger agent return to home (useful for API integration)
  public triggerAgentReturnToHome(agentId: string): boolean {
    const agent = this.state.aiAgents.get(agentId);
    if (!agent) {
      console.log(`❌ Agent ${agentId} not found for return to home`);
      return false;
    }
    
    const now = Date.now();
    this.returnAgentToHome(agent, now);
    this.state.aiAgents.set(agentId, agent);
    this.notifyListeners();
    return true;
  }

  private returnAgentToHome(agent: AIAgent, now: number): void {
    // Check if agent is actually returning from work (not a dummy move)
    const isReturningFromWork = agent.activity === CrewmateActivity.WORKING || 
                                agent.activity === CrewmateActivity.RESEARCHING || 
                                agent.activity === CrewmateActivity.MAINTAINING;
    
    // Add task completion message (only sometimes and only if returning from actual work)
    if (isReturningFromWork && Math.random() > 0.4) { // Only 60% chance of showing completion
      const completionMessages = [
        `✅ ${agent.name} completed their work shift`,
        `🏁 ${agent.name} finished assigned tasks`,
        `📋 ${agent.name} wrapped up their duties`,
        `🎯 ${agent.name} completed research project`,
        `⚙️ ${agent.name} finished maintenance work`,
        `📊 ${agent.name} completed data analysis`,
        `🔧 ${agent.name} finished system repairs`,
        `📈 ${agent.name} completed performance review`
      ];
      
      this.addChatMessage({
        id: `task_complete_${agent.id}_${now}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: agent.id,
        message: completionMessages[Math.floor(Math.random() * completionMessages.length)],
        timestamp: now,
        type: 'action'
      });
    }

    // Clear current target building
    agent.targetBuilding = undefined;
    
    // Calculate path back to home
    const currentX = Math.round(agent.x);
    const currentY = Math.round(agent.y);
    const homeX = Math.round(agent.homeX);
    const homeY = Math.round(agent.homeY);
    
    // Check if already at home
    if (currentX === homeX && currentY === homeY) {
      agent.activity = CrewmateActivity.RESTING;
      agent.chatBubble = {
        message: `${agent.name} is back home`,
        timestamp: now,
        duration: 3000
      };
      
      this.addChatMessage({
        id: `home_${now}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: agent.id,
        message: `${agent.name} has returned home and is resting`,
        timestamp: now,
        type: 'action'
      });
      return;
    }
    
    // Find path back to home
    const path = this.pathfinder.findPath(currentX, currentY, homeX, homeY);
    
    if (path && path.nodes && path.nodes.length > 0) {
      // Set path to home
      agent.currentPath = path.nodes;
      agent.pathIndex = 0;
      agent.isFollowingPath = true;
      agent.activity = CrewmateActivity.WALKING;
      
      // Update thought to indicate returning home
      agent.currentThought = 'Returning home after completing work';
      
      agent.chatBubble = {
        message: `${agent.name} is returning home`,
        timestamp: now,
        duration: 3000
      };
      
      this.addChatMessage({
        id: `return_home_${now}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: agent.id,
        message: `${agent.name} is walking back to their home at (${homeX}, ${homeY})`,
        timestamp: now,
        type: 'action'
      });
      
      console.log(`🏠 Agent ${agent.name} is returning home from (${currentX}, ${currentY}) to (${homeX}, ${homeY})`);
    } else {
      // Fallback: direct movement to home
      console.log(`🏠 No path found for ${agent.name} to return home, using direct movement`);
      agent.targetX = homeX;
      agent.targetY = homeY;
      agent.activity = CrewmateActivity.WALKING;
      agent.currentThought = 'Returning home after completing work';
      
      agent.chatBubble = {
        message: `${agent.name} is returning home`,
        timestamp: now,
        duration: 3000
      };
    }
    
    // Reset visit cooldown
    agent.visitCooldown = 5000 + Math.random() * 10000; // 5-15 seconds (was 15-45)
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

  setPlayerPath(path: Array<{x: number, y: number}>, destinationInfo?: {type: 'agent' | 'building', name: string}) {
    // Remove the starting position from the path if it matches the player's current position
    const currentPos = this.state.playerPosition;
    const currentTileX = Math.round(currentPos.pixelX / this.state.tileSize);
    const currentTileY = Math.round(currentPos.pixelY / this.state.tileSize);
    
    let filteredPath = path;
    if (path.length > 0 && path[0].x === currentTileX && path[0].y === currentTileY) {
      filteredPath = path.slice(1); // Remove the first node if it's the current position
      console.log(`🎯 Removed starting position (${currentTileX}, ${currentTileY}) from path, ${filteredPath.length} nodes remaining`);
    }
    
    this.state.playerPath = filteredPath;
    this.state.playerPathIndex = 0;
    this.state.isPlayerFollowingPath = true;
    
    // Add path start message to show destination
    if (filteredPath.length > 0) {
      let destinationMessage = '🎯 Starting journey';
      if (destinationInfo) {
        if (destinationInfo.type === 'agent') {
          destinationMessage = `🎯 Starting journey to meet ${destinationInfo.name}`;
        } else if (destinationInfo.type === 'building') {
          destinationMessage = `🎯 Starting journey to ${destinationInfo.name}`;
        }
      }
      
      this.addChatMessage({
        id: `player_path_start_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: 'player',
        message: destinationMessage,
        timestamp: Date.now(),
        type: 'action'
      });
    }
    
    // Disable camera following during path movement to prevent glitchy camera movement
    this.state.isManualCameraControl = true;
    console.log('📷 Camera following disabled during path movement');
    
    console.log(`🎯 Player path set: ${filteredPath.length} nodes, starting at (${currentTileX}, ${currentTileY}) pixel(${currentPos.pixelX}, ${currentPos.pixelY})`);
    if (filteredPath.length > 0) {
      console.log(`🎯 First target: (${filteredPath[0].x}, ${filteredPath[0].y}) pixel(${filteredPath[0].x * this.state.tileSize}, ${filteredPath[0].y * this.state.tileSize})`);
      
    }
    
    this.notifyListeners();
  }

  // Hardcoded test path for immediate testing
  setHardcodedTestPath() {
    const testPath = [
      { x: 13, y: 12 }, // Move right from current position
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

  // Set path to a random agent for automatic movement
  setPathToRandomAgent() {
    const agents = Array.from(this.state.aiAgents.values());
    if (!agents || agents.length === 0) {
      console.log('🎯 No agents available for random path');
      return;
    }

    // Get a random agent
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    
    // Use the agent's current position as the target
    const targetX = randomAgent.x;
    const targetY = randomAgent.y;
    
    console.log(`🎯 Setting path to random agent ${randomAgent.name} at (${targetX}, ${targetY})`);
    
    // Calculate path to the target position
    const currentPos = this.state.playerPosition;
    const currentTileX = Math.round(currentPos.pixelX / this.state.tileSize);
    const currentTileY = Math.round(currentPos.pixelY / this.state.tileSize);
    
    const path = this.pathfinder.findPath(
      currentTileX, currentTileY, targetX, targetY
    );
    
    if (path && path.nodes && path.nodes.length > 0) {
      console.log(`🗺️ Pathfinding result: Found path with ${path.nodes.length} nodes`);
      this.setPlayerPath(path.nodes, {type: 'agent', name: randomAgent.name});
    } else {
      console.log('🗺️ No path found, using fallback pathfinding');
      // Fallback: create a simple path
      const fallbackPath = this.createFallbackPath(currentTileX, currentTileY, targetX, targetY);
      if (fallbackPath.length > 0) {
        console.log(`🔄 Using fallback pathfinding from (${currentTileX}, ${currentTileY}) to (${targetX}, ${targetY})`);
        console.log(`✅ Fallback path created with ${fallbackPath.length} nodes: ${fallbackPath.map(p => `(${p.x},${p.y})`).join(' -> ')}`);
        this.setPlayerPath(fallbackPath, {type: 'agent', name: randomAgent.name});
      }
    }
  }

  // Method to start a task workflow from server-provided data
  startTaskWorkflowFromData(workflowSteps: any[]) {
    if (workflowSteps.length === 0) {
      console.log('❌ No workflow steps provided');
      return;
    }

    console.log(`🎯 Starting task workflow with ${workflowSteps.length} steps`);
    this.startTaskWorkflow(workflowSteps, 0);
  }

  private startTaskWorkflow(workflowSteps: any[], currentStep: number) {
    if (currentStep >= workflowSteps.length) {
      // Workflow complete
      this.addChatMessage({
        id: `workflow_complete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: 'player',
        message: `🎉 Task workflow complete! Visited all ${workflowSteps.length} agents and buildings.`,
        timestamp: Date.now(),
        type: 'action'
      });
      return;
    }

    const step = workflowSteps[currentStep];
    console.log(`🎯 Starting workflow step ${currentStep + 1}/${workflowSteps.length}: Visiting ${step.agentName} at ${step.buildingName}`);

    // Add workflow step message
    this.addChatMessage({
      id: `workflow_step_${currentStep}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: 'player',
      message: `🎯 Step ${currentStep + 1}/${workflowSteps.length}: Going to ${step.buildingName} to check on ${step.agentName}`,
      timestamp: Date.now(),
      type: 'action'
    });

    // Calculate path to the building
    const currentPos = this.state.playerPosition;
    const currentTileX = Math.round(currentPos.pixelX / this.state.tileSize);
    const currentTileY = Math.round(currentPos.pixelY / this.state.tileSize);
    
    const path = this.pathfinder.findPath(
      currentTileX, currentTileY, step.buildingX, step.buildingY
    );
    
    if (path && path.nodes && path.nodes.length > 0) {
      // Set up path completion callback to move to next step
      this.setPlayerPath(path.nodes, { type: 'building', name: step.buildingName });
      
      // Store workflow state for continuation
      this.state.currentWorkflow = {
        steps: workflowSteps,
        currentStep: currentStep,
        taskId: workflowSteps[0].taskId || Date.now()
      };
    } else {
      console.log(`❌ No path found to ${step.buildingName}, skipping to next step`);
      // Skip to next step if no path found
      setTimeout(() => {
        this.startTaskWorkflow(workflowSteps, currentStep + 1);
      }, 1000);
    }
  }

  // Method to continue workflow after reaching a building
  continueTaskWorkflow() {
    if (!this.state.currentWorkflow) {
      return;
    }

    const { steps, currentStep } = this.state.currentWorkflow;
    const step = steps[currentStep];

    // Add arrival message
    this.addChatMessage({
      id: `workflow_arrival_${currentStep}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: 'player',
      message: `📍 Arrived at ${step.buildingName}! Checking on ${step.agentName}'s progress...`,
      timestamp: Date.now(),
      type: 'action'
    });

    // Wait a moment to simulate checking on the agent
    setTimeout(() => {
      this.addChatMessage({
        id: `workflow_check_${currentStep}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: 'player',
        message: `✅ ${step.agentName} is working on: "${step.subtaskPrompt.substring(0, 50)}..."`,
        timestamp: Date.now(),
        type: 'action'
      });

      // Move to next step after a delay
      setTimeout(() => {
        this.startTaskWorkflow(steps, currentStep + 1);
      }, 2000);
    }, 1500);
  }

  // Create a simple fallback path when pathfinding fails
  private createFallbackPath(startX: number, startY: number, endX: number, endY: number): Array<{x: number, y: number}> {
    const path: Array<{x: number, y: number}> = [];
    let currentX = startX;
    let currentY = startY;
    
    // Move horizontally first, then vertically
    while (currentX !== endX) {
      currentX += currentX < endX ? 1 : -1;
      path.push({ x: currentX, y: currentY });
    }
    
    while (currentY !== endY) {
      currentY += currentY < endY ? 1 : -1;
      path.push({ x: currentX, y: currentY });
    }
    
    return path;
  }

  clearPlayerPath() {
    this.state.playerPath = undefined;
    this.state.playerPathIndex = 0;
    this.state.isPlayerFollowingPath = false;
    
    // Re-enable camera following when path is completed
    this.state.isManualCameraControl = false;
    console.log('📷 Camera following re-enabled after path completion');
    
    // Check if we're in a workflow and should continue to next step
    if (this.state.currentWorkflow) {
      this.continueTaskWorkflow();
    }
    
    this.notifyListeners();
  }

  private updatePlayerPathFollowing(deltaTime: number): void {
    if (!this.state.isPlayerFollowingPath || !this.state.playerPath || this.state.playerPath.length === 0) {
      return;
    }


    const currentPos = this.state.playerPosition;
    const currentTileX = Math.round(currentPos.pixelX / this.state.tileSize);
    const currentTileY = Math.round(currentPos.pixelY / this.state.tileSize);
    const pathIndex = this.state.playerPathIndex;
    
    if (pathIndex >= this.state.playerPath.length) {
      // Reached end of path
      console.log(`🏁 Player reached end of path at (${currentTileX}, ${currentTileY})`);
      
      // Add path completion to activity logs
      this.addChatMessage({
        id: `player_path_complete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: 'player',
        message: `🏁 Journey complete! Arrived at destination (${currentTileX}, ${currentTileY})`,
        timestamp: Date.now(),
        type: 'action'
      });
      
      this.clearPlayerPath();
      return;
    }

    const targetNode = this.state.playerPath[pathIndex];
    
    // Check if we've reached the current target node (grid-based)
    if (currentTileX === targetNode.x && currentTileY === targetNode.y) {
      // Move to next path node
      this.state.playerPathIndex++;
      console.log(`📍 Player reached path node ${pathIndex + 1}/${this.state.playerPath.length} at (${targetNode.x}, ${targetNode.y})`);
      
      // Add path node reached to activity logs
      
      // If we've reached the end of the path, clear it
      if (this.state.playerPathIndex >= this.state.playerPath.length) {
        this.clearPlayerPath();
      }
      return;
    }
    
    // Check if enough time has passed for the next movement step (grid-based movement timing)
    const now = Date.now();
    const moveInterval = 500; // 500ms between each grid movement (adjustable for speed)
    
    if (!this.state.playerLastMoveTime) {
      this.state.playerLastMoveTime = now;
    }
    
    if (now - this.state.playerLastMoveTime < moveInterval) {
      return; // Wait for next movement step
    }
    
    // Move one grid square at a time towards the target
    const dx = targetNode.x - currentTileX;
    const dy = targetNode.y - currentTileY;
    
    // Move one step at a time in a single direction (no diagonal movement)
    let newTileX = currentTileX;
    let newTileY = currentTileY;
    let direction: 'left' | 'right' | 'up' | 'down' = 'right';
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Move horizontally
      newTileX = currentTileX + (dx > 0 ? 1 : -1);
      direction = dx > 0 ? 'right' : 'left';
    } else if (dy !== 0) {
      // Move vertically
      newTileY = currentTileY + (dy > 0 ? 1 : -1);
      direction = dy > 0 ? 'down' : 'up';
    }
    
    // Ensure we stay within map boundaries
    newTileX = Math.max(0, Math.min(this.state.mapWidth - 1, newTileX));
    newTileY = Math.max(0, Math.min(this.state.mapHeight - 1, newTileY));
    
    // Convert back to pixel coordinates and update position
    const newPixelX = newTileX * this.state.tileSize;
    const newPixelY = newTileY * this.state.tileSize;
    
    console.log(`🚶 Player moving: from (${currentTileX}, ${currentTileY}) to (${newTileX}, ${newTileY}) - direction: ${direction}`);
    
    // Only log movement in console, not in chat feed to reduce spam
    // Individual step movements are too verbose for the AI feed
    
    // Update player position and animation
    this.setPlayerPixelPosition(newPixelX, newPixelY);
    this.updatePlayerAnimation(true, direction);
    
    // Update last move time
    this.state.playerLastMoveTime = now;
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
    
    // Only update camera if not following a path (to prevent glitchy camera movement)
    if (!this.state.isPlayerFollowingPath) {
    this.updateCamera();
    }
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
    
    // Screen dimensions in tile units
    const screenWidthInTiles = window.innerWidth / this.state.tileSize;
    const screenHeightInTiles = window.innerHeight / this.state.tileSize;
    
    // Calculate camera bounds in tile coordinates
    // Camera position is the top-left corner of the viewport
    // We need to ensure the camera doesn't show beyond the map boundaries
    
    // X bounds: camera can't go left of 0, and right edge can't go beyond map width
    const minCameraX = 0;
    // Allow camera to scroll so the rightmost tile (mapWidth-1) is visible
    // The camera position is the top-left corner, so we need to allow it to go right enough
    // to show the right edge of the map
    // Add a small buffer to ensure we can see the very right edge
    let maxCameraX = Math.max(0, mapWidth - screenWidthInTiles + 0.5);
    
    // Y bounds: camera can't go above 0, and bottom edge can't go beyond map height  
    const minCameraY = 0;
    // Allow camera to scroll so the bottommost tile (mapHeight-1) is visible
    // The camera position is the top-left corner, so we need to allow it to go down enough
    // to show the bottom of the map. We need to account for the fact that the camera
    // position is the top-left corner of the viewport.
    // Add a small buffer to ensure we can see the very bottom
    let maxCameraY = Math.max(0, mapHeight - screenHeightInTiles + 0.5);
    
    // If screen is wider than map, center the map horizontally
    if (screenWidthInTiles > mapWidth) {
      maxCameraX = 0;
    }
    
    // If screen is taller than map, center the map vertically
    if (screenHeightInTiles > mapHeight) {
      maxCameraY = 0;
    }
    
    // Constrain camera position
    const constrainedX = Math.max(minCameraX, Math.min(maxCameraX, cameraX));
    const constrainedY = Math.max(minCameraY, Math.min(maxCameraY, cameraY));
    
    // Debug logging - only log when camera is actually constrained
    if (constrainedX !== cameraX || constrainedY !== cameraY) {
      console.log(`📷 Camera constrained: (${cameraX.toFixed(1)}, ${cameraY.toFixed(1)}) → (${constrainedX.toFixed(1)}, ${constrainedY.toFixed(1)})`);
    }
    
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
    
    // Apply map boundaries to camera using the constraint function
    // Only constrain if not in free camera mode
    if (!this.state.freeCameraMode) {
      const constrainedCamera = this.constrainCameraToMapBounds(this.state.cameraPosition.x, this.state.cameraPosition.y);
      this.state.cameraPosition = constrainedCamera;
    }
    
    console.log(`📷 Camera moved from (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) to (${this.state.cameraPosition.x.toFixed(1)}, ${this.state.cameraPosition.y.toFixed(1)}) - delta: (${deltaX.toFixed(2)}, ${deltaY.toFixed(2)})`);
    this.notifyListeners();
  }

  // Toggle free camera mode (allows viewing beyond map boundaries)
  toggleFreeCameraMode() {
    this.state.freeCameraMode = !this.state.freeCameraMode;
    console.log(`📷 Free camera mode: ${this.state.freeCameraMode ? 'ENABLED' : 'DISABLED'}`);
    this.notifyListeners();
  }

  // Set free camera mode
  setFreeCameraMode(enabled: boolean) {
    this.state.freeCameraMode = enabled;
    console.log(`📷 Free camera mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    this.notifyListeners();
  }

  // Test method to move camera to bottom of map
  moveCameraToBottom() {
    const mapHeight = this.state.mapHeight;
    const screenHeightInTiles = typeof window !== 'undefined' ? window.innerHeight / this.state.tileSize : 10;
    
    // Move camera to show the bottom of the map (with buffer)
    const cameraY = mapHeight - screenHeightInTiles + 0.5;
    this.setCameraPosition(0, cameraY);
    console.log(`📷 Moved camera to bottom: Y=${cameraY.toFixed(1)} (map height: ${mapHeight}, screen height: ${screenHeightInTiles.toFixed(1)})`);
  }

  // Test method to move camera to top-right corner of map
  moveCameraToTopRight() {
    const mapWidth = this.state.mapWidth;
    const mapHeight = this.state.mapHeight;
    const screenWidthInTiles = typeof window !== 'undefined' ? window.innerWidth / this.state.tileSize : 16;
    const screenHeightInTiles = typeof window !== 'undefined' ? window.innerHeight / this.state.tileSize : 10;
    
    // Move camera to show the top-right of the map
    const cameraX = mapWidth - screenWidthInTiles;
    const cameraY = 0;
    this.setCameraPosition(cameraX, cameraY);
    console.log(`📷 Moved camera to top-right: X=${cameraX.toFixed(1)}, Y=${cameraY.toFixed(1)} (map: ${mapWidth}x${mapHeight}, screen: ${screenWidthInTiles.toFixed(1)}x${screenHeightInTiles.toFixed(1)})`);
  }

  // Debug method to show camera bounds
  debugCameraBounds() {
    if (typeof window === 'undefined') return;
    
    const mapWidth = this.state.mapWidth;
    const mapHeight = this.state.mapHeight;
    const screenWidthInTiles = window.innerWidth / this.state.tileSize;
    const screenHeightInTiles = window.innerHeight / this.state.tileSize;
    
    const maxCameraX = Math.max(0, mapWidth - screenWidthInTiles);
    const maxCameraY = Math.max(0, mapHeight - screenHeightInTiles);
    
    console.log(`📷 DEBUG CAMERA BOUNDS:`);
    console.log(`📷 Map: ${mapWidth}x${mapHeight}`);
    console.log(`📷 Screen: ${screenWidthInTiles.toFixed(1)}x${screenHeightInTiles.toFixed(1)} tiles`);
    console.log(`📷 Max camera X: ${maxCameraX.toFixed(1)} (allows viewing up to tile ${(maxCameraX + screenWidthInTiles).toFixed(1)})`);
    console.log(`📷 Max camera Y: ${maxCameraY.toFixed(1)} (allows viewing up to tile ${(maxCameraY + screenHeightInTiles).toFixed(1)})`);
    console.log(`📷 Map tiles: 0 to ${mapWidth-1} (X), 0 to ${mapHeight-1} (Y)`);
    console.log(`📷 Current camera: (${this.state.cameraPosition.x.toFixed(1)}, ${this.state.cameraPosition.y.toFixed(1)})`);
  }

  resetCameraToPlayer() {
    // Only reset manual control if player is not following a path
    if (!this.state.isPlayerFollowingPath) {
    this.state.isManualCameraControl = false; // Disable manual control, return to auto-follow
    }
    
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
    
    // Constrain camera to map boundaries
    const constrainedCamera = this.constrainCameraToMapBounds(cameraX, cameraY);
    
    this.state.cameraPosition = constrainedCamera;
    
    console.log(`📷 Camera initialized to center player on screen: player(${playerTileX.toFixed(1)}, ${playerTileY.toFixed(1)}) camera(${cameraX.toFixed(1)}, ${cameraY.toFixed(1)})`);
    console.log(`📷 Final constrained camera: (${constrainedCamera.x.toFixed(1)}, ${constrainedCamera.y.toFixed(1)})`);
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

  public getEffectiveTileSize(): number {
    return this.state.tileSize;
  }

  // Conversation system for natural agent interactions
  private conversationTemplates = {
    greetings: [
      "Hi there! How's your day going?",
      "Hello! Nice to see you around here.",
      "Hey! Working on anything interesting?",
      "Good to see you! How are things?",
      "Hi! Hope you're having a productive day.",
      "Hello! What brings you this way?",
      "Hey there! Everything going well?",
      "Hi! Great to run into you here."
    ],
    workTalk: [
      "I'm working on some research projects today.",
      "Just finished up a maintenance task.",
      "Working on coordinating with the team.",
      "Busy with some engineering work.",
      "Handling some administrative tasks.",
      "Working on improving our systems.",
      "Just completed a collaborative project.",
      "Working on some new developments."
    ],
    thanks: [
      "Thanks for the help earlier!",
      "Appreciate your assistance with that task.",
      "Thanks for working together on that project.",
      "Really appreciate the collaboration!",
      "Thanks for your support today.",
      "Grateful for your help with that issue.",
      "Thanks for being such a great team member!",
      "Appreciate all the hard work you've been doing."
    ],
    responses: [
      "You're welcome! Happy to help.",
      "No problem at all!",
      "My pleasure!",
      "Glad I could assist!",
      "Anytime! That's what we're here for.",
      "You're very welcome!",
      "Happy to be of service!",
      "That's what teamwork is all about!"
    ],
    casual: [
      "The weather's been nice lately.",
      "How's the coffee in the break room?",
      "Did you hear about the new project?",
      "This place is really coming together.",
      "I love working in this environment.",
      "The team has been really supportive.",
      "Things are running smoothly today.",
      "It's great to be part of this team.",
      "How's your day been so far?",
      "The new equipment is working great!",
      "Hope you're having a good day!",
      "This is such a nice place to work.",
      "The team collaboration has been amazing.",
      "Everything seems to be running well today.",
      "I really enjoy working with everyone here.",
      "The atmosphere here is so positive!"
    ],
    workUpdates: [
      "Just finished a big project!",
      "Working on something exciting today.",
      "Made some good progress on my tasks.",
      "The new system is working perfectly.",
      "Just completed a challenging assignment.",
      "Working on improving our processes.",
      "Had a productive morning so far.",
      "Just wrapped up some important work.",
      "Making good headway on the project.",
      "The team coordination is going well."
    ],
    encouragement: [
      "You're doing great work!",
      "Keep up the excellent job!",
      "Your contributions are really valuable.",
      "I appreciate your dedication.",
      "You're an important part of the team.",
      "Your work makes a real difference.",
      "Thanks for always being reliable.",
      "You bring so much to the team.",
      "Your positive attitude is contagious!",
      "Keep being awesome!"
    ]
  };

  private decideNextAgentAction(agent: AIAgent, now: number): void {
    // Agent guidelines for intelligent behavior
    const timeSinceLastAction = now - (agent.lastActionTime || 0);
    const isAtHome = Math.round(agent.x) === Math.round(agent.homeX) && Math.round(agent.y) === Math.round(agent.homeY);
    const isAtWork = Math.round(agent.x) === Math.round(agent.workX) && Math.round(agent.y) === Math.round(agent.workY);
    
    // Guideline 1: If at home and rested enough, go to work (prevent staying at home for dummy moves)
    if (isAtHome && timeSinceLastAction > 8000 && Math.random() > 0.1) { // 90% chance after 8s to leave home (was 20s)
      this.sendAgentToWork(agent, now);
      return;
    }
    
    // Guideline 2: If at work and worked enough, return home (but not for dummy moves)
    if (isAtWork && timeSinceLastAction > 12000 && Math.random() > 0.2) { // 80% chance after 12s (was 30s)
      this.returnAgentToHome(agent, now);
      return;
    }
    
    // Guideline 3: If neither at home nor work, prefer going to work over returning home
    if (!isAtHome && !isAtWork) {
      // Only return home if agent was actually working (not a dummy move)
      const wasWorking = agent.activity === CrewmateActivity.WORKING || 
                        agent.activity === CrewmateActivity.RESEARCHING || 
                        agent.activity === CrewmateActivity.MAINTAINING;
      
      if (wasWorking && Math.random() > 0.7) { // 30% chance to return home if was working
        this.returnAgentToHome(agent, now);
      } else {
        this.sendAgentToWork(agent, now); // Otherwise go to work
      }
      return;
    }
    
    // Guideline 4: Occasional exploration (roaming to nearby interesting locations)
    // Only explore if not at home to avoid starting dummy moves from home
    if (!isAtHome && timeSinceLastAction > 15000 && Math.random() > 0.6) { // 40% chance after 15s (was 45s)
      this.exploreNearbyLocation(agent, now);
      return;
    }
    
    // Guideline 5: Rest and think when no other action is needed
    agent.activity = CrewmateActivity.RESTING;
    agent.currentThought = 'Planning next actions and resting';
    agent.lastActionTime = now;
  }

  private sendAgentToWork(agent: AIAgent, now: number): void {
    const path = this.pathfinder.findPath(
      Math.round(agent.x), 
      Math.round(agent.y), 
      Math.round(agent.workX), 
      Math.round(agent.workY)
    );
    
    if (path && path.nodes && path.nodes.length > 0) {
      agent.currentPath = path.nodes;
      agent.pathIndex = 0;
      agent.isFollowingPath = true;
      agent.targetBuilding = this.getBuildingAtLocation(agent.workX, agent.workY);
      agent.activity = CrewmateActivity.WALKING;
      agent.currentThought = 'Going to work at assigned building';
      agent.lastActionTime = now;
      
      this.addChatMessage({
        id: `agent_to_work_${agent.id}_${now}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: agent.id,
        message: `🚶 ${agent.name} is heading to work`,
        timestamp: now,
        type: 'action'
      });
    }
  }

  private exploreNearbyLocation(agent: AIAgent, now: number): void {
    // Find interesting nearby locations (buildings, recreation areas)
    const currentX = Math.round(agent.x);
    const currentY = Math.round(agent.y);
    const explorationRadius = 5;
    
    const interestingLocations: {x: number, y: number, type: string}[] = [];
    
    // Look for nearby buildings within exploration radius
    for (let dx = -explorationRadius; dx <= explorationRadius; dx++) {
      for (let dy = -explorationRadius; dy <= explorationRadius; dy++) {
        const checkX = currentX + dx;
        const checkY = currentY + dy;
        
        if (checkX >= 0 && checkX < this.state.mapWidth && checkY >= 0 && checkY < this.state.mapHeight) {
          const tile = this.state.mapData.get(`${checkX},${checkY}`);
          // Exclude home location from exploration targets
          const isHomeLocation = checkX === Math.round(agent.homeX) && checkY === Math.round(agent.homeY);
          if (tile && !isHomeLocation && (tile.type === TileType.RECREATION || tile.type === TileType.RESEARCH_LAB || tile.type === TileType.ENGINEERING_BAY)) {
            interestingLocations.push({x: checkX, y: checkY, type: tile.type});
          }
        }
      }
    }
    
    if (interestingLocations.length > 0) {
      const target = interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
      const path = this.pathfinder.findPath(currentX, currentY, target.x, target.y);
      
      if (path && path.nodes && path.nodes.length > 0) {
        agent.currentPath = path.nodes;
        agent.pathIndex = 0;
        agent.isFollowingPath = true;
        agent.targetBuilding = this.getBuildingAtLocation(target.x, target.y);
        agent.activity = CrewmateActivity.WALKING;
        agent.currentThought = 'Exploring nearby locations';
        agent.lastActionTime = now;
        
        this.addChatMessage({
          id: `agent_explore_${agent.id}_${now}_${Math.random().toString(36).substr(2, 9)}`,
          agentId: agent.id,
          message: `🔍 ${agent.name} is exploring nearby areas`,
          timestamp: now,
          type: 'action'
        });
      }
    }
  }

  private getBuildingAtLocation(x: number, y: number): any {
    const tile = this.state.mapData.get(`${x},${y}`);
    return tile ? {x, y, type: tile.type} : null;
  }

  private generateTaskActivity(agent: AIAgent): string {
    const activities = [
      // Trading and Commerce
      'negotiating trade deals with other agents',
      'analyzing market prices for resources',
      'processing trade transactions',
      'updating inventory systems',
      'coordinating supply chain logistics',
      
      // Research and Development
      'conducting experiments in the lab',
      'analyzing data from sensors',
      'developing new technologies',
      'testing prototype systems',
      'documenting research findings',
      
      // Engineering and Maintenance
      'repairing equipment and systems',
      'performing routine maintenance checks',
      'upgrading infrastructure components',
      'troubleshooting technical issues',
      'installing new equipment',
      
      // Communication and Coordination
      'coordinating with other departments',
      'updating mission status reports',
      'scheduling team meetings',
      'reviewing operational procedures',
      'planning resource allocation',
      
      // Security and Monitoring
      'monitoring system security',
      'conducting safety inspections',
      'patrolling assigned areas',
      'checking access permissions',
      'analyzing threat assessments',
      
      // Resource Management
      'managing energy distribution',
      'optimizing resource usage',
      'tracking material consumption',
      'coordinating waste disposal',
      'monitoring environmental conditions'
    ];
    
    return activities[Math.floor(Math.random() * activities.length)];
  }

  private getResearchTask(): string {
    const tasks = [
      'Analyzing quantum data patterns',
      'Testing new AI algorithms',
      'Studying energy efficiency models',
      'Developing communication protocols',
      'Researching material properties',
      'Simulating system behaviors',
      'Documenting experimental results',
      'Calibrating measurement instruments',
      'Reviewing scientific literature',
      'Preparing research proposals'
    ];
    return tasks[Math.floor(Math.random() * tasks.length)];
  }

  private getEngineeringTask(): string {
    const tasks = [
      'Repairing power distribution systems',
      'Upgrading network infrastructure',
      'Maintaining life support equipment',
      'Installing new sensor arrays',
      'Troubleshooting communication systems',
      'Calibrating environmental controls',
      'Replacing worn components',
      'Testing safety systems',
      'Optimizing energy consumption',
      'Updating system firmware'
    ];
    return tasks[Math.floor(Math.random() * tasks.length)];
  }

  private getGeneralTask(): string {
    const tasks = [
      'Coordinating daily operations',
      'Managing resource allocation',
      'Updating mission logs',
      'Scheduling maintenance windows',
      'Reviewing system status reports',
      'Planning future expansions',
      'Monitoring performance metrics',
      'Coordinating with other teams',
      'Processing incoming data',
      'Maintaining operational protocols'
    ];
    return tasks[Math.floor(Math.random() * tasks.length)];
  }

  private checkForWalkingConversations(agent: AIAgent, now: number): void {
    // Check for conversations when agents are walking and meet each other
    if (Math.random() > 0.05) return; // Reduced to 5% chance when walking (was 20% for testing)
    
    const nearbyAgents = this.findNearbyAgents(agent, 1); // Within 1 tile when walking
    if (nearbyAgents.length === 0) return;
    
    const otherAgent = nearbyAgents[0];
    const conversationType = this.selectConversationType(agent, otherAgent, now);
    
    if (conversationType) {
      this.startConversation(agent, otherAgent, conversationType, now);
    }
  }

  private triggerAgentConversation(agent: AIAgent, now: number): void {
    // Trigger conversations more frequently and in more situations
    const canTalk = agent.activity === CrewmateActivity.RESTING || 
                   agent.activity === CrewmateActivity.WORKING || 
                   agent.activity === CrewmateActivity.RESEARCHING;
    
    if (!canTalk || Math.random() > 0.2) { // 20% chance for conversations (was 10%)
      return;
    }
    

    // Add task activity message to chat feed (more frequent and realistic)
    if (Math.random() > 0.5) { // 50% chance of showing task activity (was 30%)
      const activity = this.generateTaskActivity(agent);
      this.addChatMessage({
        id: `agent_task_${agent.id}_${now}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: agent.id,
        message: `⚙️ ${agent.name} is ${activity}`,
        timestamp: now,
        type: 'action'
      });
    }

    // Find nearby agents for conversation
    const nearbyAgents = this.findNearbyAgents(agent, 2); // Within 2 tiles
    if (nearbyAgents.length === 0) {
      return;
    }

    const otherAgent = nearbyAgents[0];
    const conversationType = this.selectConversationType(agent, otherAgent, now);
    
    if (conversationType) {
      this.startConversation(agent, otherAgent, conversationType, now);
    }
  }

  private findNearbyAgents(agent: AIAgent, maxDistance: number): AIAgent[] {
    const nearbyAgents: AIAgent[] = [];
    
    for (const [_, otherAgent] of Array.from(this.state.aiAgents.entries())) {
      if (otherAgent.id === agent.id) continue;
      
      const distance = Math.abs(otherAgent.x - agent.x) + Math.abs(otherAgent.y - agent.y);
      const canTalk = otherAgent.activity === CrewmateActivity.RESTING || 
                     otherAgent.activity === CrewmateActivity.WORKING || 
                     otherAgent.activity === CrewmateActivity.RESEARCHING;
      
      if (distance <= maxDistance && canTalk) {
        nearbyAgents.push(otherAgent);
      }
    }
    
    return nearbyAgents;
  }

  private selectConversationType(agent: AIAgent, otherAgent: AIAgent, now: number): string | null {
    // Check if agents have interacted recently
    const lastInteractionKey = `${agent.id}-${otherAgent.id}`;
    const agentLastInteraction = agent.lastInteractionTime || 0;
    const otherAgentLastInteraction = otherAgent.lastInteractionTime || 0;
    
    // Don't interact too frequently (at least 10 seconds between conversations for testing)
    // Check both agents to ensure neither has interacted too recently
    if (now - agentLastInteraction < 10000 || now - otherAgentLastInteraction < 10000) {
      return null;
    }

    // Context-aware conversation selection
    const types = ['greetings', 'workTalk', 'thanks', 'casual', 'workUpdates', 'encouragement'];
    let weights = [0.25, 0.2, 0.15, 0.2, 0.1, 0.1]; // Default probability weights
    
    // Adjust weights based on context
    if (agent.currentThought && agent.currentThought.includes('returned home')) {
      weights = [0.3, 0.2, 0.15, 0.15, 0.1, 0.1]; // More greetings when returning home
    } else if (agent.currentThought && agent.currentThought.includes('arrives at')) {
      weights = [0.15, 0.3, 0.1, 0.15, 0.2, 0.1]; // More work talk and updates when arriving at buildings
    } else if (agent.currentThought && agent.currentThought.includes('task')) {
      weights = [0.15, 0.2, 0.25, 0.15, 0.15, 0.1]; // More thanks and work talk when working on tasks
    } else if (agent.currentThought && agent.currentThought.includes('completed')) {
      weights = [0.1, 0.15, 0.2, 0.15, 0.25, 0.15]; // More work updates and encouragement when completing tasks
    }
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return types[i];
      }
    }
    
    return 'greetings'; // Default fallback
  }

  private startConversation(agent: AIAgent, otherAgent: AIAgent, type: string, now: number): void {
    const templates = this.conversationTemplates[type as keyof typeof this.conversationTemplates];
    const message = templates[Math.floor(Math.random() * templates.length)];
    
    // Give XP to both agents for interacting
    const xpGain = 5 + Math.floor(Math.random() * 10); // 5-15 XP per interaction
    
    agent.experiencePoints += xpGain;
    agent.totalInteractions += 1;
    otherAgent.experiencePoints += xpGain;
    otherAgent.totalInteractions += 1;
    
    // Save XP and interaction data to backend
    this.saveAgentXPData(agent);
    this.saveAgentXPData(otherAgent);
    
    // Check for level ups
    const agentNewLevel = Math.floor(agent.experiencePoints / 100) + 1;
    if (agentNewLevel > agent.level) {
      agent.level = agentNewLevel;
      this.addChatMessage({
        id: `agent_levelup_${agent.id}_${now}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: agent.id,
        message: `🎉 ${agent.name} leveled up to level ${agentNewLevel}!`,
        timestamp: now,
        type: 'action'
      });
    }
    
    const otherAgentNewLevel = Math.floor(otherAgent.experiencePoints / 100) + 1;
    if (otherAgentNewLevel > otherAgent.level) {
      otherAgent.level = otherAgentNewLevel;
      this.addChatMessage({
        id: `agent_levelup_${otherAgent.id}_${now}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: otherAgent.id,
        message: `🎉 ${otherAgent.name} leveled up to level ${otherAgentNewLevel}!`,
        timestamp: now,
        type: 'action'
      });
    }
    
    // Set conversation for the initiating agent
    agent.chatBubble = {
      message: message,
      timestamp: now,
      duration: 4000
    };
    agent.currentThought = message;
    agent.lastInteractionTime = now;

    // Add conversation message to chat feed (only sometimes)
    if (Math.random() > 0.8) { // Only 20% chance of showing conversations (reduced from 50%)
      this.addChatMessage({
        id: `conversation_${agent.id}_${now}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: agent.id,
        message: `💬 ${agent.name}: "${message}"`,
        timestamp: now,
        type: 'interaction'
      });
    }
    
    // Set response for the other agent after a short delay
    setTimeout(() => {
      if (type === 'greetings' || type === 'workTalk' || type === 'casual' || type === 'workUpdates' || type === 'encouragement' || type === 'thanks') {
        let responseTemplates;
        
        // Choose appropriate response based on conversation type
        if (type === 'thanks') {
          responseTemplates = this.conversationTemplates.responses;
        } else if (type === 'encouragement') {
          responseTemplates = [
            "Thank you so much!",
            "That means a lot to me!",
            "I really appreciate that!",
            "You're too kind!",
            "Thanks for the encouragement!",
            "That's so nice of you to say!",
            "I really needed to hear that!",
            "You're amazing too!"
          ];
        } else {
          // Mix of responses and follow-up questions
          responseTemplates = [
            ...this.conversationTemplates.responses,
            "That sounds interesting!",
            "Tell me more about that!",
            "How's that going for you?",
            "That's great to hear!",
            "I'd love to hear more!",
            "Sounds like you're doing well!",
            "That's fantastic!",
            "Keep up the great work!"
          ];
        }
        
        const response = responseTemplates[Math.floor(Math.random() * responseTemplates.length)];
        
        otherAgent.chatBubble = {
          message: response,
          timestamp: Date.now(),
          duration: 4000
        };
        otherAgent.currentThought = response;
        otherAgent.lastInteractionTime = Date.now();

        // Add response message to chat feed (only sometimes)
        if (Math.random() > 0.7) { // Only 30% chance of showing responses (reduced from 70%)
          this.addChatMessage({
            id: `conversation_response_${otherAgent.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            agentId: otherAgent.id,
            message: `💬 ${otherAgent.name}: "${response}"`,
            timestamp: Date.now(),
            type: 'interaction'
          });
        }
      }
    }, 4000); // 4 second delay for response
  }

  // Save agent XP and interaction data to backend
  private async saveAgentXPData(agent: AIAgent): Promise<void> {
    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          experience_points: agent.experiencePoints,
          level: agent.level,
          total_capital: agent.totalCapital,
          // Note: totalInteractions is not stored in the backend schema
          // but we could add it if needed
        }),
      });

      if (!response.ok) {
        console.error(`❌ Failed to save XP data for ${agent.name}:`, response.statusText);
      }
    } catch (error) {
      console.error(`❌ Error saving XP data for ${agent.name}:`, error);
    }
  }

  private updateAgentCapital(agent: AIAgent, now: number): void {
    // Update capital every 30 seconds
    if (now - agent.lastCapitalUpdate < 30000) {
      return;
    }

    // Capital changes based on agent activity and level
    let capitalChange = 0;
    
    switch (agent.activity) {
      case CrewmateActivity.WORKING:
        capitalChange = Math.floor(Math.random() * 50) + 10; // +10 to +60
        break;
      case CrewmateActivity.RESEARCHING:
        capitalChange = Math.floor(Math.random() * 100) + 20; // +20 to +120
        break;
      case CrewmateActivity.MAINTAINING:
        capitalChange = Math.floor(Math.random() * 30) + 5; // +5 to +35
        break;
      case CrewmateActivity.RESTING:
        capitalChange = -Math.floor(Math.random() * 20) - 5; // -5 to -25 (living costs)
        break;
      default:
        capitalChange = Math.floor(Math.random() * 20) - 10; // -10 to +10 (neutral)
    }

    // Higher level agents earn more
    capitalChange = Math.floor(capitalChange * (1 + agent.level * 0.2));

    // Apply capital change
    agent.totalCapital = Math.max(0, agent.totalCapital + capitalChange);
    agent.lastCapitalUpdate = now;

    // Save to backend if significant change
    if (Math.abs(capitalChange) > 10) {
      this.saveAgentXPData(agent);
    }
  }
}

export const gameState = new GameStateManager();