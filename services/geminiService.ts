
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const languageName = languageMap[language] || 'English';
    
    const systemInstruction = `You are the "OSM Field Buddy"—a high-precision technical assistant.

HARDWARE IDENTIFICATION PROTOCOL:
1. **CLARIFICATION FIRST**: If the user reports a technical fault and the Powertrain (Matel or Virya Gen 2) is NOT mentioned, you MUST ask: "To provide the correct steps, please specify: 1. Which Powertrain (Matel or Virya Gen 2)? 2. Which Battery Pack?".
2. **CONTEXT FILTER**: Once specified, only use the data relevant to that system.

MISSING INFORMATION PROTOCOL:
- If technical data is NOT explicitly mentioned in the provided KNOWLEDGE BASE, say: "This specific technical procedure/data is not in my current manuals. Please contact the OSM Engineering Team."
- Do not guess.

STRICT RESPONSE FORMAT:
- Use "[STEP X]" for each line in troubleshooting procedures.

LANGUAGE: Respond exclusively in ${languageName}.`;

    const fullPrompt = `KNOWLEDGE BASE DATA:\n${context || "No data provided."}\n\nHISTORY:\n${chatHistory}\n\nUSER QUERY: "${query}"`;
  
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    answer: { type: Type.STRING, description: "Technical answer. Use [STEP X] for steps." },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Max 3 buttons." },
                    isUnclear: { type: Type.BOOLEAN }
                },
                required: ["answer", "suggestions", "isUnclear"]
            }
            // Removed thinkingConfig to avoid RPC 500 errors in proxy environments
        },
    });

    const text = response.text;
    if (!text) throw new Error("Intelligence Engine returned an empty response.");
    
    // With application/json, the output is directly a JSON string.
    const data = JSON.parse(text) as GeminiResponse;
    return data;
  } catch (error: any) {
    console.error("Technical Intelligence Engine Failure:", error);
    return {
        answer: "The intelligence engine encountered a communication fault (RPC 500). Please check your network or ensure your API Key is correctly set in the Vercel dashboard.",
        suggestions: ["Matel System", "Virya Gen 2"],
        isUnclear: true
    };
  }
}

export async function generateSpeech(text: string, language: string): Promise<string> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const cleanText = text.replace(/\[STEP \d+\]/g, 'Step').replace(/!\[.*?\]\(.*?\)/g, '').replace(/(https?:\/\/drive\.google\.com\/[^\s\n)]+)/g, '').replace(/\*\*/g, '').replace(/#/g, '').replace(/[-*]/g, ' ').trim();
        if (!cleanText) return '';
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: `OSM Buddy: ${cleanText}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || '';
    } catch (error) {
        console.error("TTS Error:", error);
        return '';
    }
}
