import { GoogleGenAI } from "@google/genai";

// As per guidelines, the API key must be obtained exclusively from `process.env.API_KEY`.
// It's assumed to be pre-configured in the execution environment.

const getAi = () => {
    // The API key is handled by the environment and should not be managed in the UI for Gemini.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        // Fix: Updated error message to be compliant with guidelines.
        throw new Error("Gemini API key (API_KEY) is not configured in environment variables.");
    }
    // Correct initialization as per guidelines
    return new GoogleGenAI({ apiKey });
};

interface GeminiRequest {
    prompt: string;
    modelName: string;
}

interface LlmResponse {
    content: string;
    inputChars: number;
    outputChars: number;
}

export const callGemini = async ({ prompt, modelName }: GeminiRequest): Promise<LlmResponse> => {
    try {
        const ai = getAi();
        // Correct API usage as per guidelines
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
        });

        // Correct way to extract text as per guidelines
        const text = response.text;
        
        if (!text) {
            throw new Error("Received an empty response from Gemini API.");
        }
        
        return {
            content: text,
            inputChars: prompt.length,
            outputChars: text.length,
        };
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred with the Gemini API.");
    }
};
