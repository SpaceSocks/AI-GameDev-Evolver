import { GoogleGenAI, Type } from "@google/genai";
import { GameType } from "../components/GameTypeSelector";
import { LlmConfig } from "../types";

const FALLBACK_GEMINI_API_KEY = process.env.API_KEY;
if (!FALLBACK_GEMINI_API_KEY) {
    throw new Error("API_KEY environment variable not set for fallback Gemini key");
}

// --- Generic Error Handling ---
class LlmError extends Error {
    constructor(message: string, provider: string, model: string, originalError?: any) {
        let fullMessage = `[${provider.toUpperCase()} - ${model}] ${message}`;
        if (originalError) {
             console.error(`Original error from ${provider}:`, originalError);
             if (originalError.message) {
                fullMessage += `\nOriginal Message: ${originalError.message}`;
             }
        }
        super(fullMessage);
        this.name = 'LlmError';
    }
}

// --- OpenAI / Compatible Provider Logic ---

const callOpenAICompatible = async (config: LlmConfig, body: object): Promise<any> => {
    const url = (config.baseUrl || 'https://api.openai.com/v1') + '/chat/completions';
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                ...body,
                model: config.modelName,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
        }
        return await response.json();
    } catch(error: any) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            let detailedMessage = "Network request failed. This is often caused by one of two issues when connecting to a local server (like LM Studio or Ollama):\n\n";

            // Check for Mixed Content issue
            if (window.location.protocol === 'https:' && config.baseUrl.startsWith('http://')) {
                 detailedMessage += "1. **Mixed Content Error (Most Likely):**\n" +
                                    "Your browser is blocking this secure (https://) page from connecting to your insecure (http://) local server. \n" +
                                    "**SOLUTION:** Access this application from an `http://` address, not `https://`.\n\n";
            }

            detailedMessage += "2. **CORS (Cross-Origin Resource Sharing) Error:**\n" +
                               "Your local server might not be configured to accept requests from this web page.\n" +
                               "**SOLUTION:** In LM Studio, go to the Server tab and ensure the 'CORS' setting is enabled.";

             throw new LlmError(detailedMessage, config.provider, config.modelName, error);
        }
        throw new LlmError("Failed to fetch from OpenAI-compatible API.", config.provider, config.modelName, error);
    }
};

const generateInitialGameOpenAI = async (prompt: string, gameType: GameType, config: LlmConfig): Promise<{ code: string, inputChars: number }> => {
    const systemPrompt = `You are an expert game developer. Your task is to create a complete, self-contained 'index.html' file based on the user's concept and game type.
Requirements:
1. All code (HTML, CSS, JavaScript) must be within a single 'index.html' file. Do not use external files.
2. Use the HTML <canvas> element for the game.
3. The game must be functional from the very first version.
4. Keep the initial version simple. Focus on the core mechanic described by the user.
5. Use simple geometric shapes (rectangles, circles) or emojis for all game objects. Do not use image assets.
6. The code should be well-commented to explain the logic.
7. Ensure the canvas fills the entire window and resizes appropriately.
${gameType === 'interactive' ? 
'8. Include basic keyboard controls for player movement.' : 
'8. This is a visual simulation, so there must be absolutely NO user interaction. Do NOT include any keyboard controls or player input handlers. The simulation must run on its own.'
}
Respond ONLY with the full HTML code. Do not include the markdown block syntax or any other text or explanation.`;

    const userPrompt = `Game Concept: "${prompt}"\nGame Type: ${gameType}`;

    const requestBody = {
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: 0.5,
    };
    
    const response = await callOpenAICompatible(config, requestBody);
    const code = response.choices[0]?.message?.content?.trim() ?? '';
    
    if (!code) {
        throw new LlmError("Received an empty response from the model.", config.provider, config.modelName);
    }

    return { code, inputChars: JSON.stringify(requestBody).length };
};

