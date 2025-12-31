import React, { useState, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { EditorCanvas } from './components/EditorCanvas';
import { OutputPanel } from './components/OutputPanel';
import { generateMusicChat } from './services/geminiService';
import { AIResponse, Note, Message } from './types';
import { MUSIC_STYLES } from './constants';

type TabType = 'build' | 'editor' | 'ai';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [style, setStyle] = useState<string>(MUSIC_STYLES[4]); 
  const [selectedTools, setSelectedTools] = useState<string[]>(['harmony_analysis', 'instrumentation', 'rhythm_generation']);
  
  const [generatedNotes, setGeneratedNotes] = useState<Note[]>([]);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('build');

  const handleManualNotesChange = useCallback((newNotes: Note[]) => {
    setGeneratedNotes(newNotes);
  }, []);

  const handleSendMessage = useCallback(async (text: string, audio?: { data: string; mimeType: string }) => {
    setIsLoading(true);
    setError(null);
    
    const userMsg: Message = { role: 'user', text, isAudio: !!audio };
    setMessages(prev => [...prev, userMsg]);
    
    if (window.innerWidth < 768) setActiveTab('ai');
    setIsRightSidebarOpen(true);

    try {
      const { response, groundingSources } = await generateMusicChat(
        text, 
        style, 
        selectedTools, 
        generatedNotes, // Send current state for context awareness
        audio
      );
      
      setAiResponse(response);
      setGroundingSources(groundingSources || []);
      setGeneratedNotes(response.musicalSequence);
      
      const modelMsg: Message = { role: 'model', text: response.thoughtProcess.slice(0, 120) + "..." };
      setMessages(prev => [...prev, modelMsg]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Studio session error');
    } finally {
      setIsLoading(false);
    }
  }, [style, selectedTools, generatedNotes]);

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-[#020617] text-slate-100 overflow-hidden font-sans relative">
      
      {/* LEFT: Chat & Console */}
      <aside className={`
        ${activeTab === 'build' ? 'flex' : 'hidden'} 
        md:flex md:w-80 lg:w-96 h-full flex-shrink-0 z-20 bg-slate-950
      `}>
        <ControlPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          style={style}
          setStyle={setStyle}
          selectedTools={selectedTools}
          setSelectedTools={setSelectedTools}
          isLoading={isLoading}
        />
      </aside>
      
      {/* CENTER: The Production Studio */}
      <main className={`
        ${activeTab === 'editor' ? 'flex' : 'hidden'} 
        md:flex flex-grow h-full min-w-0 p-4 transition-all duration-300 ease-in-out
      `}>
        <EditorCanvas 
          notes={generatedNotes} 
          onManualNotesChange={handleManualNotesChange}
        />
      </main>

      {/* COLLAPSE HANDLE */}
      <button 
        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        className={`
          hidden md:flex absolute top-1/2 -translate-y-1/2 z-40 w-4 h-24 bg-slate-900 border border-slate-800 
          hover:bg-cyan-600 hover:text-white text-slate-700 transition-all duration-300 items-center justify-center shadow-2xl 
          ${isRightSidebarOpen ? 'right-96 rounded-l-2xl' : 'right-0 rounded-l-2xl'}
        `}
      >
        <div className="flex flex-col gap-1">
          <div className="w-1 h-1 bg-current rounded-full"></div>
          <div className="w-1 h-1 bg-current rounded-full"></div>
          <div className="w-1 h-1 bg-current rounded-full"></div>
        </div>
      </button>

      {/* RIGHT: Agentic Output */}
      <aside 
        className={`
          ${activeTab === 'ai' ? 'flex w-full' : 'hidden'} 
          md:flex h-full border-l border-slate-900 flex-shrink-0 transition-all duration-300 ease-in-out bg-slate-950 overflow-hidden 
          md:${isRightSidebarOpen ? 'w-96 opacity-100' : 'w-0 opacity-0 border-none'}
        `}
      >
        <div className="w-full md:w-96 h-full">
          <OutputPanel 
            aiResponse={aiResponse} 
            groundingSources={groundingSources}
            isLoading={isLoading} 
            error={error} 
          />
        </div>
      </aside>

      {/* MOBILE NAV */}
      <nav className="md:hidden flex h-16 bg-slate-950 border-t border-slate-800 flex-shrink-0 z-30">
        {[
          { id: 'build', label: 'Console', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { id: 'editor', label: 'Studio', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z' },
          { id: 'ai', label: 'Agent', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id as TabType)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${activeTab === t.id ? 'text-cyan-400 bg-cyan-900/10 shadow-[inset_0_-4px_0_0_#22d3ee]' : 'text-slate-600'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} /></svg>
            <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;