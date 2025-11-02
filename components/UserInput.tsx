import React from 'react';

interface UserInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  onGenerateRandom: () => void;
  isGeneratingIdea: boolean;
}

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v1.5a.5.5 0 001 0V4a1 1 0 112 0v1.5a.5.5 0 001 0V4a1 1 0 112 0v1.5a.5.5 0 00.968.243l.7-1.4a1 1 0 011.788.894l-.7 1.4a.5.5 0 00.484.663H19a1 1 0 110 2h-1.5a.5.5 0 00-.484.663l.7 1.4a1 1 0 01-1.788.894l-.7-1.4a.5.5 0 00-.968.243V16a1 1 0 11-2 0v-1.5a.5.5 0 00-1 0V16a1 1 0 11-2 0v-1.5a.5.5 0 00-1 0V16a1 1 0 11-2 0v-1.5a.5.5 0 00-.968-.243l-.7 1.4a1 1 0 01-1.788-.894l.7-1.4a.5.5 0 00-.484-.663H1a1 1 0 110-2h1.5a.5.5 0 00.484-.663l-.7-1.4a1 1 0 011.788-.894l.7 1.4a.5.5 0 00.968-.243V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
);

export const UserInput: React.FC<UserInputProps> = ({ value, onChange, disabled, onGenerateRandom, isGeneratingIdea }) => {
  const isDisabled = disabled || isGeneratingIdea;
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label htmlFor="gameDescription" className="block text-sm font-medium text-gray-300">
          Enter your game concept:
        </label>
        <button 
            onClick={onGenerateRandom}
            disabled={isDisabled}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-900/50 border border-cyan-700 rounded-md hover:bg-cyan-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            {isGeneratingIdea ? (
                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <SparklesIcon/>
            )}
           
            {isGeneratingIdea ? 'Generating...' : 'Random Idea'}
        </button>
      </div>
      <textarea
        id="gameDescription"
        rows={4}
        className="block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm p-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50"
        placeholder="e.g., A side-scrolling game where a cat jumps over dogs to collect fish."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled}
      />
    </div>
  );
};