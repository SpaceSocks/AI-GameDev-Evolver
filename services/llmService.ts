import { LlmProvider } from '../types';
import { callGemini } from './geminiService';
import { callOpenAI } from './openAiService';

interface LlmRequest {
  provider: LlmProvider;
  prompt: string;
  modelName: string;
  apiKey: string; // For OpenAI-compatible
  baseUrl?: string; // For OpenAI-compatible
}

interface LlmResponse {
  content: string;
  inputChars: number;
  outputChars: number;
}

export const callLlm = async (request: LlmRequest): Promise<LlmResponse> => {
  const { provider, prompt, modelName, apiKey, baseUrl } = request;

  switch (provider) {
    case 'gemini':
      return callGemini({ prompt, modelName });
    case 'openai':
      return callOpenAI({ prompt, modelName, apiKey, baseUrl });
    default:
      // This check is useful for JavaScript environments without full TypeScript support
      const exhaustiveCheck: never = provider;
      throw new Error(`Unsupported LLM provider: ${exhaustiveCheck}`);
  }
};
