import React from 'react';
import { Eye, EyeOff, HelpCircle, CheckCircle } from 'lucide-react';

interface FlashcardProps {
  question: string;
  answer: string;
  isRevealed: boolean;
  onReveal: () => void;
  questionNumber: number;
}

export const Flashcard: React.FC<FlashcardProps> = ({ 
  question, 
  answer, 
  isRevealed, 
  onReveal,
  questionNumber
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto perspective-1000">
      <div 
        className="relative w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 min-h-[400px] flex flex-col"
        onClick={!isRevealed ? onReveal : undefined}
      >
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Domanda #{questionNumber}
          </span>
          {isRevealed ? (
            <span className="flex items-center text-green-600 text-sm font-medium animate-in fade-in">
              <CheckCircle className="w-4 h-4 mr-1" />
              Risposta
            </span>
          ) : (
            <span className="flex items-center text-amber-600 text-sm font-medium">
              <HelpCircle className="w-4 h-4 mr-1" />
              In attesa
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-8 items-center justify-center text-center cursor-pointer">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 leading-relaxed">
              {question}
            </h2>
          </div>

          <div className={`transition-all duration-500 ease-in-out transform ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {isRevealed && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 w-full animate-in slide-in-from-bottom-4 fade-in duration-500">
                <p className="text-xl font-medium text-indigo-900">
                  {answer}
                </p>
              </div>
            )}
          </div>
          
          {!isRevealed && (
            <div className="mt-8 text-slate-400 text-sm animate-pulse">
              Tocca per mostrare la risposta
            </div>
          )}
        </div>
      </div>
    </div>
  );
};