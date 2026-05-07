import { Cell, CellType, Position } from './types';

export function generateMap(level: number): Cell[][] {
  const w = 25;
  const h = 25;
  const grid: Cell[][] = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => ({
      x, y, type: CellType.Wall, hp: 3
    }))
  );

  // Boundaries
  for (let i = 0; i < w; i++) {
    grid[0][i].type = CellType.Boundary;
    grid[h - 1][i].type = CellType.Boundary;
    grid[i][0].type = CellType.Boundary;
    grid[i][w - 1].type = CellType.Boundary;
  }

  // Initial maze carve using Recursive Backtracking on odd coordinates
  const visited = new Set<string>();

  const isGranaryArea = (x: number, y: number) => x >= 10 && x <= 14 && y >= 10 && y <= 14;

  const validOddNeighbors = (cx: number, cy: number) => {
    return [
      { dx: 0, dy: -2 }, { dx: 0, dy: 2 },
      { dx: -2, dy: 0 }, { dx: 2, dy: 0 }
    ].filter(({ dx, dy }) => {
      const nx = cx + dx;
      const ny = cy + dy;
      return nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1 && !visited.has(`${nx},${ny}`) && !isGranaryArea(nx, ny);
    }).sort(() => Math.random() - 0.5);
  };

  function carve(cx: number, cy: number) {
    visited.add(`${cx},${cy}`);
    grid[cy][cx].type = CellType.Empty;

    const neighbors = validOddNeighbors(cx, cy);
    for (const { dx, dy } of neighbors) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!visited.has(`${nx},${ny}`)) {
        grid[cy + dy / 2][cx + dx / 2].type = CellType.Empty;
        carve(nx, ny);
      }
    }
  }

  // Start carving from somewhere outside granary
  carve(1, 1);
  // Ensure we carve all reachable odd spots if the graph gets disconnected by Granary
  for(let y=1; y<h-1; y+=2) {
    for(let x=1; x<w-1; x+=2) {
      if(!visited.has(`${x},${y}`) && !isGranaryArea(x,y)) {
        carve(x, y);
      }
    }
  }

  // Setup Granary
  for (let y = 10; y <= 14; y++) {
    for (let x = 10; x <= 14; x++) {
      if (x === 10 || x === 14 || y === 10 || y === 14) {
        grid[y][x].type = CellType.GranaryWall;
      } else {
        grid[y][x].type = CellType.Empty;
      }
    }
  }

  // Place Corns. Central area is 11,11 to 13,13. (9 spots).
  // Target corn count: level * 1. If > 9, just put 9 for now.
  const cornCount = Math.min(9, level);
  const cornSpots = [
    {x:12, y:12}, {x:11,y:11}, {x:13,y:11}, {x:11,y:13}, {x:13,y:13},
    {x:12,y:11}, {x:12,y:13}, {x:11,y:12}, {x:13,y:12}
  ];
  for(let i=0; i<cornCount; i++) {
    grid[cornSpots[i].y][cornSpots[i].x].type = CellType.Corn;
  }

  // Add exits to Granary
  grid[10][11].type = CellType.Empty; // Top Leftish
  grid[14][13].type = CellType.Empty; // Bottom Rightish
  
  // Ensure Granary exits connect to Maze paths
  grid[9][11].type = CellType.Empty;
  grid[15][13].type = CellType.Empty;

  // Density control based on level (remove walls to make lower levels easier)
  const removeChance = Math.max(0, 0.4 - level * 0.04);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (grid[y][x].type === CellType.Wall && Math.random() < removeChance) {
        grid[y][x].type = CellType.Empty;
      }
    }
  }

  // Add Pipes (2-4 pairs)
  const numPipes = 2 + Math.floor(Math.random() * 3);
  let pipeIdOffset = 0;
  while(pipeIdOffset < numPipes) {
    const getValidPipePos = () => {
      for(let tries = 0; tries < 100; tries++) {
        const px = 1 + Math.floor(Math.random() * (w - 2));
        const py = 1 + Math.floor(Math.random() * (h - 2));
        if (grid[py][px].type === CellType.Empty) {
          const distToCenter = Math.abs(px - 12) + Math.abs(py - 12);
          if (distToCenter > 6) return { x: px, y: py };
        }
      }
      return null;
    }
    const p1 = getValidPipePos();
    const p2 = getValidPipePos();
    if (p1 && p2 && (p1.x !== p2.x || p1.y !== p2.y)) {
      grid[p1.y][p1.x].type = CellType.Pipe;
      grid[p1.y][p1.x].pipeId = pipeIdOffset;
      grid[p2.y][p2.x].type = CellType.Pipe;
      grid[p2.y][p2.x].pipeId = pipeIdOffset;
      pipeIdOffset++;
    } else {
      break;
    }
  }

  // Add Rat Holes on Boundaries (at least 4, increases over levels)
  const numHoles = Math.min(10, 4 + Math.floor(level / 3));
  const holeCandidates = [
    {x:12,y:0},{x:0,y:12},{x:24,y:12},{x:12,y:24},
    {x:4,y:0},{x:20,y:0},{x:4,y:24},{x:20,y:24},
    {x:0,y:4},{x:0,y:20},{x:24,y:4},{x:24,y:20}
  ].sort(() => Math.random() - 0.5);

  let placedHoles = 0;
  for(const pos of holeCandidates) {
    if(placedHoles >= numHoles) break;
    grid[pos.y][pos.x].type = CellType.RatHole;
    // ensure clear immediately inside
    if (pos.y === 0) grid[1][pos.x].type = CellType.Empty;
    if (pos.y === 24) grid[23][pos.x].type = CellType.Empty;
    if (pos.x === 0) grid[pos.y][1].type = CellType.Empty;
    if (pos.x === 24) grid[pos.y][23].type = CellType.Empty;
    placedHoles++;
  }

  return grid;
}
