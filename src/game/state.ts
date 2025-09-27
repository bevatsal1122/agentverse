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
    crewmates: new Map(),
    lastCrewmateUpdate: 0,
    aiAgents: new Map(),
    chatMessages: [],
    maxChatMessages: 100
  };

  private listeners: Array<(state: GameState) => void> = [];

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
      goals: ['Complete tasks', 'Help others']
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
    const livingQuarters = allTiles.filter(([key, tile]) => tile.type === TileType.LIVING_QUARTERS);
    if (livingQuarters.length > 0) {
      const randomHome = livingQuarters[Math.floor(Math.random() * livingQuarters.length)];
      homeX = randomHome[1].x;
      homeY = randomHome[1].y;
    } else {
      // If no living quarters, pick any random tile from the map
      const randomTile = allTiles[Math.floor(Math.random() * allTiles.length)];
      homeX = randomTile[1].x;
      homeY = randomTile[1].y;
    }
    
    // Find a random work location based on type
    let workX = homeX, workY = homeY;
    let workTileType = TileType.RECREATION;
    if (type === CrewmateType.SCIENTIST) workTileType = TileType.RESEARCH_LAB;
    else if (type === CrewmateType.ENGINEER) workTileType = TileType.ENGINEERING_BAY;
    else if (type === CrewmateType.CAPTAIN) workTileType = TileType.RESEARCH_LAB;
    
    const workTiles = allTiles.filter(([key, tile]) => tile.type === workTileType);
    if (workTiles.length > 0) {
      const randomWork = workTiles[Math.floor(Math.random() * workTiles.length)];
      workX = randomWork[1].x;
      workY = randomWork[1].y;
    } else {
      // If no work tiles of preferred type, pick any random tile from the map
      const randomTile = allTiles[Math.floor(Math.random() * allTiles.length)];
      workX = randomTile[1].x;
      workY = randomTile[1].y;
    }
    
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
      currentGoal: goals[0]
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
    
    // Random roaming - change destination more frequently for more dynamic movement
    if (Math.random() < 0.001) { // 0.1% chance per frame to change destination
      this.findRandomDestination(agent);
    }
    
    // Movement logic
    const dx = agent.targetX - agent.x;
    const dy = agent.targetY - agent.y;
    
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
      // Reached target, choose new activity
      this.chooseNewAIActivity(agent);
    } else {
      // Move towards target
      const moveSpeed = agent.speed * agent.autonomyLevel * (deltaTime / 1000);
      
      if (Math.abs(dx) > Math.abs(dy)) {
        // Move horizontally
        agent.x += dx > 0 ? moveSpeed : -moveSpeed;
        agent.direction = dx > 0 ? 'east' : 'west';
      } else {
        // Move vertically
        agent.y += dy > 0 ? moveSpeed : -moveSpeed;
        agent.direction = dy > 0 ? 'south' : 'north';
      }
      
      // Snap to grid when close
      if (Math.abs(agent.x - Math.round(agent.x)) < 0.1) {
        agent.x = Math.round(agent.x);
      }
      if (Math.abs(agent.y - Math.round(agent.y)) < 0.1) {
        agent.y = Math.round(agent.y);
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
    
    const tilesOfType = allTiles.filter(([key, tile]) => tile.type === selectedType);
    
    if (tilesOfType.length > 0) {
      const randomTile = tilesOfType[Math.floor(Math.random() * tilesOfType.length)];
      agent.targetX = randomTile[1].x;
      agent.targetY = randomTile[1].y;
      agent.activity = CrewmateActivity.WALKING;
    } else {
      // If no tiles of selected type, pick any random tile from the loaded map
      const randomTile = allTiles[Math.floor(Math.random() * allTiles.length)];
      agent.targetX = randomTile[1].x;
      agent.targetY = randomTile[1].y;
      agent.activity = CrewmateActivity.WALKING;
    }
  }

  private updateCrewmateAI(crewmate: Crewmate, deltaTime: number): void {
    const currentTile = this.state.mapData.get(`${crewmate.x},${crewmate.y}`);
    
    // Update animation frame
    crewmate.animationFrame = (crewmate.animationFrame + 1) % 8;
    
    // Simple pathfinding - move towards target
    const dx = crewmate.targetX - crewmate.x;
    const dy = crewmate.targetY - crewmate.y;
    
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
      // Reached target, choose new activity
      this.chooseNewActivity(crewmate);
    } else {
      // Move towards target
      const moveSpeed = crewmate.speed * (deltaTime / 1000);
      
      if (Math.abs(dx) > Math.abs(dy)) {
        // Move horizontally
        crewmate.x += dx > 0 ? moveSpeed : -moveSpeed;
        crewmate.direction = dx > 0 ? 'east' : 'west';
      } else {
        // Move vertically
        crewmate.y += dy > 0 ? moveSpeed : -moveSpeed;
        crewmate.direction = dy > 0 ? 'south' : 'north';
      }
      
      // Snap to grid when close
      if (Math.abs(crewmate.x - Math.round(crewmate.x)) < 0.1) {
        crewmate.x = Math.round(crewmate.x);
      }
      if (Math.abs(crewmate.y - Math.round(crewmate.y)) < 0.1) {
        crewmate.y = Math.round(crewmate.y);
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
    const tileX = Math.floor(pixelX / tileSize);
    const tileY = Math.floor(pixelY / tileSize);
    
    this.state.playerPosition = { 
      x: tileX, 
      y: tileY, 
      pixelX, 
      pixelY,
      isMoving: this.state.playerPosition.isMoving,
      animationFrame: this.state.playerPosition.animationFrame,
      direction: this.state.playerPosition.direction
    };
    
    // Update camera based on current follow mode
    this.updateCamera();
    this.notifyListeners();
  }

  setCameraPosition(x: number, y: number) {
    this.state.cameraPosition = { x, y };
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

  getMapDataArray(): Array<[string, Tile]> {
    return Array.from(this.state.mapData.entries());
  }

  clearMap() {
    this.state.mapData.clear();
    this.notifyListeners();
  }

  initializeCamera() {
    if (typeof window !== 'undefined') {
      const playerPixelX = this.state.playerPosition.pixelX;
      const playerPixelY = this.state.playerPosition.pixelY;
      
      // Center camera on player's exact pixel position
      const cameraX = -playerPixelX + (window.innerWidth / 2) - 16; // 16 is half player size
      const cameraY = -playerPixelY + (window.innerHeight / 2) - 16;
      
      this.state.cameraPosition = { x: cameraX, y: cameraY };
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
      
      this.state.cameraPosition = { x: cameraX, y: cameraY };
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
        
        this.state.cameraPosition = { x: cameraX, y: cameraY };
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
