export enum Status {
    Idle = 'IDLE',
    Generating = 'GENERATING',
    Improving = 'IMPROVING',
    Stopped = 'STOPPED',
    Error = 'ERROR'
}

export type LlmProvider = 'gemini' | 'openai';

export interface LlmConfig {
    provider: LlmProvider;
    apiKey: string;
    baseUrl: string;
    modelName: string;
}

export interface UsageStat {
    iteration: number;
    task: string;
    provider: LlmProvider;
    model: string;
    inputChars: number;
    outputChars: number;
}
