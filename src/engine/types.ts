export type Position = { x: number; y: number };

export enum CellType {
  Empty = 0,
  Wall = 1,
  Boundary = 2,
  GranaryWall = 3,
  Pipe = 4,
  RatHole = 5,
  Corn = 6,
}

export interface Cell {
  x: number;
  y: number;
  type: CellType;
  hp: number; // For breakable walls (start at 3)
  pipeId?: number;
}

export type Gender = 'M' | 'F';

export enum RatState {
  Normal = 'normal',
  Mating = 'mating',
  Pregnant = 'pregnant',
  Baby = 'baby',
  Underground = 'underground', // In pipe
  Dead = 'dead'
}

export interface Rat {
  id: string;
  x: number; // discrete grid position
  y: number;
  realX: number; // continuous position for rendering
  realY: number;
  gender: Gender;
  hp: number;
  maxHp: number;
  state: RatState;
  stateTimer: number; 
  moveTimer: number; // Time since started moving to the current target
  moveDuration: number;
  targetX: number;
  targetY: number;
  path: Position[];
  pipeTarget?: Position;
}

export interface PlacedItem {
  id: string;
  x: number;
  y: number;
  type: 'barrel' | 'bomb';
  hp: number; // Barrel stops rats, HP determines how many hits it can take
  timer: number; // Bomb countdown
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  type: 'explosion' | 'heart' | 'damage' | 'floating_text';
  text?: string;
  timer: number;
  maxTimer: number;
}

export interface GameStateData {
  level: number;
  points: number;
  barrels: number;
  bombs: number;
  timePauses: number;
  bombRange: number;
  status: 'start' | 'playing' | 'shop' | 'gameover' | 'victory';
}
