import { GoogleGenAI, Type } from "@google/genai";
import { GameType } from "../components/GameTypeSelector";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const initialGenerationPrompt = (prompt: string, gameType: GameType) => `
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

const improvementPrompt = (
    currentCode: string, 
    gameDescription: string, 
    gameType: GameType,
    userFeedback: string, 
    longTermMemory: string[], 
    shortTermPlans: string[],
    screenshotCount: number
) => `
You are an expert game developer tasked with iteratively improving a game. You will be given the complete context of the project, including its original concept, your long-term memory of past development phases, your recent actions, and high-priority feedback from the user. Your goal is to be transparent about your thinking process.

**Core Mandate: Performance is critical.** The game must run smoothly, targeting 60 FPS. Actively look for and fix performance bottlenecks, and do not introduce code that would cause significant lag. Analyze all proposed changes for performance impact before implementing them.
${screenshotCount > 0 ? ` You have also been provided a sequence of ${screenshotCount} screenshots, taken at intervals over a 15-second period, to show a broader scope of the gameplay and its progression.` : ""}

**Original Game Concept:** "${gameDescription}"
**Game Type:** ${gameType === 'interactive' ? 'Interactive Game' : 'Visual Simulation'}
${gameType === 'simulation' ? '**IMPORTANT:** This is a visual simulation. Adhere strictly to the requirement of NO user interaction or controls.' : ''}

**Developer's Notes (High Priority):** "${userFeedback || "No notes provided for this iteration."}"

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
2.  **Thought:** Based on your analysis, the user's notes, and your memory, reason about what to do next. The user's notes are the most important directive. What is the single most important improvement to make right now? Consider the original game concept, the performance mandate, and the strict game type requirement. Think step-by-step about performance implications.
3.  **Plan:** State a single, concrete, and implementable improvement for this iteration. This should be a concise summary of your thought process. Example: "I will optimize the render loop by only redrawing changed objects to improve performance."
4.  **Implement:** Rewrite the ENTIRE 'index.html' file to incorporate your plan. Ensure the game remains fully functional, performant, and self-contained in one file, while strictly adhering to the game type.

Respond ONLY with a JSON object that strictly follows the provided schema. Do not add any other text or markdown formatting.
`;

export const generateInitialGame = async (prompt: string, gameType: GameType): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: initialGenerationPrompt(prompt, gameType),
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
        return text.trim();

    } catch (error) {
        console.error("Error in generateInitialGame:", error);
        throw new Error("Failed to generate the initial game from the AI model.");
    }
};

export const improveGame = async (
    currentCode: string, 
    gameDescription: string,
    gameType: GameType,
    userFeedback: string,
    longTermMemory: string[],
    shortTermPlans: string[],
    screenshotsBase64?: string[]
): Promise<{ newCode: string, analysis: string, thought: string, plan: string }> => {
    try {
        const model = 'gemini-2.5-pro';
        const promptText = improvementPrompt(currentCode, gameDescription, gameType, userFeedback, longTermMemory, shortTermPlans, screenshotsBase64?.length ?? 0);
        
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
            model,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        analysis: {
                            type: Type.STRING,
                            description: "A detailed analysis of the current code and screenshots."
                        },
                        thought: {
                            type: Type.STRING,
                            description: "The AI's internal monologue about potential issues and ideas for improvement."
                        },
                        plan: {
                            type: Type.STRING,
                            description: "A short, concrete summary of the single improvement being implemented."
                        },
                        newCode: {
                            type: Type.STRING,
                            description: "The complete, new 'index.html' source code with the improvement."
                        }
                    },
                    required: ["analysis", "thought", "plan", "newCode"]
                }
            }
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result;

    } catch (error) {
        console.error("Error in improveGame:", error);
        throw new Error("Failed to improve the game from the AI model.");
    }
};

export const summarizeHistory = async (plans: string[]): Promise<string> => {
    try {
        const prompt = `
        You are an expert project manager. Your task is to summarize a list of recent development steps for a game project into a single, concise sentence. This summary will serve as a long-term memory for the development AI.

        Recent Steps:
        ${plans.map((plan, i) => `${i + 1}. ${plan}`).join('\n')}

        Based on these steps, what was the primary focus or achievement during this phase?

        Respond ONLY with the single summary sentence. Do not add any other text.
        Example Response: Refactored the physics engine for better performance and added a new enemy type.
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error in summarizeHistory:", error);
        return "Failed to summarize history."; // Return a fallback to avoid crashing the loop
    }
};