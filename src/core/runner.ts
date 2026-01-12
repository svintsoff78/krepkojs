import { Flow } from './flow.js';
import type { FlowResult, KrepkoMode } from './types.js';

export interface RunnerOptions {
  mode: KrepkoMode;
  tags?: string[];
}

export interface RunSummary {
  flows: FlowResult[];
  passed: number;
  failed: number;
  draft: number;
  totalDuration: number;
  exitCode: number;
}

export class Runner {
  private readonly flows: Flow[] = [];
  private readonly options: RunnerOptions;

  constructor(options: RunnerOptions) {
    this.options = options;
  }

  addFlow(flow: Flow): void {
    this.flows.push(flow);
  }

  addFlows(flows: Flow[]): void {
    this.flows.push(...flows);
  }

  private shouldRunFlow(flow: Flow): boolean {
    if (!this.options.tags || this.options.tags.length === 0) {
      return true;
    }

    const flowTags = flow.getTags();
    return this.options.tags.some((tag) => flowTags.includes(tag));
  }

  async run(): Promise<RunSummary> {
    const startTime = performance.now();
    const results: FlowResult[] = [];

    const flowsToRun = this.flows.filter((flow) => this.shouldRunFlow(flow));

    for (const flow of flowsToRun) {
      const result = await flow.run();
      results.push(result);
    }

    const totalDuration = performance.now() - startTime;

    let passed = 0;
    let failed = 0;
    let draft = 0;

    for (const result of results) {
      if (result.isDraft) {
        draft++;
      } else if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    }

    const exitCode = this.calculateExitCode(results);

    return {
      flows: results,
      passed,
      failed,
      draft,
      totalDuration,
      exitCode,
    };
  }

  private calculateExitCode(results: FlowResult[]): number {
    const { mode } = this.options;

    for (const result of results) {
      if (!result.passed) {
        if (result.isDraft) {
          if (mode === 'strict') {
            return 1;
          }
        } else {
          return 1;
        }
      }
    }

    if (mode === 'strict') {
      const hasDrafts = results.some((r) => r.isDraft);
      if (hasDrafts) {
        return 1;
      }
    }

    return 0;
  }
}