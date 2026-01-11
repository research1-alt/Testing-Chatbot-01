
import { GoogleGenAI, Type } from "@google/genai";

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
    'ks-IN': 'Kashmiri',
    'sd-IN': 'Sindhi',
    'sa-IN': 'Sanskrit',
    'kok-IN': 'Konkani',
    'mni-IN': 'Manipuri',
    'ne-IN': 'Nepali',
    'doi-IN': 'Dogri',
    'mai-IN': 'Maithili',
    'sat-IN': 'Santali',
    'brx-IN': 'Bodo',
};

function cleanJsonResponse(text: string): string {
    return text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
}

/**
 * Technical Chatbot Intelligence
 * Uses RAG (Retrieval Augmented Generation) to answer based on admin-uploaded manuals.
 */
export async function getChatbotResponse(
    query: string, 
    fileContent: string | null,
    chatHistory: string,
    language: string,
): Promise<{ answer: string, suggestions: string[], isUnclear: boolean }> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const languageName = languageMap[language] || 'English';
    
    const systemInstruction = `You are the "OSM Technical Intelligence Hub". 
    You assist field service interns in troubleshooting Omega Seiki Mobility (OSM) electric vehicles.

    STRICT OPERATING PROCEDURES:
    1. **KNOWLEDGE BASE**: You MUST prioritize the [TECHNICAL MANUALS] provided below. This is the official source of truth.
    2. **TECHNICAL PRECISION**: Mention specific relay pin numbers (30, 85, 86, 87), wire colors (e.g., Pink/Yellow), and fuse ratings (e.g., 15A).
    3. **RESPONSE STYLE**: 
       - Use numbered steps for troubleshooting.
       - Use **BOLD** for parts, tools, and wire colors.
       - Keep sentences short for easy reading on mobile screens in the field.
    4. **SAFETY FIRST**: Always advise the intern to disconnect the high-voltage battery before testing high-current circuits.
    5. **LANGUAGE**: Provide the response in ${languageName}.

    OUTPUT SCHEMA (JSON):
    - 'answer': The step-by-step solution.
    - 'suggestions': 2-3 logical next steps or related components.
    - 'isUnclear': true if the query is too vague to map to a circuit.`;

    const manualsContext = fileContent 
        ? `[TECHNICAL MANUALS]\n${fileContent}\n\n`
        : `[WARNING: NO MANUALS LOADED. USING GENERAL OSM REPAIR KNOWLEDGE.]\n\n`;

    const fullPrompt = `${manualsContext}CHAT HISTORY:\n${chatHistory}\n\nCURRENT INTERN QUERY: "${query}"`;
  
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
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
        },
    });

    const data = JSON.parse(cleanJsonResponse(response.text || "{}")) as GeminiResponse;
    return data;
  } catch (error: any) {
    console.error("Intelligence Hub Error:", error);
    throw new Error(`Technical Analysis Failed: ${error.message}`);
  }
}

/**
 * Generates technical videos for visualization using Veo.
 */
export async function generateVideo(
    base64Image: string,
    mimeType: string,
    prompt: string,
    aspectRatio: '16:9' | '9:16'
): Promise<{ videoUrl: string, error?: string }> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: { imageBytes: base64Image, mimeType: mimeType },
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            const blob = await response.blob();
            return { videoUrl: URL.createObjectURL(blob) };
        }
        return { videoUrl: '', error: 'Video generated but stream unavailable.' };
    } catch (error: any) {
        return { videoUrl: '', error: error.message };
    }
}
