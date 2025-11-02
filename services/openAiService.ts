import { LlmConfig } from '../types';

const notImplementedError = new Error("OpenAI provider is not implemented in this version.");

export const generateInitialCode = (
  config: LlmConfig,
  gameConcept: string,
  gameType: 'interactive' | 'simulation'
): Promise<string> => {
  return Promise.reject(notImplementedError);
};

export const improveCode = (
  config: LlmConfig,
  code: string,
  screenshot: string,
  gameConcept: string,
  devNotesHistory: string[],
  newDevNote?: string
): Promise<{ thought: string; plan: string; code: string; analysis: string; memory: string; }> => {
  return Promise.reject(notImplementedError);
};

export const generateRandomIdea = (
    config: LlmConfig,
    gameType: 'interactive' | 'simulation'
): Promise<string> => {
    return Promise.reject(notImplementedError);
};
