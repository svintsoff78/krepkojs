import { Context } from './context.js';
import type { StepResult, FlowResult } from './types.js';

export type StepCallback = (ctx: Context) => Promise<void> | void;

interface Step {
  name: string;
  callback: StepCallback;
}

export class Flow {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly steps: Step[] = [];
  private flowTags: string[] = [];
  private draft: boolean = false;
  private draftReason?: string;

  constructor(name: string, baseUrl: string) {
    this.name = name;
    this.baseUrl = baseUrl;
  }

  do(name: string, callback: StepCallback): this {
    this.steps.push({ name, callback });
    return this;
  }

  tags(tags: string[]): this {
    this.flowTags = tags;
    return this;
  }

  isDraft(reason?: string): this {
    this.draft = true;
    this.draftReason = reason;
    return this;
  }

  getTags(): string[] {
    return this.flowTags;
  }

  getIsDraft(): boolean {
    return this.draft;
  }

  getDraftReason(): string | undefined {
    return this.draftReason;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async run(): Promise<FlowResult> {
    const ctx = new Context(this.baseUrl);
    const stepResults: StepResult[] = [];
    const startTime = performance.now();
    let flowPassed = true;

    for (const step of this.steps) {
      const stepStart = performance.now();
      let passed = true;
      let error: Error | undefined;

      try {
        await step.callback(ctx);
      } catch (e) {
        passed = false;
        flowPassed = false;
        error = e instanceof Error ? e : new Error(String(e));
      }

      const stepDuration = performance.now() - stepStart;

      stepResults.push({
        name: step.name,
        passed,
        duration: stepDuration,
        error,
      });

      if (!passed) {
        break;
      }
    }

    const totalDuration = performance.now() - startTime;

    return {
      name: this.name,
      steps: stepResults,
      passed: flowPassed,
      duration: totalDuration,
      isDraft: this.draft,
      tags: this.flowTags,
    };
  }
}