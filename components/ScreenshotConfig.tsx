import React from 'react';

interface ScreenshotConfigProps {
  screenshotCount: number;
  setScreenshotCount: (count: number) => void;
  screenshotInterval: number;
  setScreenshotInterval: (interval: number) => void;
  disabled: boolean;
}

export const ScreenshotConfig: React.FC<ScreenshotConfigProps> = ({ 
  screenshotCount, 
  setScreenshotCount, 
  screenshotInterval, 
  setScreenshotInterval, 
  disabled 
}) => {
  return (
    <div className="space-y-1.5">
      <div>
        <label htmlFor="screenshotCount" className="block text-xs font-medium text-gray-300 mb-0.5">
          Screenshot Count
        </label>
        <input
          type="number"
          id="screenshotCount"
          value={screenshotCount}
          onChange={(e) => setScreenshotCount(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
          min="1"
          max="10"
          disabled={disabled}
          className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-1.5 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-sm"
        />
        <p className="text-xs text-gray-500 mt-0.5">Saved to iteration history (default: 1)</p>
      </div>
      {screenshotCount > 1 && (
        <div>
          <label htmlFor="screenshotInterval" className="block text-xs font-medium text-gray-300 mb-0.5">
            Interval (s)
          </label>
          <input
            type="number"
            id="screenshotInterval"
            value={screenshotInterval}
            onChange={(e) => setScreenshotInterval(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
            min="1"
            max="10"
            disabled={disabled}
            className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-1.5 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-sm"
          />
          <p className="text-xs text-gray-500 mt-0.5">Only used if count &gt; 1</p>
        </div>
      )}
    </div>
  );
};

