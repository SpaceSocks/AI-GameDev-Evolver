import React, { useEffect, useRef } from 'react';

interface StatusLogProps {
  history: string[];
}

const Message: React.FC<{ message: string }> = React.memo(({ message }) => {
    // Extract timestamp if present
    const timestampMatch = message.match(/^\[([^\]]+)\]\s*(.*)$/);
    const timestamp = timestampMatch ? timestampMatch[1] : null;
    const messageContent = timestampMatch ? timestampMatch[2] : message;

    if (messageContent.startsWith('[Analysis]')) {
        return (
            <div className="my-2 p-3 bg-purple-900/30 border-l-4 border-purple-500 rounded-r-md whitespace-pre-wrap">
                <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-purple-300">Analysis</p>
                    {timestamp && <p className="text-xs text-gray-400 ml-2">{timestamp}</p>}
                </div>
                <p className="text-gray-300">{messageContent.substring(11)}</p>
            </div>
        );
    }
    if (messageContent.startsWith('[Thought]')) {
        return (
            <div className="my-2 p-3 bg-yellow-900/30 border-l-4 border-yellow-500 rounded-r-md whitespace-pre-wrap">
                <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-yellow-300">Thought Process</p>
                    {timestamp && <p className="text-xs text-gray-400 ml-2">{timestamp}</p>}
                </div>
                <p className="text-gray-300">{messageContent.substring(10)}</p>
            </div>
        );
    }
    if (messageContent.startsWith('[Plan]')) {
        return (
            <div className="my-2 p-3 bg-green-900/30 border-l-4 border-green-500 rounded-r-md whitespace-pre-wrap">
                <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-green-300">Plan</p>
                    {timestamp && <p className="text-xs text-gray-400 ml-2">{timestamp}</p>}
                </div>
                <p className="text-gray-300">{messageContent.substring(7)}</p>
            </div>
        );
    }
    if (messageContent.startsWith('[Memory]')) {
        return (
            <div className="my-2 p-3 bg-blue-900/30 border-l-4 border-blue-500 rounded-r-md whitespace-pre-wrap">
                <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-blue-300">Memory Update</p>
                    {timestamp && <p className="text-xs text-gray-400 ml-2">{timestamp}</p>}
                </div>
                <p className="text-gray-300">{messageContent.substring(9)}</p>
            </div>
        );
    }

    const isError = messageContent.startsWith('Error:');
    const isWarning = messageContent.startsWith('Warning:');

    return (
        <div className={`flex items-start gap-2 ${isError ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-gray-300'}`}>
            <span className="text-cyan-400 flex-shrink-0">{'>'}</span>
            {timestamp && <span className="text-xs text-gray-500 flex-shrink-0 min-w-[140px]">{timestamp}</span>}
            <p className="whitespace-pre-wrap flex-1">{messageContent}</p>
        </div>
    );
});

export const StatusLog: React.FC<StatusLogProps> = ({ history }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastHistoryLengthRef = useRef(history.length);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (history.length > lastHistoryLengthRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current.closest('.overflow-y-auto') as HTMLElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
    lastHistoryLengthRef.current = history.length;
  }, [history.length]);

  return (
    <div ref={scrollContainerRef} className="text-sm font-mono min-h-0">
        {history.map((message, index) => (
            <Message key={index} message={message} />
        ))}
    </div>
  );
};
