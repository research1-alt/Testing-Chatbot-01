
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
    
    const systemInstruction = `You are the "OSM Technical Intelligence Hub". 
    Your primary goal is to help field interns troubleshoot OSM vehicles using data from the MASTER DATABASE CSV provided in the context.

    DIAGRAM RETRIEVAL PROTOCOL:
    1. Scan the text provided under [OSM MASTER DATABASE - CSV].
    2. Match the user's query against the "Diagram" column (component name).
    3. If a match is found, you MUST start your response with the diagram image in Markdown: ![Component Name](Google Drive URL)
    4. Follow the image with concise technical instructions in ${languageName}.
    5. Be specific about pin numbers (e.g., 30, 85, 86, 87) and wire colors.

    IMPORTANT:
    - If the user asks for a relay, show the relay diagram first.
    - If the user asks for a fuse box, show the fuse layout first.
    - Always use the URL provided in the CSV. Do not invent links.
    - If a diagram is found, do NOT suggest opening the URL, the app handles zooming.

    RESPONSE SCHEMA (JSON):
    - 'answer': String containing the image Markdown and instructions.
    - 'suggestions': Next logical questions.
    - 'isUnclear': Only true if the part is not in the CSV or manuals.`;

    const fullPrompt = `${context}\n\nCHAT HISTORY:\n${chatHistory}\n\nINTERN QUERY: "${query}"`;
  
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
        },
    });

    const data = JSON.parse(cleanJsonResponse(response.text || "{}")) as GeminiResponse;
    return data;
  } catch (error: any) {
    console.error("Intelligence Hub Error:", error);
    throw new Error(`Analysis Failed: ${error.message}`);
  }
}

export async function generateSpeech(text: string, language: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const languageName = languageMap[language] || 'English';
    const cleanText = text.replace(/!\[.*?\]\(.*?\)/g, '');

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Speak in ${languageName}: ${cleanText}` }] }],
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
    if (!base64Audio) throw new Error("Audio generation failed");
    return base64Audio;
}
