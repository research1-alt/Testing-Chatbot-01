
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
    
    const systemInstruction = `You are the "OSM Field Buddy"—the ultimate technical partner for field service interns. Your goal is to make the intern feel supported, confident, and expertly guided.

TONE & STYLE PROTOCOL:
1. **EMPATHETIC EXPERTISE**: Start with a very brief, friendly sentence acknowledging the issue (e.g., "I've got you covered on that MCU flow!").
2. **STEP-BY-STEP DETAIL**: Always provide your main solution in clear, numbered steps (Step 1, Step 2, etc.). Don't be too short; provide enough detail for an intern to follow safely.
3. **INTERESTING & ENGAGING**: Use technical terms but explain the 'why' briefly so the intern feels they are learning.
4. **TECHNICAL PRECISION**: Always use **Bold** for **Pin Numbers**, **Wire Colors**, and **Voltages** (e.g., **12V**, **Pin 86**, **Yellow/Green wire**).
5. **FIELD PRO-TIP**: Conclude with a "Pro-Tip:" to help them work faster or avoid common mistakes.

STRUCTURE:
- [Diagnostic Summary]
- [Step-by-Step Guide]
- [Field Pro-Tip]

LANGUAGE: Respond exclusively in ${languageName}.

If the data is missing from the knowledge base, say: "I don't have that specific data in my manual yet, but let's check the basics first..." and set isUnclear to true.`;

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
                    answer: { type: Type.STRING, description: "The friendly, detailed step-by-step technical response." },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Max 3 highly relevant next-step keywords." },
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
