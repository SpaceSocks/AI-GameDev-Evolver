import React from 'react';

interface EvolutionConfigProps {
  maxIterations: number;
  setMaxIterations: (value: number) => void;
  disabled: boolean;
}

export const EvolutionConfig: React.FC<EvolutionConfigProps> = ({ maxIterations, setMaxIterations, disabled }) => {
  return (
    <div className="space-y-3 bg-gray-900 border border-gray-700 rounded-lg p-3">
       <h3 className="text-base font-semibold text-gray-300 text-center">Evolution Parameters</h3>
      <div>
        <label htmlFor="maxIterations" className="block text-sm font-medium text-gray-300 mb-1">
          Max Iterations
        </label>
        <input
          type="number"
          id="maxIterations"
          value={maxIterations}
          onChange={(e) => setMaxIterations(Math.max(1, parseInt(e.target.value, 10) || 1))}
          min="1"
          max="50"
          disabled={disabled}
          className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">Number of improvement cycles to run.</p>
      </div>
    </div>
  );
};
