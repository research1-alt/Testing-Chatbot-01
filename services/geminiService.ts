
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
    
    const systemInstruction = `You are the OSM Service Intelligence Hub. You are an expert on Omega Seiki Mobility technical manuals and vehicle wiring.

STRICT ACCURACY PROTOCOL:
1. IDENTIFY: Scan the KNOWLEDGE BASE for the exact component (e.g., "MCU Relay", "Regen Relay").
2. VALIDATE: Ensure you are reading from the correct section. Never assume pin colors or numbers; only use what is explicitly written.
3. ISOLATE: Do not mix specifications between different relays. If a user asks about MCU, do NOT reference Regen info.
4. DETAIL: Include Pin Numbers, Wire Colors, and Voltage levels in your steps.
5. LANGUAGE: Respond in ${languageName}.
6. IMAGES: Use markdown ![Diagram Title](URL) if a relevant image link exists in the text.

If the information for a specific component query is missing from the provided context, set isUnclear: true.

CRITICAL: Double-check that the pin numbers you provide exactly match the manual section for the component mentioned in the query.`;

    const fullPrompt = `KNOWLEDGE BASE DATA:\n${context}\n\nHISTORY:\n${chatHistory}\n\nUSER QUERY: "${query}"`;
  
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
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
            },
            // CRITICAL FIX: gemini-3-pro-preview requires a positive thinking budget.
            thinkingConfig: { thinkingBudget: 16000 }
        },
    });

    const text = response.text || "{}";
    const data = JSON.parse(cleanJsonResponse(text)) as GeminiResponse;
    return data;
  } catch (error: any) {
    console.error("Technical Intelligence Engine Failure:", error);
    return {
        answer: "A processing fault occurred in the technical reasoning hub. Please re-state your query with specific component names (e.g., 'MCU Relay diagram').",
        suggestions: ["MCU Relay Pinout", "Regen Relay Wiring", "Fuse Layout"],
        isUnclear: true
    };
  }
}

export async function generateSpeech(text: string, language: string): Promise<string> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const languageName = languageMap[language] || 'English';
        const cleanText = text
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/(https?:\/\/drive\.google\.com\/[^\s\n)]+)/g, '')
            .replace(/\*\*/g, '')
            .replace(/#/g, '')
            .replace(/[-*]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) return '';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: `Instruction for OSM Technician in ${languageName}: ${cleanText}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
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
