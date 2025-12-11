
import React, { useState } from 'react';
import { Button } from './Button';
import { Timer, X } from 'lucide-react';

interface ExamConfigModalProps {
  totalQuestions: number;
  onStart: (count: number, minutes: number) => void;
  onClose: () => void;
}

export const ExamConfigModal: React.FC<ExamConfigModalProps> = ({
  totalQuestions,
  onStart,
  onClose
}) => {
  const [count, setCount] = useState<string>(Math.min(60, totalQuestions).toString());
  const [minutes, setMinutes] = useState<string>("60");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCount = parseInt(count);
    const parsedMinutes = parseInt(minutes);
    
    if (isNaN(parsedCount) || parsedCount < 1) {
        alert("Inserisci un numero valido di domande");
        return;
    }
    if (parsedCount > totalQuestions) {
        alert(`Puoi inserire al massimo ${totalQuestions} domande.`);
        return;
    }

    if (isNaN(parsedMinutes) || parsedMinutes < 1) {
        alert("Inserisci una durata valida");
        return;
    }

    onStart(parsedCount, parsedMinutes);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-sm p-8 animate-in zoom-in duration-300 border border-white/20">
        
        {/* Close Button */}
        <button type="button" onClick={onClose} className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 transition-colors">
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4 shadow-sm border border-orange-100">
            <Timer className="w-10 h-10 text-brand-orange" />
          </div>
          <h2 className="text-2xl font-bold text-brand-dark">Configura Esame</h2>
          <p className="text-slate-400 text-center mt-2 text-sm font-medium">
            Personalizza la tua sessione.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Question Count Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
              Numero Domande
            </label>
            <div className="relative">
              <input 
                type="number"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full bg-slate-100 border-2 border-transparent rounded-2xl px-5 py-4 text-xl font-bold text-brand-dark focus:bg-white focus:border-brand-orange/50 focus:ring-0 outline-none transition-all placeholder-slate-300 shadow-inner"
                placeholder="Es. 30"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-lg shadow-sm">
                MAX {totalQuestions}
              </span>
            </div>
          </div>

          {/* Time Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
              Minuti a disposizione
            </label>
            <input 
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-full bg-slate-100 border-2 border-transparent rounded-2xl px-5 py-4 text-xl font-bold text-brand-dark focus:bg-white focus:border-brand-orange/50 focus:ring-0 outline-none transition-all placeholder-slate-300 shadow-inner"
              placeholder="Es. 60"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button 
                type="submit" 
                className="w-full h-14 bg-brand-orange hover:bg-orange-600 text-white font-bold text-lg rounded-full shadow-lg shadow-orange-500/30 transition-all active:scale-95"
            >
                Inizia Esame
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