const improveGameOpenAI = async (
    currentCode: string, gameDescription: string, gameType: GameType,
    developerNotes: string[], longTermMemory: string[], shortTermPlans: string[],
    config: LlmConfig, screenshotsBase64?: string[]
): Promise<{ result: ImprovementResult, inputChars: number }> => {
    
    const systemPrompt = `You are an expert game developer iteratively improving a game.
**CRITICAL:** Respond ONLY with a valid JSON object. Do not include markdown fences, explanations, or any other text outside the JSON structure.
Your task is to follow these steps and provide your output in a structured JSON format with the keys "analysis", "thought", "plan", and "newCode".
1.  **Analysis:** Review your memory, the original concept, the game type, and screenshots. Analyze the source code for bugs, performance issues, and enhancements.
2.  **Thought:** Based on your analysis, reason about what to do next. Your PRIMARY directive is to work through the 'All Developer Notes' checklist. Address at least one outstanding note. If all notes are done, proceed with general improvements.
3.  **Plan:** State a single, concrete, and implementable improvement for this iteration.
4.  **Implement:** Rewrite the ENTIRE 'index.html' file to incorporate your plan. Ensure the game remains fully functional, performant, and self-contained.`;
    
    const userPromptText = `**Original Game Concept:** "${gameDescription}"
**Game Type:** ${gameType === 'interactive' ? 'Interactive Game' : 'Visual Simulation'}
${gameType === 'simulation' ? '**IMPORTANT:** This is a visual simulation. Adhere strictly to the requirement of NO user interaction or controls.' : ''}

**All Developer Notes (Highest Priority Checklist):**
${developerNotes.length > 0 ? developerNotes.map((note, i) => `${i + 1}. ${note}`).join('\n') : "No notes have been provided yet."}

**Long-Term Memory (Summaries of past development phases):**
${longTermMemory.length > 0 ? longTermMemory.map((summary, i) => `Phase ${i + 1}: ${summary}`).join('\n') : "No long-term memories yet."}

**Short-Term Memory (Your most recent plans):**
${shortTermPlans.length > 0 ? shortTermPlans.map((plan, i) => `${i + 1}. ${plan}`).join('\n') : "This is the first improvement iteration."}

**Current Source Code:**
\`\`\`html
${currentCode}
\`\`\``;

    const userContent: any[] = [{ type: "text", text: userPromptText }];
    if (screenshotsBase64 && screenshotsBase64.length > 0) {
        screenshotsBase64.forEach(img => {
            userContent.push({
                type: "image_url",
                image_url: { "url": `data:image/jpeg;base64,${img}` }
            });
        });
    }

    const requestBody: any = {
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
        ],
        temperature: 0.5,
    };

    // Use json_object mode for official OpenAI API, but fallback to text for local/custom servers.
    if (!config.baseUrl) {
        requestBody.response_format = { type: "json_object" };
    }

    const response = await callOpenAICompatible(config, requestBody);
    const jsonText = response.choices[0]?.message?.content?.trim() ?? '{}';
    
    let result: ImprovementResult;

    try {
        result = JSON.parse(jsonText);
    } catch (e) {
        console.warn("Failed to parse JSON directly, attempting to extract from text.");
        const match = jsonText.match(/\{.*\}/s);
        if (match) {
            try {
                result = JSON.parse(match[0]);
            } catch (parseError) {
                throw new LlmError("Failed to parse extracted JSON from model response.", config.provider, config.modelName, { originalJson: jsonText, error: parseError });
            }
        } else {
            throw new LlmError("Received a non-JSON response and could not find a JSON object within it.", config.provider, config.modelName, { originalResponse: jsonText });
        }
    }

    if (!result.analysis || !result.thought || !result.plan || !result.newCode) {
         throw new LlmError("Parsed JSON is missing one or more required keys (analysis, thought, plan, newCode).", config.provider, config.modelName, { parsedJson: result });
    }

    return { result, inputChars: JSON.stringify(requestBody).length };
}


// --- Google Gemini Provider Logic ---

const initialGenerationPromptGemini = (prompt: string, gameType: GameType) => `
You are an expert game developer. Your task is to create a complete, self-contained 'index.html' file based on the following user description and game type.

User Description: "${prompt}"
Game Type: ${gameType === 'interactive' ? 'Interactive Game' : 'Visual Simulation'}

Requirements:
1. All code (HTML, CSS, JavaScript) must be within a single 'index.html' file. Do not use external files.
2. Use the HTML <canvas> element for the game.
3. The game must be functional from the very first version.
4. Keep the initial version simple. Focus on the core mechanic described by the user.
5. Use simple geometric shapes (rectangles, circles) or emojis for all game objects. Do not use image assets.
6. The code should be well-commented to explain the logic.
7. Ensure the canvas fills the entire window and resizes appropriately.
${gameType === 'interactive' ? 
'8. Include basic keyboard controls for player movement.' : 
'8. This is a visual simulation, so there must be absolutely NO user interaction. Do NOT include any keyboard controls or player input handlers. The simulation must run on its own.'
}

Respond ONLY with the full HTML code inside a markdown block. Do not include any other text, explanation, or markdown formatting.
`;

