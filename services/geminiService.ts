import { GoogleGenAI, Part, Type } from "@google/genai";
import { LlmConfig } from '../types';

// System prompts defining the agent's behavior.
const SYSTEM_PROMPT_GAME_DEV = `You are an expert game developer AI. Your goal is to iteratively create a complete, playable game in a single HTML file with embedded JavaScript and CSS.
You must follow these rules:
1.  **Single File:** The entire game logic, assets (if simple), and styles must be contained within a single HTML file. Use inline <script> and <style> tags. Do not use external files.
2.  **Phaser Framework:** You must use the Phaser 3 framework for game development. Use the CDN link: <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>.
3.  **Complete Code:** Always output the complete, runnable HTML file. Do not use placeholders like "// your game code here".
4.  **No Placeholders:** All logic must be fully implemented.
5.  **JSON Output:** Your response must be a single JSON object with the following structure:
    {
      "thought": "A brief description of your thinking process for this iteration.",
      "plan": "A concise step-by-step plan for the changes you are about to make.",
      "code": "The full HTML source code for the game."
    }
6.  **Valid HTML:** The 'code' field must contain valid and complete HTML.
7.  **Do not use markdown:** The output MUST be a raw JSON string. Do not wrap it in \`\`\`json ... \`\`\`.`;


const SYSTEM_PROMPT_IMPROVER = `You are an expert game developer AI. You will be given the current state of a game (HTML code), a screenshot of the game, the original game concept, a history of developer notes, and a new developer note.
Your task is to analyze this information and generate a new version of the game code that incorporates the feedback and improves the game.
You must follow these rules:
1.  **Single File:** The entire game logic, assets (if simple), and styles must be contained within a single HTML file. Use inline <script> and <style> tags. Do not use external files.
2.  **Phaser Framework:** You must use the Phaser 3 framework. The provided code already includes it.
3.  **Complete Code:** Always output the complete, runnable HTML file. Do not use placeholders.
4.  **Incorporate Feedback:** Directly address the latest "Developer Note" and consider the "Developer Note History".
5.  **Analyze Screenshot:** Use the screenshot to understand the current visual state of the game and identify areas for improvement.
6.  **JSON Output:** Your response must be a single JSON object with the following structure:
    {
      "analysis": "A brief analysis of the current code, screenshot, and developer feedback.",
      "thought": "A brief description of your thinking process for this iteration.",
      "plan": "A concise step-by-step plan for the changes you are about to make.",
      "code": "The full HTML source code for the game."
    }
7.  **Valid HTML:** The 'code' field must contain valid and complete HTML.
8.  **Do not use markdown:** The output MUST be a raw JSON string. Do not wrap it in \`\`\`json ... \`\`\`.`;


let ai: GoogleGenAI;

const getAi = () => {
  if (!ai) {
    // FIX: Per guidelines, API key must be from process.env.API_KEY.
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  }
  return ai;
};

const generate = async (config: LlmConfig, contents: (string | Part)[], systemInstruction: string) => {
    const ai = getAi();
    
    const model = ai.models[config.modelName];

    const response = await model.generateContent({
        contents: [{ role: 'user', parts: contents.map(c => typeof c === 'string' ? { text: c } : c) }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    analysis: { type: Type.STRING, description: "Analysis of the current state." },
                    thought: { type: Type.STRING, description: "Thinking process." },
                    plan: { type: Type.STRING, description: "Step-by-step plan." },
                    code: { type: Type.STRING, description: "The full HTML source code." },
                },
                // All properties are optional as they depend on the prompt
                required: ["thought", "plan", "code"]
            },
            systemInstruction,
        },
    });

    const text = response.text.trim();
    try {
        const result = JSON.parse(text);
        const inputLength = contents.reduce((acc, part) => {
            if (typeof part === 'string') return acc + part.length;
            if ('text' in part && typeof part.text === 'string') return acc + part.text.length;
            return acc;
        }, 0);

        return {
            ...result,
            inputChars: inputLength,
            outputChars: text.length,
        };
    } catch (e) {
        console.error("Failed to parse Gemini JSON response:", text);
        throw new Error("Invalid JSON response from model.");
    }
};

export const generateInitialCode = async (config: LlmConfig, gameConcept: string, gameType: 'interactive' | 'simulation') => {
    const prompt = `Game Concept: "${gameConcept}"\nGame Type: "${gameType}". A ${gameType} should be playable by a user if interactive, or run on its own if a simulation. Generate the initial complete HTML file for this game using Phaser 3.`;
    return generate(config, [prompt], SYSTEM_PROMPT_GAME_DEV);
};

export const improveCode = async (config: LlmConfig, code: string, screenshot: string, gameConcept: string, devNotesHistory: string[], newDevNote: string) => {
    const imagePart: Part = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: screenshot,
        },
    };

    const textContent = `
Original Game Concept: "${gameConcept}"

Current HTML Code:
\`\`\`html
${code}
\`\`\`

Developer Note History:
- ${devNotesHistory.join('\n- ')}

New Developer Note: "${newDevNote}"

Analyze the code, screenshot, and notes, then generate the improved HTML file.
`.trim();

    return generate(config, [imagePart, {text: textContent}], SYSTEM_PROMPT_IMPROVER);
};


export const generateRandomIdea = async (config: LlmConfig): Promise<{ idea: string, inputChars: number, outputChars: number }> => {
    const ai = getAi();
    const prompt = "Generate a single, creative, and concise game concept suitable for a simple web game. The concept should be a short sentence. Example: A platformer where a ninja squirrel collects golden acorns while avoiding robot owls.";
    
    const model = ai.models[config.modelName];

    const response = await model.generateContent(prompt);

    const idea = response.text.trim();
    return {
        idea,
        inputChars: prompt.length,
        outputChars: idea.length,
    };
};
