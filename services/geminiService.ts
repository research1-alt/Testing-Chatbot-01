
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
    
    const systemInstruction = `You are the OSM Technical Response Unit. Your mission is to provide sequenced, reliable, and attractive troubleshooting guides.

STRICT SEQUENCING PROTOCOL:
Every response must be structured in this exact sequence:
1. **DIAGNOSTIC SUMMARY**: Define the Error Code/Issue clearly.
2. **TECHNICAL SPECS**: List Pin Numbers, Wire Colors, and expected Voltages (e.g., 48V, 12V, 5V) from the manual.
3. **REPAIR SEQUENCE**: Use "Step 1:", "Step 2:", etc., for the troubleshooting flow.
4. **VALIDATION**: Tell the technician how to verify the fix is complete.

STYLE RULES:
- Use **Bold** for Pin Numbers, Wire Colors, and Voltages.
- Use "Step X:" exactly to trigger the UI's special formatting.
- Be precise. If the manual says Pin 30 is Yellow/Black, do not just say "the power wire".
- LANGUAGE: Respond in ${languageName}.

DIAGRAM DISPLAY:
- Only include diagrams if specifically asked. Use ![Diagram](URL) format.

If info is missing from the context, set isUnclear: true.`;

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
                    answer: { type: Type.STRING },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    isUnclear: { type: Type.BOOLEAN }
                },
                required: ["answer", "suggestions", "isUnclear"]
            },
            thinkingConfig: { thinkingBudget: 8000 }
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
        suggestions: ["MCU Relay", "Fuse Layout", "Err-31 Fix"],
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
