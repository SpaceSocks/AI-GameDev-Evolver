import React from 'react';
import { Status } from '../types';

interface ControlsProps {
  status: Status;
  onStart: () => void;
  onStop: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ status, onStart, onStop }) => {
  const isRunning = status === Status.Generating || status === Status.Improving;
  const canStart = status === Status.Idle || status === Status.Stopped || status === Status.Error || status === Status.Finished;

  return (
    <div className="flex space-x-2">
      {canStart ? (
        <button
          onClick={onStart}
          disabled={!canStart}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {status === Status.Idle ? 'Start Evolution' : 'Start New Evolution'}
        </button>
      ) : (
        <button
          onClick={onStop}
          disabled={!isRunning}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          Stop
        </button>
      )}
    </div>
  );
};
