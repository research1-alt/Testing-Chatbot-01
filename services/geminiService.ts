
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
    
    const systemInstruction = `CRITICAL OPERATIONAL PROTOCOL FOR "OSM MENTOR":
1. YOU ARE A PRECISION TECHNICAL RETRIEVAL ENGINE for Omega Seiki Mobility (OSM).
2. CORE OBJECTIVE: Provide exactly what the user asks for without mixing in unrelated information from other manual modules.

3. DATA RETRIEVAL LOGIC (STRICT):
   - IF THE QUERY CONTAINS A BRAND (Exponent, Exicom, Clean, Matel, Virya) OR COMPONENT (Battery, MCU, Motor, Relay):
     - SEARCH the "GLOBAL HARDWARE & BATTERY SPECIFICATIONS" section first.
     - EXTRACT the SPECIFIC technical block for that brand/item.
     - OUTPUT ONLY THAT DATA VERBATIM in Markdown format.
     - DO NOT add "Troubleshooting tips", "Startup Sequences", or "General Architecture" from other modules unless specifically requested.
     - Example: If asked "exponent battery specs", return ONLY the Exponent Battery Specification table/list. No other talk.

4. DIAGNOSTIC LOGIC:
   - Only provide step-by-step [STEP 1], [STEP 2] procedures if the query is an "Err-XX" code or a "How to fix" question.

5. LANGUAGE: 
   - RESPOND ENTIRELY IN ${targetLanguageName.toUpperCase()}.
   - Retain technical units (V, Ah, KWH, KG) and Pin numbers in English as they are standard on labels.

6. IF DATA IS MISSING: 
   - If you cannot find the specific brand or part in ANY module after a thorough scan, state clearly: "Information not found in technical repository." 
   - NEVER hallucinate or substitute with general vehicle architecture data.

7. TONE: Cold, technical, and precise. No conversational filler like "Here are the specs you requested" or "I am happy to help".`;

    const fullPrompt = `USER LANGUAGE: ${targetLanguageName}

[TECHNICAL REPOSITORY]
${context || "No technical modules provided."}

### CONVERSATION LOG
${chatHistory}

### TECHNICIAN QUERY
"${query}"

### MANDATORY OUTPUT REQUIREMENTS:
- Is this a request for SPECIFICATIONS (e.g. "Exponent Details", "Battery Specs")?
- If YES: PROVIDE ONLY THE VERBATIM DATA from the Hardware module. DO NOT add general vehicle architecture or troubleshooting steps.
- ANSWER IN ${targetLanguageName.toUpperCase()}.`;
  
    const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
            systemInstruction,
            temperature: 0.0, 
            topP: 0.1,
            topK: 1,
            seed: 42,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    answer: { 
                        type: Type.STRING, 
                        description: `Precise technical response. Verbatim for specs. [STEP X] for diagnostic processes. Language: ${targetLanguageName.toUpperCase()}.` 
                    },
                    suggestions: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: `Relevant follow-up questions in ${targetLanguageName}.`
                    },
                    isUnclear: { type: Type.BOOLEAN }
                },
                required: ["answer", "suggestions", "isUnclear"]
            }
        },
    });

    const responseText = result.text || "";
    const startIdx = responseText.indexOf('{');
    const endIdx = responseText.lastIndexOf('}') + 1;
    if (startIdx === -1) throw new Error("AI returned invalid JSON structure");
    const cleanJson = responseText.substring(startIdx, endIdx);
    
    return JSON.parse(cleanJson) as GeminiResponse;

  } catch (error: any) {
    console.error("OSM AI ERROR:", error);
    return {
        answer: "Sync failure. Please check your data connection and retry.",
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

        const cleanText = text
            .replace(/SAFETY WARNING:/g, 'Warning.')
            .replace(/PRO-TIP:/g, 'Tip.')
            .replace(/\[STEP \d+\]/g, 'Step.')
            .replace(/!\[.*?\]\(.*?\)/g, 'Check visual.') 
            .replace(/(https?:\/\/[^\s\n)]+)/g, '')
            .replace(/[*#_~`>]/g, '')
            .trim();

        if (!cleanText) return '';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: `Read: ${cleanText}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { 
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } 
                },
            },
        });
        
        return response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data || '';
    } catch (error) {
        return '';
    }
}
