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
  gridSize: number;
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
  crewmates: Map<string, Crewmate>;
  lastCrewmateUpdate: number;
  aiAgents: Map<string, AIAgent>;
  chatMessages: ChatMessage[];
  maxChatMessages: number;
}

class GameStateManager {
  private state: GameState = {
    selectedTool: Tool.SELECT,
    mapData: new Map(),
    playerPosition: { x: 12, y: 12, pixelX: 768, pixelY: 768, isMoving: false, animationFrame: 0, direction: 'right' }, // Start at center of compact city
    cameraPosition: { x: 0, y: 0 }, // Will be updated when window is available
    cameraFollowMode: 'player',
    cameraFollowAgentId: null,
    gridSize: 64,
    tileSize: 64,
    mapWidth: 25, // Default from defaultMap
    mapHeight: 25, // Default from defaultMap
    crewmates: new Map(),
    lastCrewmateUpdate: 0,
    aiAgents: new Map(),
    chatMessages: [],
    maxChatMessages: 100
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
      speed: 0.5 + Math.random() * 0.5, // Random speed between 0.5 and 1.0
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
      moveInterval: 500 + Math.random() * 300
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
    
    // Find a random living quarters tile for home
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
      // If no living quarters, pick any random tile from the map within boundaries
      const validTiles = allTiles.filter(([key, tile]) => 
        tile.x >= 0 && tile.x < this.state.mapWidth && tile.y >= 0 && tile.y < this.state.mapHeight
      );
      if (validTiles.length > 0) {
        const randomTile = validTiles[Math.floor(Math.random() * validTiles.length)];
        homeX = randomTile[1].x;
        homeY = randomTile[1].y;
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
      // If no work tiles of preferred type, pick any random tile from the map within boundaries
      const validTiles = allTiles.filter(([key, tile]) => 
        tile.x >= 0 && tile.x < this.state.mapWidth && tile.y >= 0 && tile.y < this.state.mapHeight
      );
      if (validTiles.length > 0) {
        const randomTile = validTiles[Math.floor(Math.random() * validTiles.length)];
        workX = randomTile[1].x;
        workY = randomTile[1].y;
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
      speed: 0.3 + Math.random() * 0.7, // Random speed between 0.3 and 1.0
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
      moveInterval: 500 + Math.random() * 300 // 0.5-0.8 seconds between steps
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

    // Clear old chat messages
    if (now % 30000 < 100) { // Every 30 seconds
      this.clearOldChatMessages();
    }

    // Periodically spawn new agents (every 60-120 seconds, max 8 agents for compact city)
    if (this.state.aiAgents.size < 8 && now % 90000 < 100 && Math.random() < 0.3) {
      const newAgent = this.spawnRandomAIAgent();
      if (!newAgent) {
        console.log('Cannot spawn AI agent: no map loaded');
      }
    }

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
    
    // Autonomous behavior - generate thoughts and actions more frequently
    if (now - agent.lastInteractionTime > 3000 + Math.random() * 5000) {
      this.generateAutonomousBehavior(agent, now);
      agent.lastInteractionTime = now;
    }
    
    // Building visit decision logic
    if (now - agent.lastBuildingVisitTime > agent.visitCooldown && !agent.isFollowingPath) {
      this.decideToVisitBuilding(agent, now);
    }
    
    // Movement logic with pathfinding
    if (agent.isFollowingPath && agent.currentPath) {
      this.followPath(agent, deltaTime, now);
    } else {
      // Fallback to old random roaming if no path
      if (Math.random() < 0.001) { // 0.1% chance per frame to change destination
        this.findRandomDestination(agent);
      }
      
      // Grid-based movement towards target (road-only)
      const currentX = Math.round(agent.x);
      const currentY = Math.round(agent.y);
      const targetX = Math.round(agent.targetX);
      const targetY = Math.round(agent.targetY);
      
      if (currentX === targetX && currentY === targetY) {
        // Reached target, choose new activity
        this.chooseNewAIActivity(agent);
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
    
    // Check for nearby agents for interactions
    this.checkForAgentInteractions(agent, now);
    
    this.state.aiAgents.set(agent.id, agent);
  }

  private generateAutonomousBehavior(agent: AIAgent, now: number): void {
    const thoughts = [
      `${agent.name} is exploring the area`,
      `${agent.name} wonders about the other agents`,
      `${agent.name} is ${agent.currentThought}`,
      `${agent.name} decides to ${agent.currentGoal?.toLowerCase()}`,
      `${agent.name} feels ${agent.personality.split(' ')[0].toLowerCase()}`,
      `${agent.name} is roaming around`,
      `${agent.name} discovers new places`,
      `${agent.name} is curious about the city`,
      `${agent.name} enjoys the urban landscape`,
      `${agent.name} is on an adventure`,
      `${agent.name} explores different districts`,
      `${agent.name} wanders through the streets`,
      `${agent.name} investigates the area`,
      `${agent.name} is on a mission`,
      `${agent.name} seeks new experiences`
    ];
    
    // Generate activity-specific thoughts
    switch (agent.activity) {
      case CrewmateActivity.WORKING:
        thoughts.push(`${agent.name} is focused on work`, `${agent.name} is being productive`, `${agent.name} is hard at work`);
        break;
      case CrewmateActivity.RESTING:
        thoughts.push(`${agent.name} is taking a break`, `${agent.name} is recharging`, `${agent.name} needs some rest`);
        break;
      case CrewmateActivity.WALKING:
        thoughts.push(`${agent.name} is heading somewhere`, `${agent.name} enjoys the journey`, `${agent.name} is on the move`, `${agent.name} travels the city`);
        break;
      case CrewmateActivity.RESEARCHING:
        thoughts.push(`${agent.name} is conducting research`, `${agent.name} makes discoveries`, `${agent.name} studies the data`);
        break;
      case CrewmateActivity.MAINTAINING:
        thoughts.push(`${agent.name} is fixing systems`, `${agent.name} maintains equipment`, `${agent.name} keeps things running`);
        break;
      case CrewmateActivity.EATING:
        thoughts.push(`${agent.name} is having a meal`, `${agent.name} enjoys recreation`, `${agent.name} takes time to relax`);
        break;
    }
    
    const randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];
    
    // Add chat bubble
    agent.chatBubble = {
      message: randomThought,
      timestamp: now,
      duration: 2000 + Math.random() * 3000 // 2-5 seconds
    };
    
    // Add to chat log
    this.addChatMessage({
      id: `msg_${now}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: agent.id,
      message: randomThought,
      timestamp: now,
      type: 'thinking'
    });
    
    // Update current thought
    agent.currentThought = randomThought;
  }

  private checkForAgentInteractions(agent: AIAgent, now: number): void {
    const interactionRange = 3; // tiles - increased for compact city
    
    for (const [otherId, otherAgent] of Array.from(this.state.aiAgents.entries())) {
      if (otherId === agent.id) continue;
      
      const distance = Math.abs(agent.x - otherAgent.x) + Math.abs(agent.y - otherAgent.y);
      
      if (distance <= interactionRange && Math.random() < 0.02) { // 2% chance per frame when close - increased for more interactions
        this.triggerAgentInteraction(agent, otherAgent, now);
        break; // Only one interaction at a time
      }
    }
  }

  private triggerAgentInteraction(agent1: AIAgent, agent2: AIAgent, now: number): void {
    const interactions = [
      `${agent1.name} greets ${agent2.name}`,
      `${agent1.name} and ${agent2.name} have a friendly chat`,
      `${agent1.name} shares ideas with ${agent2.name}`,
      `${agent1.name} asks ${agent2.name} about their work`,
      `${agent1.name} and ${agent2.name} discuss the metaverse`
    ];
    
    // Type-specific interactions
    if (agent1.type === agent2.type) {
      interactions.push(`${agent1.name} and ${agent2.name} bond over their shared profession`);
    }
    
    if (agent1.type === CrewmateType.CAPTAIN || agent2.type === CrewmateType.CAPTAIN) {
      interactions.push(`Leadership discussion between ${agent1.name} and ${agent2.name}`);
    }
    
    const interaction = interactions[Math.floor(Math.random() * interactions.length)];
    
    // Set interaction targets
    agent1.interactionTarget = agent2.id;
    agent2.interactionTarget = agent1.id;
    
    // Add chat bubbles for both agents
    agent1.chatBubble = {
      message: `Talking with ${agent2.name}`,
      timestamp: now,
      duration: 4000
    };
    
    agent2.chatBubble = {
      message: `Chatting with ${agent1.name}`,
      timestamp: now,
      duration: 4000
    };
    
    // Add interaction message
    this.addChatMessage({
      id: `interaction_${now}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: agent1.id,
      message: interaction,
      timestamp: now,
      type: 'interaction'
    });
    
    // Clear interaction targets after a delay
    setTimeout(() => {
      agent1.interactionTarget = undefined;
      agent2.interactionTarget = undefined;
    }, 4000);
  }

  private chooseNewAIActivity(agent: AIAgent): void {
    const currentTile = this.state.mapData.get(`${Math.round(agent.x)},${Math.round(agent.y)}`);
    
    if (currentTile) {
      switch (currentTile.type) {
        case TileType.LIVING_QUARTERS:
          agent.activity = CrewmateActivity.RESTING;
          setTimeout(() => {
            agent.targetX = agent.workX;
            agent.targetY = agent.workY;
            agent.activity = CrewmateActivity.WALKING;
          }, 3000 + Math.random() * 5000);
          break;
          
        case TileType.RESEARCH_LAB:
          if (agent.type === CrewmateType.SCIENTIST) {
            agent.activity = CrewmateActivity.RESEARCHING;
            setTimeout(() => {
              this.findRandomDestination(agent);
            }, 5000 + Math.random() * 8000);
          } else {
            this.findRandomDestination(agent);
          }
          break;
          
        case TileType.ENGINEERING_BAY:
          if (agent.type === CrewmateType.ENGINEER) {
            agent.activity = CrewmateActivity.MAINTAINING;
            setTimeout(() => {
              this.findRandomDestination(agent);
            }, 4000 + Math.random() * 6000);
          } else {
            this.findRandomDestination(agent);
          }
          break;
          
        case TileType.RECREATION:
          agent.activity = CrewmateActivity.EATING;
          setTimeout(() => {
            this.findRandomDestination(agent);
          }, 2000 + Math.random() * 4000);
          break;
          
        default:
          this.findRandomDestination(agent);
      }
    } else {
      this.findRandomDestination(agent);
    }
  }

  private decideToVisitBuilding(agent: AIAgent, now: number): void {
    // Decide which type of building to visit based on agent type and randomness
    const buildingTypes = [
      TileType.RECREATION,
      TileType.LIVING_QUARTERS,
      TileType.RESEARCH_LAB,
      TileType.ENGINEERING_BAY
    ];
    
    // Weight building types based on agent type
    const weights = buildingTypes.map(type => {
      let weight = 1;
      if (type === TileType.RESEARCH_LAB && agent.type === CrewmateType.SCIENTIST) weight = 3;
      if (type === TileType.ENGINEERING_BAY && agent.type === CrewmateType.ENGINEER) weight = 3;
      if (type === TileType.RECREATION) weight = 2; // Everyone likes recreation
      return weight;
    });
    
    // Select building type based on weights
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    let selectedType = TileType.RECREATION;
    
    for (let i = 0; i < buildingTypes.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedType = buildingTypes[i];
        break;
      }
    }
    
    // Find path to the selected building type
    const path = this.pathfinder.findPathToRandomBuilding(
      Math.round(agent.x), 
      Math.round(agent.y), 
      selectedType
    );
    
    console.log(`${agent.name} decided to visit ${this.getBuildingTypeName(selectedType)} - path found: ${path ? path.nodes.length : 0} nodes`);
    
    if (path && path.nodes.length > 0) {
      const targetBuilding = path.nodes[path.nodes.length - 1];
      
      agent.currentPath = path.nodes;
      agent.pathIndex = 0;
      agent.isFollowingPath = true;
      agent.targetBuilding = {
        x: targetBuilding.x,
        y: targetBuilding.y,
        type: selectedType,
        reason: this.getBuildingVisitReason(selectedType, agent.type)
      };
      agent.activity = CrewmateActivity.WALKING;
      agent.lastBuildingVisitTime = now;
      
      // Add chat message about the decision
      agent.chatBubble = {
        message: `${agent.name} decides to visit ${this.getBuildingTypeName(selectedType)}`,
        timestamp: now,
        duration: 3000
      };
      
      this.addChatMessage({
        id: `visit_${now}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: agent.id,
        message: `${agent.name} decides to visit ${this.getBuildingTypeName(selectedType)} - ${agent.targetBuilding.reason}`,
        timestamp: now,
        type: 'action'
      });
    }
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
    
    const buildingName = this.getBuildingTypeName(agent.targetBuilding.type);
    
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

  private getBuildingTypeName(type: TileType): string {
    switch (type) {
      case TileType.RESEARCH_LAB: return 'Research Lab';
      case TileType.ENGINEERING_BAY: return 'Engineering Bay';
      case TileType.LIVING_QUARTERS: return 'Living Quarters';
      case TileType.RECREATION: return 'Recreation Center';
      default: return 'Building';
    }
  }

  private getBuildingVisitReason(buildingType: TileType, agentType: CrewmateType): string {
    const reasons: Record<string, string[]> = {
      [TileType.RESEARCH_LAB]: [
        'to conduct research',
        'to analyze data',
        'to make discoveries',
        'to study samples'
      ],
      [TileType.ENGINEERING_BAY]: [
        'to maintain systems',
        'to fix equipment',
        'to upgrade technology',
        'to build improvements'
      ],
      [TileType.LIVING_QUARTERS]: [
        'to rest and recharge',
        'to meet residents',
        'to check facilities',
        'to socialize'
      ],
      [TileType.RECREATION]: [
        'to relax and unwind',
        'to have fun',
        'to meet other agents',
        'to enjoy activities'
      ]
    };
    
    const buildingReasons = reasons[buildingType] || ['to explore'];
    return buildingReasons[Math.floor(Math.random() * buildingReasons.length)];
  }

  private findRandomDestination(agent: AIAgent): void {
    // Get all available tiles from the loaded map
    const allTiles = Array.from(this.state.mapData.entries());
    
    if (allTiles.length === 0) {
      // No map loaded, stay in place
      return;
    }
    
    // More diverse roaming behavior within map boundaries
    const destinations = [
      { type: TileType.RECREATION, weight: 4 },
      { type: TileType.LIVING_QUARTERS, weight: 3 },
      { type: TileType.RESEARCH_LAB, weight: agent.type === CrewmateType.SCIENTIST ? 5 : 2 },
      { type: TileType.ENGINEERING_BAY, weight: agent.type === CrewmateType.ENGINEER ? 5 : 2 },
      { type: TileType.CORRIDOR, weight: 6 }, // More corridor exploration
      { type: TileType.SPACE, weight: 2 } // Only explore space tiles that exist in the map
    ];
    
    const totalWeight = destinations.reduce((sum, dest) => sum + dest.weight, 0);
    let random = Math.random() * totalWeight;
    
    let selectedType = TileType.CORRIDOR;
    for (const dest of destinations) {
      random -= dest.weight;
      if (random <= 0) {
        selectedType = dest.type;
        break;
      }
    }
    
    const tilesOfType = allTiles.filter(([key, tile]) => 
      tile.type === selectedType && 
      tile.x >= 0 && tile.x < this.state.mapWidth && tile.y >= 0 && tile.y < this.state.mapHeight // Ensure within boundaries
    );
    
    if (tilesOfType.length > 0) {
      const randomTile = tilesOfType[Math.floor(Math.random() * tilesOfType.length)];
      agent.targetX = Math.max(0, Math.min(this.state.mapWidth - 1, randomTile[1].x));
      agent.targetY = Math.max(0, Math.min(this.state.mapHeight - 1, randomTile[1].y));
      agent.activity = CrewmateActivity.WALKING;
    } else {
      // If no tiles of selected type, pick any random tile from the loaded map within boundaries
      const validTiles = allTiles.filter(([key, tile]) => 
        tile.x >= 0 && tile.x < this.state.mapWidth && tile.y >= 0 && tile.y < this.state.mapHeight
      );
      if (validTiles.length > 0) {
        const randomTile = validTiles[Math.floor(Math.random() * validTiles.length)];
        agent.targetX = Math.max(0, Math.min(24, randomTile[1].x));
        agent.targetY = Math.max(0, Math.min(24, randomTile[1].y));
        agent.activity = CrewmateActivity.WALKING;
      }
    }
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
      // Reached target, choose new activity
      this.chooseNewActivity(crewmate);
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

  private chooseNewActivity(crewmate: Crewmate): void {
    const currentTile = this.state.mapData.get(`${Math.round(crewmate.x)},${Math.round(crewmate.y)}`);
    
    if (currentTile) {
      switch (currentTile.type) {
        case TileType.LIVING_QUARTERS:
          crewmate.activity = CrewmateActivity.RESTING;
          // After resting, go to work
          setTimeout(() => {
            crewmate.targetX = crewmate.workX;
            crewmate.targetY = crewmate.workY;
            crewmate.activity = CrewmateActivity.WALKING;
          }, 3000 + Math.random() * 5000);
          break;
          
        case TileType.RESEARCH_LAB:
          if (crewmate.type === CrewmateType.SCIENTIST) {
            crewmate.activity = CrewmateActivity.RESEARCHING;
            // After researching, go home
            setTimeout(() => {
              crewmate.targetX = crewmate.homeX;
              crewmate.targetY = crewmate.homeY;
              crewmate.activity = CrewmateActivity.WALKING;
            }, 5000 + Math.random() * 8000);
          } else {
            // Go to recreation
            this.findNearestTile(crewmate, TileType.RECREATION);
          }
          break;
          
        case TileType.ENGINEERING_BAY:
          if (crewmate.type === CrewmateType.ENGINEER) {
            crewmate.activity = CrewmateActivity.MAINTAINING;
            // After maintaining, go home
            setTimeout(() => {
              crewmate.targetX = crewmate.homeX;
              crewmate.targetY = crewmate.homeY;
              crewmate.activity = CrewmateActivity.WALKING;
            }, 4000 + Math.random() * 6000);
          } else {
            // Go to recreation
            this.findNearestTile(crewmate, TileType.RECREATION);
          }
          break;
          
        case TileType.RECREATION:
          crewmate.activity = CrewmateActivity.EATING;
          // After eating, go to work
          setTimeout(() => {
            crewmate.targetX = crewmate.workX;
            crewmate.targetY = crewmate.workY;
            crewmate.activity = CrewmateActivity.WALKING;
          }, 2000 + Math.random() * 4000);
          break;
          
        default:
          // Random walk
          this.findRandomCorridor(crewmate);
      }
    } else {
      // In space, find nearest corridor
      this.findNearestTile(crewmate, TileType.CORRIDOR);
    }
  }

  private findNearestTile(crewmate: Crewmate, tileType: TileType): void {
    let nearestDistance = Infinity;
    let nearestX = crewmate.x;
    let nearestY = crewmate.y;
    
    for (const [key, tile] of Array.from(this.state.mapData.entries())) {
      if (tile.type === tileType) {
        const distance = Math.abs(tile.x - crewmate.x) + Math.abs(tile.y - crewmate.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestX = tile.x;
          nearestY = tile.y;
        }
      }
    }
    
    crewmate.targetX = nearestX;
    crewmate.targetY = nearestY;
    crewmate.activity = CrewmateActivity.WALKING;
  }

  private findRandomCorridor(crewmate: Crewmate): void {
    const corridors: Array<{x: number, y: number}> = [];
    
    for (const [key, tile] of Array.from(this.state.mapData.entries())) {
      if (tile.type === TileType.CORRIDOR) {
        corridors.push({ x: tile.x, y: tile.y });
      }
    }
    
    if (corridors.length > 0) {
      const randomCorridor = corridors[Math.floor(Math.random() * corridors.length)];
      crewmate.targetX = randomCorridor.x;
      crewmate.targetY = randomCorridor.y;
      crewmate.activity = CrewmateActivity.WALKING;
    }
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

  setPlayerPixelPosition(pixelX: number, pixelY: number) {
    const tileSize = this.state.tileSize;
    
    // Apply map boundary constraints using actual map dimensions
    const mapWidth = this.state.mapWidth;
    const mapHeight = this.state.mapHeight;
    const maxPixelX = (mapWidth - 1) * tileSize;
    const maxPixelY = (mapHeight - 1) * tileSize;
    
    // Debug logging to see what's happening
    console.log(`Player boundary debug: pixelX=${pixelX}, pixelY=${pixelY}, mapWidth=${mapWidth}, mapHeight=${mapHeight}, tileSize=${tileSize}, maxPixelX=${maxPixelX}, maxPixelY=${maxPixelY}`);
    
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

  initializeCamera() {
    if (typeof window !== 'undefined') {
      const playerPixelX = this.state.playerPosition.pixelX;
      const playerPixelY = this.state.playerPosition.pixelY;
      
      // Center camera on player's exact pixel position
      const cameraX = -playerPixelX + (window.innerWidth / 2) - 16; // 16 is half player size
      const cameraY = -playerPixelY + (window.innerHeight / 2) - 16;
      
      // Constrain camera to map boundaries
      const constrainedCamera = this.constrainCameraToMapBounds(cameraX, cameraY);
      
      this.state.cameraPosition = constrainedCamera;
      this.notifyListeners();
    }
  }

  updateCameraToFollowPlayer() {
    if (typeof window !== 'undefined') {
      const playerPixelX = this.state.playerPosition.pixelX;
      const playerPixelY = this.state.playerPosition.pixelY;
      
      // Center camera on player's exact pixel position
      const cameraX = -playerPixelX + (window.innerWidth / 2) - 16; // 16 is half player size
      const cameraY = -playerPixelY + (window.innerHeight / 2) - 16;
      
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

  updateCamera() {
    if (this.state.cameraFollowMode === 'player') {
      this.updateCameraToFollowPlayer();
    } else if (this.state.cameraFollowMode === 'agent' && this.state.cameraFollowAgentId) {
      this.updateCameraToFollowAgent(this.state.cameraFollowAgentId);
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
