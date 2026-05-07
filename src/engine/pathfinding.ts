import { Cell, CellType, Position, PlacedItem } from './types';

// Simple heuristic: Manhattan Distance
function heuristic(a: Position, b: Position) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function findPath(
  start: Position, 
  goal: Position, 
  grid: Cell[][], 
  items: PlacedItem[],
  avoidWalls: boolean = true
): Position[] | null {
  const openSet = new Set<string>();
  const openQueue: {pos: Position, fScore: number}[] = [];
  const cameFrom = new Map<string, string>();

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  const startKey = `${start.x},${start.y}`;
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, goal));

  openSet.add(startKey);
  openQueue.push({pos: start, fScore: fScore.get(startKey)!});

  const getG = (key: string) => gScore.has(key) ? gScore.get(key)! : Infinity;

  // Track barrels for extra cost logic if needed
  const barrelPositions = new Set(items.filter(i => i.type === 'barrel').map(i => `${i.x},${i.y}`));

  while(openSet.size > 0) {
    openQueue.sort((a,b) => a.fScore - b.fScore);
    const current = openQueue.shift()!.pos;
    const currentKey = `${current.x},${current.y}`;
    openSet.delete(currentKey);

    if (current.x === goal.x && current.y === goal.y) {
      // Reconstruct Path
      const path: Position[] = [];
      let currObj = currentKey;
      while(cameFrom.has(currObj)) {
        const [x,y] = currObj.split(',').map(Number);
        path.unshift({x, y});
        currObj = cameFrom.get(currObj)!;
      }
      return path; // Excluding start pos
    }

    const dirs = [
      {x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}
    ];

    for(const d of dirs) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      
      if(nx < 0 || ny < 0 || ny >= grid.length || nx >= grid[0].length) continue;
      
      const cell = grid[ny][nx];
      // Don't walk through Boundaries, missing cells, Granary Walls, or normal Walls (unless avoidWalls=false)
      if (cell.type === CellType.Boundary || cell.type === CellType.GranaryWall) continue;
      if (avoidWalls && cell.type === CellType.Wall) continue;

      const neighborKey = `${nx},${ny}`;
      
      // Barrels add a massive cost so rats try to avoid them, 
      // but if there's no other way, they will bash them.
      let moveCost = 1;
      if(barrelPositions.has(neighborKey)) moveCost += 10;
      if(cell.type === CellType.Wall) moveCost += 5; // if avoidWalls=false, walls have high cost

      const tentativeG = getG(currentKey) + moveCost;

      if(tentativeG < getG(neighborKey)) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        const f = tentativeG + heuristic({x: nx, y: ny}, goal);
        fScore.set(neighborKey, f);
        
        if(!openSet.has(neighborKey)) {
          openSet.add(neighborKey);
          openQueue.push({pos: {x: nx, y: ny}, fScore: f});
        } else {
          // Update fScore in queue
          const qItem = openQueue.find(q => q.pos.x === nx && q.pos.y === ny);
          if (qItem) qItem.fScore = f;
        }
      }
    }
  }

  return null; // No path found
}
