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

// Code diffing utility to reduce token usage
const computeCodeDiff = (oldCode: string, newCode: string): string => {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const maxLines = 100; // Only show first 100 lines of diff
    
    let diff = '';
    let oldIdx = 0;
    let newIdx = 0;
    let diffLineCount = 0;
    
    while ((oldIdx < oldLines.length || newIdx < newLines.length) && diffLineCount < maxLines) {
        if (oldIdx >= oldLines.length) {
            diff += `+${newLines[newIdx]}\n`;
            newIdx++;
            diffLineCount++;
        } else if (newIdx >= newLines.length) {
            diff += `-${oldLines[oldIdx]}\n`;
            oldIdx++;
            diffLineCount++;
        } else if (oldLines[oldIdx] === newLines[newIdx]) {
            oldIdx++;
            newIdx++;
        } else {
            // Find next matching line
            let found = false;
            for (let search = oldIdx + 1; search < Math.min(oldIdx + 10, oldLines.length); search++) {
                if (oldLines[search] === newLines[newIdx]) {
                    for (let d = oldIdx; d < search; d++) {
                        diff += `-${oldLines[d]}\n`;
                        diffLineCount++;
                    }
                    oldIdx = search;
                    found = true;
                    break;
                }
            }
            if (!found) {
                diff += `-${oldLines[oldIdx]}\n+${newLines[newIdx]}\n`;
                oldIdx++;
                newIdx++;
                diffLineCount += 2;
            }
        }
    }
    
    if (diffLineCount >= maxLines) {
        diff += `\n... (diff truncated, showing first ${maxLines} lines)\n`;
    }
    
    return diff || 'No changes detected';
};

// Summarize code structure for context
const summarizeCode = (code: string, maxLength: number = 2000): string => {
    if (code.length <= maxLength) return code;
    
    // Extract key parts: script tag content, important functions
    const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
        const scriptContent = scriptMatch[1];
        // Get function/class definitions
        const importantParts = scriptContent.match(/(function\s+\w+|const\s+\w+\s*=|class\s+\w+|let\s+\w+\s*=)/g);
        if (importantParts) {
            const summary = `[Code summary: ${importantParts.length} key functions/declarations. Full code is ${code.length.toLocaleString()} chars.]\n\nKey elements: ${importantParts.slice(0, 10).join(', ')}...`;
            return summary + '\n\n[Full code provided in previous iteration context. Focus on changes needed.]';
        }
    }
    return `[Code too large: ${code.length.toLocaleString()} chars. Previous version retained in context.]`;
};

const createGenerationPrompt = (description: string, type: GameType): string => {
  return `You are an expert game developer. Your task is to create a complete, single-file HTML game based on the user's concept.
The game logic must be implemented in JavaScript within a <script> tag. All necessary CSS should be in a <style> tag.
The game should be playable and visually appealing. Use a <canvas> element for rendering.
Do not use any external libraries or assets. Everything must be self-contained in one HTML file.

IMPORTANT REQUIREMENTS:
- The canvas must fill the entire viewport (width: 100%, height: 100% or width/height matching window size)
- Body should have no margins/padding and display flex to center content
- For simulations: The game should START AUTOMATICALLY when loaded - no start button required unless specified
- For interactive games: Start button is acceptable
- Make it visually impressive and engaging
- Full-screen canvas rendering is critical

Game Concept: "${description}"
Game Type: ${type === 'interactive' ? 'An interactive game controlled by the player (e.g., keyboard or mouse).' : 'A visual simulation that runs automatically on its own without any player input - start immediately when loaded.'}

Please provide only the full HTML code for the game. Do not include any explanations or markdown formatting around the code.
Your response should start with \`<!DOCTYPE html>\` and end with \`</html>\`.`;
};

