export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
}

export interface StepResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: Error;
}

export interface FlowResult {
  name: string;
  steps: StepResult[];
  passed: boolean;
  duration: number;
  isDraft: boolean;
  tags: string[];
}

export type KrepkoMode = 'dev' | 'ci' | 'strict';

export interface KrepkoConfig {
  baseUrl: string;
  mode: KrepkoMode;
  pattern: string;
  tags?: string[];
}