import React from 'react';

export type GameType = 'simulation' | 'interactive';

interface GameTypeSelectorProps {
  value: GameType;
  onChange: (value: GameType) => void;
  disabled: boolean;
}

const SelectorButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    disabled: boolean;
}> = ({ label, isActive, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-50 ${
            isActive
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
    >
        {label}
    </button>
);

export const GameTypeSelector: React.FC<GameTypeSelectorProps> = ({ value, onChange, disabled }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Select Game Type:
      </label>
      <div className="flex space-x-2 bg-gray-900 border border-gray-600 rounded-md p-1">
        <SelectorButton 
            label="Visual Simulation"
            isActive={value === 'simulation'}
            onClick={() => onChange('simulation')}
            disabled={disabled}
        />
        <SelectorButton
            label="Interactive Game"
            isActive={value === 'interactive'}
            onClick={() => onChange('interactive')}
            disabled={disabled}
        />
      </div>
    </div>
  );
};
