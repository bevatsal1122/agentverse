import React, { useEffect, useRef, useState } from 'react';
import { gameState, Tool, TileType, GameState, Crewmate, CrewmateType, CrewmateActivity } from '../game/state';
import { MapLoader } from '../maps/mapLoader';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [, forceUpdate] = useState({});
  const [trafficElements, setTrafficElements] = useState<TrafficElement[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current) return;

    // Get 2D context
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D context');
      return;
    }

    ctxRef.current = ctx;

    // Set up canvas
    canvasRef.current.width = window.innerWidth;
    canvasRef.current.height = window.innerHeight - 80;

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;
    (ctx as any).webkitImageSmoothingEnabled = false;
    (ctx as any).mozImageSmoothingEnabled = false;
    (ctx as any).msImageSmoothingEnabled = false;

    // Setup click handler for tile placement
    canvasRef.current.addEventListener('click', handleCanvasClick);

    // Initialize camera to center on player
    gameState.initializeCamera();

    // Auto-load default map if no map is loaded
    const state = gameState.getState();
    console.log('Initial map data size:', state.mapData.size);
    if (state.mapData.size === 0) {
      console.log('Loading default map...');
      MapLoader.loadDefaultMap();
      console.log('Map loaded, new size:', gameState.getState().mapData.size);
    }

    // Subscribe to game state changes
    const unsubscribe = gameState.subscribe(updateCanvas);

    // Initial render
    updateCanvas(gameState.getState());
    
    // Generate initial traffic
    generateTraffic(gameState.getState());
    
    // Spawn initial crewmates
    const currentState = gameState.getState();
    if (currentState.crewmates.size === 0) {
      // Spawn 3-5 crewmates initially
      const numCrewmates = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numCrewmates; i++) {
        gameState.spawnRandomCrewmate();
      }
    }
    
    // Animation loop for traffic and crewmates (throttled for performance)
    let lastTime = 0;
    const animate = (currentTime: number) => {
      if (currentTime - lastTime > 100) { // Update every 100ms instead of every frame
        updateTraffic();
        gameState.updateCrewmates(); // Update crewmate AI and movement
        updateCanvas(gameState.getState());
        lastTime = currentTime;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      unsubscribe();
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('click', handleCanvasClick);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleCanvasClick = (event: MouseEvent) => {
    if (!canvasRef.current) return;

    const state = gameState.getState();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert screen coordinates to grid coordinates
    const gridX = Math.floor((x - state.cameraPosition.x) / state.tileSize);
    const gridY = Math.floor((y - state.cameraPosition.y) / state.tileSize);

    // Get the current selected tool from game state instead of closure
    const currentTool = state.selectedTool;

    // Handle different tools
    switch (currentTool) {
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

  const getTileColor = (type: TileType): string => {
    switch (type) {
      case TileType.SPACE:
        return '#0a0a1a'; // Deep space dark blue
      case TileType.CORRIDOR:
        return '#2a2a3a'; // Dark gray corridor
      case TileType.MAIN_CORRIDOR:
        return '#1a1a2a'; // Darker main corridor
      case TileType.HIGHWAY:
        return '#0f0f1f'; // Very dark main highway
      case TileType.LIVING_QUARTERS:
        return '#2a3a4a'; // Blue-gray quarters
      case TileType.RESEARCH_LAB:
        return '#3a2a4a'; // Purple-gray research
      case TileType.ENGINEERING_BAY:
        return '#4a3a2a'; // Orange-gray engineering
      case TileType.RECREATION:
        return '#2a4a3a'; // Green-gray recreation
      case TileType.POWER_LINE:
        return '#ffaa00'; // Bright orange power
      case TileType.WATER:
        return '#1a3a5a'; // Deep blue water
      default:
        return '#0a0a1a'; // Default to space
    }
  };

  const drawSpaceTexture = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    // Base space color
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(x, y, size, size);
    
    // Add star field pattern
    ctx.fillStyle = '#ffffff';
    // Bright stars
    for (let sx = 0; sx < size; sx += 6) {
      for (let sy = 0; sy < size; sy += 6) {
        if ((sx + sy) % 12 === 0) {
          ctx.fillRect(x + sx, y + sy, 1, 1);
        }
      }
    }
    
    // Dimmer stars
    ctx.fillStyle = '#666666';
    for (let sx = 3; sx < size; sx += 8) {
      for (let sy = 3; sy < size; sy += 8) {
        if ((sx + sy) % 16 === 0) {
          ctx.fillRect(x + sx, y + sy, 1, 1);
        }
      }
    }
  };

  const isCorridorType = (type: TileType | undefined): boolean => {
    return type === TileType.CORRIDOR || type === TileType.MAIN_CORRIDOR || type === TileType.HIGHWAY;
  };

  const drawCrewmate = (ctx: CanvasRenderingContext2D, crewmate: Crewmate, x: number, y: number, tileSize: number) => {
    const centerX = x + tileSize / 2;
    const centerY = y + tileSize / 2;
    const size = tileSize * 0.6;
    
    // Crewmate body (oval shape like Among Us)
    ctx.fillStyle = crewmate.color;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + size * 0.1, size * 0.4, size * 0.5, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Crewmate backpack
    ctx.fillStyle = crewmate.color;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + size * 0.3, size * 0.15, size * 0.25, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Crewmate visor (white)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - size * 0.1, size * 0.3, size * 0.2, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Visor reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(centerX - size * 0.05, centerY - size * 0.15, size * 0.1, size * 0.05, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Activity indicator
    if (crewmate.activity !== CrewmateActivity.WALKING) {
      const indicatorColor = getActivityColor(crewmate.activity);
      ctx.fillStyle = indicatorColor;
      ctx.beginPath();
      ctx.arc(centerX + size * 0.3, centerY - size * 0.2, size * 0.08, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Walking animation - slight bounce
    if (crewmate.activity === CrewmateActivity.WALKING) {
      const bounce = Math.sin(crewmate.animationFrame * 0.5) * 2;
      ctx.translate(0, bounce);
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

  const drawRoadTile = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, state: GameState, tileX: number, tileY: number, roadType: TileType) => {
    // Base road color based on type
    let baseColor = '#404040';
    let lineColor = '#FFFF00';
    let edgeColor = '#606060';
    
    if (roadType === TileType.MAIN_CORRIDOR) {
      baseColor = '#2F2F2F';
      lineColor = '#FFFFFF'; // White lines for main corridors
      edgeColor = '#505050';
    } else if (roadType === TileType.HIGHWAY) {
      baseColor = '#1C1C1C';
      lineColor = '#FFFFFF'; // White lines for highways
      edgeColor = '#404040';
    }
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, size, size);
    
    // Check adjacent tiles for road connections
    const hasRoadNorth = isCorridorType(state.mapData.get(`${tileX},${tileY - 1}`)?.type);
    const hasRoadSouth = isCorridorType(state.mapData.get(`${tileX},${tileY + 1}`)?.type);
    const hasRoadEast = isCorridorType(state.mapData.get(`${tileX + 1},${tileY}`)?.type);
    const hasRoadWest = isCorridorType(state.mapData.get(`${tileX - 1},${tileY}`)?.type);
    
    // Draw road markings based on type
    if (roadType === TileType.HIGHWAY) {
      // Highway with multiple lanes
      ctx.fillStyle = lineColor;
      
      if (hasRoadNorth || hasRoadSouth) {
        // Multiple vertical lines for highway
        ctx.fillRect(x + size/3 - 1, y, 1, size);
        ctx.fillRect(x + 2*size/3 - 1, y, 1, size);
      }
      if (hasRoadEast || hasRoadWest) {
        // Multiple horizontal lines for highway
        ctx.fillRect(x, y + size/3 - 1, size, 1);
        ctx.fillRect(x, y + 2*size/3 - 1, size, 1);
      }
      
      // Highway barriers
      ctx.fillStyle = '#808080';
      if (!hasRoadNorth) ctx.fillRect(x, y, size, 3);
      if (!hasRoadSouth) ctx.fillRect(x, y + size - 3, size, 3);
      if (!hasRoadEast) ctx.fillRect(x + size - 3, y, 3, size);
      if (!hasRoadWest) ctx.fillRect(x, y, 3, size);
      
    } else if (roadType === TileType.MAIN_CORRIDOR) {
      // Main corridor with center divider
      ctx.fillStyle = lineColor;
      
      if (hasRoadNorth || hasRoadSouth) {
        // Dashed vertical line
        for (let i = 0; i < size; i += 6) {
          ctx.fillRect(x + size/2 - 1, y + i, 2, 3);
        }
      }
      if (hasRoadEast || hasRoadWest) {
        // Dashed horizontal line
        for (let i = 0; i < size; i += 6) {
          ctx.fillRect(x + i, y + size/2 - 1, 3, 2);
        }
      }
      
      // Main road edges
      ctx.fillStyle = edgeColor;
      if (!hasRoadNorth) ctx.fillRect(x, y, size, 2);
      if (!hasRoadSouth) ctx.fillRect(x, y + size - 2, size, 2);
      if (!hasRoadEast) ctx.fillRect(x + size - 2, y, 2, size);
      if (!hasRoadWest) ctx.fillRect(x, y, 2, size);
      
    } else {
      // Regular road
      ctx.fillStyle = lineColor;
      
      if (hasRoadNorth || hasRoadSouth) {
        // Vertical line
        ctx.fillRect(x + size/2 - 1, y, 2, size);
      }
      if (hasRoadEast || hasRoadWest) {
        // Horizontal line
        ctx.fillRect(x, y + size/2 - 1, size, 2);
      }
      
      // Road edges
      ctx.fillStyle = edgeColor;
      if (!hasRoadNorth) ctx.fillRect(x, y, size, 2);
      if (!hasRoadSouth) ctx.fillRect(x, y + size - 2, size, 2);
      if (!hasRoadEast) ctx.fillRect(x + size - 2, y, 2, size);
      if (!hasRoadWest) ctx.fillRect(x, y, 2, size);
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
    
    // Generate random traffic on roads (reduced for performance)
    for (let i = 0; i < Math.min(5, roadTiles.length / 8); i++) {
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

  const drawTraffic = (ctx: CanvasRenderingContext2D, state: GameState) => {
    trafficElements.forEach(element => {
      const screenX = element.x + state.cameraPosition.x;
      const screenY = element.y + state.cameraPosition.y;
      
      // Only draw if visible
      if (screenX > -20 && screenX < window.innerWidth + 20 && 
          screenY > -20 && screenY < window.innerHeight + 20) {
        
        ctx.fillStyle = element.color;
        
        if (element.type === 'car') {
          // Draw car
          if (element.direction === 'north' || element.direction === 'south') {
            ctx.fillRect(screenX - 2, screenY - 4, 4, 8);
          } else {
            ctx.fillRect(screenX - 4, screenY - 2, 8, 4);
          }
        } else if (element.type === 'bus') {
          // Draw bus (larger)
          if (element.direction === 'north' || element.direction === 'south') {
            ctx.fillRect(screenX - 3, screenY - 6, 6, 12);
          } else {
            ctx.fillRect(screenX - 6, screenY - 3, 12, 6);
          }
        } else if (element.type === 'pedestrian') {
          // Draw pedestrian (small dot)
          ctx.fillRect(screenX - 1, screenY - 1, 2, 2);
        }
      }
    });
  };

  const updateCanvas = (state: GameState) => {
    if (!ctxRef.current || !canvasRef.current) return;

    const ctx = ctxRef.current;
    const canvas = canvasRef.current;

    // Clear canvas with space background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context for transformations
    ctx.save();

    // Apply camera transformation
    ctx.translate(state.cameraPosition.x, state.cameraPosition.y);

    // Calculate visible area to optimize rendering
    const viewportLeft = Math.floor(-state.cameraPosition.x / state.tileSize) - 2;
    const viewportRight = Math.floor((-state.cameraPosition.x + canvas.width) / state.tileSize) + 2;
    const viewportTop = Math.floor(-state.cameraPosition.y / state.tileSize) - 2;
    const viewportBottom = Math.floor((-state.cameraPosition.y + canvas.height) / state.tileSize) + 2;

    // Render background grass for empty areas in viewport
    for (let tileX = viewportLeft; tileX <= viewportRight; tileX++) {
      for (let tileY = viewportTop; tileY <= viewportBottom; tileY++) {
        const x = tileX * state.tileSize;
        const y = tileY * state.tileSize;
        
        // If no tile exists at this position, render space
        if (!state.mapData.has(`${tileX},${tileY}`)) {
          drawSpaceTexture(ctx, x, y, state.tileSize);
          
          // Add subtle tile border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, state.tileSize, state.tileSize);
        }
      }
    }

    // Render existing tiles
    state.mapData.forEach((tile) => {
      // Only render tiles in viewport
      if (tile.x < viewportLeft || tile.x > viewportRight || 
          tile.y < viewportTop || tile.y > viewportBottom) {
        return;
      }

      const x = tile.x * state.tileSize;
      const y = tile.y * state.tileSize;

      // Special rendering for different tile types
      if (tile.type === TileType.SPACE) {
        drawSpaceTexture(ctx, x, y, state.tileSize);
      } else if (isCorridorType(tile.type)) {
        drawRoadTile(ctx, x, y, state.tileSize, state, tile.x, tile.y, tile.type);
      } else {
        // Fill zoning background color for districts
        ctx.fillStyle = getTileColor(tile.type);
        ctx.fillRect(x, y, state.tileSize, state.tileSize);
        
        // Add subtle zoning pattern
        if (tile.type === TileType.LIVING_QUARTERS) {
          ctx.fillStyle = 'rgba(100, 150, 200, 0.3)'; // Semi-transparent blue overlay
          ctx.fillRect(x, y, state.tileSize, state.tileSize);
        } else if (tile.type === TileType.RESEARCH_LAB) {
          ctx.fillStyle = 'rgba(150, 100, 200, 0.3)'; // Semi-transparent purple overlay
          ctx.fillRect(x, y, state.tileSize, state.tileSize);
        } else if (tile.type === TileType.ENGINEERING_BAY) {
          ctx.fillStyle = 'rgba(200, 150, 100, 0.3)'; // Semi-transparent orange overlay
          ctx.fillRect(x, y, state.tileSize, state.tileSize);
        } else if (tile.type === TileType.RECREATION) {
          ctx.fillStyle = 'rgba(100, 200, 150, 0.3)'; // Semi-transparent green overlay
          ctx.fillRect(x, y, state.tileSize, state.tileSize);
        }

        // Add building sprites
        if (tile.type === TileType.LIVING_QUARTERS) {
          // Create variety in living quarters based on position
          const moduleType = (tile.x + tile.y) % 4;
          
          if (moduleType === 0) {
            // Crew quarters module
            ctx.fillStyle = '#2a3a4a'; // Module shadow
            ctx.fillRect(x + 6, y + 16, 20, 12);
            
            ctx.fillStyle = '#3a4a5a'; // Module body
            ctx.fillRect(x + 5, y + 15, 20, 12);
            
            ctx.fillStyle = '#4a5a6a'; // Module top
            ctx.fillRect(x + 4, y + 12, 22, 4);
            
            // Glowing windows
            ctx.fillStyle = '#ffd700'; // Golden windows
            ctx.fillRect(x + 8, y + 18, 3, 3);
            ctx.fillRect(x + 13, y + 18, 3, 3);
            ctx.fillRect(x + 18, y + 18, 3, 3);
            
            // Door
            ctx.fillStyle = '#6a7a8a'; // Door
            ctx.fillRect(x + 14, y + 21, 4, 6);
            
          } else if (moduleType === 1) {
            // Family quarters module
            ctx.fillStyle = '#2a3a4a'; // Shadow
            ctx.fillRect(x + 4, y + 8, 24, 20);
            
            ctx.fillStyle = '#3a4a5a'; // Module body
            ctx.fillRect(x + 3, y + 7, 24, 20);
            
            ctx.fillStyle = '#4a5a6a'; // Module top
            ctx.fillRect(x + 2, y + 5, 26, 4);
            
            // Multiple windows pattern
            ctx.fillStyle = '#ffd700'; // Golden windows
            for (let wx = 0; wx < 4; wx++) {
              for (let wy = 0; wy < 3; wy++) {
                ctx.fillRect(x + 5 + wx * 4, y + 11 + wy * 4, 2, 2);
              }
            }
            
            ctx.fillStyle = '#6a7a8a'; // Door
            ctx.fillRect(x + 13, y + 21, 4, 6);
            
          } else if (moduleType === 2) {
            // Luxury quarters module
            ctx.fillStyle = '#2a3a4a'; // Shadow
            ctx.fillRect(x + 2, y + 14, 28, 14);
            
            ctx.fillStyle = '#4a5a6a'; // Module body
            ctx.fillRect(x + 1, y + 13, 28, 14);
            
            ctx.fillStyle = '#5a6a7a'; // Module top
            ctx.fillRect(x + 0, y + 9, 30, 6);
            
            // Large luxury windows
            ctx.fillStyle = '#ffd700'; // Golden windows
            ctx.fillRect(x + 5, y + 17, 4, 4);
            ctx.fillRect(x + 11, y + 17, 4, 4);
            ctx.fillRect(x + 17, y + 17, 4, 4);
            ctx.fillRect(x + 23, y + 17, 4, 4);
            
            ctx.fillStyle = '#6a7a8a'; // Door
            ctx.fillRect(x + 13, y + 21, 4, 6);
            
          } else {
            // Compact quarters module
            ctx.fillStyle = '#2a3a4a'; // Shadow
            ctx.fillRect(x + 3, y + 12, 26, 16);
            
            ctx.fillStyle = '#3a4a5a'; // Module body
            ctx.fillRect(x + 2, y + 11, 26, 16);
            
            ctx.fillStyle = '#4a5a6a'; // Module top
            ctx.fillRect(x + 1, y + 9, 28, 4);
            
            // Compact windows
            ctx.fillStyle = '#ffd700'; // Golden windows
            ctx.fillRect(x + 5, y + 15, 6, 6);
            ctx.fillRect(x + 19, y + 15, 6, 6);
            
            ctx.fillStyle = '#6a7a8a'; // Door
            ctx.fillRect(x + 13, y + 21, 4, 6);
          }
          
        } else if (tile.type === TileType.RESEARCH_LAB) {
          // Create variety in research lab modules
          const labType = (tile.x * 3 + tile.y * 2) % 3;
          
          if (labType === 0) {
            // Main research tower
            ctx.fillStyle = '#3a2a4a'; // Shadow
            ctx.fillRect(x + 2, y + 6, 28, 22);
            
            ctx.fillStyle = '#4a3a5a'; // Module body
            ctx.fillRect(x + 1, y + 5, 28, 22);
            
            ctx.fillStyle = '#5a4a6a'; // Module top
            ctx.fillRect(x + 1, y + 5, 28, 4);
            
            // Research lab windows with purple glow
            ctx.fillStyle = '#aa88ff'; // Purple lit windows
            for (let wx = 0; wx < 5; wx++) {
              for (let wy = 0; wy < 4; wy++) {
                if ((wx + wy) % 2 === 0) { // Checkerboard pattern
                  ctx.fillRect(x + 3 + wx * 4, y + 9 + wy * 4, 2, 2);
                }
              }
            }
            
          } else if (labType === 1) {
            // Laboratory complex
            ctx.fillStyle = '#3a2a4a'; // Shadow
            ctx.fillRect(x + 1, y + 16, 30, 12);
            
            ctx.fillStyle = '#4a3a5a'; // Module body
            ctx.fillRect(x + 0, y + 15, 30, 12);
            
            ctx.fillStyle = '#5a4a6a'; // Module top
            ctx.fillRect(x + 0, y + 13, 30, 4);
            
            // Lab equipment windows
            ctx.fillStyle = '#aa88ff'; // Purple lab windows
            ctx.fillRect(x + 2, y + 19, 8, 6);
            ctx.fillRect(x + 12, y + 19, 8, 6);
            ctx.fillRect(x + 22, y + 19, 6, 6);
            
            // Lab equipment indicators
            ctx.fillStyle = '#ff88aa'; // Pink equipment lights
            ctx.fillRect(x + 3, y + 17, 6, 2);
            ctx.fillRect(x + 13, y + 17, 6, 2);
            
          } else {
            // Advanced research module
            ctx.fillStyle = '#3a2a4a'; // Shadow
            ctx.fillRect(x + 3, y + 4, 26, 24);
            
            ctx.fillStyle = '#4a3a5a'; // Module body
            ctx.fillRect(x + 2, y + 3, 26, 24);
            
            ctx.fillStyle = '#5a4a6a'; // Module top
            ctx.fillRect(x + 2, y + 3, 26, 3);
            
            // Advanced lab equipment
            ctx.fillStyle = '#aa88ff'; // Purple equipment
            for (let gx = 0; gx < 6; gx++) {
              for (let gy = 0; gy < 6; gy++) {
                ctx.fillRect(x + 4 + gx * 3, y + 7 + gy * 3, 2, 2);
              }
            }
          }
          
        } else if (tile.type === TileType.ENGINEERING_BAY) {
          // Create variety in industrial buildings
          const buildingType = (tile.x * 2 + tile.y) % 3;
          
          if (buildingType === 0) {
            // Heavy factory with smokestacks
            ctx.fillStyle = '#444444'; // Shadow
            ctx.fillRect(x + 2, y + 9, 28, 20);
            
            ctx.fillStyle = '#696969'; // Factory body
            ctx.fillRect(x + 1, y + 8, 28, 20);
            
            ctx.fillStyle = '#2F4F4F'; // Factory roof
            ctx.fillRect(x + 1, y + 8, 28, 6);
            
            // Multiple smokestacks
            ctx.fillStyle = '#A9A9A9';
            ctx.fillRect(x + 6, y + 2, 3, 8);
            ctx.fillRect(x + 12, y + 1, 4, 9);
            ctx.fillRect(x + 20, y + 3, 3, 7);
            ctx.fillRect(x + 26, y + 2, 3, 8);
            
            // Smoke
            ctx.fillStyle = '#D3D3D3';
            ctx.fillRect(x + 7, y + 0, 2, 3);
            ctx.fillRect(x + 13, y + 0, 2, 2);
            ctx.fillRect(x + 21, y + 1, 2, 3);
            ctx.fillRect(x + 27, y + 0, 2, 3);
            
            // Factory windows
            ctx.fillStyle = '#FF4500';
            ctx.fillRect(x + 4, y + 16, 3, 3);
            ctx.fillRect(x + 12, y + 16, 3, 3);
            ctx.fillRect(x + 20, y + 16, 3, 3);
            
          } else if (buildingType === 1) {
            // Warehouse/logistics center
            ctx.fillStyle = '#555555'; // Shadow
            ctx.fillRect(x + 1, y + 13, 30, 16);
            
            ctx.fillStyle = '#8B4513'; // Brown warehouse
            ctx.fillRect(x + 0, y + 12, 30, 16);
            
            ctx.fillStyle = '#654321'; // Dark brown roof
            ctx.fillRect(x + 0, y + 10, 30, 4);
            
            // Loading docks
            ctx.fillStyle = '#2F4F4F'; // Dark loading areas
            ctx.fillRect(x + 2, y + 20, 6, 8);
            ctx.fillRect(x + 12, y + 20, 6, 8);
            ctx.fillRect(x + 22, y + 20, 6, 8);
            
            // Small office section
            ctx.fillStyle = '#87CEEB'; // Office windows
            ctx.fillRect(x + 26, y + 16, 2, 2);
            ctx.fillRect(x + 26, y + 20, 2, 2);
            
          } else {
            // Modern manufacturing plant
            ctx.fillStyle = '#333333'; // Shadow
            ctx.fillRect(x + 3, y + 11, 26, 18);
            
            ctx.fillStyle = '#4682B4'; // Steel blue modern
            ctx.fillRect(x + 2, y + 10, 26, 18);
            
            ctx.fillStyle = '#2F4F4F'; // Flat industrial roof
            ctx.fillRect(x + 1, y + 8, 28, 4);
            
            // Modern industrial features
            ctx.fillStyle = '#A9A9A9'; // Ventilation systems
            ctx.fillRect(x + 8, y + 6, 6, 4);
            ctx.fillRect(x + 18, y + 6, 6, 4);
            
            // Clean industrial windows
            ctx.fillStyle = '#87CEEB';
            for (let iw = 0; iw < 5; iw++) {
              ctx.fillRect(x + 4 + iw * 4, y + 14, 2, 4);
              ctx.fillRect(x + 4 + iw * 4, y + 20, 2, 4);
            }
          }
          
        } else if (tile.type === TileType.RECREATION) {
          // Create variety in park designs
          const parkType = (tile.x + tile.y * 2) % 4;
          
          if (parkType === 0) {
            // Dense forest park
            ctx.fillStyle = '#006400'; // Dark green base
            ctx.fillRect(x, y, state.tileSize, state.tileSize);
            
            // Multiple trees
            for (let tx = 0; tx < 2; tx++) {
              for (let ty = 0; ty < 2; ty++) {
                const treeX = x + 6 + tx * 10;
                const treeY = y + 6 + ty * 10;
                
                // Tree trunk
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(treeX + 4, treeY + 7, 2, 4);
                
                // Tree foliage (larger)
                ctx.fillStyle = '#228B22';
                ctx.fillRect(treeX + 1, treeY + 1, 8, 8);
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(treeX + 2, treeY + 2, 6, 6);
              }
            }
            
          } else if (parkType === 1) {
            // Playground park
            ctx.fillStyle = '#228B22'; // Medium green base
            ctx.fillRect(x, y, state.tileSize, state.tileSize);
            
            // Playground equipment
            ctx.fillStyle = '#FF0000'; // Red playground equipment
            ctx.fillRect(x + 8, y + 8, 6, 4);
            ctx.fillRect(x + 18, y + 12, 4, 6);
            
            ctx.fillStyle = '#0000FF'; // Blue equipment
            ctx.fillRect(x + 12, y + 18, 8, 3);
            
            // Small trees around playground
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 4, y + 22, 1, 3);
            ctx.fillRect(x + 26, y + 6, 1, 3);
            
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(x + 2, y + 18, 4, 4);
            ctx.fillRect(x + 24, y + 4, 4, 4);
            
          } else if (parkType === 2) {
            // Garden park with flowers
            ctx.fillStyle = '#32CD32'; // Light green base
            ctx.fillRect(x, y, state.tileSize, state.tileSize);
            
            // Flower beds
            ctx.fillStyle = '#FF69B4'; // Pink flowers
            ctx.fillRect(x + 4, y + 4, 4, 4);
            ctx.fillRect(x + 20, y + 8, 4, 4);
            ctx.fillRect(x + 12, y + 20, 4, 4);
            
            ctx.fillStyle = '#FFD700'; // Yellow flowers
            ctx.fillRect(x + 8, y + 12, 3, 3);
            ctx.fillRect(x + 18, y + 18, 3, 3);
            
            ctx.fillStyle = '#FF0000'; // Red flowers
            ctx.fillRect(x + 24, y + 24, 3, 3);
            
            // Garden paths
            ctx.fillStyle = '#D2B48C'; // Tan path
            ctx.fillRect(x + 0, y + 14, 32, 2);
            ctx.fillRect(x + 14, y + 0, 2, 32);
            
          } else {
            // Central plaza park
            ctx.fillStyle = '#228B22'; // Medium green
            ctx.fillRect(x, y, state.tileSize, state.tileSize);
            
            // Central fountain
            ctx.fillStyle = '#4169E1'; // Blue water
            ctx.fillRect(x + 12, y + 12, 8, 8);
            
            ctx.fillStyle = '#D3D3D3'; // Light gray fountain edge
            ctx.fillRect(x + 11, y + 11, 10, 1);
            ctx.fillRect(x + 11, y + 20, 10, 1);
            ctx.fillRect(x + 11, y + 11, 1, 10);
            ctx.fillRect(x + 20, y + 11, 1, 10);
            
            // Benches around fountain
            ctx.fillStyle = '#8B4513'; // Brown benches
            ctx.fillRect(x + 6, y + 15, 3, 1);
            ctx.fillRect(x + 23, y + 15, 3, 1);
            ctx.fillRect(x + 15, y + 6, 1, 3);
            ctx.fillRect(x + 15, y + 23, 1, 3);
            
            // Corner trees
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 3, y + 26, 2, 3);
            ctx.fillRect(x + 27, y + 3, 2, 3);
            
            ctx.fillStyle = '#228B22';
            ctx.fillRect(x + 1, y + 22, 6, 6);
            ctx.fillRect(x + 25, y + 1, 6, 6);
          }
          
        } else if (tile.type === TileType.POWER_LINE) {
          // Power lines with poles
          ctx.fillStyle = '#FFFF00'; // Base yellow
          ctx.fillRect(x, y, state.tileSize, state.tileSize);
          
          // Power pole
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(x + 14, y + 4, 4, 24);
          
          // Cross beam
          ctx.fillRect(x + 8, y + 8, 16, 2);
          
          // Power lines
          ctx.fillStyle = '#000000';
          ctx.fillRect(x + 0, y + 12, state.tileSize, 1);
          ctx.fillRect(x + 0, y + 16, state.tileSize, 1);
          ctx.fillRect(x + 0, y + 20, state.tileSize, 1);
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
    });

    // Render player with classic SimCity mayor sprite at exact pixel position
    const playerX = state.playerPosition.pixelX + 4;
    const playerY = state.playerPosition.pixelY + 4;
    const playerSize = 24;

    // Player shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(playerX + 2, playerY + 20, playerSize - 2, 4);

    // Player body (mayor in suit)
    ctx.fillStyle = '#000080'; // Navy suit
    ctx.fillRect(playerX + 8, playerY + 12, 8, 12);
    
    // Player head
    ctx.fillStyle = '#FFDBAC'; // Skin tone
    ctx.fillRect(playerX + 10, playerY + 4, 4, 6);
    
    // Player hair
    ctx.fillStyle = '#8B4513'; // Brown hair
    ctx.fillRect(playerX + 9, playerY + 3, 6, 3);
    
    // Player arms
    ctx.fillStyle = '#000080'; // Suit arms
    ctx.fillRect(playerX + 6, playerY + 12, 3, 6);
    ctx.fillRect(playerX + 15, playerY + 12, 3, 6);
    
    // Player hands
    ctx.fillStyle = '#FFDBAC';
    ctx.fillRect(playerX + 6, playerY + 16, 2, 2);
    ctx.fillRect(playerX + 16, playerY + 16, 2, 2);
    
    // Player legs
    ctx.fillStyle = '#000080'; // Suit pants
    ctx.fillRect(playerX + 9, playerY + 20, 2, 4);
    ctx.fillRect(playerX + 13, playerY + 20, 2, 4);
    
    // Player shoes
    ctx.fillStyle = '#000000';
    ctx.fillRect(playerX + 8, playerY + 22, 3, 2);
    ctx.fillRect(playerX + 13, playerY + 22, 3, 2);

    // Draw crewmates
    state.crewmates.forEach((crewmate) => {
      const screenX = (crewmate.x * state.tileSize) - state.cameraPosition.x;
      const screenY = (crewmate.y * state.tileSize) - state.cameraPosition.y;
      
      // Only render crewmates in viewport
      if (screenX > -state.tileSize && screenX < window.innerWidth + state.tileSize && 
          screenY > -state.tileSize && screenY < window.innerHeight + state.tileSize) {
        
        ctx.save();
        drawCrewmate(ctx, crewmate, screenX, screenY, state.tileSize);
        ctx.restore();
      }
    });

    // Draw traffic elements
    drawTraffic(ctx, state);

    // Restore context
    ctx.restore();

    forceUpdate({});
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight - 80;
        // Re-initialize camera position after resize
        gameState.initializeCamera();
        updateCanvas(gameState.getState());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="block"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="absolute bottom-2 right-2 simcity-panel p-2">
        <div className="text-xs">
          <div className="font-bold">STATUS</div>
          <div>Tool: {selectedTool.replace('_', ' ').toUpperCase()}</div>
          <div>Position: ({gameState.getState().playerPosition.x}, {gameState.getState().playerPosition.y})</div>
          <div>Pixel: ({Math.round(gameState.getState().playerPosition.pixelX)}, {Math.round(gameState.getState().playerPosition.pixelY)})</div>
          <div>Tile Cost: $100</div>
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;