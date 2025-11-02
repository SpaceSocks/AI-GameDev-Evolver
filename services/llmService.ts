import { LlmConfig } from '../types';
import * as geminiService from './geminiService';
// In a real app, you might have an openAiService.ts as well
// import * as openAiService from './openAiService';

export const generateInitialCode = (config: LlmConfig, gameConcept: string, gameType: 'interactive' | 'simulation') => {
  switch (config.provider) {
    case 'gemini':
      return geminiService.generateInitialCode(config, gameConcept, gameType);
    // case 'openai':
    //   return openAiService.generateInitialCode(config, gameConcept);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
};

export const improveCode = (config: LlmConfig, code: string, screenshot: string, gameConcept: string, devNotesHistory: string[], newDevNote: string) => {
    switch (config.provider) {
        case 'gemini':
            return geminiService.improveCode(config, code, screenshot, gameConcept, devNotesHistory, newDevNote);
        // case 'openai':
        //     return openAiService.improveCode(config, code, screenshot, gameConcept, devNotesHistory, newDevNote);
        default:
            throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
};

export const generateRandomIdea = (config: LlmConfig) => {
    switch (config.provider) {
        case 'gemini':
            return geminiService.generateRandomIdea(config);
        // case 'openai':
        //     return openAiService.generateRandomIdea(config);
        default:
            throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
};
