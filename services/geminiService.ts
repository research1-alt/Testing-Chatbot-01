
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
          answer: "⚠️ SYSTEM CONFIGURATION ERROR: The 'API_KEY' is missing in Vercel environment variables. Please add it and redeploy.",
          suggestions: ["Setup Guide", "Contact Admin"],
          isUnclear: true
      };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const languageName = languageMap[language] || 'English';
    
    const systemInstruction = `You are "OSM Buddy"—the official technical support AI for Omega Seiki Mobility.

CORE RULES:
1. **NO CLARIFICATION**: Do NOT ask the user to specify Matel or Virya Gen 2 unless the query is completely unrelated to technical data. Provide the solution directly for the mentioned system.
2. **KNOWLEDGE EXCLUSIVITY**: Use ONLY the KNOWLEDGE BASE provided. If the user asks about "matel mcu ignition voltage", look specifically for the Matel MCU section and return the voltage (e.g., 12V).
3. **PRECISION**: Return pin numbers, wire colors, and step-by-step troubleshooting using "[STEP X]".
4. **CONSISTENCY**: Give the same technical values found in the manuals every time. Use a formal, technical tone.

FORMATTING:
- Use bold **text** for components.
- Use "[STEP X]" for procedures.
- Output MUST be a valid JSON object.

LANGUAGE: Respond exclusively in ${languageName}.`;

    const fullPrompt = `KNOWLEDGE BASE DATA:\n${context || "No context provided."}\n\nHISTORY:\n${chatHistory}\n\nUSER QUERY: "${query}"`;
  
    const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
            systemInstruction,
            temperature: 0, // Forces the model to be consistent/deterministic
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
    
    // Robust JSON cleaning to remove markdown wrappers or trailing garbage
    const cleanJson = responseText.substring(
        responseText.indexOf('{'),
        responseText.lastIndexOf('}') + 1
    );
    
    return JSON.parse(cleanJson) as GeminiResponse;

  } catch (error: any) {
    console.error("OSM AI Failure:", error);
    
    if (error.message?.includes('API_KEY')) {
        return {
            answer: "⚠️ AUTHENTICATION ERROR: Invalid API Key. Please verify the key in your Vercel project settings.",
            suggestions: ["Check API Key", "Retry"],
            isUnclear: true
        };
    }

    return {
        answer: "System Synchronization Delay. I am currently unable to reach the technical database. Please re-type your query.",
        suggestions: ["Matel Specs", "Virya Specs"],
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
