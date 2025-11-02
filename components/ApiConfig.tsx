import React from 'react';
import { LlmProvider } from '../types';

interface ApiConfigProps {
  provider: LlmProvider;
  setProvider: (provider: LlmProvider) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  modelName: string;
  setModelName: (name: string) => void;
  disabled: boolean;
}

export const ApiConfig: React.FC<ApiConfigProps> = ({ provider, setProvider, apiKey, setApiKey, baseUrl, setBaseUrl, modelName, setModelName, disabled }) => {
  
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as LlmProvider;
    setProvider(newProvider);
    // Reset to sensible defaults when changing provider
    if (newProvider === 'gemini') {
        setModelName('gemini-2.5-pro');
        setBaseUrl('');
        // Fix: Per guidelines, Gemini API key comes from env, so clear it from state
        setApiKey('');
    } else {
        setModelName('gpt-4o');
    }
  };

  return (
    <div className="space-y-3 bg-gray-900 border border-gray-700 rounded-lg p-3">
       <h3 className="text-base font-semibold text-gray-300 text-center">LLM Configuration</h3>
      <div>
        <label htmlFor="provider" className="block text-sm font-medium text-gray-300 mb-1">
          LLM Provider
        </label>
        <select
          id="provider"
          value={provider}
          onChange={handleProviderChange}
          disabled={disabled}
          className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-sm"
        >
          <option value="gemini">Google Gemini</option>
          <option value="openai">OpenAI / Compatible</option>
        </select>
      </div>

    {provider === 'openai' && (
        <div>
            <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-300 mb-1">
            Base URL (Optional)
            </label>
            <input
            type="text"
            id="baseUrl"
            className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-sm"
            placeholder="http://localhost:1234/v1 (for LM Studio)"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            disabled={disabled}
            />
        </div>
    )}
      {/* Fix: Hide API key field for Gemini, as it uses environment variables */}
      {provider !== 'gemini' && (
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-1">
            API Key
          </label>
          <input
            type="password"
            id="apiKey"
            className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-sm"
            placeholder="Required for cloud services"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}
      <div>
        <label htmlFor="modelName" className="block text-sm font-medium text-gray-300 mb-1">
          Model Name
        </label>
        <input
          type="text"
          id="modelName"
          className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-sm"
          placeholder="e.g., gemini-2.5-pro or gpt-4o"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
};