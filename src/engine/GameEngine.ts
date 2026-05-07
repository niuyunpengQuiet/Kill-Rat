import { Cell, CellType, GameStateData, Particle, PlacedItem, Rat, RatState, Gender, Position } from './types';
import { generateMap } from './MapGenerator';
import { findPath } from './pathfinding';

export class GameEngine {
  public grid: Cell[][] = [];
  public rats: Rat[] = [];
  public items: PlacedItem[] = [];
  public particles: Particle[] = [];
  
  public state: GameStateData;
  public onStateChange?: (state: GameStateData) => void;
  public onParticlesChange?: (particles: Particle[]) => void;
  public onPlaySound?: (sound: string) => void;

  private lastTick: number = 0;
  private timePaused: boolean = false;
  private pauseTimer: number = 0;

  constructor() {
    this.state = {
      level: 1,
      points: 0,
      barrels: 5,
      bombs: 20,
      timePauses: 0,
      bombRange: 1,
      status: 'start'
    };
  }

  public initLevel() {
    this.grid = generateMap(this.state.level);
    this.rats = [];
    this.items = [];
    this.particles = [];
    this.timePaused = false;
    
    // Spawn initial rats
    const numRats = this.state.level + 10;
    const holes: Position[] = [];
    this.grid.forEach(row => row.forEach(c => {
      if(c.type === CellType.RatHole) holes.push({x: c.x, y: c.y});
    }));

    for(let i=0; i<numRats; i++) {
      const hole = holes[Math.floor(Math.random() * holes.length)];
      if(hole) {
        this.spawnRat(hole.x, hole.y, i % 2 === 0 ? 'M' : 'F');
      }
    }
    
    this.state.status = 'playing';
    this.notifyState();
  }

  private spawnRat(x: number, y: number, gender: Gender, isBaby = false) {
    this.rats.push({
      id: Math.random().toString(36).substr(2, 9),
      x, y,
      realX: x, realY: y,
      gender,
      maxHp: 1, hp: 1,
      state: isBaby ? RatState.Baby : RatState.Normal,
      stateTimer: isBaby ? 5 : 0,
      moveTimer: 0,
      moveDuration: 0.5, // 500ms per cell
      targetX: x,
      targetY: y,
      path: []
    });
  }

  public placeItem(x: number, y: number, type: 'barrel' | 'bomb') {
    if (this.state.status !== 'playing') return;
    if (this.grid[y][x].type === CellType.Wall || this.grid[y][x].type === CellType.Boundary || this.grid[y][x].type === CellType.GranaryWall) return;

    if (type === 'barrel' && this.state.barrels > 0) {
      if (this.grid[y][x].type === CellType.Pipe) return; // Cannot put barrel on pipe entrance
      this.state.barrels--;
      this.items.push({ id: Math.random().toString(), x, y, type: 'barrel', hp: 5, timer: 0 });
    } else if (type === 'bomb' && this.state.bombs > 0) {
      this.state.bombs--;
      // Bomb CAN be placed on pipe entrance
      this.items.push({ id: Math.random().toString(), x, y, type: 'bomb', hp: 1, timer: 2 }); // 2 sec fuse
    }
    this.notifyState();
  }

  public useTimePause() {
    if (this.state.timePauses > 0 && !this.timePaused) {
      this.state.timePauses--;
      this.timePaused = true;
      this.pauseTimer = 5; // Pause for 5 seconds
      this.notifyState();
    }
  }

  public update(dt: number) { // dt is in seconds
    if (this.state.status !== 'playing') return;

    // Handle Time Pause
    if (this.timePaused) {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) {
        this.timePaused = false;
      }
    }

