import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, Message } from '../types';
import { AVAILABLE_TOOLS } from "../constants";

let activeChat: any = null;

export const generateMusicChat = async (
  prompt: string,
  style: string,
  selectedToolIds: string[],
  currentContextNotes: any[],
  audioData?: { data: string; mimeType: string }
): Promise<{ response: AIResponse; groundingSources?: any[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const systemInstruction = `You are 'Musico Co-Pilot,' a professional music production agent.
Your primary specialty is transcribing user audio (humming, singing, whistling) into precise musical sequences and collaborating on polyphonic scores.

Context Awareness:
- The user provides notes with a 'time' property (grid units, where 4 units = 1 beat).
- You can create chords by giving multiple notes the same 'time'.

Audio Input Handling:
- If the user provides an audio clip, listen carefully for the pitch and rhythm.
- Transcribe the melody accurately into the 'musicalSequence' array.
- Use the 'style' (${style}) to inform the accompaniment or instrumentation.

Output Requirements:
1. Return valid JSON only.
2. 'thoughtProcess': Brief musical analysis of the transcription and suggestions.
3. 'musicalSequence': Pitch (e.g., C4, Eb5), Duration (quarter, eighth, etc.), Instrument, and 'time' (integer grid unit).
4. 'abcNotation': Valid ABC notation matching the sequence.`;

  if (!activeChat) {
    activeChat = ai.chats.create({
      model: "gemini-3-pro-preview",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            thoughtProcess: { type: Type.STRING },
            musicalSequence: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pitch: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  instrument: { type: Type.STRING },
                  time: { type: Type.INTEGER }
                },
                required: ['pitch', 'duration', 'instrument', 'time']
              }
            },
            lyrics: { type: Type.STRING, nullable: true },
            abcNotation: { type: Type.STRING, nullable: true }
          },
          required: ['thoughtProcess', 'musicalSequence', 'lyrics', 'abcNotation']
        }
      }
    });
  }

  const contextPrompt = audioData 
    ? `User has provided a recording. Please transcribe the melody and incorporate it into the score. Current canvas: ${JSON.stringify(currentContextNotes)}`
    : `Current Canvas State: ${JSON.stringify(currentContextNotes)}. User Input: ${prompt || "Enhance current composition."}`;

  try {
    const messageContent = audioData 
      ? { parts: [{ text: contextPrompt }, { inlineData: audioData }] } 
      : contextPrompt;

    const response = await activeChat.sendMessage(messageContent);
    const textOutput = response.text.trim();
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    return {
      response: JSON.parse(textOutput),
      groundingSources: grounding
    };
  } catch (error) {
    console.error("Gemini Production Error:", error);
    activeChat = null;
    throw new Error("Studio engine reset required. Please try again.");
  }
};