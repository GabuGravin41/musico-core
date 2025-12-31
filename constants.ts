
import { Tool } from './types';

export const MUSIC_STYLES: string[] = [
  "Classical",
  "Jazz Fusion",
  "Lofi Hip Hop",
  "Cinematic Score",
  "Synthwave",
  "Ambient",
  "Minimalist",
  "Blues Rock"
];

export const AVAILABLE_TOOLS: Tool[] = [
  {
    id: "harmony_analysis",
    name: "Analyze Harmony",
    description: "Analyze and suggest chord progressions that fit the motif."
  },
  {
    id: "instrumentation",
    name: "Suggest Instrumentation",
    description: "Recommend instruments that complement the selected style."
  },
  {
    id: "rhythm_generation",
    name: "Generate Rhythm Section",
    description: "Create a complementary drum and bass line."
  },
  {
    id: "web_inspiration",
    name: "Web Search for Inspiration",
    description: "Simulate a search for similar themes and styles online."
  },
  {
    id: "lyric_writing",
    name: "Write Lyrics",
    description: "Generate lyrics that match the mood of the music."
  }
];

export const PITCH_MAP: { [key: string]: number } = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
};

export const DURATION_MAP: { [key: string]: number } = {
  'whole': 16,
  'half': 8,
  'quarter': 4,
  'eighth': 2
};
