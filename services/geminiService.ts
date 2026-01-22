
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
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY is missing. Check Vercel Settings.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const languageName = languageMap[language] || 'English';
    
    const systemInstruction = `You are "OSM Buddy"—the high-precision field assistant for Omega Seiki Mobility technicians.

TECHNICAL PROTOCOL:
1. **DIRECT ANSWERS**: Provide the solution directly based on the KNOWLEDGE BASE provided. Do not ask for system selection (Matel/Virya) unless it's absolutely impossible to answer without it.
2. **KNOWLEDGE ONLY**: Use ONLY the provided KNOWLEDGE BASE. If the data for a specific component or system is not found in the manuals, say: "This specific data is not available in my current technical library. Please consult the OSM Engineering Team."
3. **FORMATTING**: Use "[STEP X]" for troubleshooting procedures. Use bold **text** for technical terms.
4. **SUGGESTIONS**: Provide 2-3 follow-up question suggestions related to the current topic.

LANGUAGE: Respond exclusively in ${languageName}.`;

    const fullPrompt = `KNOWLEDGE BASE DATA:\n${context || "No context provided."}\n\nHISTORY:\n${chatHistory}\n\nUSER QUERY: "${query}"`;
  
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    answer: { type: Type.STRING, description: "Direct technical answer using [STEP X]." },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Relevant technical follow-ups." },
                    isUnclear: { type: Type.BOOLEAN, description: "True only if the query is totally unintelligible." }
                },
                required: ["answer", "suggestions", "isUnclear"]
            }
        },
    });

    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    
    return JSON.parse(text) as GeminiResponse;
  } catch (error: any) {
    console.error("OSM AI Failure:", error);
    return {
        answer: "The intelligence engine encountered a connectivity error. Please try again or check your network.",
        suggestions: ["Relay Guide", "Error Codes"],
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
