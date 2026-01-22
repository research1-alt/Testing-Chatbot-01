
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
    
    const systemInstruction = `You are "OSM Buddy"—the official technical support AI for Omega Seiki Mobility.

STRICT GROUNDING RULES (MANDATORY):
1. **NO EXTERNAL KNOWLEDGE**: You are forbidden from using information from your general training. You MUST ONLY use the provided [OSM MASTER DATABASE] and [SUPPLEMENTAL MANUALS].
2. **TERM VERIFICATION**: If a term like "TrueDrive" or "Dynamic 6" is NOT in the provided context, you MUST NOT use it in your answer. 
3. **SPECIFICATION LOCK**: 
   - For Matel: Ignition is 12V (KSI) on Pins 1 & 10.
   - For Virya Gen 2: Refer ONLY to the "Virya Gen 2 Pin Configuration" table.
   - NEVER mention "Pin 23" or "11-60V" for Virya Gen 2 unless those exact digits are in the provided text for that controller.
4. **UNKNOWN SYSTEMS**: If the user asks about a controller or system not described in the library, respond: "Technical specifications for [System Name] are not available in the current OSM library. Please upload the manual to the Admin Dashboard."
5. **CONSISTENCY**: Use "[STEP X]" for troubleshooting and bold **text** for components.

Output MUST be a valid JSON object.`;

    const fullPrompt = `KNOWLEDGE BASE DATA:\n${context || "No context provided."}\n\nHISTORY:\n${chatHistory}\n\nUSER QUERY: "${query}"`;
  
    const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
            systemInstruction,
            temperature: 0,
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

    const responseText = result.text;
    if (!responseText) throw new Error("Empty AI response");
    
    const startIdx = responseText.indexOf('{');
    const endIdx = responseText.lastIndexOf('}') + 1;
    const cleanJson = responseText.substring(startIdx, endIdx);
    
    return JSON.parse(cleanJson) as GeminiResponse;

  } catch (error: any) {
    console.error("OSM AI Failure:", error);
    return {
        answer: "Intelligence sync error. Please check your query or connectivity.",
        suggestions: ["Matel Specs", "Fault Codes"],
        isUnclear: true
    };
  }
}

export async function generateSpeech(text: string, language: string): Promise<string> {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) return '';
        const ai = new GoogleGenAI({ apiKey });
        const cleanText = text.replace(/\[STEP \d+\]/g, 'Step').replace(/!\[.*?\]\(.*?\)/g, '').replace(/(https?:\/\/drive\.google\.com\/[^\s\n)]+)/g, '').replace(/\*\*/g, '').replace(/#/g, '').trim();
        if (!cleanText) return '';
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: `OSM: ${cleanText}` }] }],
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
