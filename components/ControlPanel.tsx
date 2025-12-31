import React, { useState, useRef } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Checkbox } from './ui/Checkbox';
import { MUSIC_STYLES, AVAILABLE_TOOLS } from '../constants';
import { Message } from '../types';

interface ControlPanelProps {
  messages: Message[];
  onSendMessage: (text: string, audio?: { data: string; mimeType: string }) => void;
  style: string;
  setStyle: (style: string) => void;
  selectedTools: string[];
  setSelectedTools: (tools: string[]) => void;
  isLoading: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  messages, onSendMessage, style, setStyle, selectedTools, setSelectedTools, isLoading
}) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleToolChange = (id: string) => {
    setSelectedTools(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          onSendMessage(input || "Interpret this melody", { data: base64data, mimeType: 'audio/webm' });
          setInput('');
        };
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording failed", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <Card className="h-full flex flex-col bg-slate-900 border-none shadow-none rounded-none w-full overflow-hidden border-r border-slate-800">
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex-shrink-0 z-10">
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <div className="w-4 h-4 bg-cyan-500 rounded-sm"></div>
          MUSICO <span className="text-cyan-500">CORE</span>
        </h1>
      </div>

      <div className="flex-grow p-4 space-y-4 overflow-y-auto custom-scrollbar bg-slate-950/20">
        {messages.length === 0 && (
          <div className="text-center py-10 opacity-30 px-6">
            <p className="text-xs uppercase tracking-[0.3em] font-bold">Waiting for Initialization</p>
            <p className="text-[10px] mt-2 leading-relaxed">Hum a melody or type a musical direction to begin your session.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
              m.role === 'user' ? 'bg-cyan-600/20 text-cyan-100 border border-cyan-500/30' : 'bg-slate-800/50 text-slate-300 border border-slate-700'
            }`}>
              {m.isAudio && (
                <div className="flex items-center gap-2 mb-1 text-[10px] text-cyan-400 font-bold uppercase">
                  <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"/>
                  </svg> 
                  Recording Transmitted
                </div>
              )}
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-slate-900 border-t border-slate-800">
        <select
          value={style}
          onChange={e => setStyle(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 focus:outline-none focus:border-cyan-500"
        >
          {MUSIC_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isLoading}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-24 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all resize-none min-h-[80px]"
            placeholder={isRecording ? "Recording hum..." : "Describe your next move..."}
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={isRecording ? stopRecording : undefined}
              className={`p-2 rounded-lg border transition-all ${isRecording ? 'bg-rose-600 border-rose-500 text-white animate-pulse scale-110 shadow-[0_0_15px_rgba(225,29,72,0.5)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-cyan-400'}`}
              title="Hold to Record Hum/Melody"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !isRecording)}
              className="p-2 bg-cyan-600 rounded-lg text-white hover:bg-cyan-500 disabled:opacity-30 disabled:bg-slate-800 transition-all shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
        <div className="mt-2 text-[8px] text-slate-600 uppercase font-black tracking-widest text-center">
          {isRecording ? "Recording active • Release to analyze" : "Hold Mic to Transcribe Humming"}
        </div>
      </div>
    </Card>
  );
};