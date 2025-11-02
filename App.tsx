import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { UserInput } from './components/UserInput';
import { Controls } from './components/Controls';
import { StatusLog } from './components/StatusLog';
import { GameDisplay } from './components/GameDisplay';
import { IterationHistory } from './components/IterationHistory';
import { UserFeedback } from './components/UserFeedback';
import { TabButton } from './components/ui/TabButton';
import { Status } from './types';
import { generateInitialGame, improveGame, summarizeHistory } from './services/geminiService';
import { GameTypeSelector, GameType } from './components/GameTypeSelector';
import { TimingStats } from './components/TimingStats';
import { DeveloperNotesLog } from './components/DeveloperNotesLog';

interface Iteration {
    code: string;
    screenshot?: string;
}

const MEMORY_SUMMARY_INTERVAL = 10; // Summarize every 10 iterations
const SHORT_TERM_MEMORY_LIMIT = 10; // Keep the last 10 plans in short-term memory
const SCREENSHOT_COUNT = 3;
const SCREENSHOT_DURATION_MS = 15000;

const App: React.FC = () => {
    const [gameConcept, setGameConcept] = useState('');
    const [gameType, setGameType] = useState<GameType>('simulation');
    const [status, setStatus] = useState<Status>(Status.Idle);
    const [statusHistory, setStatusHistory] = useState<string[]>([]);
    const [gameCode, setGameCode] = useState<string | null>(null);
    const [iterationHistory, setIterationHistory] = useState<Iteration[]>([]);
    const [selectedIterationIndex, setSelectedIterationIndex] = useState<number | null>(null);
    const [pastPlans, setPastPlans] = useState<string[]>([]);
    const [longTermMemory, setLongTermMemory] = useState<string[]>([]);
    const [developerNotesHistory, setDeveloperNotesHistory] = useState<string[]>([]);
    const [currentTab, setCurrentTab] = useState<'log' | 'history' | 'notes'>('log');
    const [timingStats, setTimingStats] = useState<{
        startTime: number | null;
        iterationTimes: number[];
        totalElapsed: number;
    }>({
        startTime: null,
        iterationTimes: [],
        totalElapsed: 0,
    });

    const gameIframeRef = useRef<HTMLIFrameElement>(null);
    const stopRequestedRef = useRef(false);
    const isGameLoadedRef = useRef(false);
    const iterationCounterRef = useRef(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const feedbackRef = useRef(''); 
    const developerNotesHistoryRef = useRef<string[]>([]);

    const isRunning = status === Status.Generating || status === Status.Improving;

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [statusHistory, currentTab, developerNotesHistory]);
    
    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval> | null = null;
        if (isRunning && timingStats.startTime) {
            intervalId = setInterval(() => {
                setTimingStats(prev => ({
                    ...prev,
                    totalElapsed: Date.now() - prev.startTime!,
                }));
            }, 1000);
        }
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isRunning, timingStats.startTime]);


    const addToLog = useCallback((message: string) => {
        setStatusHistory(prev => [...prev, message]);
    }, []);

    const takeScreenshot = useCallback(async (): Promise<string | undefined> => {
        const iframe = gameIframeRef.current;
        if (!isGameLoadedRef.current || !iframe?.contentWindow?.document) {
            addToLog("Warning: Game content not loaded, skipping screenshot.");
            return undefined;
        }

        try {
            const canvas = iframe.contentWindow.document.querySelector('canvas');
            if (!canvas) {
                addToLog("Warning: Could not find canvas in game, skipping screenshot.");
                return undefined;
            }
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            return dataUrl.split(',')[1];
        } catch (e) {
            console.error("Screenshot failed:", e);
            addToLog(`Error: Failed to capture screenshot. ${e instanceof Error ? e.message : String(e)}`);
            return undefined;
        }
    }, [addToLog]);
    
    const takeScreenshots = useCallback(async (count: number, totalDurationMs: number): Promise<string[]> => {
        const screenshots: string[] = [];
        const interval = totalDurationMs / count;
    
        for (let i = 0; i < count; i++) {
            await new Promise(resolve => setTimeout(resolve, i === 0 ? 0 : interval));
            if (stopRequestedRef.current) break;
            addToLog(`> Capturing screenshot ${i + 1} of ${count}...`);
            const screenshot = await takeScreenshot();
            if (screenshot) {
                screenshots.push(screenshot);
            }
        }
        return screenshots;
    }, [takeScreenshot, addToLog]);

    const runImprovementLoop = useCallback(async (initialCode: string, concept: string, type: GameType) => {
        let currentCode = initialCode;
        iterationCounterRef.current = 1;

        while (!stopRequestedRef.current) {
            const iterationStartTime = Date.now();
            try {
                setStatus(Status.Improving);
                addToLog(`\n--- Starting Iteration ${iterationCounterRef.current} ---`);
                
                if (iterationCounterRef.current > 1 && (iterationCounterRef.current -1) % MEMORY_SUMMARY_INTERVAL === 0) {
                    addToLog("AI is consolidating long-term memory...");
                    const plansToSummarize = pastPlans.slice(-MEMORY_SUMMARY_INTERVAL);
                    const summary = await summarizeHistory(plansToSummarize);
                    setLongTermMemory(prev => [...prev, summary]);
                    addToLog(`[Memory] New summary created: "${summary}"`);
                }

                addToLog("Pausing briefly to let game state evolve...");
                await new Promise(resolve => setTimeout(resolve, 2000));
                if (stopRequestedRef.current) break;

                addToLog(`Capturing ${SCREENSHOT_COUNT} screenshots over ${SCREENSHOT_DURATION_MS / 1000} seconds...`);
                const screenshots = await takeScreenshots(SCREENSHOT_COUNT, SCREENSHOT_DURATION_MS);
                 if (stopRequestedRef.current) break;

                const allDeveloperNotes = developerNotesHistoryRef.current;

                addToLog("Sending context to AI for analysis...");
                const shortTermPlans = pastPlans.slice(-SHORT_TERM_MEMORY_LIMIT);
                
                addToLog("> AI is now thinking...");
                const result = await improveGame(currentCode, concept, type, allDeveloperNotes, longTermMemory, shortTermPlans, screenshots.length > 0 ? screenshots : undefined);

                if (stopRequestedRef.current) break;
                
                addToLog("AI has finished its thinking process.");
                addToLog(`[Analysis] ${result.analysis}`);
                addToLog(`[Thought] ${result.thought}`);
                addToLog(`[Plan] ${result.plan}`);
                
                if(feedbackRef.current){
                    feedbackRef.current = ''; // Clear temporary feedback ref
                }

                addToLog("Applying new code and reloading game...");
                setGameCode(result.newCode);
                setPastPlans(prev => [...prev, result.plan]);
                currentCode = result.newCode;
                
                addToLog("Capturing thumbnail for iteration history...");
                const newScreenshot = await takeScreenshot();

                setIterationHistory(prev => [...prev, { code: result.newCode, screenshot: newScreenshot }]);
                setSelectedIterationIndex(prev => (prev ?? 0) + 1);

                iterationCounterRef.current++;

            } catch (e: any) {
                console.error(e);
                addToLog(`Error during improvement loop: ${e.message}`);
                setStatus(Status.Error);
                break;
            } finally {
                const iterationEndTime = Date.now();
                const duration = iterationEndTime - iterationStartTime;
                setTimingStats(prev => ({
                    ...prev,
                    iterationTimes: [...prev.iterationTimes, duration],
                }));
            }
        }
        if (stopRequestedRef.current) {
            addToLog("Evolution stopped by user.");
            setStatus(Status.Stopped);
        }

    }, [addToLog, takeScreenshots, pastPlans, longTermMemory]);

    const handleStart = useCallback(async () => {
        if (!gameConcept.trim()) {
            addToLog("Error: Please enter a game concept.");
            return;
        }

        stopRequestedRef.current = false;
        isGameLoadedRef.current = false;
        feedbackRef.current = '';
        developerNotesHistoryRef.current = [];
        setStatus(Status.Generating);
        setStatusHistory([]);
        setIterationHistory([]);
        setGameCode(null);
        setPastPlans([]);
        setLongTermMemory([]);
        setDeveloperNotesHistory([]);
        setSelectedIterationIndex(null);
        setCurrentTab('log');
        setTimingStats({
            startTime: Date.now(),
            iterationTimes: [],
            totalElapsed: 0,
        });

        try {
            addToLog("Generating initial game version...");
            const initialCode = await generateInitialGame(gameConcept, gameType);
            if (stopRequestedRef.current) return;

            addToLog("Initial game generated. Loading...");
            setGameCode(initialCode);
            
            const firstLoadPromise = new Promise<void>(resolve => {
                const checkLoad = () => {
                    if (isGameLoadedRef.current || stopRequestedRef.current) resolve();
                    else setTimeout(checkLoad, 100);
                };
                checkLoad();
            });
            await firstLoadPromise;
            if (stopRequestedRef.current) return;

            addToLog("Initial game loaded successfully.");
            addToLog("Capturing thumbnail for Iteration 1...");
            const screenshot = await takeScreenshot();
            
            setIterationHistory([{ code: initialCode, screenshot }]);
            setSelectedIterationIndex(0);

            runImprovementLoop(initialCode, gameConcept, gameType);

        } catch (e: any) {
            console.error(e);
            addToLog(`Error generating initial game: ${e.message}`);
            setStatus(Status.Error);
        }
    }, [gameConcept, gameType, addToLog, runImprovementLoop, takeScreenshot]);

    const handleStop = useCallback(() => {
        stopRequestedRef.current = true;
        setStatus(Status.Stopped);
        addToLog("Stopping evolution...");
    }, [addToLog]);

    const handleSelectIteration = useCallback((index: number) => {
        isGameLoadedRef.current = false;
        setGameCode(iterationHistory[index].code);
        setSelectedIterationIndex(index);
        addToLog(`Showing code for Iteration ${index + 1}.`);
    }, [iterationHistory, addToLog]);



    const handleSendFeedback = useCallback((feedback: string) => {
        const trimmedFeedback = feedback.trim();
        feedbackRef.current = trimmedFeedback;
        setDeveloperNotesHistory(prev => [...prev, trimmedFeedback]);
        developerNotesHistoryRef.current.push(trimmedFeedback);
        addToLog(`[Feedback] Note added to checklist: "${trimmedFeedback}"`);
    }, [addToLog]);
    

    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen flex flex-col font-sans">
            <Header />
            <main className="flex-grow p-4 grid grid-cols-1 lg:grid-cols-4 gap-4 lg:grid-rows-[1fr] min-h-0">
                {/* Left Panel */}
                <div className="flex flex-col gap-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <UserInput value={gameConcept} onChange={setGameConcept} disabled={isRunning} />
                    <GameTypeSelector value={gameType} onChange={setGameType} disabled={isRunning} />
                    <UserFeedback onSend={handleSendFeedback} disabled={!isRunning} />
                    <TimingStats 
                        totalElapsed={timingStats.totalElapsed} 
                        iterationTimes={timingStats.iterationTimes}
                    />
                    <Controls onStart={handleStart} onStop={handleStop} status={status} hasHistory={iterationHistory.length > 0} />
                </div>

                {/* Center Panel */}
                <div className="lg:col-span-2 min-h-[400px] lg:min-h-0 flex flex-col">
                     <GameDisplay 
                        code={gameCode}
                        status={status}
                        iframeRef={gameIframeRef}
                        onLoad={() => isGameLoadedRef.current = true}
                    />
                </div>
                
                {/* Right Panel */}
                <div className="bg-gray-800/50 rounded-lg border border-gray-700 min-h-[400px] lg:min-h-0 flex flex-col">
                    <div className="px-4 border-b border-gray-700 flex-shrink-0">
                        <div className="flex">
                            <TabButton label="Evolution Log" isActive={currentTab === 'log'} onClick={() => setCurrentTab('log')} />
                            <TabButton label="Review Iterations" isActive={currentTab === 'history'} onClick={() => setCurrentTab('history')} />
                            <TabButton label="Developer Notes" isActive={currentTab === 'notes'} onClick={() => setCurrentTab('notes')} />
                        </div>
                    </div>
                    <div className="flex-grow relative">
                        <div ref={scrollContainerRef} className="absolute inset-0 p-4 overflow-y-auto">
                            {currentTab === 'log' && <StatusLog history={statusHistory} />}
                            {currentTab === 'history' && (
                                <IterationHistory 
                                    history={iterationHistory} 
                                    onSelect={handleSelectIteration}
                                    selectedIndex={selectedIterationIndex}
                                />
                            )}
                             {currentTab === 'notes' && <DeveloperNotesLog notes={developerNotesHistory} />}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;