import React, { useState, useRef, useCallback, useEffect } from 'react';

import { Header } from './components/Header';
import { UserInput } from './components/UserInput';
import { GameTypeSelector, GameType } from './components/GameTypeSelector';
import { Controls } from './components/Controls';
import { GameDisplay, GameDisplayRef } from './components/GameDisplay';
import { StatusLog } from './components/StatusLog';
import { IterationHistory } from './components/IterationHistory';
import { UserFeedback } from './components/UserFeedback';
import { ApiConfig } from './components/ApiConfig';
import { TabButton } from './components/ui/TabButton';
import { Status, LlmConfig, UsageStat } from './types';
import * as llmService from './services/llmService';
import { DeveloperNotesLog } from './components/DeveloperNotesLog';
import { TimingStats } from './components/TimingStats';
import { UsageStats } from './components/UsageStats';


type LeftPanelTab = 'history' | 'notes';
type RightPanelTab = 'log' | 'config' | 'stats';

interface Iteration {
    code: string;
    screenshot?: string;
}

const App: React.FC = () => {
    // Main State
    const [status, setStatus] = useState<Status>(Status.Idle);
    const [gameConcept, setGameConcept] = useState<string>('');
    const [gameType, setGameType] = useState<GameType>('interactive');
    const [iterations, setIterations] = useState<Iteration[]>([]);
    const [selectedIteration, setSelectedIteration] = useState<number | null>(null);
    const [statusHistory, setStatusHistory] = useState<string[]>([]);
    const [developerNotes, setDeveloperNotes] = useState<string[]>([]);
    const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);

    // UI State
    const [leftTab, setLeftTab] = useState<LeftPanelTab>('history');
    const [rightTab, setRightTab] = useState<RightPanelTab>('log');
    
    // LLM Config
    const [llmConfig, setLlmConfig] = useState<LlmConfig>({
        provider: 'gemini',
        apiKey: '',
        baseUrl: '',
        modelName: 'gemini-2.5-pro'
    });

    // Stats
    const [usageHistory, setUsageHistory] = useState<UsageStat[]>([]);
    const [totalElapsedTime, setTotalElapsedTime] = useState(0);
    const [iterationTimes, setIterationTimes] = useState<number[]>([]);
    
    // Refs
    const gameDisplayRef = useRef<GameDisplayRef>(null);
    const stopEvolvingRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    
    const addStatus = useCallback((message: string) => {
        console.log(message);
        setStatusHistory(prev => [...prev, message]);
    }, []);
    
    // Timer Effect
    useEffect(() => {
        if (status === Status.Generating || status === Status.Improving) {
            const startTime = Date.now();
            timerRef.current = setInterval(() => {
                setTotalElapsedTime(prev => prev + (Date.now() - (startTime + prev)));
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [status]);


    const handleGenerateRandomIdea = async () => {
        setIsGeneratingIdea(true);
        addStatus("Generating a random game idea...");
        try {
            const result = await llmService.generateRandomIdea(llmConfig, gameType);
            setGameConcept(result.idea);
            addStatus(`Generated idea: "${result.idea}"`);
        } catch (e: any) {
            addStatus(`Error: Failed to generate idea. ${e.message}`);
        } finally {
            setIsGeneratingIdea(false);
        }
    };

    const runImprovementCycle = async () => {
        if (stopEvolvingRef.current) {
            addStatus("Evolution stopped by user.");
            setStatus(Status.Stopped);
            stopEvolvingRef.current = false;
            return;
        }

        if (developerNotes.length === 0) {
            addStatus("Stopping: No more developer notes to process.");
            setStatus(Status.Idle);
            return;
        }

        setStatus(Status.Improving);
        const currentIterationIndex = iterations.length - 1;
        const currentIteration = iterations[currentIterationIndex];
        const noteToProcess = developerNotes[0];
        const noteHistory = developerNotes.slice(1);
        
        addStatus(`Starting iteration ${iterations.length + 1} with note: "${noteToProcess}"`);

        const iterationStartTime = Date.now();
        
        try {
            const screenshot = await gameDisplayRef.current?.captureScreenshot();
            if (!screenshot) {
                throw new Error("Could not capture screenshot.");
            }
            
            // Update screenshot of the previous iteration
            setIterations(prev => {
                const newIterations = [...prev];
                if (newIterations[currentIterationIndex]) {
                   newIterations[currentIterationIndex].screenshot = screenshot;
                }
                return newIterations;
            });

            const result = await llmService.improveCode(
                llmConfig,
                currentIteration.code,
                screenshot,
                gameConcept,
                noteHistory,
                noteToProcess
            );

            if(result.analysis) addStatus(`[Analysis] ${result.analysis}`);
            if(result.thought) addStatus(`[Thought] ${result.thought}`);
            if(result.plan) addStatus(`[Plan]\n${result.plan}`);
            
            const newIteration = { code: result.code };
            setIterations(prev => [...prev, newIteration]);
            setSelectedIteration(iterations.length);
            setDeveloperNotes(prev => prev.slice(1)); // Consume the note

            setUsageHistory(prev => [...prev, {
                iteration: iterations.length + 1,
                task: 'improve',
                provider: llmConfig.provider,
                model: llmConfig.modelName,
                inputChars: result.inputChars,
                outputChars: result.outputChars,
            }]);

            const iterationDuration = Date.now() - iterationStartTime;
            setIterationTimes(prev => [...prev, iterationDuration]);
            
            // Schedule next cycle
            setTimeout(runImprovementCycle, 1000);

        } catch (e: any) {
            addStatus(`Error during improvement cycle: ${e.message}`);
            setStatus(Status.Error);
        }
    };

    const handleStart = async () => {
        if (!gameConcept.trim()) {
            addStatus("Error: Please enter a game concept.");
            return;
        }
        if (developerNotes.length === 0) {
            addStatus("Warning: No developer notes added. Add a note to guide the first improvement.");
        }
        
        setStatus(Status.Generating);
        addStatus("Starting evolution...");
        addStatus(`Generating initial code for: "${gameConcept}"`);
        stopEvolvingRef.current = false;
        setIterations([]);
        setIterationTimes([]);
        setTotalElapsedTime(0);
        setSelectedIteration(null);

        try {
            const result = await llmService.generateInitialCode(llmConfig, gameConcept, gameType);

            if(result.thought) addStatus(`[Thought] ${result.thought}`);
            if(result.plan) addStatus(`[Plan]\n${result.plan}`);
            addStatus("Initial code generated successfully.");

            const initialIteration = { code: result.code };
            setIterations([initialIteration]);
            setSelectedIteration(0);
            
            setUsageHistory(prev => [...prev, {
                iteration: 1,
                task: 'initial',
                provider: llmConfig.provider,
                model: llmConfig.modelName,
                inputChars: result.inputChars,
                outputChars: result.outputChars,
            }]);
            
            // Start the improvement loop after a short delay
            setTimeout(runImprovementCycle, 1000);

        } catch (e: any) {
            addStatus(`Error: Failed to generate initial code. ${e.message}`);
            setStatus(Status.Error);
        }
    };
    
    const handleStop = () => {
        if (status === Status.Generating || status === Status.Improving) {
            addStatus("Stopping evolution after the current step...");
            stopEvolvingRef.current = true;
            // The running cycle will check this ref and stop.
        }
    };

    const handleImprove = () => {
        if (iterations.length > 0 && developerNotes.length > 0) {
             stopEvolvingRef.current = false;
             runImprovementCycle();
        } else {
            addStatus("Cannot improve: No initial code or no developer notes.");
        }
    };

    const handleAddNote = (note: string) => {
        setDeveloperNotes(prev => [...prev, note]);
        addStatus(`Added note: "${note}"`);
    };

    const displayedCode = selectedIteration !== null ? iterations[selectedIteration]?.code : null;
    const isRunning = status === Status.Generating || status === Status.Improving;

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
            <Header />
            <main className="flex-grow p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Panel */}
                <div className="flex flex-col gap-4">
                    <UserInput 
                        value={gameConcept} 
                        onChange={setGameConcept} 
                        disabled={isRunning}
                        onGenerateRandom={handleGenerateRandomIdea}
                        isGeneratingIdea={isGeneratingIdea}
                    />
                    <GameTypeSelector value={gameType} onChange={setGameType} disabled={isRunning} />
                    
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg flex flex-col flex-grow">
                        <div className="flex border-b border-gray-700">
                           <TabButton label="History" isActive={leftTab === 'history'} onClick={() => setLeftTab('history')} />
                           <TabButton label="Dev Notes" isActive={leftTab === 'notes'} onClick={() => setLeftTab('notes')} />
                        </div>
                        <div className="p-3 overflow-y-auto flex-grow">
                            {leftTab === 'history' && <IterationHistory history={iterations} onSelect={setSelectedIteration} selectedIndex={selectedIteration} />}
                            {leftTab === 'notes' && <DeveloperNotesLog notes={developerNotes} />}
                        </div>
                    </div>

                    <UserFeedback onSend={handleAddNote} disabled={isRunning} />
                </div>

                {/* Center Panel */}
                <div className="flex flex-col gap-4">
                    <Controls
                        status={status}
                        onStart={handleStart}
                        onStop={handleStop}
                        onImprove={handleImprove}
                        hasCode={iterations.length > 0}
                        hasDevNotes={developerNotes.length > 0}
                    />
                    <div className="flex-grow min-h-[300px] lg:min-h-0">
                        <GameDisplay ref={gameDisplayRef} htmlContent={displayedCode} />
                    </div>
                </div>

                {/* Right Panel */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg flex flex-col">
                    <div className="flex border-b border-gray-700">
                        <TabButton label="Status Log" isActive={rightTab === 'log'} onClick={() => setRightTab('log')} />
                        <TabButton label="Config" isActive={rightTab === 'config'} onClick={() => setRightTab('config')} />
                        <TabButton label="Usage" isActive={rightTab === 'stats'} onClick={() => setRightTab('stats')} />
                    </div>
                    <div className="p-3 overflow-y-auto flex-grow">
                        {rightTab === 'log' && <StatusLog history={statusHistory} />}
                        {rightTab === 'config' && (
                             <div className="space-y-4">
                                <ApiConfig 
                                    provider={llmConfig.provider}
                                    setProvider={(p) => setLlmConfig(c => ({...c, provider: p}))}
                                    apiKey={llmConfig.apiKey}
                                    setApiKey={(k) => setLlmConfig(c => ({...c, apiKey: k}))}
                                    baseUrl={llmConfig.baseUrl}
                                    setBaseUrl={(u) => setLlmConfig(c => ({...c, baseUrl: u}))}
                                    modelName={llmConfig.modelName}
                                    setModelName={(n) => setLlmConfig(c => ({...c, modelName: n}))}
                                    disabled={isRunning}
                                />
                                <TimingStats 
                                    totalElapsed={totalElapsedTime}
                                    iterationTimes={iterationTimes}
                                    currentIteration={iterations.length}
                                    status={status}
                                />
                             </div>
                        )}
                        {rightTab === 'stats' && <UsageStats history={usageHistory} />}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;