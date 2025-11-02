import React from 'react';

const APP_VERSION = '1.0.0';

export const Header: React.FC = () => {
    return (
        <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 p-4 border-b border-gray-700">
            <div className="flex items-center justify-center gap-3">
                <h1 className="text-2xl font-bold text-cyan-400">
                    EvoForge
                </h1>
                <span className="text-xs font-mono bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded-full border border-cyan-700">
                    v{APP_VERSION}
                </span>
            </div>
        </header>
    );
};