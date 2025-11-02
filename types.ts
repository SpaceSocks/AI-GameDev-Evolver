export enum Status {
  Idle = 'Idle',
  Generating = 'Generating Code',
  Improving = 'Improving Code',
  Error = 'Error',
  Stopped = 'Stopped',
  Finished = 'Finished',
}

export type LlmProvider = 'gemini' | 'openai';

export interface UsageStat {
  iteration: number;
  task: 'generation' | 'improvement';
  provider: LlmProvider;
  inputChars: number;
  outputChars: number;
}

export interface Iteration {
  code: string;
  screenshot?: string;
  compressedScreenshot?: string;
}

export type GameType = 'simulation' | 'interactive';
