import React, { useEffect, useState } from 'react';
import { Lightbulb, Star, Volume2, CheckCircle, XCircle } from 'lucide-react';

interface QuizCardProps {
  question: string;
  options: string[];
  correctAnswer: string;
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
  questionNumber: number;
  onHint: () => void;
  hiddenOptions: string[];
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  isExamMode?: boolean;
  children?: React.ReactNode;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  options,
  correctAnswer,
  selectedAnswer,
  onSelectAnswer,
  questionNumber,
  onHint,
  hiddenOptions,
  isBookmarked,
  onToggleBookmark,
  isExamMode = false,
  children
}) => {
  const isAnswered = selectedAnswer !== null;
  const isHintUsed = hiddenOptions.length > 0;
  const [animClass, setAnimClass] = useState('animate-pop');

  useEffect(() => {
    setAnimClass('animate-pop');
    const timer = setTimeout(() => setAnimClass(''), 500);
    return () => clearTimeout(timer);
  }, [questionNumber]);

  const speakQuestion = (e: React.MouseEvent) => {
    e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.lang = 'it-IT';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const getOptionStyles = (option: string, index: number) => {
    if (hiddenOptions.includes(option)) {
       return 'opacity-0 pointer-events-none h-0 p-0 m-0 overflow-hidden border-none'; 
    }

    // Base Style
    let styles = "w-full text-left relative px-5 py-4 rounded-2xl transition-all duration-200 active:scale-[0.98] flex items-center justify-between group font-medium text-[15px] border-2";
    
    // EXAM MODE
    if (isExamMode) {
        if (option === selectedAnswer) {
             // Selected in Exam: Brand Orange Border
             return `${styles} bg-orange-50 border-[#FF8A00] text-[#2546A1] font-semibold shadow-sm`;
        }
        return `${styles} bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200`;
    }

    // QUIZ MODE (Immediate Feedback)
    if (!isAnswered) {
        return `${styles} bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200`;
    }
    
    // Answered Phase
    if (option === correctAnswer) {
      // Correct: Blue System
      // Bordo: Blu Reale (#4263EB)
      // Sfondo: Blu Ghiaccio (#EFF6FF)
      // Testo: Blu Scuro (#1E3A8A)
      return `${styles} bg-[#EFF6FF] border-[#4263EB] text-[#1E3A8A] font-bold shadow-md shadow-blue-500/10`;
    }
    
    if (option === selectedAnswer && option !== correctAnswer) {
      // Wrong: Orange System
      // Bordo: Arancione Vivo (#FF8A00)
      // Sfondo: Arancione Chiaro (#FFF7ED)
      // Testo: Arancione Scuro/Marrone (#9A3412)
      return `${styles} bg-[#FFF7ED] border-[#FF8A00] text-[#9A3412] font-bold shadow-md shadow-orange-500/10`;
    }
    
    // Dimmed others
    return `${styles} bg-slate-50 border-transparent text-slate-300 pointer-events-none opacity-50`;
  };

  const getLetter = (index: number) => {
    return String.fromCharCode(65 + index) + "."; 
  };

  return (
    <div className={`w-full max-w-2xl mx-auto perspective-1000 px-4 mb-24`}>
      {/* CARD CONTAINER */}
      <div className={`
        relative bg-white rounded-[40px] shadow-2xl shadow-brand-dark/20 
        overflow-hidden transition-all duration-300 ${animClass} 
        p-6 md:p-8 flex flex-col min-h-[500px]
      `}>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col">
             <span className="text-brand-orange font-bold text-sm tracking-wide mb-1">
                Quiz
             </span>
             <h2 className="text-2xl md:text-3xl font-bold text-brand-dark leading-snug">
               {question}
             </h2>
          </div>
          
          <div className="flex gap-2 shrink-0 ml-4">
             {!isExamMode && (
                <>
                  <button 
                      onClick={speakQuestion}
                      className="p-2 text-slate-300 hover:text-brand-light bg-slate-50 rounded-full transition-colors"
                  >
                      <Volume2 className="w-5 h-5" />
                  </button>
                  <button 
                      onClick={onToggleBookmark}
                      className={`p-2 rounded-full transition-colors ${isBookmarked ? 'text-brand-orange bg-orange-50' : 'text-slate-300 bg-slate-50'}`}
                  >
                      <Star className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                </>
             )}
          </div>
        </div>

        {/* Hint */}
        {!isAnswered && !isExamMode && (
            <div className="mb-6">
              <button 
                onClick={onHint}
                disabled={isHintUsed}
                className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isHintUsed ? 'text-slate-300' : 'text-brand-light hover:underline'}`}
              >
                <Lightbulb className="w-4 h-4" />
                {isHintUsed ? 'Aiuto Usato' : 'Mostra Indizio'}
              </button>
            </div>
        )}

        <div className="mb-4 text-slate-400 font-semibold text-sm">
           Scegli la risposta corretta
        </div>

        {/* Options Stack */}
        <div className="flex flex-col gap-3 mb-8 flex-1">
          {options.map((option, index) => {
            const isSelected = option === selectedAnswer;
            const isCorrect = option === correctAnswer;
            const showCorrectIcon = (!isExamMode && isAnswered && isCorrect);
            const showWrongIcon = (!isExamMode && isAnswered && isSelected && !isCorrect);

            return (
              <button
                key={`${index}-${option}`}
                onClick={() => (!isAnswered || isExamMode) && onSelectAnswer(option)}
                disabled={(!isExamMode && isAnswered) || hiddenOptions.includes(option)}
                className={getOptionStyles(option, index)}
              >
                <div className="flex items-center text-left">
                  <span className="mr-3 font-bold opacity-70 min-w-[20px]">{getLetter(index)}</span>
                  <span className="leading-snug">{option}</span>
                </div>

                {showCorrectIcon && (
                   <CheckCircle className="w-6 h-6 text-[#4263EB] ml-3 shrink-0" />
                )}
                {showWrongIcon && (
                   <XCircle className="w-6 h-6 text-[#FF8A00] ml-3 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Button Area */}
        <div className="mt-auto pt-2">
            {children}
        </div>

      </div>
    </div>
  );
};
