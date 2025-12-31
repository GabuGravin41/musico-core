import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card } from './ui/Card';
import { Note } from '../types';
import { PITCH_MAP, DURATION_MAP } from '../constants';

interface EditorCanvasProps {
  notes: Note[];
  onManualNotesChange: (notes: Note[]) => void;
}

const PIXELS_PER_UNIT = 32; // Horizontal width of one time unit (1/16th note)
const ROW_HEIGHT = 20; // Height of one pitch row
const TEMPO_BPM = 120;
const SECONDS_PER_BEAT = 60 / TEMPO_BPM;
const QUARTER_DURATION = 4; // 1 unit = 1/16th, so 4 units = 1 quarter
const PIXELS_PER_SECOND = (PIXELS_PER_UNIT * 16) / (SECONDS_PER_BEAT * 4); 

// MIDI Range: C1 (24) to C8 (108) = 85 notes
const TOTAL_ROWS = 85; 
const START_MIDI = 108; // Top row is C8 (MIDI 108)
const MIDDLE_C_MIDI = 60; // C4 is MIDI 60

const getPitchFromRow = (row: number): string => {
  const midiNote = START_MIDI - row;
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = noteNames[midiNote % 12];
  const octave = Math.floor(midiNote / 12) - 1;
  return `${name}${octave}`;
};

