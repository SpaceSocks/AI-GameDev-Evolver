
import { LlmConfig } from '../types';

// System prompts tailored for OpenAI-compatible models
const SYSTEM_PROMPT_GAME_DEV = `You are an expert game developer AI. Your goal is to create a complete, playable game in a single HTML file.
Rules:
1.  **Single File:** The entire game (logic, styles) must be in one HTML file. Use inline <script> and <style>.
2.  **Phaser Framework:** You must use Phaser 3. Use the CDN: <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>.
3.  **Complete Code:** Always output the full, runnable HTML. No placeholders.
4.  **JSON Output:** Your response MUST be a single, valid JSON object. Do not add any extra text or markdown.
    {
      "thought": "Your thinking process for this iteration.",
      "plan": "A step-by-step plan for the code.",
      "code": "The full HTML source code for the game."
    }`;

const SYSTEM_PROMPT_IMPROVER = `You are an expert game developer AI. You will be given the current code, a screenshot, the original concept, and developer notes. Your task is to generate a new version of the game that incorporates the feedback.
Rules:
1.  **Single File & Complete Code:** Output the complete, runnable HTML file.
2.  **Phaser Framework:** You must use Phaser 3. The provided code already includes it.
3.  **Incorporate Feedback:** Address the latest "Developer Note".
4.  **Analyze Screenshot:** Use the screenshot to understand the visual state.
5.  **JSON Output:** Your response MUST be a single, valid JSON object. Do not add any extra text or markdown.
    {
      "analysis": "Your analysis of the current state and feedback.",
      "thought": "Your thinking process for this iteration.",
      "plan": "A step-by-step plan for the changes.",
      "code": "The full HTML source code for the game."
    }`;

const parseJsonResponse = (responseText: string) => {
    try {
        return JSON.parse(responseText);
    } catch (e) {
        // Fallback for models that wrap JSON in markdown
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match && match[0]) {
            try {
                return JSON.parse(match[0]);
            } catch (e2) {
                 console.error("Failed to parse extracted JSON:", responseText);
                 throw new Error("Invalid JSON response even after extraction.");
            }
        }
        console.error("Failed to parse JSON and no object found:", responseText);
        throw new Error("Invalid JSON response from model.");
    }
};

const getApiEndpoint = (config: LlmConfig) => (config.baseUrl || 'https://api.openai.com/v1') + '/chat/completions';

const callApi = async (config: LlmConfig, messages: any[]) => {
    const endpoint = getApiEndpoint(config);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const body: any = {
        model: config.modelName,
        messages,
        temperature: 0.7,
    };
    
    // Use json_object mode only for official OpenAI API, not for local/custom endpoints to ensure compatibility
    if (!config.baseUrl) {
        body.response_format = { type: "json_object" };
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
            throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorBody.error)}`);
        }
        
        const json = await response.json();
        return json.choices[0]?.message?.content || '';
    } catch (e: any) {
        if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
            const troubleshootingMsg = `Network request failed. This is often a Cross-Origin Resource Sharing (CORS) issue when connecting to a local LLM server (like LM Studio or Ollama).\n\nACTION REQUIRED: Please ensure your local server has CORS enabled and that you are not running into a Mixed Content (HTTP/HTTPS) issue. See the README for details.\nOriginal Message: ${e.message}`;
            throw new Error(troubleshootingMsg);
        }
        throw e;
    }
};

export const generateInitialCode = async (config: LlmConfig, gameConcept: string, gameType: 'interactive' | 'simulation') => {
    const userPrompt = `Game Concept: "${gameConcept}"\nGame Type: "${gameType}". A ${gameType} should be playable by a user if interactive, or run on its own if a simulation. Generate the initial complete HTML file for this game using Phaser 3.`;
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT_GAME_DEV },
        { role: 'user', content: userPrompt }
    ];

    const responseText = await callApi(config, messages);
    const result = parseJsonResponse(responseText);

    const inputLength = messages.reduce((acc, msg) => acc + msg.content.length, 0);

    return {
        ...result,
        inputChars: inputLength,
        outputChars: responseText.length,
    };
};

export const improveCode = async (config: LlmConfig, code: string, screenshot: string, gameConcept: string, devNotesHistory: string[], newDevNote: string) => {
    const userMessageContent = [
        {
            type: "image_url",
            image_url: {
                url: `data:image/jpeg;base64,${screenshot}`,
            },
        },
        {
            type: "text",
            text: `
Original Game Concept: "${gameConcept}"
Current HTML Code: \`\`\`html\n${code}\n\`\`\`
Developer Note History:\n- ${devNotesHistory.join('\n- ')}
New Developer Note: "${newDevNote}"
Analyze the code, screenshot, and notes, then generate the improved HTML file.`
        }
    ];

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT_IMPROVER },
        { role: 'user', content: userMessageContent as any }
    ];

    const responseText = await callApi(config, messages);
    const result = parseJsonResponse(responseText);
    const inputLength = (userMessageContent[1].text || '').length + SYSTEM_PROMPT_IMPROVER.length;

    return {
        ...result,
        inputChars: inputLength,
        outputChars: responseText.length,
    };
};

export const generateRandomIdea = async (config: LlmConfig, gameType: 'interactive' | 'simulation'): Promise<{ idea: string, inputChars: number, outputChars: number }> => {
    // Consolidated prompt for better compatibility with local models that may crash on system prompts.
    const prompt = `You are a creative concept generator.
Your task is to generate a single, creative, and concise concept for a simple web ${gameType} using Phaser.
An 'interactive' game involves player controls, while a 'simulation' runs on its own.
The concept must be a single short sentence.
Do not add any extra explanation or text. Only provide the concept.
Example for an interactive game: A platformer where a ninja squirrel collects golden acorns while avoiding robot owls.
Example for a simulation: A simple ecosystem where dots representing sheep wander and eat grass, while wolf dots hunt the sheep.

Generate a new, unique concept for a ${gameType} now.`;
    
    const messages = [
        // Using a single user role is more robust for many local models
        { role: 'user', content: prompt }
    ];

    const idea = await callApi(config, messages);
    return {
        idea: idea.trim().replace(/"/g, ''), // Clean up the response
        inputChars: prompt.length,
        outputChars: idea.length,
    };
};