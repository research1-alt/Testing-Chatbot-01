
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
          answer: "⚠️ SYSTEM ERROR: API_KEY is missing. Please add the 'API_KEY' environment variable in your Vercel Dashboard and redeploy the application.",
          suggestions: ["How to add API Key", "Contact Admin"],
          isUnclear: true
      };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const languageName = languageMap[language] || 'English';
    
    const systemInstruction = `You are "OSM Buddy"—the high-precision field assistant for Omega Seiki Mobility technicians.

TECHNICAL PROTOCOL:
1. **DIRECT ANSWERS**: Provide the solution directly based on the KNOWLEDGE BASE provided.
2. **KNOWLEDGE ONLY**: Use ONLY the provided KNOWLEDGE BASE. If the data is missing, say: "This specific data is not available in my current technical library."
3. **FORMATTING**: Use "[STEP X]" for troubleshooting procedures. Use bold **text** for technical terms.
4. **RESPONSE**: You must return a valid JSON object.

LANGUAGE: Respond exclusively in ${languageName}.`;

    const fullPrompt = `KNOWLEDGE BASE DATA:\n${context || "No context provided."}\n\nHISTORY:\n${chatHistory}\n\nUSER QUERY: "${query}"`;
  
    const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
            systemInstruction,
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
    
    // Attempt to clean the response if it contains markdown wrappers
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson) as GeminiResponse;

  } catch (error: any) {
    console.error("OSM AI Failure:", error);
    
    // Check for specific API Key errors
    if (error.message?.includes('API_KEY')) {
        return {
            answer: "⚠️ CONFIGURATION ERROR: The API Key is invalid or missing in Vercel. Please check your settings.",
            suggestions: ["Check Vercel Keys", "System Manual"],
            isUnclear: true
        };
    }

    return {
        answer: "The intelligence engine encountered a connectivity issue with Google AI services. Please try again in a moment.",
        suggestions: ["Matel Relay Guide", "Fault Codes"],
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
