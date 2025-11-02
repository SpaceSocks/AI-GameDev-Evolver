import React, { useEffect, useState } from 'react';
import { Status } from '../types';

interface GameDisplayProps {
    code: string | null;
    status: Status;
    iframeRef: React.RefObject<HTMLIFrameElement>;
    onLoad: () => void;
}

export const GameDisplay: React.FC<GameDisplayProps> = ({ code, status, iframeRef, onLoad }) => {
    const [iframeSrc, setIframeSrc] = useState<string | undefined>(undefined);

    useEffect(() => {
        let objectUrl: string | undefined;

        if (code) {
            const blob = new Blob([code], { type: 'text/html' });
            objectUrl = URL.createObjectURL(blob);
            setIframeSrc(objectUrl);
        } else {
            setIframeSrc(undefined);
        }

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [code]);

    return (
        <div className="w-full h-full bg-black border-2 border-gray-700 rounded-lg flex items-center justify-center relative overflow-hidden">
            {iframeSrc ? (
                <iframe
                    ref={iframeRef}
                    src={iframeSrc}
                    title="Game Preview"
                    sandbox="allow-scripts allow-same-origin"
                    onLoad={onLoad}
                    className="w-full h-full"
                />
            ) : (
                <div className="text-center text-gray-500">
                    <h2 className="text-xl font-bold mb-2">AI GameDev Evolver</h2>
                    <p>Enter your game concept and click "Start Evolution"</p>
                    <p>to begin the generation process.</p>
                </div>
            )}
            {status === Status.Generating && (
                 <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-white text-lg font-semibold">Generating Initial Game...</p>
                 </div>
            )}
        </div>
    );
};