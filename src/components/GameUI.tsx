import React, { useState } from 'react';
import { useGameLoop } from './useGameLoop';
import { i18n, AppLanguage } from '../i18n';

export default function GameUI() {
  const { state, canvasRef, handleCanvasClick, engine } = useGameLoop();
  const [selectedTool, setSelectedTool] = useState<'barrel'|'bomb'>('bomb');
  const [lang, setLang] = useState<AppLanguage>('zh');
  
  const text = i18n[lang];

  return (
    <div className="min-h-screen bg-[#0c0e14] text-[#e2e8f0] font-sans flex flex-col items-center select-none">
      
      <header className="w-full h-16 flex items-center justify-between px-8 bg-[#111827] border-b border-slate-800 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-white">{text.title}</h1>
          <div className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-slate-400">V1.0.5</div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')}
            className="text-xs px-3 py-1 border border-slate-600 rounded text-slate-400 hover:text-white"
          >
            {lang === 'en' ? '中文' : 'EN'}
          </button>
          <div className="flex items-center gap-12">
            <div className="text-center">
               <p className="text-[10px] text-slate-500 uppercase tracking-widest">{text.level}</p>
               <p className="text-xl font-black text-white">{state.level.toString().padStart(2, '0')}</p>
            </div>
            <div className="text-center">
               <p className="text-[10px] text-slate-500 uppercase tracking-widest">{text.points}</p>
               <p className="text-xl font-black text-yellow-500">{state.points}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full max-w-4xl flex justify-center gap-4 mb-4">
          <button 
           className={`px-6 py-2 rounded font-medium border text-sm transition-all ${selectedTool === 'barrel' ? 'bg-slate-900 border-green-500/50 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:bg-slate-800'}`}
           onClick={() => setSelectedTool('barrel')}
          >
            {text.tube} ({state.barrels})
          </button>
          <button 
           className={`px-6 py-2 rounded font-medium border text-sm transition-all ${selectedTool === 'bomb' ? 'bg-slate-900 border-orange-500/50 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:bg-slate-800'}`}
           onClick={() => setSelectedTool('bomb')}
          >
            {text.bomb} ({state.bombs})
          </button>
          <button 
           className={`px-6 py-2 rounded font-medium border text-sm transition-all bg-[#0f172a] border-slate-700 text-blue-400 hover:bg-slate-800`}
           onClick={() => engine.useTimePause()}
          >
            {text.pause} ({state.timePauses})
          </button>
      </div>

      <div className="relative w-full max-w-[750px] aspect-square mx-auto flex-1 pb-8">
        <canvas 
          ref={canvasRef} 
          width={750} 
          height={750} 
          className="bg-[#161b22] shadow-2xl shadow-blue-900/20 rounded-lg border-4 border-[#2d3139] w-full h-full cursor-crosshair object-contain"
          onClick={(e) => handleCanvasClick(e, selectedTool)}
        />
        
        {state.status === 'shop' && (
          <div className="absolute inset-0 bg-[#0f172a]/95 flex flex-col items-center justify-center rounded-lg border border-slate-800 backdrop-blur-sm z-10 p-8">
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{text.levelComplete}</h2>
            <p className="mb-8 font-mono text-lg text-yellow-400">{text.pts}: {state.points}</p>
            <div className="flex flex-col gap-3 w-full max-w-sm">
              <button 
                onClick={() => engine.shopBuy('barrel')}
                className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
              >
                <span className="text-sm">{text.buyTube}</span>
                <span className="text-xs font-bold px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded">5 {text.pts}</span>
              </button>
              <button 
                onClick={() => engine.shopBuy('bomb')}
                className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
              >
                <span className="text-sm">{text.buyBomb}</span>
                <span className="text-xs font-bold px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded">5 {text.pts}</span>
              </button>
              <button 
                onClick={() => engine.shopBuy('bombrange')}
                className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
              >
                <span className="text-sm">{text.buyRange}</span>
                <span className="text-xs font-bold px-2 py-1 bg-orange-500/10 text-orange-500 rounded">20 {text.pts}</span>
              </button>
              <button 
                onClick={() => engine.shopBuy('pause')}
                className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
              >
                <span className="text-sm">{text.buyPause}</span>
                <span className="text-xs font-bold px-2 py-1 bg-blue-500/10 text-blue-500 rounded">10 {text.pts}</span>
              </button>
            </div>
            <button 
              onClick={() => engine.nextLevel()}
              className="mt-8 bg-blue-600 text-white px-8 py-3 rounded text-sm font-bold hover:bg-blue-500 transition-colors"
            >
              {text.nextLevel}
            </button>
          </div>
        )}

        {state.status === 'gameover' && (
          <div className="absolute inset-0 bg-[#0c0e14]/95 flex flex-col items-center justify-center rounded-lg border border-red-900/50 backdrop-blur-sm z-10 p-8">
            <h2 className="text-4xl font-black text-red-500 mb-2 tracking-tight">{text.missionFailed}</h2>
            <p className="mb-6 text-sm text-slate-400 uppercase tracking-widest">{text.breachMsg}</p>
            <p className="mb-8 font-mono text-lg text-slate-300">{text.levelReached} {state.level}</p>
            <button 
              onClick={() => engine.restart()}
              className="bg-red-600 text-white px-8 py-3 rounded text-sm font-bold hover:bg-red-500 transition-colors"
            >
              {text.restart}
            </button>
          </div>
        )}

        {state.status === 'start' && (
          <div className="absolute inset-0 bg-[#0c0e14]/95 flex flex-col items-center justify-center rounded-lg border border-[#2d3139] backdrop-blur-sm z-10 p-8">
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">{text.title}</h2>
            <div className="max-w-md bg-slate-800/50 border border-slate-700 p-6 rounded-lg text-slate-300 mb-8 space-y-4 text-sm leading-relaxed">
               <p>{text.desc1}</p>
               <ul className="list-disc pl-5 space-y-2">
                 <li><span className="text-green-400">{text.tube}:</span> {text.desc2.split('：')[1] || text.desc2.split(': ')[1]}</li>
                 <li><span className="text-orange-400">{text.bomb}:</span> {text.desc3.split('：')[1] || text.desc3.split(': ')[1]}</li>
                 <li><span className="text-blue-400">{text.desc4.split('会')[0] || text.desc4.split('will')[0]}</span> {text.desc4.split('会')[1] ? '会' + text.desc4.split('会')[1] : 'will' + text.desc4.split('will')[1]}</li>
               </ul>
            </div>
            <button 
              onClick={() => engine.initLevel()}
              className="bg-blue-600 text-white px-8 py-3 rounded text-sm font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
            >
              {text.startBtn}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
