import React from 'react';
import { Status } from '../types';

interface ControlsProps {
    onStart: () => void;
    onStop: () => void;
    status: Status;
    hasHistory: boolean;
}

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
    </svg>
);

export const Controls: React.FC<ControlsProps> = ({ onStart, onStop, status, hasHistory }) => {
    const isRunning = status === Status.Generating || status === Status.Improving;

    const getButtonText = () => {
        switch (status) {
            case Status.Generating:
                return 'Generating...';
            case Status.Improving:
                return 'Evolving...';
            default:
                return hasHistory && !isRunning ? 'Start New Evolution' : 'Start Evolution';
        }
    };

    return (
        <div className="flex space-x-4">
            <button
                onClick={onStart}
                disabled={isRunning}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
                <PlayIcon />
                {getButtonText()}
            </button>
            <button
                onClick={onStop}
                disabled={!isRunning}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
                <StopIcon />
                Stop
            </button>
        </div>
    );
};
