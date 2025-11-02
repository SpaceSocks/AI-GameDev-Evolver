import { GoogleGenAI, Type } from "@google/genai";
import { LlmConfig } from "../types";

const getClient = (config: LlmConfig) => {
  // Fix: Per guidelines, API key must be from process.env.API_KEY
  return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

const getGameTypePrompt = (gameType: 'interactive' | 'simulation'): string => {
    if (gameType === 'interactive') {
        return 'The game must be interactive, responding to user input (e.g., keyboard or mouse).';
    }
    return 'The game should be a visual simulation that runs on its own without user input, like a screensaver or digital art.';
}

const codeGenerationInstruction = `You are an expert game developer. Your task is to create a complete, self-contained HTML file for a game.
The file must include all necessary HTML, CSS, and JavaScript.
- Use the HTML5 canvas for rendering.
- Use requestAnimationFrame for the game loop.
- Do NOT use any external libraries, frameworks, or assets (no imports, no CDN links).
- All code, styles, and markup must be in a single file.
- Your response must be ONLY the raw HTML code. Do NOT wrap it in markdown backticks (\`\`\`html) or any other explanatory text.
`;

export const generateInitialCode = async (
  config: LlmConfig,
  gameConcept: string,
  gameType: 'interactive' | 'simulation'
): Promise<string> => {
  const ai = getClient(config);
  const gameTypePrompt = getGameTypePrompt(gameType);

  const prompt = `${codeGenerationInstruction}
  
  Game Concept: "${gameConcept}"
  Game Type: ${gameTypePrompt}
  
  Create the initial version of this game.`;

  try {
    const response = await ai.models.generateContent({
      model: config.modelName,
      contents: prompt,
    });
    // Fix: Per guidelines, use response.text to get the output.
    return response.text.trim();
  } catch (error) {
    console.error("Error generating initial code with Gemini:", error);
    throw new Error(`Gemini API Error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const improveCodeSchema = {
    type: Type.OBJECT,
    properties: {
      analysis: {
        type: Type.STRING,
        description: "A brief analysis of the screenshot provided. What do you see in the game's current state? What is working, what is broken? Be concise.",
      },
      thought: {
        type: Type.STRING,
        description: 'Your thought process. First, analyze the user request, the screenshot, and the code. Identify bugs, flaws, and areas for improvement. Think step-by-step about what you need to do to address the user feedback and evolve the game.',
      },
      plan: {
        type: Type.STRING,
        description: 'A concise, step-by-step plan of the changes you will make to the code.',
      },
      memory: {
        type: Type.STRING,
        description: 'A summary of the key takeaways from this iteration that should be remembered for the next one. What was added, what was fixed, and what is the current state of the game? This helps maintain context over multiple iterations.'
      },
      code: {
        type: Type.STRING,
        description: `The complete, new, self-contained HTML file for the game. It must include all necessary HTML, CSS, and JavaScript. Do not use external libraries or assets.`,
      },
    },
    required: ['analysis', 'thought', 'plan', 'memory', 'code'],
  };

export const improveCode = async (
  config: LlmConfig,
  code: string,
  screenshot: string, // base64 encoded string
  gameConcept: string,
  devNotesHistory: string[],
  newDevNote?: string
): Promise<{ thought: string; plan: string; code: string; analysis: string; memory: string; }> => {
  const ai = getClient(config);

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: screenshot,
    },
  };
  
  let notesPrompt = 'There are no developer notes yet.';
  if (devNotesHistory.length > 0 || newDevNote) {
      const allNotes = [...devNotesHistory];
      if (newDevNote) {
          allNotes.push(newDevNote);
      }
      notesPrompt = `Here is a list of developer notes to address. Treat them like a checklist.
${allNotes.map((note, index) => `- Note ${index + 1}: ${note}`).join('\n')}
The most recent note is the highest priority.`
  }

  const prompt = `You are an expert game developer iteratively improving a game.
  
  **Original Concept:** ${gameConcept}
  
  **Task:** Analyze the provided code, screenshot, and developer notes. Then, generate a new version of the code that improves the game.
  
  **Developer Notes / Checklist:**
  ${notesPrompt}
  
  **Current Code:**
  \`\`\`html
  ${code}
  \`\`\`
  
  **Instructions:**
  1.  **Analyze:** Look at the screenshot. What is the current state? Does it match the code? Are there visual bugs?
  2.  **Think:** Review the developer notes and the original concept. How can you implement the requested features or fix bugs?
  3.  **Plan:** Create a step-by-step plan for your code changes.
  4.  **Recode:** Rewrite the entire HTML file with your improvements. The new code must be a complete, self-contained file. Do not provide a diff or patch.
  5.  **Summarize:** Create a memory entry summarizing the changes for future context.
  
  Provide your response as a single JSON object matching the required schema.`;

  const textPart = { text: prompt };

  try {
    const response = await ai.models.generateContent({
      model: config.modelName,
      contents: { parts: [textPart, imagePart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: improveCodeSchema,
      },
    });

    // Fix: Per guidelines, access text and trim.
    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    
    // Sometimes the model might still wrap the code in markdown, so we strip it just in case.
    if (result.code) {
        result.code = result.code.replace(/^```html\n/, '').replace(/\n```$/, '');
    }

    return result;
  } catch (error) {
    console.error("Error improving code with Gemini:", error);
    throw new Error(`Gemini API Error: ${error instanceof Error ? error.message : String(error)}`);
  }
};


export const generateRandomIdea = async (
    config: LlmConfig,
    gameType: 'interactive' | 'simulation'
): Promise<string> => {
    const ai = getClient(config);
    const gameTypePrompt = getGameTypePrompt(gameType);

    const prompt = `You are a creative game designer. Brainstorm a simple but fun concept for a browser game.
    The concept should be suitable for a single developer to create in a short amount of time.
    ${gameTypePrompt}
    
    Provide only the game concept description, in 1-2 sentences. Do not add any extra text or pleasantries.`;

    try {
        const response = await ai.models.generateContent({
            // Fix: Per guidelines, use a simpler model for basic text tasks.
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating random idea with Gemini:", error);
        throw new Error(`Gemini API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
};