const getRowFromPitch = (pitch: string): number => {
  const match = pitch.match(/([A-G][#b]?)([0-9])/i);
  if (!match) return 0;
  let name = match[1].toUpperCase();
  const octave = parseInt(match[2], 10);
  const accidentalMap: { [key: string]: string } = { 'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#', 'BB': 'A#' };
  name = accidentalMap[name] || name;
  const noteValue = PITCH_MAP[name.replace('#', '')] + (name.includes('#') ? 1 : 0);
  const midiNote = (octave + 1) * 12 + noteValue;
  return START_MIDI - midiNote;
};

const getFrequencyFromPitch = (pitch: string): number => {
  const row = getRowFromPitch(pitch);
  const midiNote = START_MIDI - row;
  return 440 * Math.pow(2, (midiNote - 69) / 12);
};

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ notes, onManualNotesChange }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPos, setPlayheadPos] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const activeSources = useRef<OscillatorNode[]>([]);

  // Initial Scroll: Center on C4 precisely
  useEffect(() => {
    const centerView = () => {
      if (scrollContainerRef.current) {
        const c4Row = START_MIDI - MIDDLE_C_MIDI;
        const targetScroll = (c4Row * ROW_HEIGHT) - (scrollContainerRef.current.clientHeight / 2) + (ROW_HEIGHT / 2);
        scrollContainerRef.current.scrollTop = targetScroll;
      }
    };
    // Use a small delay to ensure the container dimensions are fully calculated
    const timer = setTimeout(centerView, 100);
    return () => clearTimeout(timer);
  }, []);

  // Vertical Auto-Scroll for new notes
  useEffect(() => {
    if (notes.length > 0 && !isPlaying && scrollContainerRef.current) {
      const latestNote = notes[notes.length - 1];
      const row = getRowFromPitch(latestNote.pitch);
      const noteY = row * ROW_HEIGHT;
      const container = scrollContainerRef.current;
      
      if (noteY < container.scrollTop || noteY > container.scrollTop + container.clientHeight - ROW_HEIGHT) {
        container.scrollTo({
          top: noteY - (container.clientHeight / 2),
          behavior: 'smooth'
        });
      }
    }
  }, [notes, isPlaying]);

  // Horizontal Auto-Scroll for playhead
  useEffect(() => {
    if (isPlaying && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const viewportRight = container.scrollLeft + container.clientWidth - 100;
      
      if (playheadPos + 64 > viewportRight) {
        container.scrollLeft = playheadPos + 64 - (container.clientWidth / 2);
      }
    }
  }, [playheadPos, isPlaying]);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      audioCtxRef.current = ctx;
      masterGainRef.current = masterGain;
    }
    return audioCtxRef.current;
  };

  const playNote = (ctx: AudioContext, dest: AudioNode, note: Note, startTime: number) => {
    const freq = getFrequencyFromPitch(note.pitch);
    const dur = (DURATION_MAP[note.duration] || 4) * (SECONDS_PER_BEAT / QUARTER_DURATION);
    if (freq <= 0) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = note.instrument.toLowerCase().includes('bass') ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, startTime);
    filter.frequency.exponentialRampToValueAtTime(600, startTime + dur);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(startTime);
    osc.stop(startTime + dur);
    activeSources.current.push(osc);
  };

  const play = useCallback(() => {
    if (isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      activeSources.current.forEach(s => { try { s.stop(); } catch(e){} });
      activeSources.current = [];
      setIsPlaying(false);
      setPlayheadPos(0);
      return;
    }

    const ctx = initAudio();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    startTimeRef.current = now;
    
    let maxTime = 0;
    notes.forEach(note => {
      const scheduledStart = now + (note.time * (SECONDS_PER_BEAT / 4));
      playNote(ctx, masterGainRef.current!, note, scheduledStart);
      const noteEnd = note.time + (DURATION_MAP[note.duration] || 4);
      if (noteEnd > maxTime) maxTime = noteEnd;
    });

    const totalDurationSeconds = maxTime * (SECONDS_PER_BEAT / 4);
    setIsPlaying(true);

    const animate = () => {
      const elapsed = ctx.currentTime - startTimeRef.current;
      if (elapsed >= totalDurationSeconds) {
        setIsPlaying(false);
        setPlayheadPos(0);
        return;
      }
      setPlayheadPos(elapsed * PIXELS_PER_SECOND);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, notes]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoveredCell) return;
    
    const pitchAtRow = getPitchFromRow(hoveredCell.row);
    const timeAtCol = hoveredCell.col;
    
    const existingIndex = notes.findIndex(n => n.pitch === pitchAtRow && n.time === timeAtCol);

    if (existingIndex !== -1) {
      const newNotes = [...notes];
      newNotes.splice(existingIndex, 1);
      onManualNotesChange(newNotes);
    } else {
      const newNote: Note = { 
        pitch: pitchAtRow, 
        duration: 'quarter', 
        instrument: 'Lead', 
        time: timeAtCol 
      };
      onManualNotesChange([...notes, newNote]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const row = Math.floor(y / ROW_HEIGHT);
    const col = Math.floor(x / PIXELS_PER_UNIT);
    
    if (row >= 0 && row < TOTAL_ROWS) {
      setHoveredCell({ row, col });
    } else {
      setHoveredCell(null);
    }
  };

  return (
    <Card className="h-full flex flex-col border-slate-800 bg-[#020617] overflow-hidden shadow-2xl rounded-2xl relative border-2">
      
      {/* HEADER */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md flex justify-between items-center z-50">
        <div className="flex flex-col">
          <h2 className="text-xs font-black text-white flex items-center gap-2 tracking-[0.2em] uppercase">
            MUSICO CORE <span className="text-cyan-500 font-mono tracking-normal">STATION</span>
          </h2>
          <div className="flex gap-2 mt-1">
            <span className="text-[8px] bg-slate-800 text-slate-400 px-1 rounded font-bold uppercase tracking-wider">Midi Mapping Active</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => onManualNotesChange([])} className="px-4 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 hover:text-rose-400 transition-colors uppercase border border-slate-800">Reset Canvas</button>
          <button
            onClick={play}
            className={`px-6 py-1.5 rounded-lg font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2 ${isPlaying ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30' : 'bg-cyan-500 text-slate-950 shadow-lg hover:bg-cyan-400'}`}
          >
            {isPlaying ? 'STOP PLAYBACK' : 'START PLAYBACK'}
          </button>
        </div>
      </div>
      
      <div 
        ref={scrollContainerRef}
        className="flex-grow overflow-auto relative custom-scrollbar bg-slate-950/80"
      >
        <div className="flex relative" style={{ width: '5000px', height: `${TOTAL_ROWS * ROW_HEIGHT}px` }}>
          
          {/* PIANO SIDEBAR (SYNCED VERTICALLY VIA PARENT SCROLL) */}
          <div className="sticky left-0 w-16 h-full bg-slate-900 border-r border-slate-800 z-40 shadow-2xl flex flex-col">
            {Array.from({ length: TOTAL_ROWS }).map((_, i) => {
              const pitch = getPitchFromRow(i);
              const isBlack = pitch.includes('#');
              const isOctave = pitch.startsWith('C') && !isBlack;
              const isMiddleC = pitch === 'C4';
              return (
                <div 
                  key={i} 
                  className={`w-full flex items-center justify-end pr-2 border-b border-slate-800/10 text-[9px] font-bold transition-all flex-shrink-0 ${isBlack ? 'bg-slate-950 text-slate-600' : 'bg-slate-100 text-slate-900'} ${isMiddleC ? 'ring-inset ring-2 ring-cyan-500/50' : ''}`} 
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  {(isOctave || i === 0 || i === TOTAL_ROWS - 1) && (
                    <span className={isMiddleC ? "text-cyan-600 scale-110" : ""}>{pitch}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* WORKSPACE AREA (ALIGNED WITH PIANO SIDEBAR) */}
          <div 
            ref={workspaceRef}
            className="flex-grow relative h-full cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredCell(null)}
            onMouseDown={handleCanvasClick}
          >
            {/* GRID LAYER */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: `${PIXELS_PER_UNIT}px ${ROW_HEIGHT}px`
            }} />
            
            {/* BEAT MARKERS */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px)`,
              backgroundSize: `${PIXELS_PER_UNIT * 4}px 100%`
            }} />

            {/* GHOST HOVER */}
            {hoveredCell && (
              <>
                <div className="absolute w-full bg-cyan-500/10 pointer-events-none" style={{ top: `${hoveredCell.row * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }} />
                <div className="absolute bg-cyan-500/20 border border-cyan-400/30 rounded-sm pointer-events-none flex items-center justify-center text-[7px] font-bold text-cyan-200" style={{ 
                  top: `${hoveredCell.row * ROW_HEIGHT + 1}px`, 
                  left: `${hoveredCell.col * PIXELS_PER_UNIT + 1}px`, 
                  width: `${PIXELS_PER_UNIT - 2}px`, 
                  height: `${ROW_HEIGHT - 2}px` 
                }}>
                  {getPitchFromRow(hoveredCell.row)}
                </div>
              </>
            )}

            {/* PLAYHEAD */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-rose-500 z-30 shadow-[0_0_20px_rgba(244,63,94,1)] pointer-events-none"
              style={{ left: `${playheadPos}px` }}
            />

            {/* NOTES */}
            {notes.map((note, i) => {
              const row = getRowFromPitch(note.pitch);
              const top = row * ROW_HEIGHT;
              const left = note.time * PIXELS_PER_UNIT;
              const width = (DURATION_MAP[note.duration] || 4) * (PIXELS_PER_UNIT / 4); 

              return (
                <div key={`${note.pitch}-${note.time}-${i}`} className="absolute rounded-sm border border-white/20 bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.4)] group/note transition-all hover:brightness-125" style={{
                  top: `${top + 1}px`, left: `${left + 1}px`, width: `${width - 2}px`, height: `${ROW_HEIGHT - 2}px`,
                }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* FOOTER */}
      <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-[9px] text-slate-500 font-mono tracking-widest uppercase z-30">
         <div className="flex gap-8">
           <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div> {TEMPO_BPM} BPM</span>
           <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> 4/4 TIME</span>
           <span className="text-slate-400">Voices: {notes.length}</span>
         </div>
         <div className="flex items-center gap-4">
           <span className={`font-black transition-colors ${isPlaying ? 'text-cyan-400' : 'text-slate-600'}`}>
             {isPlaying ? 'ENGINE ACTIVE' : 'ENGINE READY'}
           </span>
         </div>
      </div>
    </Card>
  );
};