import { useRef, useEffect, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { GameStateData, Particle, CellType, Gender, RatState } from '../engine/types';

export function useGameLoop() {
  const engineRef = useRef<GameEngine>(new GameEngine());
  const [state, setState] = useState<GameStateData>(engineRef.current.state);
  const [particles, setParticles] = useState<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    engineRef.current.onStateChange = setState;
    engineRef.current.onParticlesChange = setParticles;
    engineRef.current.initLevel();

    let lastTime = performance.now();
    let animationId: number;

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      
      engineRef.current.update(dt);
      render(engineRef.current, canvasRef.current, dt);

      animationId = requestAnimationFrame(loop);
    };
    
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const render = (engine: GameEngine, canvas: HTMLCanvasElement | null, dt: number) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const tileSize = w / 25;

    // Draw Grid
    for(let y=0; y<engine.grid.length; y++) {
      for(let x=0; x<engine.grid[y].length; x++) {
        const cell = engine.grid[y][x];
        const px = x * tileSize;
        const py = y * tileSize;

        ctx.fillStyle = '#161b22'; // Default floor (theme .cell)
        switch(cell.type) {
           case CellType.Wall: 
             ctx.fillStyle = cell.hp === 3 ? '#475569' : (cell.hp === 2 ? '#3b4758' : '#2f3947'); // Slate wall
             break;
           case CellType.Boundary:
             ctx.fillStyle = '#2d3139'; // Border color
             break;
           case CellType.GranaryWall:
             ctx.fillStyle = '#1e293b'; // Hard wall
             break;
           case CellType.Pipe:
             ctx.fillStyle = '#27272a'; // Pipe background
             break;
           case CellType.RatHole:
             ctx.fillStyle = '#000';
             break;
           case CellType.Empty:
             ctx.fillStyle = '#161b22'; // Floor
             break;
           case CellType.Corn:
             ctx.fillStyle = '#161b22';
             break;
        }
        ctx.fillRect(px, py, tileSize + 1, tileSize + 1);

        if (cell.type === CellType.GranaryWall) {
             ctx.strokeStyle = '#64748b';
             ctx.lineWidth = 2;
             ctx.strokeRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
        }

        // Draw details
        if (cell.type === CellType.Pipe) {
            ctx.strokeStyle = '#52525b';
            ctx.lineWidth = 3;
            ctx.strokeRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(px+tileSize/2, py+tileSize/2, tileSize*0.25, 0, Math.PI*2);
            ctx.fill();
        } else if (cell.type === CellType.Corn) {
            ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
            ctx.shadowBlur = 10;
            ctx.font = `${tileSize * 0.7}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🌽', px + tileSize / 2, py + tileSize / 2 + 2); // manual adjustment for emoji vertical alignment
            ctx.shadowBlur = 0; // reset
        }
      }
    }

    // Draw Items
    engine.items.forEach(item => {
      const px = item.x * tileSize;
      const py = item.y * tileSize;
      if (item.type === 'barrel') {
         ctx.fillStyle = '#22c55e'; // Tube
         ctx.fillRect(px + tileSize*0.15, py + tileSize*0.15, tileSize*0.7, tileSize*0.7);
         ctx.strokeStyle = '#166534';
         ctx.lineWidth = 2;
         ctx.strokeRect(px + tileSize*0.15, py + tileSize*0.15, tileSize*0.7, tileSize*0.7);
         
         // HP bar
         ctx.fillStyle = 'white';
         ctx.fillRect(px+2, py+2, (tileSize-4)*(item.hp/5), 3);
      } else if (item.type === 'bomb') {
         ctx.fillStyle = '#000';
         ctx.beginPath();
         ctx.arc(px+tileSize/2, py+tileSize/2, tileSize*0.35, 0, Math.PI*2);
         ctx.fill();
         ctx.strokeStyle = '#f97316';
         ctx.lineWidth = 2;
         ctx.stroke();
         
         // Timer bar
         ctx.fillStyle = 'white';
         ctx.fillRect(px+tileSize/2 - tileSize*0.2, py+tileSize/2 - tileSize*0.4, tileSize*0.4*(item.timer/2), 2);
         // Spark
         ctx.fillStyle = '#fb7185';
         ctx.fillRect(px+tileSize/2 + tileSize*0.2, py+tileSize/2 - tileSize*0.4 - 4, 6, 2);
      }
    });

    // Draw Rats
    engine.rats.forEach(r => {
      if(r.state === RatState.Underground) return;

      const px = r.realX * tileSize + tileSize/2;
      const py = r.realY * tileSize + tileSize/2;

      ctx.save();
      ctx.translate(px, py);

      // Determine rotation based on direction of movement
      let angle = 0;
      if (r.targetX > r.x) angle = 0; // right
      else if (r.targetX < r.x) angle = Math.PI; // left
      else if (r.targetY > r.y) angle = Math.PI / 2; // down
      else if (r.targetY < r.y) angle = -Math.PI / 2; // up
      else {
          // default looking right, or maybe use previous? Just 0 for now.
      }
      ctx.rotate(angle);

      ctx.fillStyle = r.gender === 'M' ? '#3b82f6' : '#ef4444'; // Blue / Pink-Red
      if(r.state === RatState.Baby) ctx.fillStyle = '#94a3b8'; // slate-400 baby
      
      const isPregnant = r.state === RatState.Pregnant;
      const scaleMult = isPregnant ? 1.2 : (r.state === RatState.Baby ? 0.6 : 1);

      if (isPregnant) {
        ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
        ctx.shadowBlur = 8;
      }

      ctx.scale(scaleMult, scaleMult);

      // Body (ellipse)
      ctx.beginPath();
      ctx.ellipse(0, 0, tileSize * 0.35, tileSize * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body outline
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.shadowBlur = 0; // reset shadow before rest of body parts

      // Ears
      // Draw behind body? No, drawn over is fine.
      ctx.fillStyle = r.gender === 'M' ? '#60a5fa' : '#f87171'; // Lighter color
      if(r.state === RatState.Baby) ctx.fillStyle = '#cbd5e1'; 
      ctx.beginPath();
      ctx.arc(tileSize * 0.15, -tileSize * 0.2, tileSize * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(tileSize * 0.15, tileSize * 0.2, tileSize * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Nose
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(tileSize * 0.35, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      // Tail
      ctx.beginPath();
      ctx.moveTo(-tileSize * 0.35, 0);
      ctx.quadraticCurveTo(-tileSize * 0.5, tileSize * 0.1, -tileSize * 0.65, -tileSize * 0.1);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
      
      // HP bar (drawn without rotation, translated back appropriately)
      if(r.maxHp > 1) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px - tileSize/3, py - tileSize/2 - 8, tileSize/1.5, 3);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(px - tileSize/3, py - tileSize/2 - 8, (tileSize/1.5)*(r.hp/r.maxHp), 3);
      }
    });

    // Draw Particles
    engine.particles.forEach(p => {
       const px = p.x * tileSize + tileSize/2;
       const py = p.y * tileSize + tileSize/2;
       const progress = p.timer / p.maxTimer; // 1 to 0
       
       if (p.type === 'explosion') {
          ctx.fillStyle = `rgba(255, 100, 0, ${progress})`;
          ctx.beginPath();
          ctx.arc(px, py, tileSize * (1.5 - progress), 0, Math.PI*2);
          ctx.fill();
       } else if (p.type === 'heart') {
          ctx.fillStyle = `rgba(255, 0, 100, ${progress})`;
          ctx.font = '20px Arial';
          ctx.fillText('❤', px - 10, py - (1-progress)*20);
       } else if (p.type === 'smoke') {
          ctx.fillStyle = `rgba(100, 100, 100, ${progress})`;
          ctx.beginPath();
          ctx.arc(px, py - (1-progress)*20, tileSize * 0.5, 0, Math.PI*2);
          ctx.fill();
       } else if (p.type === 'floating_text' && p.text) {
          ctx.fillStyle = `rgba(255, 255, 0, ${progress})`;
          ctx.font = 'bold 16px Arial';
          ctx.fillText(p.text, px - 20, py - (1-progress)*30);
       }
    });

  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>, selectedTool: 'barrel' | 'bomb') => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const scaleX = canvasRef.current!.width / rect.width;
      const scaleY = canvasRef.current!.height / rect.height;

      const vx = (e.clientX - rect.left) * scaleX;
      const vy = (e.clientY - rect.top) * scaleY;

      // Map to 25x25 grid
      const tileSize = canvasRef.current!.width / 25;
      const gx = Math.floor(vx / tileSize);
      const gy = Math.floor(vy / tileSize);
      
      engineRef.current.placeItem(gx, gy, selectedTool);
  };

  return { state, canvasRef, handleCanvasClick, engine: engineRef.current };
}
