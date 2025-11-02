import React from 'react';

interface StatusLogProps {
  history: string[];
}

const Message: React.FC<{ message: string }> = React.memo(({ message }) => {
    if (message.startsWith('[Analysis]')) {
        return (
            <div className="my-2 p-3 bg-purple-900/30 border-l-4 border-purple-500 rounded-r-md whitespace-pre-wrap">
                <p className="font-semibold text-purple-300 mb-1">Analysis</p>
                <p className="text-gray-300">{message.substring(11)}</p>
            </div>
        );
    }
    if (message.startsWith('[Thought]')) {
        return (
            <div className="my-2 p-3 bg-yellow-900/30 border-l-4 border-yellow-500 rounded-r-md whitespace-pre-wrap">
                <p className="font-semibold text-yellow-300 mb-1">Thought Process</p>
                <p className="text-gray-300">{message.substring(10)}</p>
            </div>
        );
    }
    if (message.startsWith('[Plan]')) {
        return (
            <div className="my-2 p-3 bg-green-900/30 border-l-4 border-green-500 rounded-r-md whitespace-pre-wrap">
                <p className="font-semibold text-green-300 mb-1">Plan</p>
                <p className="text-gray-300">{message.substring(7)}</p>
            </div>
        );
    }
    if (message.startsWith('[Memory]')) {
        return (
            <div className="my-2 p-3 bg-blue-900/30 border-l-4 border-blue-500 rounded-r-md whitespace-pre-wrap">
                <p className="font-semibold text-blue-300 mb-1">Memory Update</p>
                <p className="text-gray-300">{message.substring(9)}</p>
            </div>
        );
    }

    const isError = message.startsWith('Error:');
    const isWarning = message.startsWith('Warning:');

    return (
        <p className={`whitespace-pre-wrap ${isError ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-gray-300'}`}>
            <span className="text-cyan-400 mr-2">{'>'}</span>{message}
        </p>
    );
});

export const StatusLog: React.FC<StatusLogProps> = ({ history }) => {
  return (
    <div className="text-sm font-mono">
        {history.map((message, index) => (
            <Message key={index} message={message} />
        ))}
    </div>
  );
};
