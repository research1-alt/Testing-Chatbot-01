
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

STRICT GROUNDING RULES:
1. **INTERNAL DATABASE ONLY**: Use ONLY the provided [OSM MASTER DATABASE] and [SUPPLEMENTAL MANUALS]. If info is not there, say "Information not found in library."
2. **FORBIDDEN TERMS (HALLUCINATION PREVENTION)**: 
   - NEVER mention "TrueDrive" or "Dynamic 6". These are not in our database.
   - NEVER mention "Pin 23" or "11 to 60VDC" for any ignition system. These are hallucinations.
3. **MATEL MCU SPECS**:
   - Ignition (KSI) = 12V. 
   - Pins = 1 & 10.
   - If user asks about Matel, use ONLY these values.
4. **VIRYA GEN 2 SPECS**:
   - Refer strictly to the "Virya Gen 2 Pin Configuration" table. 
   - Pin 1 = 48V Main Supply. Pin 2 = Interlock 48V.
5. **VERIFICATION**: Before outputting a Pin Number or Voltage, search the context. If the exact number is not found next to the component name, report it as "Data unavailable".

Output MUST be a valid JSON object.`;

    const fullPrompt = `KNOWLEDGE BASE DATA:\n${context || "No context provided."}\n\nHISTORY:\n${chatHistory}\n\nUSER QUERY: "${query}"`;
  
    const result = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Upgraded for better reasoning and instruction following
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
