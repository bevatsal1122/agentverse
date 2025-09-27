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
  const [backgroundCanvas, setBackgroundCanvas] = useState<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();

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

    // Initialize tileset background
    initializeTilesetBackground();

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
        return '#228B22'; // SimCity grass green
      case TileType.CORRIDOR:
        return '#404040'; // Dark asphalt
      case TileType.MAIN_CORRIDOR:
        return '#505050'; // Medium asphalt
      case TileType.HIGHWAY:
        return '#606060'; // Light asphalt
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
    
    // Add grass texture pattern
    ctx.fillStyle = '#32CD32'; // Lighter grass
    for (let gx = 0; gx < size; gx += 2) {
      for (let gy = 0; gy < size; gy += 2) {
        if ((gx + gy + x + y) % 4 === 0) {
          ctx.fillRect(x + gx, y + gy, 1, 1);
        }
      }
    }
    
    // Add darker grass spots for variation
    ctx.fillStyle = '#1F7A1F';
    for (let gx = 1; gx < size; gx += 4) {
      for (let gy = 1; gy < size; gy += 4) {
        if ((gx + gy + x + y) % 8 === 0) {
          ctx.fillRect(x + gx, y + gy, 1, 1);
        }
      }
    }
    
    // Add subtle grid lines like SimCity
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(x, y, size, 1); // Top border
    ctx.fillRect(x, y, 1, size); // Left border
  };

  const isCorridorType = (type: TileType | undefined): boolean => {
    return type === TileType.CORRIDOR || type === TileType.MAIN_CORRIDOR || type === TileType.HIGHWAY;
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
    // SimCity-style road colors
    let baseColor = '#404040'; // Dark asphalt
    let lineColor = '#FFFF00'; // Yellow lines
    let edgeColor = '#2F2F2F'; // Darker edge
    
    if (roadType === TileType.MAIN_CORRIDOR) {
      baseColor = '#505050'; // Medium asphalt
      lineColor = '#FFFFFF'; // White lines
      edgeColor = '#3F3F3F';
    } else if (roadType === TileType.HIGHWAY) {
      baseColor = '#606060'; // Light asphalt
      lineColor = '#FFFFFF'; // White lines
      edgeColor = '#4F4F4F';
    }
    
    // Draw base asphalt texture
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, size, size);
    
    // Add asphalt texture
    ctx.fillStyle = lightenColor(baseColor, 10);
    for (let ax = 0; ax < size; ax += 3) {
      for (let ay = 0; ay < size; ay += 3) {
        if ((ax + ay + x + y) % 6 === 0) {
          ctx.fillRect(x + ax, y + ay, 1, 1);
        }
      }
    }
    
    ctx.fillStyle = lightenColor(baseColor, -10);
    for (let ax = 1; ax < size; ax += 4) {
      for (let ay = 1; ay < size; ay += 4) {
        if ((ax + ay + x + y) % 8 === 0) {
          ctx.fillRect(x + ax, y + ay, 1, 1);
        }
      }
    }
    
    // Check adjacent tiles for road connections
    const hasRoadNorth = isCorridorType(state.mapData.get(`${tileX},${tileY - 1}`)?.type);
    const hasRoadSouth = isCorridorType(state.mapData.get(`${tileX},${tileY + 1}`)?.type);
    const hasRoadEast = isCorridorType(state.mapData.get(`${tileX + 1},${tileY}`)?.type);
    const hasRoadWest = isCorridorType(state.mapData.get(`${tileX - 1},${tileY}`)?.type);
    
    // Draw SimCity-style road markings
    if (roadType === TileType.HIGHWAY) {
      // Highway with multiple lanes
      ctx.fillStyle = lineColor;
      if (hasRoadNorth || hasRoadSouth) {
        // Double lane dividers
        ctx.fillRect(x + size/3, y, 1, size);
        ctx.fillRect(x + 2*size/3, y, 1, size);
      }
      if (hasRoadEast || hasRoadWest) {
        // Double lane dividers
        ctx.fillRect(x, y + size/3, size, 1);
        ctx.fillRect(x, y + 2*size/3, size, 1);
      }
      
      // Road edges
      ctx.fillStyle = edgeColor;
      if (!hasRoadNorth) ctx.fillRect(x, y, size, 2);
      if (!hasRoadSouth) ctx.fillRect(x, y + size - 2, size, 2);
      if (!hasRoadEast) ctx.fillRect(x + size - 2, y, 2, size);
      if (!hasRoadWest) ctx.fillRect(x, y, 2, size);
      
    } else if (roadType === TileType.MAIN_CORRIDOR) {
      // Main road with center line
      ctx.fillStyle = lineColor;
      if (hasRoadNorth || hasRoadSouth) {
        // Dashed center line
        for (let i = 0; i < size; i += 6) {
          ctx.fillRect(x + size/2, y + i, 1, 3);
        }
      }
      if (hasRoadEast || hasRoadWest) {
        // Dashed center line
        for (let i = 0; i < size; i += 6) {
          ctx.fillRect(x + i, y + size/2, 3, 1);
        }
      }
      
      // Road edges
      ctx.fillStyle = edgeColor;
      if (!hasRoadNorth) ctx.fillRect(x, y, size, 2);
      if (!hasRoadSouth) ctx.fillRect(x, y + size - 2, size, 2);
      if (!hasRoadEast) ctx.fillRect(x + size - 2, y, 2, size);
      if (!hasRoadWest) ctx.fillRect(x, y, 2, size);
      
    } else {
      // Regular road
      ctx.fillStyle = lineColor;
      if (hasRoadNorth || hasRoadSouth) {
        // Simple center line
        ctx.fillRect(x + size/2, y, 1, size);
      }
      if (hasRoadEast || hasRoadWest) {
        // Simple center line
        ctx.fillRect(x, y + size/2, size, 1);
      }
      
      // Road edges
      ctx.fillStyle = edgeColor;
      if (!hasRoadNorth) ctx.fillRect(x, y, size, 1);
      if (!hasRoadSouth) ctx.fillRect(x, y + size - 1, size, 1);
      if (!hasRoadEast) ctx.fillRect(x + size - 1, y, 1, size);
      if (!hasRoadWest) ctx.fillRect(x, y, 1, size);
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

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render tileset background if available
    if (backgroundCanvas) {
      ctx.drawImage(backgroundCanvas, state.cameraPosition.x, state.cameraPosition.y);
    } else {
      // Fallback to grass background
      ctx.fillStyle = '#228B22';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

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
        
        // If no tile exists at this position, render grass
        if (!state.mapData.has(`${tileX},${tileY}`)) {
          drawGrassTexture(ctx, x, y, state.tileSize);
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
        drawGrassTexture(ctx, x, y, state.tileSize);
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

        // Add SimCity-style building sprites
        if (tile.type === TileType.LIVING_QUARTERS) {
          // Create variety in residential buildings based on position
          const buildingType = (tile.x + tile.y) % 4;
          
          if (buildingType === 0) {
            // Small house
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 5, y + 18, 22, 12);
            
            // House base (brown)
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 4, y + 16, 22, 12);
            
            // Roof (dark red)
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(x + 2, y + 12, 26, 6);
            
            // Roof peak
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 4, y + 10, 22, 4);
            
            // Windows (yellow)
            ctx.fillStyle = '#FFFF99';
            ctx.fillRect(x + 8, y + 18, 3, 3);
            ctx.fillRect(x + 13, y + 18, 3, 3);
            ctx.fillRect(x + 18, y + 18, 3, 3);
            
            // Door (dark brown)
            ctx.fillStyle = '#654321';
            ctx.fillRect(x + 13, y + 22, 4, 6);
            
          } else if (buildingType === 1) {
            // Medium house
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 3, y + 14, 26, 16);
            
            // House base (tan)
            ctx.fillStyle = '#D2B48C';
            ctx.fillRect(x + 2, y + 12, 26, 16);
            
            // Roof (blue)
            ctx.fillStyle = '#4682B4';
            ctx.fillRect(x + 0, y + 8, 30, 6);
            
            // Chimney
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 22, y + 6, 4, 8);
            
            // Windows (yellow)
            ctx.fillStyle = '#FFFF99';
            ctx.fillRect(x + 6, y + 16, 3, 3);
            ctx.fillRect(x + 12, y + 16, 3, 3);
            ctx.fillRect(x + 18, y + 16, 3, 3);
            ctx.fillRect(x + 6, y + 21, 3, 3);
            ctx.fillRect(x + 18, y + 21, 3, 3);
            
            // Door (brown)
            ctx.fillStyle = '#654321';
            ctx.fillRect(x + 12, y + 20, 4, 8);
            
          } else if (buildingType === 2) {
            // Large house
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 1, y + 12, 30, 18);
            
            // House base (gray)
            ctx.fillStyle = '#A9A9A9';
            ctx.fillRect(x + 0, y + 10, 30, 18);
            
            // Roof (green)
            ctx.fillStyle = '#228B22';
            ctx.fillRect(x + 0, y + 6, 30, 6);
            
            // Multiple chimneys
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 6, y + 4, 3, 8);
            ctx.fillRect(x + 21, y + 4, 3, 8);
            
            // Windows (yellow)
            ctx.fillStyle = '#FFFF99';
            for (let i = 0; i < 5; i++) {
              ctx.fillRect(x + 3 + i * 5, y + 14, 3, 3);
              if (i !== 2) { // Skip middle for door
                ctx.fillRect(x + 3 + i * 5, y + 20, 3, 3);
              }
            }
            
            // Door (dark brown)
            ctx.fillStyle = '#654321';
            ctx.fillRect(x + 13, y + 18, 4, 10);
            
          } else {
            // Apartment building
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 3, y + 8, 26, 22);
            
            // Building base (brick red)
            ctx.fillStyle = '#B22222';
            ctx.fillRect(x + 2, y + 6, 26, 22);
            
            // Roof (dark gray)
            ctx.fillStyle = '#2F2F2F';
            ctx.fillRect(x + 1, y + 4, 28, 4);
            
            // Windows in grid pattern (yellow)
            ctx.fillStyle = '#FFFF99';
            for (let wx = 0; wx < 4; wx++) {
              for (let wy = 0; wy < 4; wy++) {
                ctx.fillRect(x + 4 + wx * 5, y + 8 + wy * 4, 3, 2);
              }
            }
            
            // Entrance (brown)
            ctx.fillStyle = '#654321';
            ctx.fillRect(x + 13, y + 24, 4, 4);
          }
          
        } else if (tile.type === TileType.RESEARCH_LAB) {
          // Create variety in commercial buildings
          const buildingType = (tile.x * 3 + tile.y * 2) % 3;
          
          if (buildingType === 0) {
            // Office building
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 2, y + 6, 28, 24);
            
            // Building base (blue)
            ctx.fillStyle = '#4169E1';
            ctx.fillRect(x + 1, y + 4, 28, 24);
            
            // Roof (dark blue)
            ctx.fillStyle = '#191970';
            ctx.fillRect(x + 0, y + 2, 30, 4);
            
            // Windows in grid pattern (yellow)
            ctx.fillStyle = '#FFFF99';
            for (let wx = 0; wx < 5; wx++) {
              for (let wy = 0; wy < 5; wy++) {
                ctx.fillRect(x + 3 + wx * 4, y + 6 + wy * 4, 3, 2);
              }
            }
            
            // Entrance (dark blue)
            ctx.fillStyle = '#000080';
            ctx.fillRect(x + 13, y + 24, 4, 4);
            
          } else if (buildingType === 1) {
            // Shopping center
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 1, y + 16, 30, 14);
            
            // Building base (cyan)
            ctx.fillStyle = '#00CED1';
            ctx.fillRect(x + 0, y + 14, 30, 14);
            
            // Roof (teal)
            ctx.fillStyle = '#008B8B';
            ctx.fillRect(x + 0, y + 12, 30, 4);
            
            // Store windows (yellow)
            ctx.fillStyle = '#FFFF99';
            ctx.fillRect(x + 2, y + 18, 8, 6);
            ctx.fillRect(x + 12, y + 18, 8, 6);
            ctx.fillRect(x + 22, y + 18, 6, 6);
            
            // Store signs (red)
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(x + 3, y + 16, 6, 2);
            ctx.fillRect(x + 13, y + 16, 6, 2);
            ctx.fillRect(x + 23, y + 16, 4, 2);
            
          } else {
            // High-rise office
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 3, y + 2, 26, 28);
            
            // Building base (purple)
            ctx.fillStyle = '#9370DB';
            ctx.fillRect(x + 2, y + 0, 26, 28);
            
            // Roof (dark purple)
            ctx.fillStyle = '#4B0082';
            ctx.fillRect(x + 1, y + 0, 28, 3);
            
            // Windows in dense grid (yellow)
            ctx.fillStyle = '#FFFF99';
            for (let gx = 0; gx < 6; gx++) {
              for (let gy = 0; gy < 7; gy++) {
                ctx.fillRect(x + 4 + gx * 3, y + 4 + gy * 3, 2, 2);
              }
            }
            
            // Entrance (dark purple)
            ctx.fillStyle = '#4B0082';
            ctx.fillRect(x + 13, y + 24, 4, 4);
          }
          
        } else if (tile.type === TileType.ENGINEERING_BAY) {
          // Create variety in industrial buildings
          const buildingType = (tile.x * 2 + tile.y) % 3;
          
          if (buildingType === 0) {
            // Heavy factory with smokestacks
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 2, y + 12, 28, 18);
            
            // Factory body (gray)
            ctx.fillStyle = '#696969';
            ctx.fillRect(x + 1, y + 10, 28, 18);
            
            // Factory roof (dark gray)
            ctx.fillStyle = '#2F2F2F';
            ctx.fillRect(x + 0, y + 8, 30, 4);
            
            // Multiple smokestacks
            ctx.fillStyle = '#A9A9A9';
            ctx.fillRect(x + 6, y + 2, 3, 8);
            ctx.fillRect(x + 12, y + 1, 4, 9);
            ctx.fillRect(x + 20, y + 3, 3, 7);
            ctx.fillRect(x + 26, y + 2, 3, 8);
            
            // Smoke (light gray)
            ctx.fillStyle = '#D3D3D3';
            ctx.fillRect(x + 7, y + 0, 2, 3);
            ctx.fillRect(x + 13, y + 0, 2, 2);
            ctx.fillRect(x + 21, y + 1, 2, 3);
            ctx.fillRect(x + 27, y + 0, 2, 3);
            
            // Factory windows (orange glow)
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(x + 4, y + 14, 3, 3);
            ctx.fillRect(x + 12, y + 14, 3, 3);
            ctx.fillRect(x + 20, y + 14, 3, 3);
            
          } else if (buildingType === 1) {
            // Warehouse
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 1, y + 16, 30, 14);
            
            // Warehouse body (brown)
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 0, y + 14, 30, 14);
            
            // Roof (dark brown)
            ctx.fillStyle = '#654321';
            ctx.fillRect(x + 0, y + 12, 30, 4);
            
            // Loading docks (dark gray)
            ctx.fillStyle = '#2F2F2F';
            ctx.fillRect(x + 2, y + 22, 6, 6);
            ctx.fillRect(x + 12, y + 22, 6, 6);
            ctx.fillRect(x + 22, y + 22, 6, 6);
            
            // Office section (light blue)
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(x + 26, y + 18, 3, 6);
            
          } else {
            // Power plant
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 3, y + 14, 26, 16);
            
            // Plant body (steel blue)
            ctx.fillStyle = '#4682B4';
            ctx.fillRect(x + 2, y + 12, 26, 16);
            
            // Roof (dark gray)
            ctx.fillStyle = '#2F2F2F';
            ctx.fillRect(x + 1, y + 10, 28, 4);
            
            // Cooling towers
            ctx.fillStyle = '#A9A9A9';
            ctx.fillRect(x + 8, y + 4, 6, 8);
            ctx.fillRect(x + 18, y + 4, 6, 8);
            
            // Steam (white)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x + 10, y + 2, 2, 4);
            ctx.fillRect(x + 20, y + 2, 2, 4);
            
            // Industrial windows (blue)
            ctx.fillStyle = '#87CEEB';
            for (let iw = 0; iw < 5; iw++) {
              ctx.fillRect(x + 4 + iw * 4, y + 16, 2, 3);
              ctx.fillRect(x + 4 + iw * 4, y + 22, 2, 3);
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
            
            // Simple square trees
            for (let tx = 0; tx < 2; tx++) {
              for (let ty = 0; ty < 2; ty++) {
                const treeX = x + 6 + tx * 12;
                const treeY = y + 6 + ty * 12;
                
                // Tree trunk (brown)
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(treeX + 4, treeY + 8, 2, 4);
                
                // Tree foliage (dark green)
                ctx.fillStyle = '#006400';
                ctx.fillRect(treeX + 1, treeY + 2, 8, 8);
                
                // Tree highlights (bright green)
                ctx.fillStyle = '#228B22';
                ctx.fillRect(treeX + 2, treeY + 3, 6, 6);
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
            
            // Simple fountain or feature in center
            if (parkType === 1) {
              // Small fountain
              ctx.fillStyle = '#4682B4';
              ctx.fillRect(x + 12, y + 12, 8, 8);
              ctx.fillStyle = '#87CEEB';
              ctx.fillRect(x + 13, y + 13, 6, 6);
            } else if (parkType === 2) {
              // Flower bed
              ctx.fillStyle = '#FF69B4';
              ctx.fillRect(x + 10, y + 10, 12, 12);
              ctx.fillStyle = '#FFD700';
              ctx.fillRect(x + 12, y + 12, 8, 8);
            } else {
              // Single tree
              ctx.fillStyle = '#8B4513';
              ctx.fillRect(x + 14, y + 18, 4, 6);
              ctx.fillStyle = '#006400';
              ctx.fillRect(x + 10, y + 10, 12, 12);
              ctx.fillStyle = '#228B22';
              ctx.fillRect(x + 12, y + 12, 8, 8);
            }
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