const createImprovementPrompt = (
    description: string,
    type: GameType,
    notes: string[],
    previousCode: string,
    compressedScreenshot: string, // Single compressed base64 screenshot
    iterationHistory: Iteration[]
): string => {
    const iterationNumber = iterationHistory.length;
    const isFirstIteration = iterationHistory.length === 1;
    
    const userNotes = notes.length > 0
        ? `CRITICAL PRIORITY: Address these developer notes:\n- ${notes.join('\n- ')}\n\nAddress at least ONE note.`
        : 'Focus on measurable improvements: bugs, performance, stability.';

    // Always include full code (LLM needs it), but make prompt concise
    const codeContext = `**Current Code** (${previousCode.length.toLocaleString()} chars):\n\`\`\`html\n${previousCode}\n\`\`\``;

    // Include compressed screenshot if available
    const screenshotSection = compressedScreenshot 
        ? `**Current Visual State (Compressed)**:
Here is a compressed screenshot of the running game. Analyze it visually for bugs, visual issues, or gameplay problems:

\`\`\`
${compressedScreenshot}
\`\`\`

Use this visual to understand the current state and identify specific visual issues to fix.`
        : `**Visual State**: Analyze the game visually for issues.`;

    // Concise context
    const iterationContext = isFirstIteration
        ? `First improvement iteration. Build on the initial version incrementally.`
        : `Iteration #${iterationNumber}. Previous iterations tested improvements. Make ONE focused change that measurably improves quality.`;

    return `Improve this HTML game. You MUST respond with a single valid JSON object in this exact format:

{
  "thought": "brief explanation of your improvement strategy",
  "analysis": "what works well and what needs fixing",
  "plan": "step-by-step plan for the changes",
  "code": "complete HTML file starting with <!DOCTYPE html> and ending with </html>"
}

**Goal**: Make ONE measurable improvement: fix bugs, improve performance/stability, or address developer notes. Preserve working features.

**Original Concept**: "${description}"
**Game Type**: ${type}
**Iteration**: ${iterationContext}

${userNotes}

${codeContext}

${screenshotSection}

**Improvement Rules**:
- Fix bugs first (highest priority)
- Improve performance: reduce lag, optimize rendering
- Enhance stability: smoother animations, fix edge cases
- Preserve ALL working features
- Make ONE focused change, not many
- Output complete HTML file starting with <!DOCTYPE html> and ending with </html>

**CRITICAL**: Your response must be ONLY valid JSON, nothing else. No markdown, no explanations, no code fences. Start with { and end with }.`;
};


