import React, { useState, useEffect } from 'react';
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
  const [savedModels, setSavedModels] = useState<string[]>([]);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModelName, setNewModelName] = useState('');

  // Load saved models from localStorage on mount and auto-add current model if not saved
  useEffect(() => {
    const saved = localStorage.getItem('evoforge_savedModels');
    const initialModels = saved ? JSON.parse(saved) : [];
    
    // Add current model if not in list
    if (modelName && !initialModels.includes(modelName)) {
      initialModels.push(modelName);
      localStorage.setItem('evoforge_savedModels', JSON.stringify(initialModels));
    }
    
    setSavedModels(initialModels);
  }, []); // Only run on mount

  // Save models to localStorage when they change (but not on mount)
  useEffect(() => {
    if (savedModels.length > 0) {
      localStorage.setItem('evoforge_savedModels', JSON.stringify(savedModels));
    }
  }, [savedModels]);

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

  const handleAddModel = () => {
    if (newModelName.trim() && !savedModels.includes(newModelName.trim())) {
      setSavedModels([...savedModels, newModelName.trim()]);
      setModelName(newModelName.trim());
      setNewModelName('');
      setShowAddModel(false);
    }
  };

  const handleModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__add_new__') {
      setShowAddModel(true);
    } else {
      setModelName(value);
    }
  };

  return (
    <div className="space-y-1.5">
      <div>
        <label htmlFor="provider" className="block text-sm font-medium text-gray-300 mb-1">
          LLM Provider
        </label>
        <select
          id="provider"
          value={provider}
          onChange={handleProviderChange}
          disabled={disabled}
          className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-1.5 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-sm"
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
            className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-1.5 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-sm"
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
            className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-1.5 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-sm"
            placeholder="Required for cloud services"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}
      {!showAddModel ? (
        <div>
          <label htmlFor="modelName" className="block text-sm font-medium text-gray-300 mb-1">
            Model Name
          </label>
          <select
            id="modelName"
            value={modelName}
            onChange={handleModelSelect}
            disabled={disabled}
            className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-1.5 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-sm"
          >
            {/* Show current model if it's not in savedModels */}
            {!savedModels.includes(modelName) && modelName && (
              <option value={modelName}>{modelName}</option>
            )}
            {/* Show all saved models */}
            {savedModels.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
            <option value="__add_new__">+ Add New Model</option>
          </select>
        </div>
      ) : (
        <div>
          <label htmlFor="newModelName" className="block text-sm font-medium text-gray-300 mb-1">
            Add New Model
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              id="newModelName"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-md shadow-sm p-1.5 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 text-sm"
              placeholder="e.g., gpt-5-nano"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              disabled={disabled}
            />
            <button
              onClick={handleAddModel}
              disabled={disabled || !newModelName.trim()}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddModel(false);
                setNewModelName('');
              }}
              disabled={disabled}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};