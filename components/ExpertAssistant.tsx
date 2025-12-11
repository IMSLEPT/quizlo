
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, Send, X, MessageSquare, Loader2, Volume2, Flag, PhoneOff, Play } from 'lucide-react';
import { Button } from './Button';
import { ChatMessage } from '../types';
import { createBlob, decodeAudioData, base64ToUint8Array } from '../utils/audio';

interface ExpertAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  options: string[];
  correctAnswer: string;
  subjectContext?: string; // New prop for dynamic context
}

export const ExpertAssistant: React.FC<ExpertAssistantProps> = ({
  isOpen,
  onClose,
  question,
  options,
  correctAnswer,
  subjectContext = "Materia Generale"
}) => {
  const [mode, setMode] = useState<'CHAT' | 'VOICE'>('CHAT');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);

  // Chat refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Live API refs
  const activeSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Initialize AI
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const systemInstruction = `
    Sei un esperto tutor di ${subjectContext}, amichevole e paziente.
    L'utente sta rispondendo a una domanda a risposta multipla su questo argomento.
    
    CONTESTO ATTUALE (L'utente vede questo sullo schermo):
    ---------------------------------------------------
    DOMANDA: "${question}"
    OPZIONI: ${options.join(', ')}
    RISPOSTA CORRETTA (NON RIVELARE): "${correctAnswer}"
    ---------------------------------------------------
    
    OBIETTIVO:
    Aiuta l'utente a ragionare per arrivare alla risposta corretta da solo.
    
    REGOLE FONDAMENTALI:
    1. NON dare mai la risposta corretta direttamente, a meno che l'utente non dica esplicitamente "Mi arrendo" o "I give up".
    2. Dai per scontato che l'utente stia parlando di QUESTA domanda specifica. Non chiedere "di quale domanda parli?".
    3. Fai domande guida o dai piccoli indizi basati sul dominio di ${subjectContext}.
    4. Se l'utente sbaglia, spiega gentilmente perché quel ragionamento non funziona.
    5. Sii conciso ma chiaro.
  `;

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, mode]);

  // Clean up Live session on close or mode switch
  useEffect(() => {
    if (!isOpen || mode === 'CHAT') {
      stopLiveSession();
    }
  }, [isOpen, mode]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction },
        history: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }))
      });

      const result = await chat.sendMessage({ message: userMsg.text });
      const responseText = result.text;

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Mi dispiace, si è verificato un errore. Riprova." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGiveUp = () => {
    if (mode === 'CHAT') {
      doGiveUpChat();
    } else {
      // In Voice mode, we switch to chat to show the answer clearly
      stopLiveSession();
      setMode('CHAT');
      // Small delay to allow mode switch
      setTimeout(() => doGiveUpChat(), 100);
    }
  };

  const doGiveUpChat = async () => {
    const userMsg: ChatMessage = { role: 'user', text: "Mi arrendo, qual è la risposta?" };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    try {
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction },
        history: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }))
      });
      const result = await chat.sendMessage({ message: "Mi arrendo, qual è la risposta?" });
      setMessages(prev => [...prev, { role: 'model', text: result.text }]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- LIVE API LOGIC ---

  const startLiveSession = async () => {
    try {
      if (isLiveConnected || isConnecting) return; // Prevent double connection
      
      setIsConnecting(true);
      
      // Audio Contexts
      // We create them here to ensure they are created after a user gesture (clicking "Avvia")
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Ensure contexts are running (vital for browsers like Chrome/Safari)
      if (inputAudioContextRef.current.state === 'suspended') {
        await inputAudioContextRef.current.resume();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Stream setup
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
        callbacks: {
          onopen: () => {
            console.log("Live session opened");
            setIsLiveConnected(true);
            setIsConnecting(false);

            if (!inputAudioContextRef.current || !streamRef.current) return;

            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              if (!isMicOn) return; // Mute logic
              
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
             const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && audioContextRef.current) {
                const ctx = audioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                try {
                  const audioBuffer = await decodeAudioData(base64ToUint8Array(base64Audio), ctx, 24000, 1);
                  const source = ctx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(ctx.destination);
                  source.onended = () => sourcesRef.current.delete(source);
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  sourcesRef.current.add(source);
                } catch (e) {
                  console.error("Audio decode error", e);
                }
             }
          },
          onclose: () => {
            console.log("Live session closed");
            setIsLiveConnected(false);
            setIsConnecting(false);
          },
          onerror: (err) => {
            console.error("Live session error", err);
            setIsLiveConnected(false);
            setIsConnecting(false);
          }
        }
      });

      // Store the session promise result so we can close it later
      sessionPromise.then(session => {
        activeSessionRef.current = session;
      });

    } catch (e) {
      console.error("Failed to start live session", e);
      setIsLiveConnected(false);
      setIsConnecting(false);
    }
  };

  const stopLiveSession = () => {
    // Explicitly close the session using the reference
    if (activeSessionRef.current) {
        try {
            activeSessionRef.current.close();
        } catch (e) {
            console.error("Error closing session:", e);
        }
        activeSessionRef.current = null;
    }

    // Clean up audio nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop sources
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    setIsLiveConnected(false);
    setIsConnecting(false);
  };

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={onClose}></div>
      
      <div className="bg-white w-full max-w-lg h-[80vh] sm:h-[600px] sm:rounded-2xl shadow-2xl flex flex-col pointer-events-auto transform transition-transform animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-indigo-600 text-white rounded-t-none sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">L'Esperto Risponde</h3>
            <span className="bg-indigo-500 text-xs px-2 py-0.5 rounded-full border border-indigo-400">AI Tutor</span>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-500 p-1 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setMode('CHAT')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              mode === 'CHAT' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => {
              setMode('VOICE');
            }}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              mode === 'VOICE' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Mic className="w-4 h-4" />
            Voce (Live)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative bg-slate-50">
          {mode === 'CHAT' ? (
            <div className="h-full flex flex-col">
              {/* Messages */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-slate-500 mt-10 p-4">
                    <p>Ciao! Sono il tuo tutor di <strong>{subjectContext}</strong>.</p>
                    <p className="text-sm">Chiedimi un aiuto sulla domanda o un suggerimento.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-2 shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Scrivi un messaggio..."
                    className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <Button onClick={handleSendMessage} size="sm" className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-2 text-center">
                   <button 
                    onClick={handleGiveUp}
                    className="text-xs text-red-500 hover:text-red-700 underline font-medium flex items-center justify-center gap-1 mx-auto"
                   >
                     <Flag className="w-3 h-3" />
                     Mi arrendo, dimmi la risposta
                   </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-8">
              
              {isLiveConnected ? (
                <>
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full flex items-center justify-center bg-indigo-100 animate-pulse transition-all duration-300">
                       <Volume2 className="w-12 h-12 text-indigo-600" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-20"></div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">In ascolto...</h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                      Parla naturalmente. L'AI conosce la domanda attuale su {subjectContext} e ti risponderà a voce.
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <Button 
                      onClick={toggleMic}
                      variant="secondary"
                      className={`rounded-full w-14 h-14 flex items-center justify-center border-2 ${isMicOn ? 'border-slate-200' : 'border-red-200 bg-red-50 text-red-500'}`}
                      title={isMicOn ? "Disattiva Microfono" : "Attiva Microfono"}
                    >
                      {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                    </Button>

                    <Button 
                      onClick={stopLiveSession}
                      className="rounded-full w-16 h-16 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200"
                      title="Termina Chiamata"
                    >
                      <PhoneOff className="w-8 h-8" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-32 h-32 rounded-full flex items-center justify-center bg-slate-100 transition-all duration-300">
                     <MicOff className="w-12 h-12 text-slate-400" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                       {isConnecting ? "Connessione in corso..." : "Conversazione Vocale"}
                    </h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                      Premi il pulsante per avviare una chiamata vocale in tempo reale con il tutor.
                    </p>
                  </div>

                  <Button 
                    onClick={startLiveSession}
                    disabled={isConnecting}
                    className={`rounded-full px-8 py-4 text-lg ${isConnecting ? 'bg-slate-300' : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200'}`}
                  >
                    {isConnecting ? (
                        <>
                           <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                           Connessione...
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5 mr-2 fill-current" />
                            Avvia Conversazione
                        </>
                    )}
                  </Button>
                </>
              )}

               <button 
                  onClick={handleGiveUp}
                  className="absolute bottom-8 text-sm text-red-500 hover:text-red-700 font-medium bg-red-50 px-4 py-2 rounded-full border border-red-100 hover:bg-red-100 transition-colors"
               >
                 Mi arrendo (Torna alla Chat)
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
