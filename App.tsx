
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { QuizCard } from './components/QuizCard';
import { Button } from './components/Button';
import { ProgressBar } from './components/ProgressBar';
import { ExamConfigModal } from './components/ExamConfigModal';
import { ConfirmModal } from './components/ConfirmModal';
import { BottomNav } from './components/BottomNav';
import { BackgroundCurves } from './components/BackgroundCurves';
import { extractTextFromPDF, parseQuestionsFromText } from './utils/pdfParser';
import { ArrowLeft, ArrowRight, RotateCcw, Shuffle, List, LayoutTemplate, Search, Trophy, AlertCircle, Star, Loader2, Repeat, Timer, GraduationCap, XCircle, CheckCircle, Hash, Upload, Trash2, Zap, X, Globe, BookOpen, FlaskConical, History } from 'lucide-react';
import { AppMode, Question } from './types';
import { questions as defaultQuestions } from './data/questions';

type FilterMode = 'ALL' | 'ERRORS' | 'BOOKMARKS';

function App() {
  // --- Persistent State Initialization ---
  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = localStorage.getItem('quiz_questions');
    if (saved) return JSON.parse(saved);
    return defaultQuestions.length > 0 ? defaultQuestions : [];
  });
  const [subjectContext, setSubjectContext] = useState<string>(() => {
    return localStorage.getItem('quiz_subject') || "Materia Generale";
  });

  const [mode, setMode] = useState<AppMode>(AppMode.QUIZ);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  
  // Jump Logic
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [jumpTarget, setJumpTarget] = useState('');

  // Quiz State
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('quiz_score') || '0'));
  const [attempts, setAttempts] = useState(() => parseInt(localStorage.getItem('quiz_attempts') || '0'));
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  
  // Hint State
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);

  // Review & Bookmarks State
  const [wrongAnswers, setWrongAnswers] = useState<number[]>(() => {
    const saved = localStorage.getItem('quiz_wrong');
    return saved ? JSON.parse(saved) : [];
  });
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    const saved = localStorage.getItem('quiz_bookmarks');
    return saved ? JSON.parse(saved) : [];
  });
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');

  // Exam State
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<number, string>>({}); 
  const [examTimeLeft, setExamTimeLeft] = useState(3600); 
  const [isExamConfigOpen, setIsExamConfigOpen] = useState(false);
  const examTimerRef = useRef<number | null>(null);

  // Confirmation State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem('quiz_questions', JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem('quiz_subject', subjectContext);
  }, [subjectContext]);

  useEffect(() => {
    localStorage.setItem('quiz_score', score.toString());
    localStorage.setItem('quiz_attempts', attempts.toString());
  }, [score, attempts]);

  useEffect(() => {
    localStorage.setItem('quiz_wrong', JSON.stringify(wrongAnswers));
  }, [wrongAnswers]);

  useEffect(() => {
    localStorage.setItem('quiz_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // --- Initialization ---
  useEffect(() => {
    if (questions.length > 0) {
      if (!isShuffled) {
        setShuffledQuestions([...questions]);
      }
    }
  }, [questions]);

  // --- File Upload Logic ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await extractTextFromPDF(file);
      const extractedQuestions = parseQuestionsFromText(text);
      
      if (extractedQuestions.length === 0) {
        alert("Non sono riuscito a trovare domande nel PDF. Assicurati che il formato sia leggibile.");
        return;
      }

      const subject = file.name.replace('.pdf', '') || "Nuova Materia";
      
      setQuestions(extractedQuestions);
      setShuffledQuestions([...extractedQuestions]);
      setSubjectContext(subject);
      setScore(0);
      setAttempts(0);
      setWrongAnswers([]);
      setBookmarks([]);
      setCurrentQuestionIndex(0);
      setMode(AppMode.QUIZ);
      
    } catch (error) {
      console.error("Upload error:", error);
      alert("Errore durante la lettura del PDF.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetApp = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsResetConfirmOpen(true);
  }, []);

  const performReset = useCallback(() => {
    setIsResetConfirmOpen(false);
    setQuestions([]);
    setShuffledQuestions([]);
    setSubjectContext("Materia Generale");
    setScore(0);
    setAttempts(0);
    setWrongAnswers([]);
    setBookmarks([]);
    setCurrentQuestionIndex(0);
    setMode(AppMode.QUIZ);
    setSearchTerm('');
    setIsSearchOpen(false);
    localStorage.clear();
  }, []);

  const filteredQuestions = useMemo(() => {
    let baseList = shuffledQuestions;
    if (filterMode === 'ERRORS') {
      baseList = baseList.filter(q => wrongAnswers.includes(q.id));
    } else if (filterMode === 'BOOKMARKS') {
      baseList = baseList.filter(q => bookmarks.includes(q.id));
    }
    return baseList;
  }, [shuffledQuestions, filterMode, wrongAnswers, bookmarks]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return questions.filter(q => 
        q.id.toString().includes(lowerTerm) || 
        q.question.toLowerCase().includes(lowerTerm)
    ).slice(0, 5);
  }, [searchTerm, questions]);

  const handleSearchSelect = (targetQuestion: Question) => {
      let index = activeQuestionList.findIndex(q => q.id === targetQuestion.id);

      if (index === -1) {
          if (filterMode !== 'ALL') {
             setFilterMode('ALL');
             const globalIndex = shuffledQuestions.findIndex(q => q.id === targetQuestion.id);
             setCurrentQuestionIndex(globalIndex !== -1 ? globalIndex : 0);
          } else if (mode === AppMode.EXAM) {
              alert("Non puoi cercare domande durante l'esame.");
              return;
          }
      } else {
          setCurrentQuestionIndex(index);
      }
      setSearchTerm('');
      setIsSearchOpen(false);
  };

  const handleJumpToQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = parseInt(jumpTarget);
    if (!isNaN(targetId)) {
        const index = activeQuestionList.findIndex(q => q.id === targetId);
        if (index !== -1) {
            setCurrentQuestionIndex(index);
            setIsJumpOpen(false);
            setJumpTarget('');
        } else {
            alert(`La domanda #${targetId} non è presente nella lista corrente (${filterMode}).`);
        }
    }
  };

  useEffect(() => {
    if (mode === AppMode.QUIZ && currentQuestionIndex >= filteredQuestions.length) {
      if (filteredQuestions.length > 0) {
        setCurrentQuestionIndex(Math.max(0, filteredQuestions.length - 1));
      } else {
        setCurrentQuestionIndex(0);
      }
    }
  }, [filteredQuestions.length, mode, currentQuestionIndex]);

  const submitExam = useCallback(() => {
    setMode(AppMode.EXAM_RESULT);
    if (examTimerRef.current) {
        clearInterval(examTimerRef.current);
        examTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (mode === AppMode.EXAM) {
      examTimerRef.current = window.setInterval(() => {
        setExamTimeLeft(prev => {
          if (prev <= 1) {
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (examTimerRef.current) clearInterval(examTimerRef.current);
    }
    return () => {
      if (examTimerRef.current) clearInterval(examTimerRef.current);
    };
  }, [mode, submitExam]);

  const activeQuestionList = mode === AppMode.EXAM ? examQuestions : filteredQuestions;
  const currentQuestion = activeQuestionList[currentQuestionIndex];

  // --- LOGICA GENERAZIONE OPZIONI MIGLIORATA ---
  const generateOptions = useCallback((currentQ: Question) => {
    if (!currentQ) return [];

    // Priorità 1: Se il PDF ha già opzioni parsate, usa quelle.
    if (currentQ.options && currentQ.options.length > 0) {
        return [...currentQ.options].sort(() => Math.random() - 0.5);
    }

    const correct = currentQ.answer.trim();

    // Priorità 2: Fallback Contestuale
    // Trova l'indice della domanda nella lista *Principale* (per mantenere il contesto dell'argomento)
    const masterIndex = questions.findIndex(q => q.id === currentQ.id);
    
    // Se non troviamo la domanda (caso raro), fallback randomico globale
    if (masterIndex === -1) {
        return [...questions]
            .filter(q => q.id !== currentQ.id)
            .map(q => q.answer.trim())
            .slice(0, 3)
            .concat([correct])
            .sort(() => Math.random() - 0.5);
    }

    // Definiamo una finestra di vicinanza (es. ±20 domande)
    // Questo assicura che i distrattori siano dello stesso argomento (es. Ossa con Ossa)
    const range = 20;
    const start = Math.max(0, masterIndex - range);
    const end = Math.min(questions.length, masterIndex + range + 1);

    const neighbors = questions.slice(start, end);

    // Estrai candidati e applica Filtri di Qualità
    const candidates = neighbors
        .map(q => q.answer.trim())
        .filter(ans => {
            const cleanAns = ans.trim();
            // 1. Deve essere diversa dalla risposta corretta
            if (cleanAns === correct) return false;
            // 2. Scarta risposte troppo brevi (< 2 caratteri)
            if (cleanAns.length <= 2) return false;
            // 3. Scarta numeri puri (a meno che non sia matematica, ma spesso sono errori di parsing)
            // Se la risposta corretta è testo, non vogliamo un numero come opzione
            if (/^\d+$/.test(cleanAns) || /^\d+[.,]\d+$/.test(cleanAns)) return false;
            // 4. Scarta metadati comuni nei PDF sporchi
            const upper = cleanAns.toUpperCase();
            if (upper.includes('PAGINA') || upper.includes('CAPITOLO') || upper.includes('LEZIONE') || upper.includes('DOMANDA')) return false;
            
            return true;
        });

    // Rimuovi duplicati
    const uniqueCandidates = [...new Set(candidates)];
    
    // Mischia i candidati validi
    const shuffledCandidates = uniqueCandidates.sort(() => Math.random() - 0.5);
    
    // Prendi i primi 3
    const selectedDistractors = shuffledCandidates.slice(0, 3);

    // Se non abbiamo abbastanza vicini validi (es. inizio/fine file o molte risposte uguali)
    // Integriamo con random dalla lista globale, ma sempre applicando i filtri
    if (selectedDistractors.length < 3) {
        const remainingNeeded = 3 - selectedDistractors.length;
        const globalDistractors = questions
            .filter(q => 
                q.id !== currentQ.id && 
                !uniqueCandidates.includes(q.answer.trim()) &&
                q.answer.trim().length > 2 &&
                q.answer.trim() !== correct
            )
            .map(q => q.answer.trim())
            .sort(() => Math.random() - 0.5)
            .slice(0, remainingNeeded);
        
        selectedDistractors.push(...globalDistractors);
    }

    // Combina con la risposta corretta e mischia finale
    return [...selectedDistractors, correct].sort(() => Math.random() - 0.5);

  }, [questions]);

  useEffect(() => {
    if (currentQuestion) {
      const opts = generateOptions(currentQuestion);
      setCurrentOptions(opts);
      setHiddenOptions([]); 
    }
  }, [currentQuestion, generateOptions]);

  useEffect(() => {
      if (currentQuestion) {
          if (mode === AppMode.EXAM) {
             setSelectedAnswer(examAnswers[currentQuestion.id] || null);
          } else {
             setSelectedAnswer(null);
          }
      }
  }, [currentQuestion, mode]); 

  const openExamConfig = () => {
    setIsExamConfigOpen(true);
  };

  const startExam = (count: number, minutes: number) => {
      const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, count);
      setExamQuestions(shuffled);
      setExamAnswers({});
      setCurrentQuestionIndex(0);
      setExamTimeLeft(minutes * 60);
      setMode(AppMode.EXAM);
      setIsExamConfigOpen(false);
  };

  const handlePrev = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (filterMode === 'ERRORS' && filteredQuestions.length > 1 && mode !== AppMode.EXAM) {
       setCurrentQuestionIndex(filteredQuestions.length - 1);
    }
  }, [currentQuestionIndex, filterMode, filteredQuestions.length, mode]);

  const handleRetry = useCallback(() => {
    setSelectedAnswer(null);
    setHiddenOptions([]);
  }, []);

  const handleSmartNext = useCallback(() => {
    if (mode === AppMode.EXAM) {
        if (currentQuestionIndex < examQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            submitExam();
        }
        return;
    }

    if (filterMode === 'ERRORS') {
        const wasCorrect = selectedAnswer === currentQuestion?.answer.trim();
        
        if (wasCorrect && currentQuestion) {
            const questionIdToRemove = currentQuestion.id;
            setWrongAnswers(prev => prev.filter(id => id !== questionIdToRemove));
            if (filteredQuestions.length <= 1) {
                 setCurrentQuestionIndex(0);
            } else if (currentQuestionIndex >= filteredQuestions.length - 1) {
                setCurrentQuestionIndex(0); 
            }
        } else {
            setCurrentQuestionIndex(prev => (prev + 1) % filteredQuestions.length);
        }
    } else {
        if (currentQuestionIndex < filteredQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setCurrentQuestionIndex(0); 
        }
    }
    
    setSelectedAnswer(null);
  }, [filterMode, selectedAnswer, currentQuestion, currentQuestionIndex, filteredQuestions.length, mode, examQuestions.length, submitExam]);

  const handleAnswerSelect = (answer: string) => {
    if (mode === AppMode.EXAM) {
        if (currentQuestion) {
            setExamAnswers(prev => ({
                ...prev,
                [currentQuestion.id]: answer
            }));
            setSelectedAnswer(answer);
        }
        return;
    }

    setSelectedAnswer(answer);
    setAttempts(prev => prev + 1);
    
    if (answer === currentQuestion.answer.trim()) {
      setScore(prev => prev + 1);
    } else {
      if (!wrongAnswers.includes(currentQuestion.id)) {
        setWrongAnswers(prev => [...prev, currentQuestion.id]);
      }
    }
  };

  const handleHint = () => {
    if (hiddenOptions.length > 0) return;
    const correctTrimmed = currentQuestion.answer.trim();
    const wrongOptions = currentOptions.filter(opt => opt !== correctTrimmed);
    const optionsToHide = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
    setHiddenOptions(optionsToHide);
  };

  const toggleBookmark = () => {
    if (!currentQuestion) return;
    const id = currentQuestion.id;
    setBookmarks(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const toggleShuffle = () => {
    if (isShuffled) {
      setShuffledQuestions([...questions]);
    } else {
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      setShuffledQuestions(shuffled);
    }
    setIsShuffled(!isShuffled);
    setCurrentQuestionIndex(0);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Mobile Filter Chip Component
  const MobileChip = ({ 
      label, 
      icon: Icon, 
      isActive, 
      onClick, 
      count,
      activeColorClass = 'bg-brand-orange'
  }: { 
      label: string; 
      icon?: React.ElementType; 
      isActive: boolean; 
      onClick: () => void; 
      count?: number;
      activeColorClass?: string;
  }) => (
      <button 
          onClick={onClick}
          className={`
              flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border
              ${isActive 
                  ? `${activeColorClass} text-white border-transparent shadow-md` 
                  : 'bg-white/10 text-slate-200 border-white/10 hover:bg-white/20'
              }
          `}
      >
          {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-300'}`} />}
          {label}
          {count !== undefined && count > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20' : 'bg-slate-700 text-slate-300'}`}>
                  {count}
              </span>
          )}
      </button>
  );

  // Logo Component
  const Logo = ({ size = "text-2xl" }: { size?: string }) => (
    <h1 className={`${size} font-extrabold tracking-tight text-white leading-none`}>
      Quiz<span className="text-brand-orange">lo</span>
    </h1>
  );

  // --- RENDERING ---

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center font-sans overflow-hidden relative p-6">
        <BackgroundCurves />
        
        <div className="w-full max-w-md flex flex-col items-center gap-12 z-10 animate-in fade-in zoom-in duration-500">
          {/* Logo Header */}
          <div className="text-center flex flex-col items-center">
             <h1 className="text-7xl font-extrabold tracking-tight text-white leading-none mb-4 drop-shadow-xl">
              Quiz<span className="text-brand-orange">lo</span>
            </h1>
            <p className="text-blue-100/60 font-medium text-xl tracking-wide">Il tuo studio, semplificato.</p>
          </div>

          {/* Functional Hero Upload Button */}
           <div className="w-full max-w-sm h-80 relative group cursor-pointer mx-auto">
               <div className="absolute inset-0 bg-[#4263EB] rounded-[2.5rem] transform transition-all duration-300 group-hover:scale-[1.02] shadow-2xl shadow-blue-500/30 group-active:scale-95"></div>
               <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 z-50 cursor-pointer"
                  />
                  
                  <div className="w-24 h-24 bg-white/20 rounded-[2rem] flex items-center justify-center mb-8 backdrop-blur-md shadow-inner border border-white/20 group-hover:rotate-6 transition-transform duration-300">
                     {isUploading ? (
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                     ) : (
                        <Upload className="w-10 h-10 text-white stroke-[2.5px]" />
                     )}
                  </div>
                  
                  <h3 className="text-white font-bold text-3xl mb-3">Carica PDF</h3>
                  <p className="text-blue-100/70 font-medium text-sm max-w-[200px] leading-relaxed">
                    Tocca per caricare il tuo materiale e iniziare
                  </p>
               </div>
            </div>
        </div>
      </div>
    );
  }

  const renderExamResults = () => {
      let correctCount = 0;
      examQuestions.forEach(q => {
          if (examAnswers[q.id] === q.answer.trim()) correctCount++;
      });
      const threshold = Math.ceil(examQuestions.length * 0.6);
      const passed = correctCount >= threshold;

      return (
        <div className="max-w-4xl mx-auto w-full animate-in slide-in-from-bottom-8 duration-700 pb-20">
            {/* Card Risultato */}
            <div className="bg-white rounded-[30px] shadow-2xl shadow-black/20 overflow-hidden mb-10 p-8 md:p-12 text-center relative">
                <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl ${passed ? 'bg-[#4263EB]' : 'bg-orange-100'}`}>
                    {passed ? <Trophy className="w-12 h-12 text-[#FF8A00] drop-shadow-sm" /> : <XCircle className="w-12 h-12 text-[#C2410C]" />}
                </div>
                
                <h2 className={`text-4xl font-bold mb-3 tracking-tight ${passed ? 'text-[#1E3A8A]' : 'text-[#C2410C]'}`}>
                    {passed ? 'ESAME SUPERATO!' : 'ESAME NON SUPERATO'}
                </h2>
                
                <p className="text-slate-500 mb-10 text-lg font-medium">
                    Hai risposto correttamente a <span className={`font-bold text-2xl ${passed ? 'text-[#4263EB]' : 'text-[#C2410C]'}`}>{correctCount}</span> su <span className="font-bold text-slate-800">{examQuestions.length}</span> domande.
                </p>
                
                <button 
                    onClick={() => setMode(AppMode.QUIZ)} 
                    className="inline-flex items-center justify-center bg-[#FF8A00] hover:bg-orange-600 text-white rounded-full px-12 py-4 font-bold text-lg shadow-lg shadow-orange-500/30 transition-all active:scale-95"
                >
                    Torna alla Home
                </button>
            </div>

            <h3 className="text-2xl font-bold text-white mb-6 px-4 drop-shadow-md">Riepilogo Dettagliato</h3>
            
            {/* Tabella Riepilogo */}
            <div className="bg-white rounded-[30px] shadow-xl overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed min-w-[600px]">
                        <thead>
                            <tr className="bg-[#4263EB] text-white">
                                <th className="p-4 font-semibold text-xs uppercase tracking-wide w-[45%]">Domanda</th>
                                <th className="p-4 font-semibold text-xs uppercase tracking-wide w-[27.5%]">La tua risposta</th>
                                <th className="p-4 font-semibold text-xs uppercase tracking-wide w-[27.5%]">Corretta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {examQuestions.map((q, idx) => {
                                const userAnswer = examAnswers[q.id];
                                const correctAnswerTrimmed = q.answer.trim();
                                const isCorrect = userAnswer === correctAnswerTrimmed;
                                const isRowEven = idx % 2 === 0;

                                return (
                                    <tr key={q.id} className={`border-b border-slate-100 ${isRowEven ? 'bg-white' : 'bg-[#EFF6FF]'}`}>
                                        <td className="p-4 align-top">
                                            <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">
                                                Domanda {idx + 1}
                                            </span>
                                            <span className="text-[#1E3A8A] font-medium text-sm leading-relaxed block line-clamp-3" title={q.question}>
                                                {q.question}
                                            </span>
                                        </td>
                                        <td className="p-4 align-top">
                                            {userAnswer ? (
                                                <span className={`font-bold text-sm block line-clamp-3 ${isCorrect ? 'text-[#4263EB]' : 'text-[#FF8A00]'}`} title={userAnswer}>
                                                    {userAnswer}
                                                </span>
                                            ) : (
                                                <span className="italic text-slate-400 font-normal text-sm block">Nessuna</span>
                                            )}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex items-start gap-2">
                                                <span className="text-slate-600 font-medium text-sm block line-clamp-3 leading-snug" title={q.answer}>
                                                    {q.answer}
                                                </span>
                                                {isCorrect && (
                                                    <CheckCircle className="w-4 h-4 text-[#4263EB] shrink-0 mt-0.5" />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      );
  };

  const renderQuizMode = () => {
    if (mode === AppMode.EXAM_RESULT) {
        return renderExamResults();
    }

    if (activeQuestionList.length === 0 && mode !== AppMode.EXAM) {
      return (
        <div className="text-center py-24 bg-white/10 backdrop-blur-xl rounded-3xl shadow-xl border border-white/10 max-w-2xl mx-auto animate-in zoom-in duration-300">
          <div className="bg-white/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-white/10">
            <Search className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Nessuna domanda trovata</h3>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            {filterMode === 'ERRORS' 
              ? "Non hai ancora commesso errori! Ottimo lavoro." 
              : filterMode === 'BOOKMARKS'
              ? "Non hai ancora aggiunto domande ai preferiti."
              : "La lista corrente è vuota."}
          </p>
          <div className="flex justify-center gap-3">
             <Button onClick={() => setFilterMode('ALL')} variant="primary" size="lg">
               Torna a tutte le domande
             </Button>
          </div>
        </div>
      );
    }

    if (!currentQuestion) {
      return (
        <div className="flex justify-center items-center h-[60vh] w-full">
           <Loader2 className="w-12 h-12 text-brand-orange animate-spin opacity-50" />
        </div>
      );
   }

   const isLastQuestion = currentQuestionIndex === activeQuestionList.length - 1;

    return (
      <div className="flex flex-col items-center w-full max-w-4xl mx-auto z-10 relative">
        {/* Info Bar - Desktop Only */}
        <div className="w-full hidden md:flex justify-between items-center mb-8 px-2">
          {mode === AppMode.EXAM ? (
             <div className={`flex items-center gap-3 font-bold px-5 py-2.5 rounded-2xl shadow-sm border border-white/50 backdrop-blur ${examTimeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-white/20 text-white border-white/10'}`}>
                <Timer className="w-5 h-5" />
                <span className="font-mono text-xl">{formatTime(examTimeLeft)}</span>
             </div>
          ) : (
             <div className="flex items-center gap-3 text-brand-orange font-bold bg-white/10 backdrop-blur px-5 py-2.5 rounded-2xl border border-white/10 shadow-sm">
                <Trophy className="w-5 h-5 text-brand-orange" />
                <span className="text-lg">{score}</span>
                <span className="text-slate-300 text-sm font-normal">/ {attempts}</span>
             </div>
          )}
          
          <div className="flex items-center gap-3">
             {filterMode !== 'ALL' && mode !== AppMode.EXAM && (
                <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-2 shadow-sm ${filterMode === 'ERRORS' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-brand-orange/10 text-brand-orange border-brand-orange/20'}`}>
                   {filterMode === 'ERRORS' ? <AlertCircle className="w-3.5 h-3.5"/> : <Star className="w-3.5 h-3.5 fill-current"/>}
                   {filterMode === 'ERRORS' ? 'Ripasso Errori' : 'Preferiti'}
                </span>
             )}
             {mode === AppMode.EXAM && (
                 <span className="text-xs font-bold px-3 py-1.5 rounded-xl border bg-blue-900/40 text-blue-300 border-blue-500/30 flex items-center gap-2 shadow-sm">
                    <GraduationCap className="w-4 h-4" /> ESAME
                 </span>
             )}
             <div className="text-sm text-slate-300 font-semibold bg-white/10 backdrop-blur px-4 py-1.5 rounded-xl border border-white/10 shadow-sm">
               {currentQuestionIndex + 1} <span className="text-slate-500 font-light mx-1">/</span> {activeQuestionList.length}
             </div>
          </div>
        </div>

        {/* Mobile Question Counter & Progress */}
        <div className="w-full md:hidden mb-4 px-1">
            <div className="flex justify-between items-center text-xs text-slate-200 font-semibold mb-2">
                 <span>Domanda {currentQuestionIndex + 1} di {activeQuestionList.length}</span>
                 {filterMode !== 'ALL' && mode !== AppMode.EXAM && (
                     <span className={`px-2 py-0.5 rounded-md ${filterMode === 'ERRORS' ? 'bg-red-500/20 text-red-400' : 'bg-brand-orange/20 text-brand-orange'}`}>
                        {filterMode === 'ERRORS' ? 'Ripasso' : 'Preferiti'}
                     </span>
                 )}
            </div>
            <ProgressBar current={currentQuestionIndex + 1} total={activeQuestionList.length} />
        </div>

        <div className="w-full mb-8 hidden md:block">
          <ProgressBar current={currentQuestionIndex + 1} total={activeQuestionList.length} />
        </div>

        <div className="w-full relative animate-in slide-in-from-right-8 fade-in duration-300 fill-mode-both" key={currentQuestionIndex}>
          <QuizCard 
            question={currentQuestion.question}
            options={currentOptions}
            correctAnswer={currentQuestion.answer.trim()}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={handleAnswerSelect}
            questionNumber={mode === AppMode.EXAM ? currentQuestionIndex + 1 : currentQuestion.id}
            onHint={handleHint}
            hiddenOptions={hiddenOptions}
            isBookmarked={bookmarks.includes(currentQuestion.id)}
            onToggleBookmark={toggleBookmark}
            isExamMode={mode === AppMode.EXAM}
          >
             {/* Navigation Buttons inside the Card */}
             <div className="flex items-center gap-3 w-full mt-4">
                
                {/* Back Button */}
                <button 
                    onClick={handlePrev} 
                    disabled={currentQuestionIndex === 0 && filterMode !== 'ERRORS'}
                    className="w-14 h-14 rounded-full flex items-center justify-center bg-slate-100 border-2 border-slate-100 text-slate-400 hover:text-brand-dark hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    title="Precedente"
                >
                    <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
                </button>

                {/* Retry Button (Only in Quiz Mode & if Answered) */}
                {mode !== AppMode.EXAM && selectedAnswer && (
                     <button
                        onClick={handleRetry}
                        className="w-14 h-14 rounded-full flex items-center justify-center bg-slate-100 border-2 border-slate-100 text-slate-400 hover:text-brand-dark hover:border-slate-300 transition-all active:scale-95"
                        title="Riprova questa domanda"
                     >
                        <RotateCcw className="w-6 h-6" strokeWidth={2.5} />
                     </button>
                )}

                {/* Next / Skip / Finish Button */}
                {selectedAnswer || mode === AppMode.EXAM ? (
                    <Button 
                        onClick={handleSmartNext}
                        className="h-14 flex-1 rounded-full bg-brand-orange text-white font-bold text-lg shadow-lg shadow-orange-500/40 hover:bg-orange-600 hover:scale-[1.02] active:scale-95 transition-all border-0"
                    >
                        {mode === AppMode.EXAM && isLastQuestion ? (
                            <span className="flex items-center gap-2">Termina <CheckCircle className="w-6 h-6" /></span>
                        ) : (filterMode === 'ERRORS' || !isLastQuestion ? (
                            <span className="flex items-center gap-2">Prossima <ArrowRight className="w-6 h-6" /></span>
                        ) : (
                            <span className="flex items-center gap-2">Ricomincia <RotateCcw className="w-6 h-6" /></span>
                        ))}
                    </Button>
                ) : (
                    <Button 
                        onClick={handleSmartNext} 
                        className="h-14 flex-1 rounded-full bg-slate-100 text-slate-400 font-bold text-lg hover:bg-slate-200 hover:text-slate-600 border-2 border-slate-100 transition-all"
                        variant="ghost"
                    >
                        {filterMode === 'ERRORS' && isLastQuestion ? (
                            <span className="flex items-center gap-2">Loop <Repeat className="w-6 h-6" /></span>
                        ) : (
                            <span className="flex items-center gap-2">Salta <ArrowRight className="w-6 h-6" /></span>
                        )}
                    </Button>
                )}
             </div>
          </QuizCard>
        </div>

      </div>
    );
  };

  const renderListMode = () => (
    <div className="w-full max-w-4xl mx-auto bg-white/10 backdrop-blur-xl rounded-3xl shadow-xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 z-10 relative">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-white">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="p-5 font-bold text-slate-400 text-xs uppercase tracking-wider w-20">ID</th>
              <th className="p-5 font-bold text-slate-400 text-xs uppercase tracking-wider w-1/2">Domanda</th>
              <th className="p-5 font-bold text-slate-400 text-xs uppercase tracking-wider w-1/2">Risposta</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuestions.map((q) => (
              <tr key={q.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-5 text-slate-500 font-mono text-sm">#{q.id}</td>
                <td className="p-5 text-slate-200 font-medium">
                   {q.question}
                   {bookmarks.includes(q.id) && <Star className="inline w-3.5 h-3.5 ml-2 text-brand-orange fill-current"/>}
                   {wrongAnswers.includes(q.id) && <AlertCircle className="inline w-3.5 h-3.5 ml-2 text-red-500"/>}
                </td>
                <td className="p-5 text-brand-orange">{q.answer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans pb-32 overflow-x-hidden relative bg-brand-dark">
      <BackgroundCurves />
      
      {/* MOBILE HEADER */}
      {questions.length > 0 && (
          <div className="md:hidden sticky top-0 z-50 bg-brand-dark/80 backdrop-blur-xl border-b border-white/10 shadow-sm transition-all flex flex-col">
              <div className="px-4 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     <Logo size="text-2xl" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                       {mode !== AppMode.EXAM && (
                           <button 
                             onClick={handleResetApp}
                             className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                           >
                               <Trash2 className="w-5 h-5" />
                           </button>
                       )}

                       {mode !== AppMode.EXAM ? (
                          <div className="flex items-center gap-1.5 text-brand-orange font-bold bg-white/10 pl-2 pr-3 py-1.5 rounded-full border border-white/10 text-xs ml-1">
                              <Trophy className="w-3.5 h-3.5" />
                              <span>{score}</span>
                          </div>
                      ) : (
                          <div className="flex items-center gap-1.5 text-red-400 font-bold bg-red-950/30 pl-2 pr-3 py-1.5 rounded-full border border-red-500/20 text-xs animate-pulse ml-1">
                              <Timer className="w-3.5 h-3.5" />
                              <span className="font-mono">{formatTime(examTimeLeft)}</span>
                          </div>
                      )}
                  </div>
              </div>

              {isSearchOpen && (
                 <div className="px-4 pb-3 animate-in slide-in-from-top-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Cerca domanda o ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800 border-white/10 border text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                            autoFocus
                        />
                         <button 
                            onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                         >
                            <X className="w-4 h-4" />
                         </button>
                    </div>
                    {searchTerm && (
                        <div className="mt-2 bg-slate-800 rounded-xl shadow-lg border border-white/10 max-h-48 overflow-y-auto z-50">
                             {searchResults.length > 0 ? (
                                searchResults.map(q => (
                                    <div 
                                        key={q.id}
                                        onClick={() => handleSearchSelect(q)}
                                        className="p-3 border-b border-white/5 last:border-0 active:bg-slate-700"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">#{q.id}</span>
                                        </div>
                                        <div className="text-xs text-slate-200 line-clamp-1">{q.question}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-slate-400 text-center p-3">Nessun risultato</div>
                            )}
                        </div>
                    )}
                 </div>
              )}

              {isJumpOpen && (
                 <div className="px-4 pb-3 animate-in slide-in-from-top-2">
                    <form onSubmit={handleJumpToQuestion} className="flex gap-2 relative">
                        <input 
                            type="number" 
                            placeholder="Vai al numero..." 
                            className="w-full bg-slate-800 border-white/10 border text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                            value={jumpTarget}
                            onChange={(e) => setJumpTarget(e.target.value)}
                            autoFocus
                        />
                         <button 
                            type="button"
                            onClick={() => { setIsJumpOpen(false); setJumpTarget(''); }}
                            className="absolute right-14 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                         >
                            <X className="w-4 h-4" />
                         </button>
                        <Button type="submit" size="sm" className="px-4 rounded-xl">Vai</Button>
                    </form>
                 </div>
              )}

              {mode !== AppMode.EXAM && !isSearchOpen && !isJumpOpen && (
                  <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto no-scrollbar mask-gradient">
                       <button
                          onClick={() => setIsSearchOpen(!isSearchOpen)}
                          className="p-2 bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white shadow-sm flex-shrink-0"
                        >
                          <Search className="w-5 h-5" />
                        </button>

                       <MobileChip 
                         label="Tutte" 
                         isActive={filterMode === 'ALL'} 
                         onClick={() => setFilterMode('ALL')} 
                       />
                       <MobileChip 
                         label="Ripasso" 
                         icon={AlertCircle} 
                         isActive={filterMode === 'ERRORS'} 
                         onClick={() => setFilterMode('ERRORS')} 
                         count={wrongAnswers.length}
                         activeColorClass="bg-red-500"
                       />
                       <MobileChip 
                         label="Preferiti" 
                         icon={Star} 
                         isActive={filterMode === 'BOOKMARKS'} 
                         onClick={() => setFilterMode('BOOKMARKS')} 
                         count={bookmarks.length}
                         activeColorClass="bg-brand-orange"
                       />
                  </div>
              )}
          </div>
      )}

      {/* DESKTOP NAVBAR */}
      <nav className="hidden md:block sticky top-0 z-50 bg-brand-dark/80 backdrop-blur-xl border-b border-white/5 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center h-auto md:h-20 py-3 md:py-0 gap-3 md:gap-0">
            {/* Logo */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setMode(AppMode.QUIZ)}>
                <Logo size="text-2xl" />
              </div>
            </div>

            {/* Desktop Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
              
              {mode !== AppMode.EXAM && mode !== AppMode.EXAM_RESULT && (
                   <Button 
                    onClick={openExamConfig} 
                    className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-lg shadow-blue-900/40 hover:shadow-blue-900/60 border-none"
                    size="sm"
                   >
                     <GraduationCap className="w-4 h-4 mr-2" /> Esame
                   </Button>
              )}

              {mode !== AppMode.EXAM && mode !== AppMode.EXAM_RESULT && (
                  <div className="flex bg-white/10 backdrop-blur p-1.5 rounded-xl border border-white/10">
                    <button
                    onClick={() => setFilterMode('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                        filterMode === 'ALL' ? 'bg-white/20 text-white shadow-sm scale-105' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    >
                    Tutte
                    </button>
                    <button
                    onClick={() => setFilterMode('ERRORS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                        filterMode === 'ERRORS' ? 'bg-white/20 text-red-400 shadow-sm scale-105' : 'text-slate-400 hover:text-red-400'
                    }`}
                    >
                    <AlertCircle className="w-4 h-4" />
                    {wrongAnswers.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">{wrongAnswers.length}</span>}
                    </button>
                    <button
                    onClick={() => setFilterMode('BOOKMARKS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                        filterMode === 'BOOKMARKS' ? 'bg-white/20 text-brand-orange shadow-sm scale-105' : 'text-slate-400 hover:text-brand-orange'
                    }`}
                    >
                    <Star className="w-4 h-4 fill-current" />
                    {bookmarks.length > 0 && <span className="bg-brand-orange text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">{bookmarks.length}</span>}
                    </button>
                </div>
              )}

              {mode !== AppMode.EXAM && mode !== AppMode.EXAM_RESULT && (
                <div className="flex gap-2">
                     <div className="relative">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => setIsJumpOpen(!isJumpOpen)}
                            className="bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white border-white/10"
                            title="Vai al numero domanda"
                        >
                            <Hash className="w-4 h-4" />
                        </Button>
                        
                        {isJumpOpen && (
                            <div className="absolute top-full right-0 mt-3 bg-slate-800 p-4 rounded-2xl shadow-xl border border-white/10 w-52 z-50 animate-in slide-in-from-top-2">
                                <form onSubmit={handleJumpToQuestion} className="flex gap-2">
                                    <input 
                                        type="number" 
                                        placeholder="N° ID" 
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-orange outline-none"
                                        value={jumpTarget}
                                        onChange={(e) => setJumpTarget(e.target.value)}
                                        autoFocus
                                    />
                                    <Button type="submit" size="sm" className="px-3">Vai</Button>
                                </form>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => setIsSearchOpen(!isSearchOpen)}
                            className={`bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white border-white/10 ${isSearchOpen ? 'ring-2 ring-brand-orange/20' : ''}`}
                            title="Cerca"
                        >
                            <Search className="w-4 h-4" />
                        </Button>
                        
                        {isSearchOpen && (
                            <div className="absolute top-full right-0 mt-3 bg-slate-800 p-4 rounded-2xl shadow-xl border border-white/10 w-80 z-50 animate-in slide-in-from-top-2">
                                <input
                                    type="text"
                                    placeholder="Cerca testo..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-brand-orange outline-none mb-2"
                                    autoFocus
                                />
                                {searchTerm && (
                                    <div className="max-h-64 overflow-y-auto pr-1">
                                        {searchResults.length > 0 ? (
                                            searchResults.map(q => (
                                                <div 
                                                    key={q.id}
                                                    onClick={() => handleSearchSelect(q)}
                                                    className="p-3 hover:bg-slate-700 cursor-pointer rounded-xl border border-transparent transition-colors mb-1"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-bold bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">#{q.id}</span>
                                                    </div>
                                                    <div className="text-sm text-slate-300 line-clamp-2 leading-snug">{q.question}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-slate-400 text-center p-4">Nessun risultato</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
              )}

              {mode === AppMode.QUIZ && (
                  <Button 
                    variant={isShuffled ? "primary" : "ghost"}
                    size="sm"
                    onClick={toggleShuffle}
                    className={`hidden md:flex rounded-lg ${isShuffled ? '' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Shuffle className={`w-4 h-4 ${isShuffled ? 'text-white' : ''}`} />
                  </Button>
              )}

              {mode !== AppMode.EXAM && mode !== AppMode.EXAM_RESULT && (
                   <Button 
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetApp}
                    className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                    title="Reset e Carica nuovo PDF"
                  >
                    <Trash2 className="w-4 h-4 pointer-events-none" />
                  </Button>
              )}
              
              {mode !== AppMode.EXAM && mode !== AppMode.EXAM_RESULT && (
                <div className="h-8 w-px bg-white/10 hidden md:block mx-1"></div>
              )}

              {mode !== AppMode.EXAM && mode !== AppMode.EXAM_RESULT && (
                <div className="flex bg-white/10 backdrop-blur p-1 rounded-xl border border-white/10">
                    <button
                    onClick={() => setMode(AppMode.QUIZ)}
                    className={`p-2 rounded-lg transition-all ${
                        mode === AppMode.QUIZ ? 'bg-white/20 text-brand-orange shadow-sm scale-105' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    >
                    <LayoutTemplate className="w-4 h-4" />
                    </button>
                    <button
                    onClick={() => setMode(AppMode.LIST)}
                    className={`p-2 rounded-lg transition-all ${
                        mode === AppMode.LIST ? 'bg-white/20 text-brand-orange shadow-sm scale-105' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    >
                    <List className="w-4 h-4" />
                    </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {mode === AppMode.LIST ? renderListMode() : renderQuizMode()}
      </main>

      {isExamConfigOpen && (
        <ExamConfigModal 
          totalQuestions={questions.length}
          onClose={() => setIsExamConfigOpen(false)}
          onStart={startExam}
        />
      )}

      <ConfirmModal 
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={performReset}
        title="Reset Applicazione"
        message="Sei sicuro di voler cancellare tutte le domande e i progressi? Questa azione è irreversibile e dovrai caricare un nuovo PDF."
      />

      {questions.length > 0 && (
         <BottomNav 
           currentMode={mode} 
           setMode={setMode} 
           onOpenExam={openExamConfig} 
         />
      )}
    </div>
  );
}

export default App;
