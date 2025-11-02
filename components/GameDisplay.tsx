import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface GameDisplayProps {
  htmlContent: string | null;
  onLoad?: () => void;
}

export interface GameDisplayRef {
  captureScreenshot: () => Promise<string>;
}

export const GameDisplay = forwardRef<GameDisplayRef, GameDisplayProps>(({ htmlContent, onLoad }, ref) => {
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
        
        // A short delay to allow the canvas to render before capturing
        setTimeout(() => {
          try {
            const canvas = iframe.contentWindow.document.querySelector('canvas');
            if (!canvas) {
              return reject(new Error('Canvas not found in iframe'));
            }
            // toDataURL returns a base64 string, but we need to remove the prefix
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64 = dataUrl.split(',')[1];
            resolve(base64);
          } catch (e) {
            console.error('Screenshot capture failed:', e);
            reject(new Error('Failed to capture screenshot due to security or rendering issues.'));
          }
        }, 500);
      });
    },
  }));


  return (
    <div className="w-full h-full bg-black border border-gray-700 rounded-lg overflow-hidden">
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
