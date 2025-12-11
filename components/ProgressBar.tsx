import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div className="w-full relative">
      <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
        <span>Progresso</span>
        <span className="text-white">{percentage}%</span>
      </div>
      <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden border border-slate-700/50 backdrop-blur-sm">
        <div 
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out relative shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
          style={{ width: `${percentage}%` }}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 animate-shimmer opacity-30"></div>
          {/* Glow */}
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/60 blur-[1px]"></div>
        </div>
      </div>
    </div>
  );
};