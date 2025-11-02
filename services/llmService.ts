

import { LlmConfig } from '../types';
import * as geminiService from './geminiService';
import * as openAiService from './openAiService';

export const generateInitialCode = (config: LlmConfig, gameConcept: string, gameType: 'interactive' | 'simulation') => {
  switch (config.provider) {
    case 'gemini':
      return geminiService.generateInitialCode(config, gameConcept, gameType);
    case 'openai':
      return openAiService.generateInitialCode(config, gameConcept, gameType);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
};

export const improveCode = (config: LlmConfig, code: string, screenshot: string, gameConcept: string, devNotesHistory: string[], newDevNote?: string) => {
    switch (config.provider) {
        case 'gemini':
            return geminiService.improveCode(config, code, screenshot, gameConcept, devNotesHistory, newDevNote);
        case 'openai':
            return openAiService.improveCode(config, code, screenshot, gameConcept, devNotesHistory, newDevNote);
        default:
            throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
};

export const generateRandomIdea = (config: LlmConfig, gameType: 'interactive' | 'simulation') => {
    switch (config.provider) {
        case 'gemini':
            return geminiService.generateRandomIdea(config, gameType);
        case 'openai':
            return openAiService.generateRandomIdea(config, gameType);
        default:
            throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
};