const improvementPromptGemini = (
    currentCode: string, gameDescription: string, gameType: GameType,
    allDeveloperNotes: string[], longTermMemory: string[], shortTermPlans: string[],
    screenshotCount: number
) => `
You are an expert game developer tasked with iteratively improving a game. You will be given the complete context of the project, including its original concept, your long-term memory of past development phases, your recent actions, and a persistent checklist of developer notes. Your goal is to be transparent about your thinking process.

**Core Mandate: Performance is critical.** The game must run smoothly, targeting 60 FPS. Actively look for and fix performance bottlenecks, and do not introduce code that would cause significant lag. Analyze all proposed changes for performance impact before implementing them.
${screenshotCount > 0 ? ` You have also been provided a sequence of ${screenshotCount} screenshots, taken at intervals over a 15-second period, to show a broader scope of the gameplay and its progression.` : ""}

**Original Game Concept:** "${gameDescription}"
**Game Type:** ${gameType === 'interactive' ? 'Interactive Game' : 'Visual Simulation'}
${gameType === 'simulation' ? '**IMPORTANT:** This is a visual simulation. Adhere strictly to the requirement of NO user interaction or controls.' : ''}

**All Developer Notes (Highest Priority Checklist):**
${allDeveloperNotes.length > 0 ? allDeveloperNotes.map((note, i) => `${i + 1}. ${note}`).join('\n') : "No notes have been provided yet."}

**Long-Term Memory (Summaries of past development phases):**
${longTermMemory.length > 0 ? longTermMemory.map((summary, i) => `Phase ${i + 1}: ${summary}`).join('\n') : "No long-term memories yet."}

**Short-Term Memory (Your most recent plans):**
${shortTermPlans.length > 0 ? shortTermPlans.map((plan, i) => `${i + 1}. ${plan}`).join('\n') : "This is the first improvement iteration."}

**Current Source Code:**
\`\`\`html
${currentCode}
\`\`\`

Your task is to follow these steps and provide your output in a structured JSON format:
1.  **Analysis:** Review your long-term and short-term memory. Does your recent work align with the project's long-term goals, original concept, and specified game type? ${screenshotCount > 0 ? "Then, critically examine the sequence of screenshots. Describe how the game state evolves across the frames. " : ""}Finally, analyze the provided source code. How does it work? Are there any obvious bugs or areas for enhancement, especially regarding performance and adherence to the game type (interactive vs. simulation)?
2.  **Thought:** Based on your analysis, reason about what to do next. Your PRIMARY directive is to work through the 'All Developer Notes' checklist. Review the entire list and the current code to determine which notes have been fully implemented. If there are outstanding notes, your plan for this iteration MUST address at least one of them. Once all notes appear to be implemented, you may proceed with general improvements based on the original game concept and performance mandates. Think step-by-step.
3.  **Plan:** State a single, concrete, and implementable improvement for this iteration. This should be a concise summary of your thought process. Example: "I will address the note about jump height by increasing the player's jump velocity value."
4.  **Implement:** Rewrite the ENTIRE 'index.html' file to incorporate your plan. Ensure the game remains fully functional, performant, and self-contained in one file, while strictly adhering to the game type.

Respond ONLY with a JSON object that strictly follows the provided schema. Do not add any other text or markdown formatting.
`;

const generateInitialGameGemini = async (prompt: string, gameType: GameType, config: LlmConfig): Promise<{ code: string, inputChars: number }> => {
    try {
        const fullPrompt = initialGenerationPromptGemini(prompt, gameType);
        const ai = new GoogleGenAI({ apiKey: config.apiKey || FALLBACK_GEMINI_API_KEY });
        
        const response = await ai.models.generateContent({
            model: config.modelName,
            contents: fullPrompt,
        });
        
        let text = response.text.trim();
        if (text.startsWith('```html')) {
            text = text.substring(7);
        } else if (text.startsWith('```')) {
            text = text.substring(3);
        }
        if (text.endsWith('```')) {
            text = text.substring(0, text.length - 3);
        }
        
        const code = text.trim();
        return { code, inputChars: fullPrompt.length };

    } catch (error) {
        throw new LlmError("Failed to generate initial game.", config.provider, config.modelName, error);
    }
};

