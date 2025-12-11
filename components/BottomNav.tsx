import React from 'react';
import { Home, List, GraduationCap } from 'lucide-react';
import { AppMode } from '../types';

interface BottomNavProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  onOpenExam: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentMode, setMode, onOpenExam }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full z-[100] md:hidden pointer-events-none">
      {/* Container della barra - Pointer events auto per interazione */}
      <div className="bg-white rounded-t-[40px] h-[88px] w-full shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pointer-events-auto flex justify-center items-end pb-4 gap-14 relative">
        
        {/* Sinistra: Home/Quiz */}
        <button 
          onClick={() => setMode(AppMode.QUIZ)}
          className={`flex flex-col items-center justify-center w-16 transition-all duration-300 group ${
            currentMode === AppMode.QUIZ ? 'text-[#FF8A00]' : 'text-slate-400 hover:text-slate-500'
          }`}
        >
          <Home className={`w-7 h-7 mb-1.5 transition-transform duration-300 ${currentMode === AppMode.QUIZ ? 'fill-current scale-105' : 'stroke-[2.5px]'}`} />
          <span className="text-[10px] font-bold tracking-wide">Home</span>
        </button>

        {/* Centro: Esame */}
        <div className="relative flex flex-col items-center justify-end h-full w-20">
           {/* Pulsante che esce dalla barra - Raffinato ed Elegante */}
           <button
            onClick={onOpenExam}
            className="
              absolute -top-9
              flex items-center justify-center w-[72px] h-[72px]
              rounded-full
              bg-gradient-to-b from-[#4263EB] to-[#1e3a8a]
              border-[3px] border-[#FF8A00]
              shadow-[0_10px_25px_-5px_rgba(37,99,235,0.5)]
              transform transition-transform duration-200 active:scale-95
            "
            aria-label="Configura Esame"
          >
            <GraduationCap className="w-8 h-8 text-white" strokeWidth={2} />
          </button>
          
          {/* Etichetta allineata sulla barra bianca */}
          <span className="text-[10px] font-bold text-[#1e3a8a] tracking-wide mb-0.5">Esame</span>
        </div>

        {/* Destra: Lista */}
        <button 
          onClick={() => setMode(AppMode.LIST)}
          className={`flex flex-col items-center justify-center w-16 transition-all duration-300 group ${
            currentMode === AppMode.LIST ? 'text-[#FF8A00]' : 'text-slate-400 hover:text-slate-500'
          }`}
        >
          <List className={`w-7 h-7 mb-1.5 transition-transform duration-300 stroke-[2.5px] ${currentMode === AppMode.LIST ? 'scale-105' : ''}`} />
          <span className="text-[10px] font-bold tracking-wide">Lista</span>
        </button>
      </div>
    </div>
  );
};