const App: React.FC = () => {
  // Config state with localStorage initialization
  const [gameDescription, setGameDescription] = useState('A side-scrolling game where a cat jumps over dogs to collect fish.');
  const [gameType, setGameType] = useState<GameType>('interactive');
  const [provider, setProvider] = useState<LlmProvider>((localStorage.getItem('evoforge_provider') as LlmProvider) || 'gemini');
  const [apiKey, setApiKey] = useState(localStorage.getItem('evoforge_apiKey') || ''); // Only for OpenAI
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('evoforge_baseUrl') || ''); // Only for OpenAI
  const [modelName, setModelName] = useState(localStorage.getItem('evoforge_modelName') || 'gemini-2.5-pro');
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
  
  // Save API settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('evoforge_provider', provider);
  }, [provider]);
  
  useEffect(() => {
    localStorage.setItem('evoforge_apiKey', apiKey);
  }, [apiKey]);
  
  useEffect(() => {
    localStorage.setItem('evoforge_baseUrl', baseUrl);
  }, [baseUrl]);
  
  useEffect(() => {
    localStorage.setItem('evoforge_modelName', modelName);
  }, [modelName]);
  
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
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const logMessage = `[${dateStr} ${timestamp}] ${message}`;
    console.log(logMessage);
    setLogHistory(prev => [...prev, logMessage]);
  }, []);

  const handleAddNote = (note: string) => {
    setDeveloperNotes(prev => [...prev, note]);
    log(`[User Feedback] Added developer note: "${note}"`);
  };

  const handleGenerateRandomIdea = useCallback(async () => {
    if (isRunning) return;
    
    log('Generating random game idea...');
    const prompt = gameType === 'interactive' 
      ? `Generate a creative, fun game idea for an interactive game where the player controls a character or interacts with the game using keyboard/mouse. Make it engaging and specific with clear objectives, mechanics, and visual style. Keep it concise (1-2 sentences).`
      : `Generate a creative, fun idea for a visual simulation where the user watches an animated scene play out automatically without any player interaction. The simulation should be entertaining to watch with interesting behaviors, animations, or visual effects. UI stats and adjustable settings are fine. Keep it concise (1-2 sentences).`;
    
    try {
      const response = await callLlm({ provider, prompt, modelName, apiKey, baseUrl });
      const idea = response.content.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
      setGameDescription(idea);
      log('Random game idea generated successfully.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error generating random idea: ${errorMessage}`);
    }
  }, [gameType, provider, modelName, apiKey, baseUrl, isRunning, log, setGameDescription]);

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
        log(`Starting evolution process - Game Type: ${gameType}, Max Iterations: ${maxIterations}`);
        log(`Generating initial game code for: "${gameDescription}"`);
        log(`Using LLM: ${provider} with model: ${modelName}`);
        const generationPrompt = createGenerationPrompt(gameDescription, gameType);
        const genStartTime = Date.now();
        log(`Sending generation request to LLM...`);
        const genResponse = await callLlm({ provider, prompt: generationPrompt, modelName, apiKey, baseUrl });
        const genTime = ((Date.now() - genStartTime) / 1000).toFixed(2);
        log(`LLM response received in ${genTime}s (Input: ${genResponse.inputChars.toLocaleString()} chars, Output: ${genResponse.outputChars.toLocaleString()} chars)`);
        
        if (!genResponse.content || genResponse.content.trim().length === 0) {
            throw new Error("Received empty response from LLM. Please check your API configuration and try again.");
        }
        
        currentCode = genResponse.content.replace(/^```html\n/, '').replace(/\n```$/, '');
        
        setDisplayedCode(currentCode);
        setUsageHistory(prev => [...prev, { iteration: 1, task: 'generation', provider, inputChars: genResponse.inputChars, outputChars: genResponse.outputChars }]);
        log(`Initial code generated successfully. Code length: ${currentCode.length.toLocaleString()} characters.`);
        log(`Rendering game preview...`);

        await new Promise(resolve => setTimeout(resolve, 1000)); // wait for iframe to render
        log(`Capturing initial screenshot...`);
        const screenshot = await gameDisplayRef.current?.captureScreenshot();
        const firstIteration: Iteration = { code: currentCode, screenshot };
        setIterationHistory([firstIteration]);
        iterationHistoryRef.current = [firstIteration];
        log(`Iteration 1 complete. Ready for improvements.`);
        
        // STEP 2: Improvement Loop
        for (let i = 1; i <= maxIterations; i++) {
            // Check if user explicitly stopped
            if (!isRunningRef.current) {
                setStatus(Status.Stopped);
                log('Evolution stopped by user.');
                return;
            }
            const iterNum = i + 1;
            setCurrentIteration(iterNum);
            currentIterationRef.current = iterNum;
            setStatus(Status.Improving);
            const iterStartTime = Date.now();
            log(`--- Starting Iteration ${iterNum}/${maxIterations + 1} ---`);
            
            // Capture one compressed screenshot for AI analysis (wait 1.5s for game to stabilize)
            log(`Waiting 1.5s for game to stabilize before capturing screenshot...`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            log(`Capturing compressed screenshot for AI visual analysis...`);
            const compressedScreenshot = await gameDisplayRef.current?.captureCompressedScreenshot();
            
            const notesCount = developerNotesRef.current.length;
            if (notesCount > 0) {
                log(`Processing ${notesCount} developer note(s): ${developerNotesRef.current.slice(0, 3).join(', ')}${notesCount > 3 ? '...' : ''}`);
            }
            
            log(`Building improvement prompt with compressed screenshot...`);
            const improvementPrompt = createImprovementPrompt(gameDescription, gameType, developerNotesRef.current, currentCode, compressedScreenshot || '', iterationHistoryRef.current);
            const promptSizeKB = (improvementPrompt.length / 1024).toFixed(1);
            const estimatedTokens = Math.ceil(improvementPrompt.length / 4); // Rough estimate: ~4 chars per token
            log(`Sending improvement request to LLM (prompt: ${improvementPrompt.length.toLocaleString()} chars / ~${estimatedTokens.toLocaleString()} tokens / ${promptSizeKB}KB)`);
            const improveResponse = await callLlm({ provider, prompt: improvementPrompt, modelName, apiKey, baseUrl });
            log(`LLM response received (Input: ${improveResponse.inputChars.toLocaleString()} chars, Output: ${improveResponse.outputChars.toLocaleString()} chars)`);
            
            if (!improveResponse.content || improveResponse.content.trim().length === 0) {
                throw new Error("Received empty response from LLM during improvement. Retrying next iteration may help.");
            }
            
            log(`Parsing LLM response...`);
            const parsedData = parseImprovementResponse(improveResponse.content);
            if (!parsedData) {
                throw new Error("Failed to get valid improvement data from LLM. The response format may be incorrect.");
            }
            
            log(`[Thought] ${parsedData.thought}`);
            log(`[Analysis] ${parsedData.analysis}`);
            log(`[Plan] ${parsedData.plan}`);
            
            // Log improvement quality check
            const codeSizeChange = currentCode.length > 0 
                ? ((parsedData.code.length - currentCode.length) / currentCode.length * 100).toFixed(1)
                : '0';
            const codeSizeChangeText = parseFloat(codeSizeChange) > 0 
                ? `+${codeSizeChange}%` 
                : codeSizeChange === '0' 
                    ? 'N/A' 
                    : `${codeSizeChange}%`;
            log(`Code size change: ${codeSizeChangeText} (${currentCode.length.toLocaleString()} → ${parsedData.code.length.toLocaleString()} chars)`);

            currentCode = parsedData.code;
            log(`Updating game code...`);
            setDisplayedCode(currentCode);
            setUsageHistory(prev => [...prev, { iteration: iterNum, task: 'improvement', provider, inputChars: improveResponse.inputChars, outputChars: improveResponse.outputChars }]);
            
            log(`Rendering updated game preview...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            const newScreenshot = await gameDisplayRef.current?.captureScreenshot();
            const newIteration: Iteration = { code: currentCode, screenshot: newScreenshot, compressedScreenshot };

            setIterationHistory(prev => [...prev, newIteration]);
            iterationHistoryRef.current = [...iterationHistoryRef.current, newIteration];
            
            const iterationTime = Date.now() - iterStartTime;
            setIterationTimes(prev => [...prev, iterationTime]);
            log(`✓ Iteration ${iterNum} completed in ${(iterationTime / 1000).toFixed(2)}s. Progress: ${iterNum}/${maxIterations + 1} iterations.`);
        }
        
        setStatus(Status.Finished);
        const totalEvolutionTime = ((Date.now() - iterationStartTime) / 1000).toFixed(2);
        log(`✓ Evolution finished successfully! Total iterations: ${maxIterations + 1}, Total time: ${totalEvolutionTime}s`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error: ${errorMessage}`);
        setStatus(Status.Error);
        isRunningRef.current = false; // Ensure ref is updated on error
    }

  }, [gameDescription, gameType, provider, modelName, apiKey, baseUrl, maxIterations, log]);


  return (
    <div className="bg-gray-900 text-gray-200 h-screen flex flex-col font-sans overflow-hidden">
      <Header />
      <main className="flex-1 grid lg:grid-cols-4 gap-3 p-3 overflow-hidden min-h-0">
        {/* Left Panel */}
        <div className="lg:col-span-1 flex flex-col gap-2 overflow-y-auto min-h-0 h-full pr-2">
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-3 space-y-3">
            <UserInput value={gameDescription} onChange={setGameDescription} onGenerateRandom={handleGenerateRandomIdea} disabled={isRunning} />
            <GameTypeSelector value={gameType} onChange={setGameType} disabled={isRunning} />
          </div>
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-3 space-y-2">
            <h3 className="text-sm font-semibold text-gray-300 text-center mb-2">Configuration</h3>
            <EvolutionConfig maxIterations={maxIterations} setMaxIterations={setMaxIterations} disabled={isRunning} />
            <ApiConfig 
                provider={provider} setProvider={setProvider}
                apiKey={apiKey} setApiKey={setApiKey}
                baseUrl={baseUrl} setBaseUrl={setBaseUrl}
                modelName={modelName} setModelName={setModelName}
                disabled={isRunning}
            />
          </div>
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-3 space-y-3">
            <UserFeedback onSend={handleAddNote} disabled={status === Status.Generating} />
          </div>
          <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg p-3 space-y-3">
              <TimingStats totalElapsed={totalTime} iterationTimes={iterationTimes} currentIteration={currentIteration} status={status} />
          </div>
          <div className="mt-auto pt-4 sticky bottom-0 bg-gray-900">
              <Controls status={status} onStart={handleStartEvolution} onStop={handleStopEvolution} />
          </div>
        </div>

        {/* Center Panel */}
        <div className="lg:col-span-2 flex flex-col min-h-0 h-full">
          <GameDisplay 
            ref={gameDisplayRef} 
            htmlContent={displayedCode || null} 
            isLoading={false}
            statusText={status}
            currentIteration={currentIteration}
          />
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-1 flex flex-col bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden min-h-0 h-full">
          <div className="flex border-b border-gray-700 bg-gray-900/50 flex-shrink-0">
            <TabButton label="Evolution Log" isActive={activeTab === 'log'} onClick={() => setActiveTab('log')} />
            <TabButton label="Review Iterations" isActive={activeTab === 'iterations'} onClick={() => setActiveTab('iterations')} />
            <TabButton label="Developer Notes" isActive={activeTab === 'dev_notes'} onClick={() => setActiveTab('dev_notes')} />
            <TabButton label="Usage Stats" isActive={activeTab === 'usage'} onClick={() => setActiveTab('usage')} />
          </div>
          <div className="p-4 overflow-y-auto flex-grow min-h-0">
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