
import { GoogleGenAI, Type } from "@google/genai";

interface GeminiResponse {
    answer: string;
    suggestions: string[];
    isUnclear: boolean;
}

const languageMap: { [key: string]: string } = {
    'en-US': 'English',
    'hi-IN': 'Hindi',
    'bn-IN': 'Bengali',
    'gu-IN': 'Gujarati',
    'kn-IN': 'Kannada',
    'ml-IN': 'Malayalam',
    'mr-IN': 'Marathi',
    'ta-IN': 'Tamil',
    'te-IN': 'Telugu',
    'ur-IN': 'Urdu'
};

function cleanJsonResponse(text: string): string {
    return text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
}

/**
 * Main chatbot logic for troubleshooting OSM vehicles using RAG.
 */
export async function getChatbotResponse(
    query: string, 
    fileContent: string | null,
    chatHistory: string,
    language: string,
): Promise<{ answer: string, suggestions: string[], isUnclear: boolean }> {
  try {
    // Guidelines: Use process.env.API_KEY directly and create instance per call
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const languageName = languageMap[language] || 'English';
    
    // System Instruction tailored for OSM Knowledge Base
    const systemInstruction = `You are the "OSM Technical Intelligence Hub". 
    Your primary goal is to help service interns troubleshoot Omega Seiki Mobility vehicles using the provided technical manuals.

    STRICT OPERATING PROCEDURES:
    1. **KNOWLEDGE PRIORITY**: Always search the [KNOWLEDGE BASE] provided below first. If the answer is there, use it as your primary source.
    2. **TECHNICAL ACCURACY**: Focus on circuit paths (e.g., Aux Battery -> Fuse Box -> Switch), wire colors, and relay pin numbers (Pin 30, 85, 86, 87).
    3. **RESPONSE STRUCTURE**: 
       - Use "Step X:" for instructions.
       - Use double newlines between steps for extreme readability on mobile.
       - Use **BOLD** for parts, wire colors, and specific connector IDs.
    4. **FALLBACK**: If the information is not in the knowledge base, provide general EV troubleshooting best practices but state clearly that this is general advice.
    5. **LANGUAGE**: Provide the response in ${languageName}.

    OUTPUT FORMAT:
    - ALWAYS return valid JSON.
    - 'answer': The formatted technical solution.
    - 'suggestions': 2-3 follow-up questions an intern might ask.
    - 'isUnclear': true if the user's query is too vague to provide a specific circuit solution.`;

    const contextContent = fileContent 
        ? `[KNOWLEDGE BASE CONTENT]\n${fileContent}\n\n`
        : `[WARNING: Knowledge base empty. Using general OSM logic.]\n\n`;

    const fullPrompt = `${contextContent}CONTEXT (History):\n${chatHistory}\n\nUSER QUESTION: "${query}"`;
  
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    answer: { 
                        type: Type.STRING,
                        description: "The technical solution with clear step-by-step formatting."
                    },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    isUnclear: { type: Type.BOOLEAN }
                },
                required: ["answer", "suggestions", "isUnclear"]
            },
        },
    });

    const cleanedText = cleanJsonResponse(response.text || "{}");
    const data = JSON.parse(cleanedText) as GeminiResponse;

    return data;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('429')) throw new Error("Server is busy. Please try again in 30 seconds.");
    throw new Error(`Technical Analysis Error: ${error.message || 'Unknown error occurred during processing.'}`);
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
        // Guidelines: Create a new instance right before making the call to ensure the latest API key is used
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
            // Guidelines: You must append an API key when fetching from the download link
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            const blob = await response.blob();
            return { videoUrl: URL.createObjectURL(blob) };
        }
        return { videoUrl: '', error: 'Video generation completed but could not retrieve playback stream.' };
    } catch (error: any) {
        return { videoUrl: '', error: error.message };
    }
}