const improveGameGemini = async (
    currentCode: string, gameDescription: string, gameType: GameType,
    developerNotes: string[], longTermMemory: string[], shortTermPlans: string[],
    config: LlmConfig, screenshotsBase64?: string[]
): Promise<{ result: ImprovementResult, inputChars: number }> => {
    try {
        const ai = new GoogleGenAI({ apiKey: config.apiKey || FALLBACK_GEMINI_API_KEY });
        const promptText = improvementPromptGemini(currentCode, gameDescription, gameType, developerNotes, longTermMemory, shortTermPlans, screenshotsBase64?.length ?? 0);
        
        const parts: any[] = [];
        
        if (screenshotsBase64 && screenshotsBase64.length > 0) {
            screenshotsBase64.forEach(screenshot => {
                parts.push({
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: screenshot,
                    },
                });
            });
        }
        parts.push({ text: promptText });
        
        const response = await ai.models.generateContent({
            model: config.modelName,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        analysis: { type: Type.STRING },
                        thought: { type: Type.STRING },
                        plan: { type: Type.STRING },
                        newCode: { type: Type.STRING }
                    },
                    required: ["analysis", "thought", "plan", "newCode"]
                }
            }
        });
        
        const jsonText = response.text.trim();
        const result: ImprovementResult = JSON.parse(jsonText);
        return { result, inputChars: promptText.length };

    } catch (error) {
        throw new LlmError("Failed to improve game.", config.provider, config.modelName, error);
    }
};

// --- Public Service Functions ---

interface ImprovementResult {
    newCode: string;
    analysis: string;
    thought: string;
    plan: string;
}

export const generateInitialGame = async (prompt: string, gameType: GameType, config: LlmConfig): Promise<{ code: string, inputChars: number }> => {
    if (config.provider === 'openai') {
        return generateInitialGameOpenAI(prompt, gameType, config);
    }
    return generateInitialGameGemini(prompt, gameType, config);
};


export const improveGame = async (
    currentCode: string, gameDescription: string, gameType: GameType,
    developerNotes: string[], longTermMemory: string[], shortTermPlans: string[],
    config: LlmConfig, screenshotsBase64?: string[]
): Promise<{ result: ImprovementResult, inputChars: number }> => {
     if (config.provider === 'openai') {
        return improveGameOpenAI(currentCode, gameDescription, gameType, developerNotes, longTermMemory, shortTermPlans, config, screenshotsBase64);
    }
    return improveGameGemini(currentCode, gameDescription, gameType, developerNotes, longTermMemory, shortTermPlans, config, screenshotsBase64);
};

export const summarizeHistory = async (plans: string[], config: LlmConfig): Promise<{ summary: string, inputChars: number }> => {
    const prompt = `You are an expert project manager. Your task is to summarize a list of recent development steps for a game project into a single, concise sentence. This summary will serve as a long-term memory for the development AI.

Recent Steps:
${plans.map((plan, i) => `${i + 1}. ${plan}`).join('\n')}

Based on these steps, what was the primary focus or achievement during this phase?
Respond ONLY with the single summary sentence. Do not add any other text.
Example Response: Refactored the physics engine for better performance and added a new enemy type.`;
    
    try {
        if (config.provider === 'openai') {
            const requestBody = { messages: [{ role: "user", content: prompt }] };
            const response = await callOpenAICompatible(config, requestBody);
            const summary = response.choices[0]?.message?.content?.trim() ?? '';
            return { summary, inputChars: JSON.stringify(requestBody).length };
        } else {
            // Gemini provider
            const ai = new GoogleGenAI({ apiKey: config.apiKey || FALLBACK_GEMINI_API_KEY });
            const response = await ai.models.generateContent({
                model: config.modelName,
                contents: prompt,
            });
            const summary = response.text.trim();
            return { summary, inputChars: prompt.length };
        }
    } catch (error) {
       console.error("Error in summarizeHistory:", error);
       // Return a fallback to avoid crashing the loop
       return { summary: "Failed to summarize history.", inputChars: 0 }; 
    }
};