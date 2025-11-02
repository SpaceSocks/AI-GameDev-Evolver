
import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 p-4 border-b border-gray-700">
            <h1 className="text-2xl font-bold text-center text-cyan-400">
                AI GameDev Evolver
            </h1>
        </header>
    );
};
