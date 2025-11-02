import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { UserInput } from './components/UserInput';
import { GameTypeSelector } from './components/GameTypeSelector';
import { ApiConfig } from './components/ApiConfig';
import { EvolutionConfig } from './components/EvolutionConfig';
import { UserFeedback } from './components/UserFeedback';
import { TimingStats } from './components/TimingStats';
import { Controls } from './components/Controls';
import { GameDisplay, GameDisplayRef } from './components/GameDisplay';
import { TabButton } from './components/ui/TabButton';
import { StatusLog } from './components/StatusLog';
import { IterationHistory } from './components/IterationHistory';
import { DeveloperNotesLog } from './components/DeveloperNotesLog';
import { UsageStats } from './components/UsageStats';
import { Status, LlmProvider, UsageStat, Iteration, GameType } from './types';
import { callLlm } from './services/llmService';

const createGenerationPrompt = (description: string, type: GameType): string => {
  return `You are an expert game developer. Your task is to create a complete, single-file HTML game based on the user's concept.
The game logic must be implemented in JavaScript within a <script> tag. All necessary CSS should be in a <style> tag.
The game should be playable and visually appealing. Use a <canvas> element for rendering.
Do not use any external libraries or assets. Everything must be self-contained in one HTML file.

Game Concept: "${description}"
Game Type: ${type === 'interactive' ? 'An interactive game controlled by the player (e.g., keyboard or mouse).' : 'A visual simulation that runs on its own without player input.'}

Please provide only the full HTML code for the game. Do not include any explanations or markdown formatting around the code.
Your response should start with \`<!DOCTYPE html>\` and end with \`</html>\`.`;
};

const createImprovementPrompt = (
    description: string,
    type: GameType,
    notes: string[],
    previousCode: string,
    previousScreenshot: string, // base64
    iterationHistory: Iteration[]
): string => {
    const userNotes = notes.length > 0
        ? `Here are specific developer notes to address:\n- ${notes.join('\n- ')}`
        : 'There are no specific developer notes for this iteration. Focus on general improvements.';

    const context = iterationHistory.length > 1
        ? `This is iteration #${iterationHistory.length}. We have already tried a few things. Focus on novel improvements and refining the core concept.`
        : `This is the first improvement iteration. The goal is to refine the initial version.`;

    return `You are an expert game developer tasked with improving a self-contained HTML game.
You will be given the original game concept, the previous HTML code, a screenshot of it running, and a list of developer notes.

Your goal is to iteratively improve the game based on the feedback and your own expert analysis.
You must output a JSON object with the following structure: { "thought": "...", "analysis": "...", "plan": "...", "code": "..." }.

1.  **thought**: Briefly outline your high-level thinking process for this iteration. What are the main goals?
2.  **analysis**: Analyze the previous code and screenshot. What works well? What are the biggest weaknesses? What is the most important thing to fix or add? Consider gameplay, bugs, aesthetics, and code quality.
3.  **plan**: Provide a concise, step-by-step plan for the changes you will make to the code in this iteration.
4.  **code**: Provide the complete, new HTML file for the game. It must be a single, self-contained file with all CSS and JavaScript included. It must start with \`<!DOCTYPE html>\` and end with \`</html>\`.

**Original Game Concept**: "${description}"
**Game Type**: ${type}
**Context**: ${context}

**Developer Notes**:
${userNotes}

**Previous Code**:
\`\`\`html
${previousCode}
\`\`\`

**Screenshot Analysis**:
(You have been provided a screenshot of the previous version running. Use it to identify visual bugs, UI/UX issues, or gameplay state problems that might not be obvious from the code alone.)

Now, provide your response as a single JSON object. Do not add any text or markdown formatting before or after the JSON.
`;
};


