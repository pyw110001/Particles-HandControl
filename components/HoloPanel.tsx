import React, { useState } from 'react';
import { AppMode, ColorTheme } from '../types';
import { generateThemeFromPrompt } from '../services/geminiService';

interface HoloPanelProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  currentTheme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
  gestureState: { isOpen: boolean; expansion: number; isHandDetected: boolean; rotation: number };
}

const HoloPanel: React.FC<HoloPanelProps> = ({ mode, setMode, currentTheme, setTheme, gestureState }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    const newTheme = await generateThemeFromPrompt(prompt);
    if (newTheme) {
      setTheme(newTheme);
    }
    setIsGenerating(false);
  };

  const updateColor = (key: 'start' | 'mid' | 'end', value: string) => {
    setTheme({
      ...currentTheme,
      [key]: value
    });
  };

  return (
    <div className="absolute top-0 left-0 h-full w-full pointer-events-none p-6 flex flex-col justify-between">
      
      {/* Header */}
      <header className="flex justify-between items-start pointer-events-auto">
        <div className="bg-holo-900/80 backdrop-blur-md border border-holo-500 p-4 rounded-lg shadow-[0_0_20px_rgba(0,191,255,0.2)] max-w-sm">
          <h1 className="text-holo-400 font-mono text-xl font-bold tracking-widest uppercase mb-2">
            Nebula :: Core
          </h1>
          <p className="text-holo-200 font-mono text-xs opacity-80">
            PARTICLE COUNT: 70,000<br/>
            RENDERER: WEBGL2 / THREE.JS<br/>
            STATUS: {mode === AppMode.DEMO ? 'AUTOPILOT' : 'MANUAL OVERRIDE'}
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-col gap-2">
           <div className={`px-4 py-2 border font-mono text-xs rounded transition-all duration-300 ${
             gestureState.isHandDetected 
               ? 'bg-holo-500/20 border-holo-400 text-holo-100 shadow-[0_0_10px_#00bfff]' 
               : 'bg-red-900/20 border-red-500/50 text-red-400'
           }`}>
             SENSOR: {gestureState.isHandDetected ? 'ONLINE' : 'SEARCHING...'}
           </div>
           
           <div className="flex gap-2">
             <div className={`flex-1 h-1 rounded ${gestureState.isOpen ? 'bg-holo-400' : 'bg-holo-900 border border-holo-800'}`}></div>
             <div className={`flex-1 h-1 rounded ${!gestureState.isOpen && gestureState.isHandDetected ? 'bg-holo-400' : 'bg-holo-900 border border-holo-800'}`}></div>
           </div>
           <div className="flex justify-between text-[10px] text-holo-500 font-mono">
              <span>EXPAND</span>
              <span>CONTRACT</span>
           </div>
           
           {/* Rotation Indicator */}
           <div className="flex items-center gap-2 font-mono text-[10px] text-holo-400">
             <span>ROTATION</span>
             <div className="h-1 bg-holo-900 w-16 rounded overflow-hidden">
                <div 
                  className="h-full bg-holo-500 transition-all duration-100" 
                  style={{ 
                    width: '20%', 
                    transform: `translateX(${(gestureState.rotation + 1.5) / 3 * 100}%)` 
                  }} 
                />
             </div>
           </div>
        </div>
      </header>

      {/* Control Deck */}
      <div className="pointer-events-auto w-full max-w-md bg-deep/90 backdrop-blur-xl border-t-2 border-holo-500/50 rounded-t-2xl p-6 self-center transform transition-transform shadow-[0_-5px_30px_rgba(0,0,0,0.8)]">
        
        {/* Toggle Mode */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setMode(mode === AppMode.DEMO ? AppMode.INTERACTIVE : AppMode.DEMO)}
            className={`
              relative px-8 py-3 font-mono text-sm font-bold tracking-widest uppercase transition-all duration-300 overflow-hidden group
              border border-holo-400 rounded
              ${mode === AppMode.INTERACTIVE 
                ? 'bg-holo-500/20 text-holo-50 shadow-[0_0_20px_rgba(0,191,255,0.4)]' 
                : 'hover:bg-holo-500/10 text-holo-300'}
            `}
          >
            <span className="relative z-10">
              {mode === AppMode.DEMO ? 'Initialize Sensor Link' : 'Disengage Sensors'}
            </span>
            <div className="absolute inset-0 bg-holo-400/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>

        {/* Color Theme Control */}
        <div className="space-y-4 border-t border-holo-800/50 pt-4">
          <div className="flex justify-between items-end">
             <label className="text-holo-400 font-mono text-xs uppercase">Chromatic Adaptation (AI)</label>
             <span className="text-holo-600 text-[10px]">{currentTheme.name}</span>
          </div>
          
          <div className="flex gap-2 mb-3">
            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: 'Cyberpunk Neon'..."
              className="flex-1 bg-black/50 border border-holo-700 text-holo-100 font-mono text-sm px-3 py-2 rounded focus:border-holo-400 focus:outline-none placeholder-holo-800"
            />
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !process.env.API_KEY}
              className="bg-holo-700 hover:bg-holo-600 disabled:opacity-50 text-white font-mono text-xs px-4 rounded border border-holo-500 transition-colors"
            >
              GEN
            </button>
          </div>

          {/* Manual Color Pickers */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'CORE', key: 'start', val: currentTheme.start },
              { label: 'MID', key: 'mid', val: currentTheme.mid },
              { label: 'OUTER', key: 'end', val: currentTheme.end }
            ].map((c) => (
              <div key={c.key} className="flex flex-col gap-1">
                <label className="text-[10px] text-holo-500 font-mono text-center">{c.label}</label>
                <div className="relative h-8 w-full overflow-hidden rounded border border-holo-600 group">
                   <input 
                      type="color" 
                      value={c.val} 
                      onChange={(e) => updateColor(c.key as any, e.target.value)}
                      className="absolute -top-2 -left-2 w-[150%] h-[150%] cursor-pointer p-0 border-0"
                   />
                </div>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default HoloPanel;