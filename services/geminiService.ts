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
    
    const systemInstruction = `You are the "OSM Field Buddy"—a high-precision technical assistant.

HARDWARE IDENTIFICATION PROTOCOL:
1. **CLARIFICATION FIRST**: If the user reports a technical fault or asks for troubleshooting (e.g., "vehicle not moving", "checking wiring") and the Powertrain (Matel or Virya Gen 2) is NOT mentioned in the query or chat history, you MUST NOT give a solution yet. 
2. **THE REQUEST**: Instead, ask: "To provide the correct steps, please specify: 1. Which Powertrain (Matel or Virya Gen 2)? 2. Which Battery Pack?".
3. **CONTEXT FILTER**: Once the user has specified their system (e.g., "I am using Matel"), only use the data relevant to that system. Do not mix Virya Gen 2 data into a Matel response.

MISSING INFORMATION PROTOCOL:
- If a user asks for a specific technical procedure, wiring diagram, or value that is NOT explicitly mentioned in the provided KNOWLEDGE BASE or MASTER DATABASE, you MUST respond with: "This specific technical procedure/data is not in my current manuals. Please contact the OSM Engineering Team or refer to the physical vehicle manual."
- Do not attempt to guess or use general EV knowledge. Only use the provided documents.

STRICT RESPONSE FORMAT:
- **SPEC QUERIES**: For numbers/voltages, give ONLY the value (e.g., "12V").
- **PROCEDURE QUERIES**: Use "[STEP X]" for each line.
- **DATA INTEGRITY**: Use exact numbers from the context. No placeholders.

LANGUAGE: Respond exclusively in ${languageName}.`;

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
                    answer: { type: Type.STRING, description: "Technical answer or identification request. Use [STEP X] for procedures." },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Max 3 highly relevant buttons (e.g. 'Matel System', 'Virya Gen 2')." },
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
    return {
        answer: "System Fault. Re-state query.",
        suggestions: ["Matel System", "Virya Gen 2"],
        isUnclear: true
    };
  }
}

export async function generateSpeech(text: string, language: string): Promise<string> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const languageName = languageMap[language] || 'English';
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
