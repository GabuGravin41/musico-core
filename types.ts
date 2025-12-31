export interface Note {
  pitch: string;
  duration: 'whole' | 'half' | 'quarter' | 'eighth';
  instrument: string;
  time: number; // The starting position in grid units
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  isAudio?: boolean;
}

export interface AIResponse {
  thoughtProcess: string;
  musicalSequence: Note[];
  lyrics: string | null;
  abcNotation: string | null;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
}