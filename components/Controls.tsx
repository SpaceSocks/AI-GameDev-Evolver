import React from 'react';
import { Status } from '../types';

interface ControlsProps {
  status: Status;
  onStart: () => void;
  onStop: () => void;
  onImprove: () => void;
  hasCode: boolean;
  hasDevNotes: boolean;
}

const StartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
);

const ImproveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11.983 1.904a1.5 1.5 0 00-1.966 0l-7.25 7.25a1.5 1.5 0 000 2.122l7.25 7.25a1.5 1.5 0 002.122 0l7.25-7.25a1.5 1.5 0 000-2.122l-7.25-7.25z" /><path d="M9.429 3.016a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 01-1.06-1.06L14.146 10 9.43 5.284a.75.75 0 01-.001-1.06l.001-1.208zM4.429 8.266a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 01-1.06-1.06L9.146 15 4.43 10.284a.75.75 0 01-.001-1.06l.001-1.208z" opacity=".5"/></svg>
);


export const Controls: React.FC<ControlsProps> = ({ status, onStart, onStop, onImprove, hasCode, hasDevNotes }) => {
  const isRunning = status === Status.Generating || status === Status.Improving;
  
  const canStart = !isRunning && !hasCode;
  const canStop = isRunning;
  const canImprove = !isRunning && hasCode && hasDevNotes;

  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        onClick={onStart}
        disabled={!canStart}
        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
      >
        <StartIcon />
        Start Evolution
      </button>

      <button
        onClick={onStop}
        disabled={!canStop}
        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
      >
        <StopIcon />
        Stop
      </button>

      <button
        onClick={onImprove}
        disabled={!canImprove}
        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
      >
        <ImproveIcon />
        Improve
      </button>
    </div>
  );
};
