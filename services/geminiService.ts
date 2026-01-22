
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
1. **CLARIFICATION**: If the user's query relates to troubleshooting or specs but lacks specific hardware details (Matel vs Virya, or Battery Type), you MUST ask for them.
2. **SUGGESTIONS**: Your "suggestions" array must match the choices you just offered in the text (e.g., if you ask for Battery Pack, offer "48V 10kWh" and "48V 5kWh" as buttons).
3. **KNOWLEDGE ONLY**: Use ONLY the provided KNOWLEDGE BASE. If data is missing, say: "This specific data is not in my manuals. Contact Engineering."
4. **FORMATTING**: Use "[STEP X]" for all procedural lines. Use bold **text** for component names. Include Drive links as plain text URLs.

LANGUAGE: Respond exclusively in ${languageName}.`;

    const fullPrompt = `KNOWLEDGE BASE:\n${context || "No context."}\n\nHISTORY:\n${chatHistory}\n\nUSER QUERY: "${query}"`;
  
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    answer: { type: Type.STRING, description: "Detailed technical response with [STEP X]." },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 context-specific buttons." },
                    isUnclear: { type: Type.BOOLEAN, description: "True if you are asking for clarification." }
                },
                required: ["answer", "suggestions", "isUnclear"]
            }
        },
    });

    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    
    const data = JSON.parse(text) as GeminiResponse;
    
    // Safety check: ensure suggestions aren't empty if bot is asking a question
    if (data.isUnclear && data.suggestions.length === 0) {
        data.suggestions = ["Matel System", "Virya Gen 2"];
    }
    
    return data;
  } catch (error: any) {
    console.error("OSM AI Failure:", error);
    return {
        answer: "Communication Fault (RPC-500). If this persists, please ensure the API_KEY is set in Vercel and redeploy the app.",
        suggestions: ["Retry Query", "System Status"],
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
