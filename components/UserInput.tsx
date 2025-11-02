import React from 'react';

interface UserInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerateRandom: () => void;
  disabled: boolean;
}

export const UserInput: React.FC<UserInputProps> = ({ value, onChange, onGenerateRandom, disabled }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="gameDescription" className="block text-sm font-medium text-gray-300">
          Enter your game concept:
        </label>
        <button
          onClick={onGenerateRandom}
          disabled={disabled}
          className="px-2 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          Random Idea
        </button>
      </div>
      <textarea
        id="gameDescription"
        rows={3}
        className="block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm p-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-sm"
        placeholder="e.g., A side-scrolling game where a cat jumps over dogs to collect fish."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
};