const App: React.FC = () => {
  // Config state
  const [gameDescription, setGameDescription] = useState('A side-scrolling game where a cat jumps over dogs to collect fish.');
  const [gameType, setGameType] = useState<GameType>('interactive');
  const [provider, setProvider] = useState<LlmProvider>('gemini');
  const [apiKey, setApiKey] = useState(''); // Only for OpenAI
  const [baseUrl, setBaseUrl] = useState(''); // Only for OpenAI
  const [modelName, setModelName] = useState('gemini-2.5-pro');
  const [maxIterations, setMaxIterations] = useState(10);

  // App status state
  const [status, setStatus] = useState<Status>(Status.Idle);
  const [logHistory, setLogHistory] = useState<string[]>([]);
  const [iterationHistory, setIterationHistory] = useState<Iteration[]>([]);
  const [developerNotes, setDeveloperNotes] = useState<string[]>([]);
  const [usageHistory, setUsageHistory] = useState<UsageStat[]>([]);
  
  // Timing state
  const [totalTime, setTotalTime] = useState(0);
  const [iterationTimes, setIterationTimes] = useState<number[]>([]);
  const [currentIteration, setCurrentIteration] = useState(0);

  // UI state
  const [displayedCode, setDisplayedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'log' | 'iterations' | 'dev_notes' | 'usage'>('log');
  const [selectedIteration, setSelectedIteration] = useState<number | null>(null);

  // Refs
  const gameDisplayRef = useRef<GameDisplayRef>(null);
  const isRunningRef = useRef(false);
  const currentIterationRef = useRef(0);
  const developerNotesRef = useRef(developerNotes);
  const iterationHistoryRef = useRef(iterationHistory);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isRunning = status === Status.Generating || status === Status.Improving;
  
  useEffect(() => {
    developerNotesRef.current = developerNotes;
  }, [developerNotes]);

  useEffect(() => {
    iterationHistoryRef.current = iterationHistory;
  }, [iterationHistory]);
  
  useEffect(() => {
    if (isRunning) {
      isRunningRef.current = true;
      const startTime = Date.now() - totalTime;
      timerRef.current = setInterval(() => {
        setTotalTime(Date.now() - startTime);
      }, 1000);
    } else {
      isRunningRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, totalTime]);

  const log = useCallback((message: string) => {
    console.log(message);
    setLogHistory(prev => [...prev, message]);
  }, []);

  const handleAddNote = (note: string) => {
    setDeveloperNotes(prev => [...prev, note]);
    log(`[User Feedback] Added developer note: "${note}"`);
  };

  const handleStopEvolution = () => {
    log('Stopping evolution...');
    isRunningRef.current = false;
    setStatus(Status.Stopped);
  };
  
  const handleSelectIteration = useCallback((index: number) => {
    setSelectedIteration(index);
    setDisplayedCode(iterationHistory[index].code);
    setActiveTab('iterations');
  }, [iterationHistory]);

  const parseImprovementResponse = (responseText: string): { thought: string, analysis: string, plan: string, code: string } | null => {
    try {
        const cleanedText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(cleanedText);
        if (parsed.code && parsed.thought && parsed.analysis && parsed.plan) {
            return parsed;
        }
        return null;
    } catch (e) {
        log(`Warning: Failed to parse JSON from LLM response. Falling back to code extraction. Error: ${(e as Error).message}`);
        const codeMatch = responseText.match(/<!DOCTYPE html>[\s\S]*<\/html>/);
        if (codeMatch) {
            return {
                thought: "Could not parse full JSON response, but was able to extract HTML code.",
                analysis: "Analysis not available due to parsing error.",
                plan: "Plan not available due to parsing error.",
                code: codeMatch[0]
            };
        }
        return null;
    }
  };

  const handleStartEvolution = useCallback(async () => {
    // Reset state for a new run
    setLogHistory([]);
    setIterationHistory([]);
    setUsageHistory([]);
    setIterationTimes([]);
    setTotalTime(0);
    setCurrentIteration(1);
    currentIterationRef.current = 1;
    setSelectedIteration(null);
    setActiveTab('log');
    
    log('Starting new evolution...');
    setStatus(Status.Generating);
    
    let currentCode = '';
    const iterationStartTime = Date.now();

    try {
        // STEP 1: Generation
        log(`Generating initial game code for: "${gameDescription}"`);
        const generationPrompt = createGenerationPrompt(gameDescription, gameType);
        const genResponse = await callLlm({ provider, prompt: generationPrompt, modelName, apiKey, baseUrl });
        currentCode = genResponse.content.replace(/^```html\n/, '').replace(/\n```$/, '');
        
        setDisplayedCode(currentCode);
        setUsageHistory(prev => [...prev, { iteration: 1, task: 'generation', provider, inputChars: genResponse.inputChars, outputChars: genResponse.outputChars }]);
        log('Initial code generated successfully.');

        await new Promise(resolve => setTimeout(resolve, 1000)); // wait for iframe to render
        const screenshot = await gameDisplayRef.current?.captureScreenshot();
        const firstIteration: Iteration = { code: currentCode, screenshot };
        setIterationHistory([firstIteration]);
        iterationHistoryRef.current = [firstIteration];
        
        // STEP 2: Improvement Loop
        for (let i = 1; i <= maxIterations; i++) {
            if (!isRunningRef.current) {
                setStatus(Status.Stopped);
                log('Evolution stopped by user.');
                return;
            }
            const iterNum = i + 1;
            setCurrentIteration(iterNum);
            currentIterationRef.current = iterNum;
            setStatus(Status.Improving);
            log(`--- Starting Iteration ${iterNum}/${maxIterations + 1} ---`);
            
            const improvementPrompt = createImprovementPrompt(gameDescription, gameType, developerNotesRef.current, currentCode, screenshot || '', iterationHistoryRef.current);
            const improveResponse = await callLlm({ provider, prompt: improvementPrompt, modelName, apiKey, baseUrl });
            
            const parsedData = parseImprovementResponse(improveResponse.content);
            if (!parsedData) {
                throw new Error("Failed to get valid improvement data from LLM.");
            }
            
            log(`[Thought] ${parsedData.thought}`);
            log(`[Analysis] ${parsedData.analysis}`);
            log(`[Plan] ${parsedData.plan}`);

            currentCode = parsedData.code;
            setDisplayedCode(currentCode);
            setUsageHistory(prev => [...prev, { iteration: iterNum, task: 'improvement', provider, inputChars: improveResponse.inputChars, outputChars: improveResponse.outputChars }]);
            log(`Iteration ${iterNum} code received.`);

            await new Promise(resolve => setTimeout(resolve, 1000));
            const newScreenshot = await gameDisplayRef.current?.captureScreenshot();
            const newIteration: Iteration = { code: currentCode, screenshot: newScreenshot };

            setIterationHistory(prev => [...prev, newIteration]);
            iterationHistoryRef.current = [...iterationHistoryRef.current, newIteration];
            
            const iterationTime = Date.now() - iterationStartTime;
            setIterationTimes(prev => [...prev, iterationTime]);
            log(`Iteration ${iterNum} finished in ${(iterationTime / 1000).toFixed(2)}s.`);
        }
        
        setStatus(Status.Finished);
        log('Evolution finished successfully!');

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error: ${errorMessage}`);
        setStatus(Status.Error);
    }

  }, [gameDescription, gameType, provider, modelName, apiKey, baseUrl, maxIterations, log]);


  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen flex flex-col font-sans">
      <Header />
      <main className="flex-grow grid lg:grid-cols-4 gap-4 p-4 overflow-hidden">
        {/* Left Panel */}
        <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto min-h-0 pr-2">
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4 space-y-4">
            <UserInput value={gameDescription} onChange={setGameDescription} disabled={isRunning} />
            <GameTypeSelector value={gameType} onChange={setGameType} disabled={isRunning} />
          </div>
           <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4 space-y-4">
              <EvolutionConfig maxIterations={maxIterations} setMaxIterations={setMaxIterations} disabled={isRunning} />
           </div>
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4 space-y-4">
              <ApiConfig 
                  provider={provider} setProvider={setProvider}
                  apiKey={apiKey} setApiKey={setApiKey}
                  baseUrl={baseUrl} setBaseUrl={setBaseUrl}
                  modelName={modelName} setModelName={setModelName}
                  disabled={isRunning}
              />
          </div>
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4 space-y-4">
            <UserFeedback onSend={handleAddNote} disabled={isRunning} />
          </div>
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-4 space-y-4">
              <TimingStats totalElapsed={totalTime} iterationTimes={iterationTimes} currentIteration={currentIteration} status={status} />
          </div>
          <div className="mt-auto pt-4 sticky bottom-0 bg-gray-900">
              <Controls status={status} onStart={handleStartEvolution} onStop={handleStopEvolution} />
          </div>
        </div>

        {/* Center Panel */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <GameDisplay ref={gameDisplayRef} htmlContent={displayedCode || null} />
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-1 flex flex-col bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden min-h-0">
          <div className="flex border-b border-gray-700 bg-gray-900/50 flex-shrink-0">
            <TabButton label="Evolution Log" isActive={activeTab === 'log'} onClick={() => setActiveTab('log')} />
            <TabButton label="Review Iterations" isActive={activeTab === 'iterations'} onClick={() => setActiveTab('iterations')} />
            <TabButton label="Developer Notes" isActive={activeTab === 'dev_notes'} onClick={() => setActiveTab('dev_notes')} />
            <TabButton label="Usage Stats" isActive={activeTab === 'usage'} onClick={() => setActiveTab('usage')} />
          </div>
          <div className="p-4 overflow-y-auto flex-grow">
            {activeTab === 'log' && <StatusLog history={logHistory} />}
            {activeTab === 'iterations' && <IterationHistory history={iterationHistory} onSelect={handleSelectIteration} selectedIndex={selectedIteration} />}
            {activeTab === 'dev_notes' && <DeveloperNotesLog notes={developerNotes} />}
            {activeTab === 'usage' && <UsageStats history={usageHistory} />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;