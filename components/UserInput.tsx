import React from 'react';

interface UserInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export const UserInput: React.FC<UserInputProps> = ({ value, onChange, disabled }) => {
  return (
    <div>
      <label htmlFor="gameDescription" className="block text-sm font-medium text-gray-300 mb-2">
        Enter your game concept:
      </label>
      <textarea
        id="gameDescription"
        rows={4}
        className="block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm p-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50"
        placeholder="e.g., A side-scrolling game where a cat jumps over dogs to collect fish."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
};
