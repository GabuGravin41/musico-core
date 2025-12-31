import React, { useEffect, useRef, useState } from 'react';
import { Card } from './ui/Card';
import { AIResponse } from '../types';
import { Spinner } from './ui/Spinner';

declare const ABCJS: any;

interface OutputPanelProps {
  aiResponse: AIResponse | null;
  groundingSources?: any[];
  isLoading: boolean;
  error: string | null;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({ aiResponse, groundingSources, isLoading, error }) => {
  const scoreRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'score' | 'theory' | 'lyrics'>('score');

  useEffect(() => {
    if (aiResponse?.abcNotation && scoreRef.current && tab === 'score') {
      try {
        scoreRef.current.innerHTML = '';
        ABCJS.renderAbc(scoreRef.current, aiResponse.abcNotation, {
          responsive: "resize",
          paddingtop: 10,
          paddingbottom: 10,
          scale: 0.8,
          staffwidth: 360
        });
      } catch (err) {
        console.error("ABC Rendering failed", err);
      }
    }
  }, [aiResponse, tab]);

  return (
    <Card className="h-full flex flex-col border-none bg-slate-950 shadow-2xl overflow-hidden rounded-none">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <h2 className="text-xs font-black text-cyan-400 flex items-center gap-2 uppercase tracking-[0.2em]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          AGENT INTELLIGENCE
        </h2>
      </div>

      <div className="flex bg-slate-950 border-b border-slate-800">
        {(['score', 'theory', 'lyrics'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${tab === t ? 'text-cyan-400 bg-cyan-400/5 shadow-[inset_0_-2px_0_0_#22d3ee]' : 'text-slate-600 hover:text-slate-400'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-6">
            <Spinner />
            <div className="text-center">
              <p className="text-[10px] text-cyan-500/60 mono animate-pulse uppercase tracking-[0.3em]">Synching Neural Oscillator</p>
              <div className="mt-4 flex gap-1 justify-center">
                 <div className="w-1 h-1 bg-cyan-500 rounded-full animate-ping"></div>
                 <div className="w-1 h-1 bg-cyan-500 rounded-full animate-ping [animation-delay:0.2s]"></div>
                 <div className="w-1 h-1 bg-cyan-500 rounded-full animate-ping [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl text-rose-400 text-[11px] mono">
            <div className="font-bold mb-2 uppercase tracking-widest text-rose-500">Critical Engine Alert</div>
            {error}
          </div>
        ) : aiResponse ? (
          <div className="h-full space-y-6 animate-fade-in">
            {tab === 'score' && (
              <div className="bg-white/95 rounded-xl border border-slate-800 shadow-2xl p-2">
                <div ref={scoreRef} className="abcjs-sidebar-render"></div>
              </div>
            )}
            
            {tab === 'theory' && (
              <div className="space-y-4">
                <div className="text-[12px] text-slate-400 leading-relaxed bg-slate-900/50 p-5 border border-slate-800 rounded-2xl">
                   <div className="text-cyan-400 font-black mb-4 flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase">
                     <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div> Composition Logic
                   </div>
                   <p className="whitespace-pre-wrap leading-loose italic">{aiResponse.thoughtProcess}</p>
                </div>

                {groundingSources && groundingSources.length > 0 && (
                  <div className="bg-slate-900/30 p-4 border border-slate-800/50 rounded-2xl">
                    <div className="text-indigo-400 font-black mb-3 text-[9px] tracking-[0.2em] uppercase">Grounding Sources</div>
                    <div className="space-y-2">
                      {groundingSources.map((source, idx) => (
                        <a 
                          key={idx} 
                          href={source.web?.uri || '#'} 
                          target="_blank" 
                          rel="noreferrer"
                          className="block text-[10px] text-slate-500 hover:text-cyan-400 transition-colors truncate mono underline decoration-indigo-500/30"
                        >
                          {source.web?.title || source.web?.uri}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'lyrics' && (
              <div className="p-8 bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl border border-slate-800 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/20"></div>
                {aiResponse.lyrics ? (
                  <div className="relative z-10">
                    <p className="text-lg font-serif italic text-slate-200 leading-relaxed tracking-wide">
                       {aiResponse.lyrics}
                    </p>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">Vocal Data Undefined</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-700 text-[10px] uppercase tracking-[0.4em] text-center px-12 gap-6 opacity-40">
            <div className="relative">
               <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 animate-pulse"></div>
               <svg className="w-16 h-16 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </div>
            Awaiting session input
          </div>
        )}
      </div>
    </Card>
  );
};