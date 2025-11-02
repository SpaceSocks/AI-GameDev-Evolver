import React from 'react';

interface Iteration {
  code: string;
  screenshot?: string;
}

interface IterationHistoryProps {
  history: Iteration[];
  onSelect: (index: number) => void;
  selectedIndex: number | null;
}

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.293a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);


export const IterationHistory: React.FC<IterationHistoryProps> = ({ history, onSelect, selectedIndex }) => {
  
  const handleDownload = (code: string, index: number) => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-iteration-${index + 1}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
        {history.map((item, index) => (
            <div
                key={index}
                onClick={() => onSelect(index)}
                className={`w-full text-left p-2 rounded-md flex items-center gap-4 transition-colors cursor-pointer ${selectedIndex === index ? 'bg-cyan-800/70 ring-2 ring-cyan-400' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
                <div className="w-24 h-16 bg-black flex-shrink-0 rounded-md border border-gray-600 flex items-center justify-center">
                    {item.screenshot ? (
                        <img src={`data:image/jpeg;base64,${item.screenshot}`} alt={`Iteration ${index + 1} screenshot`} className="w-full h-full object-cover rounded-md" />
                    ) : (
                        <span className="text-xs text-gray-500">No Preview</span>
                    )}
                </div>
                <div className="flex-grow font-semibold text-gray-200">
                    Iteration {index + 1}
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(item.code, index);
                    }}
                    className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    aria-label={`Download Iteration ${index + 1}`}
                    title={`Download Iteration ${index + 1}`}
                >
                    <DownloadIcon />
                </button>
            </div>
        ))}
        {history.length === 0 && (
            <div className="text-center text-gray-500 p-4">
                No history to display.
            </div>
        )}
    </div>
  );
};