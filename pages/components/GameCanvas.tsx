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
    const size = tileSize * 0.8; // Make crewmates bigger
    
    // Minecraft-style chunky crewmate body
    ctx.fillStyle = crewmate.color;
    ctx.fillRect(centerX - size * 0.3, centerY - size * 0.2, size * 0.6, size * 0.8);
    
    // Crewmate head (square)
    ctx.fillStyle = crewmate.color;
    ctx.fillRect(centerX - size * 0.25, centerY - size * 0.4, size * 0.5, size * 0.3);
    
    // Crewmate visor (white, rectangular)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(centerX - size * 0.2, centerY - size * 0.35, size * 0.4, size * 0.15);
    
    // Simple eyes (black squares)
    ctx.fillStyle = '#000000';
    ctx.fillRect(centerX - size * 0.12, centerY - size * 0.3, size * 0.06, size * 0.06);
    ctx.fillRect(centerX + size * 0.06, centerY - size * 0.3, size * 0.06, size * 0.06);
    
    // Activity indicator (bigger)
    if (crewmate.activity !== CrewmateActivity.WALKING) {
      const indicatorColor = getActivityColor(crewmate.activity);
      ctx.fillStyle = indicatorColor;
      ctx.fillRect(centerX + size * 0.2, centerY - size * 0.3, size * 0.15, size * 0.15);
    }
    
    // Walking animation - slight bounce
    if (crewmate.activity === CrewmateActivity.WALKING) {
      const bounce = Math.sin(crewmate.animationFrame * 0.5) * 3;
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
    
    // Add chunky asphalt texture for Minecraft style
    ctx.fillStyle = lightenColor(baseColor, 10);
    for (let ax = 0; ax < size; ax += 6) {
      for (let ay = 0; ay < size; ay += 6) {
        if ((ax + ay + x + y) % 12 === 0) {
          ctx.fillRect(x + ax, y + ay, 2, 2);
        }
      }
    }
    
    ctx.fillStyle = lightenColor(baseColor, -10);
    for (let ax = 3; ax < size; ax += 8) {
      for (let ay = 3; ay < size; ay += 8) {
        if ((ax + ay + x + y) % 16 === 0) {
          ctx.fillRect(x + ax, y + ay, 2, 2);
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
        // Double lane dividers (thicker)
        ctx.fillRect(x + size/3, y, 2, size);
        ctx.fillRect(x + 2*size/3, y, 2, size);
      }
      if (hasRoadEast || hasRoadWest) {
        // Double lane dividers (thicker)
        ctx.fillRect(x, y + size/3, size, 2);
        ctx.fillRect(x, y + 2*size/3, size, 2);
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
        // Dashed center line (thicker)
        for (let i = 0; i < size; i += 12) {
          ctx.fillRect(x + size/2 - 1, y + i, 2, 6);
        }
      }
      if (hasRoadEast || hasRoadWest) {
        // Dashed center line (thicker)
        for (let i = 0; i < size; i += 12) {
          ctx.fillRect(x + i, y + size/2 - 1, 6, 2);
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
        // Simple center line (thicker)
        ctx.fillRect(x + size/2 - 1, y, 2, size);
      }
      if (hasRoadEast || hasRoadWest) {
        // Simple center line (thicker)
        ctx.fillRect(x, y + size/2 - 1, size, 2);
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
          // Power lines with poles (scaled for 64px)
          ctx.fillStyle = '#FFFF00'; // Base yellow
          ctx.fillRect(x, y, state.tileSize, state.tileSize);
          
          // Power pole (bigger)
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(x + 28, y + 8, 8, 48);
          
          // Cross beam (bigger)
          ctx.fillRect(x + 16, y + 16, 32, 4);
          
          // Power lines (thicker)
          ctx.fillStyle = '#000000';
          ctx.fillRect(x + 0, y + 24, state.tileSize, 2);
          ctx.fillRect(x + 0, y + 32, state.tileSize, 2);
          ctx.fillRect(x + 0, y + 40, state.tileSize, 2);
          
          // Power insulators
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x + 20, y + 22, 4, 6);
          ctx.fillRect(x + 40, y + 22, 4, 6);
          ctx.fillRect(x + 20, y + 30, 4, 6);
          ctx.fillRect(x + 40, y + 30, 4, 6);
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

    // Render player with Minecraft-style sprite and walking animation
    const playerX = state.playerPosition.pixelX + 8;
    const playerY = state.playerPosition.pixelY + 8;
    const playerSize = 48;

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