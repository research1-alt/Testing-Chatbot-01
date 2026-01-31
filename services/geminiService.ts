
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
1. IDENTITY: You are a precision Look-up Tool for OSM technicians.
2. DATA EXTRACTION MODE (PRIORITY): 
   - If the query mentions a BRAND (Exponent, Exicom, Clean, Matel, Virya) + SPEC/DETAILS/BATTERY/MCU:
   - YOU MUST LOCATE THE SPECIFIC BLOCK in the "GLOBAL HARDWARE & BATTERY SPECIFICATIONS" section.
   - OUTPUT THE DATA VERBATIM. DO NOT add "Startup Sequences", "Troubleshooting tips", or general "Architecture notes" unless explicitly asked.
   - If the user asks for "Exponent battery specification", give ONLY the Exponent technical sheet data.
3. DIAGNOSTIC MODE:
   - Only use [STEP 1], [STEP 2] format if the user asks "How to check", "How to fix", or provides an "Err-XX" code.
4. LANGUAGE: RESPOND ONLY IN ${targetLanguageName.toUpperCase()}. 
   - Use English ONLY for technical values (51.2V, 172Ah, 104 KG, Pin 30).
5. NO HALLUCINATION: If a spec is not in the text, do not invent it. If you find the spec, do not "be helpful" by adding unrelated info. Stay strictly focused on the specific item requested.
6. CONTEXT HANDLING: The technical repository is divided into SPECIFICATIONS and TROUBLESHOOTING. For spec queries, prioritize the SPECIFICATIONS block.`;

    const fullPrompt = `TARGET LANGUAGE: ${targetLanguageName}

[TECHNICAL REPOSITORY]
${context || "No technical modules available."}

### CONVERSATION LOG
${chatHistory}

### TECHNICIAN QUERY
"${query}"

### INSTRUCTION SUMMARY:
- Is this a request for SPECIFICATIONS for a specific part (e.g. Exponent Battery)? 
- If YES: Extract the exact data block from the context. Do NOT add general troubleshooting or startup steps.
- If NO (e.g. "How to fix"): Use [STEP X] diagnostics.
- ENTIRE RESPONSE IN ${targetLanguageName.toUpperCase()}.`;
  
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
                        description: `Precise technical response. Verbatim for specs. [STEP X] for fixes. Language: ${targetLanguageName.toUpperCase()}.` 
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
    if (startIdx === -1) throw new Error("AI returned invalid structure");
    const cleanJson = responseText.substring(startIdx, endIdx);
    
    return JSON.parse(cleanJson) as GeminiResponse;

  } catch (error: any) {
    console.error("OSM AI ERROR:", error);
    return {
        answer: "Sync error. Please retry your query.",
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
