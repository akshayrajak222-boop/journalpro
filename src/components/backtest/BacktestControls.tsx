import React from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw } from 'lucide-react';

interface BacktestControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  currentDate?: string;
  isFinished: boolean;
}

export default function BacktestControls({
  isPlaying, onPlay, onPause, onStepForward, onReset, speed, onSpeedChange, currentDate, isFinished
}: BacktestControlsProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Playback controls */}
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button onClick={onPause} className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition">
              <Pause className="h-5 w-5" />
            </button>
          ) : (
            <button onClick={onPlay} disabled={isFinished} className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
              <Play className="h-5 w-5" />
            </button>
          )}
          
          <button 
            onClick={onStepForward} 
            disabled={isPlaying || isFinished}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
            title="Step Forward (1 Candle)"
          >
            <SkipForward className="h-5 w-5" />
          </button>
          
          <button 
            onClick={onReset}
            className="p-2.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition ml-2"
            title="Reset Backtest"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
        
        {/* Speed */}
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
        
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg">
          {[
            { label: '0.5x', value: 1000 },
            { label: '1x', value: 500 },
            { label: '2x', value: 250 },
            { label: '5x', value: 100 },
            { label: 'MAX', value: 10 }
          ].map(s => (
            <button
              key={s.label}
              onClick={() => onSpeedChange(s.value)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${speed === s.value ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Status */}
      <div className="flex items-center gap-4">
        {currentDate && (
          <div className="text-sm font-mono font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {new Date(currentDate).toLocaleString()}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {isPlaying && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isPlaying ? 'bg-indigo-500' : isFinished ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {isFinished ? 'Finished' : isPlaying ? 'Running' : 'Paused'}
          </span>
        </div>
      </div>
    </div>
  );
}
