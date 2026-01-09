import { GoogleGenAI, Type, Part } from "@google/genai";
import { relayBaseImageData } from "../utils/assets";

interface GeminiResponse {
    answer: string;
    suggestions: string[];
    isUnclear: boolean;
    diagramQuery?: string;
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

/**
 * Generates a technical diagram using Gemini 2.5 Flash Image.
 * Highly optimized for OSM Relay diagrams.
 */
export async function generateImage(prompt: string): Promise<string | null> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let parts: Part[] = [];
        // Specialized logic for relay diagrams to maintain technical precision
        if (/relay/i.test(prompt) && relayBaseImageData) {
            parts.push({
                inlineData: {
                    mimeType: "image/png",
                    data: relayBaseImageData
                }
            });
            parts.push({
                text: `You are a technical illustrator. Use the provided base relay graphic and DRAW the wiring connections based on this technical data: ${prompt}. 
                - Use sharp lines.
                - Use exact wire colors mentioned (e.g. Yellow/Red, Pink, Black).
                - Clearly label pins 85, 86, 30, 87, 87a.
                - Add a title at the top of the image.`
            });
        } else {
            parts.push({ text: `Create a professional schematic or circuit flow diagram for: ${prompt}. Focus on clarity, labeling, and technical accuracy. White background.` });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (error) {
        console.error("Image Gen Error:", error);
        return null;
    }
}

export async function getChatbotResponse(
    query: string, 
    fileContent: string | null,
    chatHistory: string,
    language: string,
): Promise<{ answer: string, suggestions: string[], isUnclear: boolean, imageUrl?: string }> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    if (!fileContent) {
        return { 
            answer: "Knowledge base is missing. Please upload the OSM Technical Manual PDF.", 
            suggestions: ["How to upload?"], 
            isUnclear: false 
        };
    }

    const languageName = languageMap[language] || 'English';
    const systemInstruction = `You are the OSM Service Intern Assistant.
    Knowledge base contains the official OSM Technical Manual with Relay diagrams, Start Sequences, and Pinouts.
    
    TASKS:
    1. If a user asks for a diagram (e.g., "show me the DC Output relay"), generate a 'diagramQuery' containing the EXACT pins, wire colors, and connections from the document.
    2. Explain the working logic of the component requested.
    3. If the query is about the vehicle not starting, check the "Start Sequence" and "Odometer Saving" notes.
    
    FORMAT:
    - Respond strictly in JSON.
    - visible text (answer, suggestions) must be in ${languageName}.`;

    const fullPrompt = `KNOWLEDGE BASE:\n${fileContent}\n\nCHAT HISTORY:\n${chatHistory}\n\nUSER QUERY: "${query}"`;
  
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: fullPrompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    answer: { type: Type.STRING },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    isUnclear: { type: Type.BOOLEAN },
                    diagramQuery: { type: Type.STRING }
                },
                required: ["answer", "suggestions", "isUnclear"]
            },
        },
    });

    const data = JSON.parse(response.text || "{}") as GeminiResponse;
    let imageUrl: string | undefined;

    if (data.diagramQuery) {
        imageUrl = await generateImage(data.diagramQuery) || undefined;
    }

    return { ...data, imageUrl };
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("I'm having trouble with the technical manual analysis.");
  }
}

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
        return { videoUrl: '', error: 'No video URI returned' };
    } catch (error: any) {
        return { videoUrl: '', error: error.message };
    }
}
