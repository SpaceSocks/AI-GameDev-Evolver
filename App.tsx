import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { UserInput } from './components/UserInput';
import { Controls } from './components/Controls';
import { StatusLog } from './components/StatusLog';
import { GameDisplay, GameDisplayRef } from './components/GameDisplay';
import { IterationHistory } from './components/IterationHistory';
import { UserFeedback } from './components/UserFeedback';
import { ApiConfig } from './components/ApiConfig';
import { TabButton } from './components/ui/TabButton';
import { Status, LlmConfig, UsageStat } from './types';
import * as llmService from './services/llmService';
import { GameType, GameTypeSelector } from './components/GameTypeSelector';
import { TimingStats } from './components/TimingStats';
import { DeveloperNotesLog } from './components/DeveloperNotesLog';
import { UsageStats } from './components/UsageStats';

type ActiveTab = 'status' | 'history' | 'notes' | 'usage';

const App: React.FC = () => {
    // State
    const [gameConcept, setGameConcept] = useState('');
    const [gameType, setGameType] = useState<GameType>('interactive');
    const [status, setStatus] = useState<Status>(Status.Idle);
    const [statusHistory, setStatusHistory] = useState<string[]>([]);
    const [developerNotes, setDeveloperNotes] = useState<string[]>([]);
    const [currentHtml, setCurrentHtml] = useState<string | null>(null);
    const [iterationHistory, setIterationHistory] = useState<{ code: string; screenshot?: string }[]>([]);
    const [selectedIterationIndex, setSelectedIterationIndex] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('status');
    const [llmConfig, setLlmConfig] = useState<LlmConfig>({
        provider: 'gemini',
        apiKey: '', // API key for OpenAI, Gemini uses env
        baseUrl: '',
        modelName: 'gemini-2.5-pro',
    });
    const [totalElapsed, setTotalElapsed] = useState(0);
    const [iterationTimes, setIterationTimes] = useState<number[]>([]);
    const [currentIterationNum, setCurrentIterationNum] = useState(0);
    const [usageHistory, setUsageHistory] = useState<UsageStat[]>([]);

    // Refs
    const stopRequestedRef = useRef(false);
    const gameDisplayRef = useRef<GameDisplayRef>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const iterationStartTimeRef = useRef<number>(0);
    const totalStartTimeRef = useRef<number>(0);
    const memoryRef = useRef<string | null>(null);

    const isRunning = status === Status.Generating || status === Status.Improving;

    // Timer effect
    useEffect(() => {
        if (isRunning) {
            totalStartTimeRef.current = Date.now() - totalElapsed;
            timerRef.current = setInterval(() => {
                setTotalElapsed(Date.now() - totalStartTimeRef.current);
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
    }, [isRunning, totalElapsed]);

    // Log helper
    const addToLog = useCallback((message: string) => {
        console.log(message);
        setStatusHistory(prev => [message, ...prev]);
    }, []);

    // Usage helper
    const addUsageStat = useCallback((task: string, inputChars: number, outputChars: number) => {
        setUsageHistory(prev => [...prev, {
            iteration: currentIterationNum,
            task,
            provider: llmConfig.provider,
            model: llmConfig.modelName,
            inputChars,
            outputChars,
        }]);
    }, [currentIterationNum, llmConfig]);

    const handleStop = () => {
        if (!isRunning) return;
        stopRequestedRef.current = true;
        addToLog('Stop request received. Finishing current task...');
        setStatus(Status.Stopped);
    };
    
    const handleAddNote = (note: string) => {
        setDeveloperNotes(prev => [...prev, note]);
        addToLog(`Developer Note added: "${note}"`);
    };
    
    const handleSelectIteration = (index: number) => {
        setSelectedIterationIndex(index);
        setCurrentHtml(iterationHistory[index].code);
        addToLog(`Viewing iteration ${index + 1}.`);
    };

    const captureAndContinue = async (code: string): Promise<void> => {
        setCurrentHtml(code);
        
        return new Promise((resolve, reject) => {
             // A short delay to allow iframe to start loading srcdoc
             setTimeout(async () => {
                try {
                    const screenshot = await gameDisplayRef.current?.captureScreenshot();
                    if (!screenshot) throw new Error("Failed to capture screenshot");
                    
                    setIterationHistory(prev => [...prev, { code, screenshot }]);
                    setSelectedIterationIndex(prev => (prev ?? -1) + 1);
                    resolve();
                } catch (error) {
                    addToLog(`Warning: Could not capture screenshot. Continuing without it. ${error instanceof Error ? error.message : ''}`);
                    setIterationHistory(prev => [...prev, { code, screenshot: undefined }]);
                    setSelectedIterationIndex(prev => (prev ?? -1) + 1);
                    resolve(); // Resolve anyway
                }
            }, 500);
        });
    };

    const handleStart = async () => {
        if (isRunning || !gameConcept.trim()) {
            addToLog('Error: Game concept cannot be empty.');
            return;
        }

        // Reset state
        stopRequestedRef.current = false;
        setStatusHistory([]);
        setIterationHistory([]);
        setDeveloperNotes([]);
        setCurrentHtml(null);
        setSelectedIterationIndex(null);
        setCurrentIterationNum(0);
        setTotalElapsed(0);
        setIterationTimes([]);
        setUsageHistory([]);
        memoryRef.current = null;
        
        addToLog(`Starting evolution for: "${gameConcept}"`);
        setStatus(Status.Generating);
        setCurrentIterationNum(1);
        
        let currentCode = '';

        try {
            // Step 1: Generate Initial Code
            iterationStartTimeRef.current = Date.now();
            addToLog('[1] Generating initial game code...');
            const initialCode = await llmService.generateInitialCode(llmConfig, gameConcept, gameType);
            addUsageStat('generate', gameConcept.length, initialCode.length);
            currentCode = initialCode;

            await captureAndContinue(currentCode);
            setIterationTimes(prev => [...prev, Date.now() - iterationStartTimeRef.current]);
            
            // Step 2: Improvement Loop
            for (let i = 2; i < 100; i++) { // Max 99 improvement iterations
                if (stopRequestedRef.current) {
                    addToLog('Evolution stopped by user.');
                    setStatus(Status.Stopped);
                    return;
                }
                
                setStatus(Status.Improving);
                setCurrentIterationNum(i);
                iterationStartTimeRef.current = Date.now();
                addToLog(`\n[${i}] Starting improvement cycle...`);

                const lastScreenshot = iterationHistory[iterationHistory.length - 1]?.screenshot;
                if (!lastScreenshot) {
                    addToLog('Warning: No screenshot available for analysis. Relying on code only.');
                }
                
                const newNote = developerNotes.shift(); // Use the oldest note first
                if (newNote) {
                    addToLog(`Addressing note: "${newNote}"`);
                } else {
                    addToLog('No new developer notes. Performing autonomous improvement.');
                }

                const response = await llmService.improveCode(llmConfig, currentCode, lastScreenshot ?? '', gameConcept, developerNotes, newNote);
                
                addUsageStat('improve', currentCode.length + (lastScreenshot?.length ?? 0), response.code.length);
                
                if (response.analysis) addToLog(`[Analysis] ${response.analysis}`);
                if (response.thought) addToLog(`[Thought] ${response.thought}`);
                if (response.plan) addToLog(`[Plan] ${response.plan}`);
                if (response.memory) {
                    addToLog(`[Memory] ${response.memory}`);
                    memoryRef.current = response.memory;
                }
                
                currentCode = response.code;

                await captureAndContinue(currentCode);
                setIterationTimes(prev => [...prev, Date.now() - iterationStartTimeRef.current]);
            }
            
            addToLog('Maximum iterations reached. Evolution complete.');
            setStatus(Status.Idle);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            addToLog(`Error: ${errorMessage}`);
            setStatus(Status.Error);
        }
    };
    
    return (
        <div className="bg-gray-800 text-white min-h-screen font-sans flex flex-col">
            <Header />
            <main className="flex-grow p-4 grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-68px)]">
                {/* Left Panel */}
                <div className="md:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
                    <UserInput value={gameConcept} onChange={setGameConcept} disabled={isRunning} />
                    <GameTypeSelector value={gameType} onChange={setGameType} disabled={isRunning} />
                    <ApiConfig 
                        provider={llmConfig.provider}
                        setProvider={(p) => setLlmConfig(c => ({...c, provider: p}))}
                        apiKey={llmConfig.apiKey}
                        setApiKey={(k) => setLlmConfig(c => ({...c, apiKey: k}))}
                        baseUrl={llmConfig.baseUrl}
                        setBaseUrl={(u) => setLlmConfig(c => ({...c, baseUrl: u}))}
                        modelName={llmConfig.modelName}
                        setModelName={(m) => setLlmConfig(c => ({...c, modelName: m}))}
                        disabled={isRunning}
                    />
                    <Controls status={status} onStart={handleStart} onStop={handleStop} />
                    <TimingStats 
                        status={status}
                        currentIteration={currentIterationNum}
                        totalElapsed={totalElapsed}
                        iterationTimes={iterationTimes}
                    />
                    <UserFeedback onSend={handleAddNote} disabled={!isRunning} />

                    {/* Tabs */}
                    <div className="flex-grow flex flex-col bg-black/30 rounded-lg border border-gray-700 min-h-[300px]">
                        <div className="flex border-b border-gray-700">
                            <TabButton label="Status Log" isActive={activeTab === 'status'} onClick={() => setActiveTab('status')} />
                            <TabButton label="History" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
                            <TabButton label="Dev Notes" isActive={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
                            <TabButton label="Usage" isActive={activeTab === 'usage'} onClick={() => setActiveTab('usage')} />
                        </div>
                        <div className="p-3 overflow-y-auto flex-grow">
                            {activeTab === 'status' && <StatusLog history={statusHistory} />}
                            {activeTab === 'history' && <IterationHistory history={iterationHistory} onSelect={handleSelectIteration} selectedIndex={selectedIterationIndex} />}
                            {activeTab === 'notes' && <DeveloperNotesLog notes={developerNotes} />}
                            {activeTab === 'usage' && <UsageStats history={usageHistory} />}
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="md:col-span-2 h-full">
                    <GameDisplay ref={gameDisplayRef} htmlContent={currentHtml} />
                </div>
            </main>
        </div>
    );
};

export default App;
