
import { GoogleGenAI, Type, Modality } from "@google/genai";

interface GeminiResponse {
    answer: string;
    suggestions: string[];
    isUnclear: boolean;
}

const languageMap: { [key: string]: string } = {
    'en-US': 'English',
    'hi-IN': 'Hindi',
    'mr-IN': 'Marathi',
    'ta-IN': 'Tamil',
    'te-IN': 'Telugu',
    'bn-IN': 'Bengali',
    'gu-IN': 'Gujarati',
    'kn-IN': 'Kannada',
    'ml-IN': 'Malayalam',
    'pa-IN': 'Punjabi',
    'ur-IN': 'Urdu',
    'as-IN': 'Assamese',
    'or-IN': 'Odia',
};

/**
 * Technical Chatbot Intelligence - Specialized for OSM Field Service
 */
export async function getChatbotResponse(
    query: string, 
    context: string | null,
    chatHistory: string,
    language: string,
): Promise<{ answer: string, suggestions: string[], isUnclear: boolean }> {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "") {
      return {
          answer: "⚠️ SYSTEM CONFIGURATION ERROR: The 'API_KEY' is missing in Vercel environment variables.",
          suggestions: ["Setup Guide", "Contact Admin"],
          isUnclear: true
      };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const systemInstruction = `You are "OSM Mentor"—a patient senior technician teaching new employees at Omega Seiki Mobility.

BEGINNER-FRIENDLY RULES (MANDATORY):
1. **TONE**: Be encouraging and clear. Avoid jargon without explaining it. (e.g., Say "MCU (the motor's brain)" instead of just "MCU").
2. **SAFETY FIRST**: If the query is about troubleshooting, ALWAYS start your answer with a "SAFETY WARNING:" block (e.g., "Ensure the vehicle is on level ground and the main switch is OFF before touching wires").
3. **STRICT GROUNDING (NO HALLUCINATIONS)**: 
   - Use ONLY the provided context. 
   - NEVER mention "TrueDrive", "Dynamic 6", or "Pin 23". If you see these in your general training data, IGNORE THEM. They are NOT part of our system.
   - For Matel: Ignition is 12V (KSI) on Pins 1 & 10.
4. **SIMPLIFIED STEPS**: Break down complex tasks into very small steps using [STEP X].
5. **EXPLAIN THE "WHY"**: Briefly explain why the technician is checking a specific pin or voltage.

Output MUST be a valid JSON object.`;

    const fullPrompt = `KNOWLEDGE BASE DATA:\n${context || "No context provided."}\n\nHISTORY:\n${chatHistory}\n\nUSER QUERY: "${query}"`;
  
    const result = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
            systemInstruction,
            temperature: 0.1,
            seed: 42,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    answer: { type: Type.STRING },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    isUnclear: { type: Type.BOOLEAN }
                },
                required: ["answer", "suggestions", "isUnclear"]
            }
        },
    });

    let responseText = result.text || "";
    
    // Hard-coded safety filter to remove any accidental hallucinations of "TrueDrive"
    responseText = responseText.replace(/TrueDrive|Dynamic 6|Pin 23/gi, "[Invalid Spec Removed]");

    const startIdx = responseText.indexOf('{');
    const endIdx = responseText.lastIndexOf('}') + 1;
    const cleanJson = responseText.substring(startIdx, endIdx);
    
    return JSON.parse(cleanJson) as GeminiResponse;

  } catch (error: any) {
    console.error("OSM AI Failure:", error);
    return {
        answer: "I'm having trouble accessing the manuals right now. Please try again in a moment.",
        suggestions: ["Basic Maintenance", "Safety Guide"],
        isUnclear: true
    };
  }
}

export async function generateSpeech(text: string, language: string): Promise<string> {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) return '';
        const ai = new GoogleGenAI({ apiKey });
        const cleanText = text
            .replace(/SAFETY WARNING:/g, 'Important Safety Warning.')
            .replace(/\[STEP \d+\]/g, 'Step')
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/(https?:\/\/drive\.google\.com\/[^\s\n)]+)/g, '')
            .replace(/\*\*/g, '')
            .replace(/#/g, '')
            .trim();
        if (!cleanText) return '';
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: `OSM Mentor: ${cleanText}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
    } catch (error) {
        return '';
    }
}
