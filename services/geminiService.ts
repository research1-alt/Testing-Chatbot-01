
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

function cleanJsonResponse(text: string): string {
    return text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
}

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
    
    const systemInstruction = `You are the OSM Technical Response Unit. Your ONLY goal is to provide specific, minimal, and highly relevant technical data or circuit flows for the user's query.

STRICT RELEVANCE & FLOW PROTOCOL:
1. **CIRCUIT FLOW MAPPING**: If asked about "Flow", "Working", or "Circuit Path", provide a step-by-step sequential mapping using the format: [Source] -> [Protection/Relay Pin] -> [Component].
2. **PIN-TO-PIN PRECISION**: Always specify exact pin numbers (e.g., Pin 86, Pin 30) and wire colors as defined in the KNOWLEDGE BASE.
3. **ZERO UNNECESSARY INFO**: If the user asks about "Error-44", do NOT talk about any other errors or systems unless they are part of the Error-44 logic.
4. **NO PREAMBLE**: Skip "Hello", "I can help", or "Here is the flow". Start immediately with technical data.
5. **FORMATTING**: 
   - Use **Bold** for Pin Numbers, Wire Colors, and Voltages.
   - Use "Step X:" for repair processes.
   - Use "->" for power/signal paths.

LANGUAGE: Respond exclusively in ${languageName}.

If the user query does not match any information in the provided knowledge base, state that the information is missing and set isUnclear to true. Do NOT make up information.`;

    const fullPrompt = `KNOWLEDGE BASE DATA:\n${context}\n\nHISTORY:\n${chatHistory}\n\nUSER QUERY: "${query}"`;
  
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    answer: { type: Type.STRING, description: "The direct, minimal technical answer or circuit flow path." },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Max 3 highly relevant next-step keywords (e.g., 'Check Pin 85', 'Verify Fuse F12V')." },
                    isUnclear: { type: Type.BOOLEAN }
                },
                required: ["answer", "suggestions", "isUnclear"]
            },
            thinkingConfig: { thinkingBudget: 4000 }
        },
    });

    const text = response.text || "{}";
    const data = JSON.parse(cleanJsonResponse(text)) as GeminiResponse;
    return data;
  } catch (error: any) {
    console.error("Technical Intelligence Engine Failure:", error);
    const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
    return {
        answer: isQuotaError ? "Technical hub at capacity. Wait 30s." : "System Fault. Re-state query.",
        suggestions: ["MCU Relay Flow", "Fuse Box Path", "Err-31 Trace"],
        isUnclear: true
    };
  }
}

export async function generateSpeech(text: string, language: string): Promise<string> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const languageName = languageMap[language] || 'English';
        const cleanText = text.replace(/!\[.*?\]\(.*?\)/g, '').replace(/(https?:\/\/drive\.google\.com\/[^\s\n)]+)/g, '').replace(/\*\*/g, '').replace(/#/g, '').replace(/[-*]/g, ' ').trim();
        if (!cleanText) return '';
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: `OSM Instructions in ${languageName}: ${cleanText}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("TTS failed");
        return base64Audio;
    } catch (error) {
        console.error("TTS Error:", error);
        throw error;
    }
}
