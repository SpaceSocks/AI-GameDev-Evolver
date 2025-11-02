import React from 'react';
import { Status } from '../types';

interface ControlsProps {
  status: Status;
  onStart: () => void;
  onStop: () => void;
}

const StartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
);


export const Controls: React.FC<ControlsProps> = ({ status, onStart, onStop }) => {
  const isRunning = status === Status.Generating || status === Status.Improving;
  
  const canStart = !isRunning;
  const canStop = isRunning;

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={onStart}
        disabled={!canStart}
        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
      >
        <StartIcon />
        Start New Evolution
      </button>

      <button
        onClick={onStop}
        disabled={!canStop}
        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
      >
        <StopIcon />
        Stop
      </button>
    </div>
  );
};
