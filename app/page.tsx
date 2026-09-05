'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, FileText, Microscope, Award, 
  MessageSquare, HelpCircle, Download, ShieldCheck, 
  Send, Mic, Paperclip, CheckCircle, 
  AlertTriangle, XCircle, ExternalLink, 
  ChevronRight, Menu, X, Info, PanelRight, Loader2, ArrowRight
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { detectLanguage, getUIDisclaimers, getUIInstructions, UI_DICTIONARY } from '@/lib/language';

type MessageRole = 'user' | 'ai';
type Confidence = 'high' | 'medium' | 'low' | null;

interface Source {
  id: string;
  title: string;
  type: string;
  date: string;
  link: string;
}

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: string;
  confidence?: Confidence;
  sources?: Source[];
  followUpQuestions?: string[];
  actions?: { label: string, action: string }[];
  animate?: boolean;
}

export default function ChatBotApp() {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextMode, setContextMode] = useState<string>('general');
  const [isListening, setIsListening] = useState(false);
  const [isWaitingForMic, setIsWaitingForMic] = useState(false);
  const [language, setLanguage] = useState<'en'|'hi'>('en');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load from session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let currentSessionId = sessionStorage.getItem('chat_session_id');
      if (!currentSessionId) {
        currentSessionId = Date.now().toString() + Math.random().toString(36).substring(7);
        sessionStorage.setItem('chat_session_id', currentSessionId);
      }
      setSessionId(currentSessionId);

      const stored = sessionStorage.getItem('chat_history');
      if (stored) {
        try {
          setMessages(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse chat history");
        }
      }
      setIsLoaded(true);
    }
  }, []);

  // Save to session storage
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      sessionStorage.setItem('chat_history', JSON.stringify(messages));
    }
  }, [messages, isLoaded]);

  useEffect(() => {
    // Check if browser supports speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInputText(prev => prev + ' ' + finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            alert(language === 'hi' ? "माइक्रोफ़ोन की अनुमति अस्वीकार कर दी गई है। कृपया अपने ब्राउज़र में अनुमति दें।" : "Microphone permission denied. Please allow it in your browser settings.");
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, [language]);

  const toggleListening = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          setIsWaitingForMic(true);
          // Request microphone permissions first
          await navigator.mediaDevices.getUserMedia({ audio: true });
          setIsWaitingForMic(false);
          
          // Use user's selected language or fallback to hi-IN to allow Hinglish/Hindi
          recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
          recognitionRef.current.start();
          setIsListening(true);
        } catch (error) {
          setIsWaitingForMic(false);
          console.error("Failed to start speech recognition or get mic permission:", error);
          alert(UI_DICTIONARY[language].micDenied);
          setIsListening(false);
        }
      } else {
        alert(UI_DICTIONARY[language].micUnsupported);
      }
    }
  };

  // Sync sidebar open state with isMobile initially
  useEffect(() => {
    // Only run on client after hydration to avoid hydration mismatch
    if (typeof window !== 'undefined') {
      setSidebarOpen(!isMobile);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    // Detect and set language dynamically based on input
    const detectedLang = detectLanguage(text);
    setLanguage(detectedLang);

    const newMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Connect to the Backend RAG API with streaming support
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: text, 
          language: detectedLang,
          sessionId: sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      setIsTyping(false);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let done = false;
      let accumulatedString = '';

      // Initialize the AI message placeholder
      const aiMsgId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: aiMsgId,
        role: 'ai',
        text: '',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        animate: false // disable old manual interval animation since stream is naturally typed
      }]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          accumulatedString += decoder.decode(value, { stream: true });
          
          setMessages(prev => {
            const newMsgs = [...prev];
            const msgIndex = newMsgs.findIndex(m => m.id === aiMsgId);
            if (msgIndex !== -1) {
              const msg = newMsgs[msgIndex];
              if (accumulatedString.includes('|||METADATA|||')) {
                const parts = accumulatedString.split('|||METADATA|||');
                msg.text = parts[0];
                if (done) {
                  try {
                    const meta = JSON.parse(parts[1]);
                    msg.confidence = meta.confidence;
                    msg.sources = meta.sources;
                    msg.followUpQuestions = meta.followUpQuestions;
                    msg.actions = meta.actions;
                    if (meta.contextMode) setContextMode(meta.contextMode);
                  } catch (e) {
                    console.error("Failed to parse metadata", e);
                  }
                }
              } else {
                msg.text = accumulatedString;
              }
            }
            return newMsgs;
          });
        }
      }
      
    } catch (error) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        text: UI_DICTIONARY[language].errorServer,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        confidence: 'low'
      }]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-slate-800 font-sans overflow-hidden">
      {/* Header (Fixed Top) */}
      <header className="h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="flex items-center">
          {isMobile && (
            <button aria-label="Toggle sidebar" onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-3 p-2 -ml-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
          )}
          <ShieldCheck className="h-8 w-8 text-blue-800 mr-2" />
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">ManakMitra <span className="text-blue-700 hidden sm:inline">- AI Assistant</span></h1>
            <p className="text-[10px] md:text-xs text-slate-500 font-medium tracking-wide">BUREAU OF INDIAN STANDARDS</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          <button 
            aria-label={`Switch language to ${language === 'en' ? 'Hindi' : 'English'}`}
            onClick={() => setLanguage(lang => lang === 'en' ? 'hi' : 'en')}
            className="px-3 py-1 text-sm font-medium rounded-md border border-slate-300 hover:bg-slate-50 transition-colors mr-2"
          >
            {language === 'en' ? 'हिंदी' : 'English'}
          </button>
          
          <button aria-label="Download Conversation" className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors hidden sm:block" title="Download Conversation">
            <Download className="w-5 h-5" />
          </button>
          <button aria-label="Toggle Contextual Helper" onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors hidden sm:block" title="Toggle Contextual Helper">
            <PanelRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden w-full relative">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col h-full bg-white relative">
          
          {/* Scrollable messages area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth pb-24">
              {messages.length === 0 ? (
               <WelcomeState language={language} />
             ) : (
               <div className="max-w-4xl mx-auto space-y-6">
                 {/* ARIA Live Region for screen readers */}
                 <div className="sr-only" aria-live="polite" aria-atomic="true">
                   {messages.length > 0 && messages[messages.length - 1].role === 'ai' ? messages[messages.length - 1].text : ''}
                 </div>
                 
                 {messages.map(msg => (
                   <MessageBubble key={msg.id} msg={msg} language={language} />
                 ))}
                 
                  {isTyping && (
                    <div className="flex items-start gap-4 animate-in fade-in">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <div className="w-5 h-5 bg-slate-200 rounded-full animate-pulse"></div>
                      </div>
                      <div className="flex-1 w-full sm:min-w-[400px] max-w-2xl bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-slate-100 rounded w-full animate-pulse"></div>
                          <div className="h-3 bg-slate-100 rounded w-full animate-pulse"></div>
                          <div className="h-3 bg-slate-100 rounded w-5/6 animate-pulse"></div>
                        </div>
                        <div className="h-6 bg-slate-100 rounded w-32 animate-pulse mt-4"></div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
          </div>
          
          {/* Input Area (Fixed Bottom) */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-20">
            <div className="max-w-4xl mx-auto relative flex items-end gap-2">
              <div className="relative flex-1 bg-slate-50 border border-slate-300 rounded-2xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all flex flex-col">
                {isWaitingForMic && (
                  <div className="absolute -top-8 left-0 right-0 flex justify-center">
                    <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow-sm animate-pulse">
                      {UI_DICTIONARY[language].micWaiting}
                    </span>
                  </div>
                )}
                <textarea 
                  aria-label="Message input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(inputText);
                    }
                  }}
                  placeholder={getUIInstructions(language)}
                  className={`w-full bg-transparent p-4 pr-12 focus:outline-none resize-none max-h-32 min-h-[56px] text-slate-800 ${language === 'hi' ? 'font-sans' : ''}`}
                  rows={1}
                  dir="auto"
                  disabled={isWaitingForMic}
                />
                <button 
                  aria-label={isListening ? "Stop voice input" : "Start voice input"}
                  onClick={toggleListening}
                  disabled={isWaitingForMic}
                  className={`absolute right-3 bottom-3 p-1.5 rounded-lg shadow-sm border transition-colors ${
                    isListening ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 
                    isWaitingForMic ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' :
                    'bg-white text-slate-400 hover:text-blue-600 border-slate-200'
                  }`}
                  title={isListening ? "Listening..." : "Speak"}
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
              <button 
                aria-label="Send message"
                onClick={() => handleSend(inputText)}
                disabled={!inputText.trim()}
                className={`p-3.5 rounded-xl shrink-0 transition-colors mb-0.5 ${inputText.trim() ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                <Send className={`w-5 h-5 ${inputText.trim() ? 'text-white' : 'text-slate-400'}`} />
              </button>
            </div>
            
            <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
              {UI_DICTIONARY[language].disclaimer}
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`sidebar-container
          fixed inset-y-0 right-0 z-40 bg-slate-50 border-l border-slate-200 shadow-2xl transition-transform duration-300 transform
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          lg:relative lg:translate-x-0 lg:shadow-none lg:transition-[width] lg:duration-300 lg:ease-in-out
          ${sidebarOpen ? 'lg:w-[320px]' : 'lg:w-0 lg:border-transparent'}
          flex flex-col shrink-0 overflow-hidden
        `}>
          <div className="w-[320px] h-full flex flex-col p-0">
            {isMobile && (
              <button aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm text-slate-500 z-50">
                <X className="w-5 h-5" />
              </button>
            )}
            <SidebarContext contextMode={contextMode} language={language} />
          </div>
        </div>
        
        {/* Mobile Sidebar Overlay */}
        {isMobile && sidebarOpen && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-20" onClick={() => setSidebarOpen(false)} />
        )}
      </div>
    </div>
  );
}

// --- Sub Components ---

const WelcomeState = ({ language }: { language: 'en' | 'hi' }) => (
  <div className="max-w-4xl mx-auto w-full flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-95 duration-500">
    <div className="w-20 h-20 bg-blue-900 rounded-3xl flex items-center justify-center mb-6 shadow-lg border-4 border-blue-100">
      <ShieldCheck className="w-10 h-10 text-white" />
    </div>
    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 text-center tracking-tight">
      {UI_DICTIONARY[language].welcomeTitle}
    </h1>
    <p className="text-lg text-slate-600 mb-8 text-center max-w-2xl">
      {UI_DICTIONARY[language].welcomeDesc}
    </p>
    
    <div className="flex flex-wrap justify-center gap-3 mb-12 text-xs font-semibold text-slate-600">
      <span className="flex items-center bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200">
        <CheckCircle className="w-4 h-4 mr-1.5"/> Powered by BIS
      </span>
      <span className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200">
        <ShieldCheck className="w-4 h-4 mr-1.5"/> Official Government Platform
      </span>
      <span className="flex items-center bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-200">
        <FileText className="w-4 h-4 mr-1.5"/> Source-backed Answers
      </span>
    </div>
  </div>
);

const MessageBubble = ({ msg, language }: { msg: Message, language: 'en' | 'hi' }) => {
  const isAI = msg.role === 'ai';
  const [displayedText, setDisplayedText] = useState(isAI && msg.animate ? '' : msg.text);

  useEffect(() => {
    if (isAI && msg.animate) {
      let i = 0;
      const intervalId = setInterval(() => {
        setDisplayedText(msg.text.substring(0, i + 1));
        i++;
        if (i >= msg.text.length) {
          clearInterval(intervalId);
        }
      }, 10);
      return () => clearInterval(intervalId);
    } else {
      setDisplayedText(msg.text);
    }
  }, [msg.text, isAI, msg.animate]);
  
  return (
    <div className={`flex gap-4 ${!isAI ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200 mt-1">
          <ShieldCheck className="w-5 h-5 text-blue-700" />
        </div>
      )}
      
      <div className={`max-w-[90%] md:max-w-[85%] flex flex-col ${!isAI ? 'items-end' : 'items-start'}`}>
        <div className={`p-5 rounded-2xl shadow-sm relative ${
          !isAI 
            ? 'bg-blue-900 text-white rounded-tr-sm border border-blue-800' 
            : 'bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-200'
        }`}>
          {/* Main Text */}
          <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
            {/* Simple markdown parsing for bold text */}
            {displayedText.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className={!isAI ? 'text-white' : 'text-slate-900 font-bold'}>{part}</strong> : part)}
            {isAI && msg.animate && displayedText.length < msg.text.length && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-pulse"></span>
            )}
          </div>
          
          {/* Confidence Badge */}
          {msg.confidence && (
            <div className="mt-4 flex items-center">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border cursor-help ${
                msg.confidence === 'high' ? 'bg-green-100 text-green-800 border-green-200' :
                msg.confidence === 'medium' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                'bg-red-100 text-red-800 border-red-200'
              }`} title="Based on official BIS metadata evaluation">
                {msg.confidence === 'high' && <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
                {msg.confidence === 'medium' && <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />}
                {msg.confidence === 'low' && <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                {msg.confidence === 'high' ? UI_DICTIONARY[language].highConf :
                 msg.confidence === 'medium' ? UI_DICTIONARY[language].medConf :
                 UI_DICTIONARY[language].lowConf}
              </span>
            </div>
          )}

          {/* Follow-up Questions */}
          {msg.followUpQuestions && (
            <div className="mt-5 bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> 
                {UI_DICTIONARY[language].followUp}
              </p>
              <ul className="space-y-2">
                {msg.followUpQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-orange-800 text-sm font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 mt-1.5"></span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source Citations */}
          {msg.sources && msg.sources.length > 0 && (
            <div className="mt-5 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h4 className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                {UI_DICTIONARY[language].sources} ({msg.sources.length} {UI_DICTIONARY[language].documents})
              </h4>
              <ul className="space-y-3">
                {msg.sources.map(s => (
                  <li key={s.id} className="group">
                    <a href={s.link} className="text-blue-700 font-semibold text-sm hover:underline flex items-start gap-1.5">
                      <span className="mt-0.5">{s.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{s.type}</span>
                      <span className="text-xs text-slate-500 font-medium">{s.date}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <span className="text-[10px] text-slate-400 mt-1.5 mx-1 font-medium">{msg.timestamp}</span>
      </div>
    </div>
  );
};

const SidebarContext = ({ contextMode, language }: { contextMode: string, language: 'en' | 'hi' }) => {
  return (
    <div className="h-full flex flex-col bg-slate-50 sidebar-container">
      <div className="p-5 border-b border-slate-200 bg-white shrink-0">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          {UI_DICTIONARY[language].contextHelper}
        </h3>
      </div>
      
      <div className="p-0 overflow-y-auto flex-1">
        {contextMode === 'standards' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SidebarSection title={UI_DICTIONARY[language].relatedStandards} icon={<FileText className="w-4 h-4 text-slate-500"/>} items={[
              'IS 14543 (Packaged Drinking Water)', 
              'IS 13428 (Natural Mineral Water)', 
              'IS 12252 (Polyalkylene Terephthalate for safe packaging)'
            ]} />
            <SidebarSection title={UI_DICTIONARY[language].certRoadmap} icon={<CheckCircle className="w-4 h-4 text-slate-500"/>} items={[
              '1. Identify applicable IS Code', 
              '2. Test sample at BIS Lab', 
              '3. File online application on e-BIS',
              '4. Factory inspection by BIS',
              '5. Grant of License (GoL)'
            ]} numbered />
          </div>
        )}
        
        {contextMode === 'hallmarking' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <SidebarSection title={UI_DICTIONARY[language].understandingPurity} icon={<Award className="w-4 h-4 text-amber-500"/>} items={[
              '24K995 (99.5% Gold)', 
              '22K916 (91.6% Gold)', 
              '18K750 (75.0% Gold)',
              '14K585 (58.5% Gold)'
            ]} />
             <div className="bg-amber-50 border-y border-amber-200 p-5 mt-4">
               <h4 className="font-bold text-amber-900 mb-2 text-sm">{UI_DICTIONARY[language].huidLookup}</h4>
               <input type="text" placeholder={UI_DICTIONARY[language].enterHuid} className="w-full text-sm p-2 rounded-lg border border-amber-300 mb-2 uppercase font-mono" />
               <button className="w-full bg-amber-600 text-white text-sm font-bold py-2 rounded-lg">{UI_DICTIONARY[language].verifyJeweller}</button>
             </div>
          </div>
        )}

        {contextMode === 'general' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <SidebarSection title={UI_DICTIONARY[language].quickLinks} icon={<ExternalLink className="w-4 h-4 text-slate-500"/>} items={[
              'All Certification Schemes (ISI, CRS)', 
              'Search QCO Notifications', 
              'Accredited Testing Labs Directory', 
              'BIS CARE App Download'
            ]} />
            
            <div className="p-5 border-t border-slate-200 mt-4 space-y-3 bg-white">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> {UI_DICTIONARY[language].recentChats}
              </h4>
              <ul className="space-y-2">
                <li className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
                  <p className="truncate">Cement manufacturing compliance</p>
                  <span className="text-[10px] text-slate-400 mt-1">Yesterday, 4:30 PM</span>
                </li>
                <li className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
                  <p className="truncate">CRS vs ISI Mark difference</p>
                  <span className="text-[10px] text-slate-400 mt-1">Aug 21, 10:15 AM</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SidebarSection = ({ title, items, icon, numbered = false }: { title: string, items: string[], icon?: React.ReactNode, numbered?: boolean }) => (
  <div className="p-5 space-y-3 border-b border-slate-100 last:border-0 bg-white">
    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
      {icon} {title}
    </h4>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="text-sm font-medium text-slate-700 flex items-start gap-2 leading-snug">
          {!numbered && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
          {item}
        </li>
      ))}
    </ul>
  </div>
);
