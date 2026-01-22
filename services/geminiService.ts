
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
  const targetLanguageName = languageMap[language] || 'English';
  
  if (!apiKey || apiKey === "") {
      return {
          answer: "⚠️ SYSTEM CONFIGURATION ERROR: The 'API_KEY' is missing.",
          suggestions: ["Contact Admin"],
          isUnclear: true
      };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // CRITICAL: We use a more aggressive system prompt to override the English bias of technical data.
    const systemInstruction = `You are "OSM Mentor"—a senior technical expert. 
CRITICAL RULE: You MUST translate the English manuals and respond ONLY in the NATIVE SCRIPT of ${targetLanguageName}.
- If language is Hindi, use Devanagari script.
- If language is Tamil, use Tamil script.
- NEVER answer in English if ${targetLanguageName} is selected.

RULES:
1. **JSON ONLY**: Your entire output must be a single valid JSON object.
2. **SCRIPTS**: The 'answer' and 'suggestions' MUST be in ${targetLanguageName} script.
3. **TECHNICAL TERMS**: Keep IDs like "MCU", "Pin 1", "48V" in English script for clarity.
4. **TONE**: Professional and helpful mentor. Start safety steps with "SAFETY WARNING:" in ${targetLanguageName}.
5. **GROUNDING**: Use ONLY the provided context. Set isUnclear to true if information is missing.`;

    const fullPrompt = `USER LANGUAGE: ${targetLanguageName}
CONTEXT DATA:
${context || "No context provided."}

HISTORY:
${chatHistory}

USER QUERY: "${query}"

REMINDER: Your JSON 'answer' and 'suggestions' MUST be in ${targetLanguageName} NATIVE SCRIPT.`;
  
    const result = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
            systemInstruction,
            temperature: 0.1,
            seed: 42,
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

    const responseText = result.text || "";
    const startIdx = responseText.indexOf('{');
    const endIdx = responseText.lastIndexOf('}') + 1;
    const cleanJson = responseText.substring(startIdx, endIdx);
    
    return JSON.parse(cleanJson) as GeminiResponse;

  } catch (error: any) {
    console.error("OSM AI Failure:", error);
    return {
        answer: "System error. Please try refreshing.",
        suggestions: ["Retry"],
        isUnclear: true
    };
  }
}

export async function generateSpeech(text: string, language: string): Promise<string> {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) return '';
        const ai = new GoogleGenAI({ apiKey });
        const targetLanguageName = languageMap[language] || 'English';

        // Aggressive cleaning to prevent 500 errors caused by special characters or formatting
        const cleanText = text
            .replace(/SAFETY WARNING:/g, 'Warning.')
            .replace(/PRO-TIP:/g, 'Tip.')
            .replace(/\[STEP \d+\]/g, 'Step.')
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/(https?:\/\/drive\.google\.com\/[^\s\n)]+)/g, '')
            .replace(/[*#_~`>]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) return '';

        // TO RESOLVE 500 ERROR:
        // 1. Move instructions into the prompt instead of systemInstruction for TTS model.
        // 2. Do not use thinkingConfig or other complex configs.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ 
                parts: [{ 
                    text: `Speak this in ${targetLanguageName} like a helpful mentor: ${cleanText}` 
                }] 
            }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { 
                    voiceConfig: { 
                        prebuiltVoiceConfig: { 
                            voiceName: 'Kore' 
                        } 
                    } 
                },
            },
        });
        
        const audioData = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        return audioData || '';
    } catch (error) {
        console.error("Detailed TTS Error:", error);
        return '';
    }
}
