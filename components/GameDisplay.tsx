import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface GameDisplayProps {
  htmlContent: string | null;
  onLoad?: () => void;
  isLoading?: boolean;
  statusText?: string;
  currentIteration?: number;
}

export interface GameDisplayRef {
  captureScreenshot: () => Promise<string>;
}

export const GameDisplay = forwardRef<GameDisplayRef, GameDisplayProps>(({ htmlContent, onLoad, isLoading, statusText, currentIteration }, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && htmlContent) {
      iframeRef.current.srcdoc = htmlContent;
    }
  }, [htmlContent]);
  
  useImperativeHandle(ref, () => ({
    captureScreenshot: async (): Promise<string> => {
      return new Promise((resolve, reject) => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow) {
          return reject(new Error('Iframe not ready'));
        }
        
        const maxAttempts = 20; // 20 * 250ms = 5 seconds
        let attempts = 0;

        const pollForCanvas = () => {
            try {
                const canvas = iframe.contentWindow?.document.querySelector('canvas');
                if (canvas) {
                    // A very short delay after finding the canvas to allow for final render flush
                    setTimeout(() => {
                        try {
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            const base64 = dataUrl.split(',')[1];
                            resolve(base64);
                        } catch(e) {
                           console.error('Screenshot capture failed:', e);
                           reject(new Error('Failed to capture screenshot due to security or rendering issues.'));
                        }
                    }, 100);
                } else {
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(pollForCanvas, 250);
                    } else {
                        reject(new Error('Canvas not found in iframe after 5 seconds.'));
                    }
                }
            } catch (e) {
                 reject(new Error('Error accessing iframe content. This might be a cross-origin issue if loading external scripts failed.'));
            }
        };

        // The iframe's onLoad event can be unreliable with srcdoc and dynamic content.
        // We start polling shortly after the content is set.
        setTimeout(pollForCanvas, 250);
      });
    },
  }));


  return (
    <div className="w-full h-full bg-black border border-gray-700 rounded-lg overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mb-4"></div>
          <p className="text-cyan-400 text-lg font-medium mb-2">{statusText || 'Loading...'}</p>
          {currentIteration !== undefined && currentIteration > 0 && (
            <p className="text-gray-400 text-sm">Iteration {currentIteration}</p>
          )}
        </div>
      )}
      {htmlContent ? (
        <iframe
          ref={iframeRef}
          title="Game Preview"
          className="w-full h-full"
          sandbox="allow-scripts allow-same-origin"
          onLoad={onLoad}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
            <p className="text-gray-500">Game preview will appear here.</p>
        </div>
      )}
    </div>
  );
});
