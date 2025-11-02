import React from 'react';
import { Status } from '../types';

interface TimingStatsProps {
  totalElapsed: number; // in ms
  iterationTimes: number[]; // in ms
  currentIteration: number;
  status: Status;
}

// Helper to format milliseconds into HH:MM:SS
const formatTime = (ms: number): string => {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export const TimingStats: React.FC<TimingStatsProps> = ({ totalElapsed, iterationTimes, currentIteration, status }) => {
  const averageIterationTime = iterationTimes.length > 0 
    ? iterationTimes.reduce((a, b) => a + b, 0) / iterationTimes.length
    : 0;
  
  const formattedAverage = (averageIterationTime / 1000).toFixed(2);
  const formattedTotal = formatTime(totalElapsed);
  const isRunning = status === Status.Generating || status === Status.Improving;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm">
      <h3 className="text-base font-semibold text-gray-300 mb-2 text-center">Evolution Stats</h3>
       <div className="flex justify-between">
        <span className="text-gray-400">Current Iteration:</span>
        <span className="font-mono text-cyan-400">{isRunning ? currentIteration : '-'}</span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-gray-400">Total Running Time:</span>
        <span className="font-mono text-cyan-400">{formattedTotal}</span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-gray-400">Avg. Iteration Time:</span>
        <span className="font-mono text-cyan-400">{formattedAverage}s</span>
      </div>
    </div>
  );
};