    // Update Bombs (bombs tick even if time paused, or do they? Let's say bombs tick)
    for(let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.type === 'bomb') {
        item.timer -= dt;
        if (item.timer <= 0) {
          this.explodeBomb(item.x, item.y);
          this.items.splice(i, 1);
        }
      } else if (item.type === 'barrel') {
        if (item.hp <= 0) {
          this.items.splice(i, 1);
        }
      }
    }

    // Update Particles
    for(let i = this.particles.length-1; i >= 0; i--) {
      this.particles[i].timer -= dt;
      if (this.particles[i].timer <= 0) this.particles.splice(i, 1);
    }
    if (this.particles.length > 0) this.onParticlesChange?.([...this.particles]);

    // Check Victory/Loss
    const cornsLeft = this.grid.flat().filter(c => c.type === CellType.Corn).length;
    if (cornsLeft === 0) {
      this.state.status = 'gameover';
      this.notifyState();
      return;
    }

    const aliveRats = this.rats.filter(r => r.state !== RatState.Dead);
    if (aliveRats.length === 0) {
      // Victory
      this.state.status = 'shop';
      this.state.points += 50;
      // Retrieve remaining barrels
      for(const item of this.items) {
        if(item.type === 'barrel') {
          this.state.points += Math.max(0, item.hp);
        }
      }
      this.notifyState();
      return;
    }

    if (this.timePaused) return; // If time is paused, rats don't update

    // Update Rats
    for(let i=0; i<this.rats.length; i++) {
        const r = this.rats[i];
        if (r.state === RatState.Dead) continue;

        // State Timers
        if (r.state === RatState.Mating) {
            r.stateTimer -= dt;
            if (r.stateTimer <= 0) {
                if (r.gender === 'F') {
                    r.state = RatState.Pregnant;
                    r.maxHp = 2; // Pregnant rats have 2 HP
                    r.hp = 2;
                    r.stateTimer = 5;
                } else {
                    r.state = RatState.Normal;
                }
            }
            continue; // Mating rats don't move
        }

        if (r.state === RatState.Underground) {
          r.stateTimer -= dt;
          if (r.stateTimer <= 0 && r.pipeTarget) {
            r.state = RatState.Normal;
            r.x = r.pipeTarget.x;
            r.y = r.pipeTarget.y;
            r.realX = r.x;
            r.realY = r.y;
            r.targetX = r.x;
            r.targetY = r.y;
          }
          continue;
        }

        if (r.state === RatState.Pregnant) {
            r.stateTimer -= dt;
            if (r.stateTimer <= 0) {
                // Give birth
                r.state = RatState.Normal;
                r.hp = 1; r.maxHp = 1;
                for(let b=0; b<this.state.level; b++) {
                   this.spawnRat(r.x, r.y, Math.random() > 0.5 ? 'M' : 'F', true);
                }
            }
        }

        if (r.state === RatState.Baby) {
            r.stateTimer -= dt;
            if (r.stateTimer <= 0) {
                r.state = RatState.Normal;
            }
            // Babies can wander
        }

        // Check Mating
        if (r.state === RatState.Normal && r.gender === 'F') {
            const male = this.rats.find(other => 
                other.id !== r.id && other.gender === 'M' && other.state === RatState.Normal &&
                Math.abs(other.x - r.x) <= 1 && Math.abs(other.y - r.y) <= 1
            );
            if (male) {
                r.state = RatState.Mating;
                r.stateTimer = 1;
                male.state = RatState.Mating;
                male.stateTimer = 1;
                this.addParticle(r.x, r.y, 'heart');
                continue;
            }
        }

        // Movement
        if (r.targetX === r.x && r.targetY === r.y) {
           this.pickNextTarget(r);
           // If pickNextTarget puts it in a pipe, state changes to underground
           if (r.state === RatState.Underground) continue;
        }

        if (r.targetX !== r.x || r.targetY !== r.y) {
            r.moveTimer += dt;
            const progress = Math.min(1, r.moveTimer / r.moveDuration);
            r.realX = r.x + (r.targetX - r.x) * progress;
            r.realY = r.y + (r.targetY - r.y) * progress;

            if (progress >= 1) {
                r.x = r.targetX;
                r.y = r.targetY;
                r.moveTimer = 0;
                
                // Eat corn!
                if (this.grid[r.y][r.x].type === CellType.Corn) {
                    this.grid[r.y][r.x].type = CellType.Empty;
                    this.onPlaySound?.('eat');
                }
            }
        }
    }

    // Clean dead rats
    this.rats = this.rats.filter(r => r.state !== RatState.Dead);
  }

  private pickNextTarget(r: Rat) {
     // Check if on a pipe entrance
     if (this.grid[r.y][r.x].type === CellType.Pipe) {
        const pipeId = this.grid[r.y][r.x].pipeId;
        // Find the other end
        for(let y=0; y<this.grid.length; y++) {
          for(let x=0; x<this.grid[y].length; x++) {
             if (this.grid[y][x].type === CellType.Pipe && this.grid[y][x].pipeId === pipeId && (x !== r.x || y !== r.y)) {
                 r.state = RatState.Underground;
                 r.stateTimer = 2; // 2 seconds to traverse pipe
                 r.pipeTarget = {x, y};
                 return;
             }
          }
        }
     }

     const cornSpots: Position[] = [];
     this.grid.forEach(row => row.forEach(c => { if(c.type === CellType.Corn) cornSpots.push({x: c.x, y: c.y}); }));

     let nextPos: Position | null = null;

     if (this.state.level >= 10 && cornSpots.length > 0 && r.state !== RatState.Baby) {
         // A* Pathfinding
         if (!r.path || r.path.length === 0) {
            const targetCorn = cornSpots[Math.floor(Math.random() * cornSpots.length)];
            const path = findPath({x: r.x, y: r.y}, targetCorn, this.grid, this.items);
            if (path && path.length > 0) {
               r.path = path;
            }
         }
         if (r.path && r.path.length > 0) {
             nextPos = r.path.shift() as Position;
         }
     }

     // Fallback to random wander
     if (!nextPos) {
       const neighbors = [
          {x: r.x, y: r.y-1}, {x: r.x, y: r.y+1}, {x: r.x-1, y: r.y}, {x: r.x+1, y: r.y}
       ].filter(p => {
          if (p.x < 0 || p.y < 0 || p.y >= this.grid.length || p.x >= this.grid[0].length) return false;
          const t = this.grid[p.y][p.x].type;
          return t === CellType.Empty || t === CellType.Pipe || t === CellType.Corn; // Rats can't randomly walk into walls
       });
       if(neighbors.length > 0) {
         nextPos = neighbors[Math.floor(Math.random() * neighbors.length)];
       }
     }

     if (nextPos) {
         // Check Barrels
         const barrel = this.items.find(i => i.type === 'barrel' && i.x === nextPos!.x && i.y === nextPos!.y);
         if (barrel) {
             barrel.hp -= 1;
             r.path = []; // Force repath next tick
             // Stand still for a tick bounce back
             r.targetX = r.x; r.targetY = r.y;
             this.onPlaySound?.('hit');
         } else {
             r.targetX = nextPos.x;
             r.targetY = nextPos.y;
         }
     }
  }

  private explodeBomb(bx: number, by: number) {
     this.onPlaySound?.('explosion');
     const targets: {x: number, y: number}[] = [];
     const range = this.state.bombRange;

     for(let r = -range; r <= range; r++) {
       targets.push({x: bx + r, y: by});
       if (r !== 0) targets.push({x: bx, y: by + r});
     }

     for(const p of targets) {
       if (p.x < 0 || p.y < 0 || p.y >= this.grid.length || p.x >= this.grid[0].length) continue;
       
       this.addParticle(p.x, p.y, 'explosion');

       // Damage walls
       const cell = this.grid[p.y][p.x];
       if (cell.type === CellType.Wall) {
          cell.hp -= 1;
          if (cell.hp <= 0) cell.type = CellType.Empty;
       }

       // Damage Barrels (Bombs destroy barrels?)
       const barrel = this.items.find(i => i.type === 'barrel' && i.x === p.x && i.y === p.y);
       if (barrel) barrel.hp -= 1;
     }

     // Damage rats
     this.rats.forEach(r => {
        if (r.state === RatState.Dead) return;
        
        // Find if rat is in any of the explosion cells
        const isInBlast = targets.some(p => {
           if (p.x < 0 || p.y < 0 || p.y >= this.grid.length || p.x >= this.grid[0].length) return false;
           
           // Generous hitbox for checking if rat is hit by the blast (1.2x1.2 cell size around the blast center)
           const inRange = Math.abs(r.realX - p.x) <= 0.6 && Math.abs(r.realY - p.y) <= 0.6;
           
           if (inRange) {
              if (r.state === RatState.Underground) {
                  const cell = this.grid[p.y][p.x];
                  return cell.type === CellType.Pipe;
              }
              return true;
           }
           return false;
        });

        if (isInBlast) {
            r.hp -= 1;
            if (r.hp <= 0) {
               r.state = RatState.Dead;
               this.addParticle(Math.round(r.realX), Math.round(r.realY), 'smoke');
               // Item Drop (100% chance)
               const isBarrel = Math.random() < 0.5;
               if(isBarrel) this.state.barrels++;
               else this.state.bombs++;
               this.addParticle(Math.round(r.realX), Math.round(r.realY), 'floating_text', isBarrel ? '+1 🛢️' : '+1 💣');
            }
        }
     });

     this.notifyState();
  }

  private addParticle(x: number, y: number, type: Particle['type'], text?: string) {
    this.particles.push({ id: Math.random().toString(), x, y, type, text, timer: 1, maxTimer: 1 });
  }

  private notifyState() {
     this.onStateChange?.({...this.state});
  }

  public shopBuy(item: 'barrel' | 'bomb' | 'pause' | 'bombrange') {
    if(this.state.status !== 'shop') return;
    if(item === 'barrel' && this.state.points >= 5) {
      this.state.points -= 5;
      this.state.barrels++;
    } else if(item === 'bomb' && this.state.points >= 5) {
      this.state.points -= 5;
      this.state.bombs++;
    } else if(item === 'pause' && this.state.points >= 10) {
      this.state.points -= 10;
      this.state.timePauses++;
    } else if (item === 'bombrange' && this.state.points >= 20) {
      this.state.points -= 20;
      this.state.bombRange++;
    }
    this.notifyState();
  }

  public nextLevel() {
    this.state.level++;
    // Bombs are not reset on next level
    this.initLevel();
  }

  public restart() {
    this.state.level = 1;
    this.state.points = 0;
    this.state.barrels = 5;
    this.state.bombs = 20;
    this.state.timePauses = 0;
    this.state.bombRange = 1;
    this.initLevel();
  }
}
