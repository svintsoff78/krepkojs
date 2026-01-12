import type { FlowResult, StepResult } from '../core/types.js';
import type { RunSummary } from '../core/runner.js';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

export class PrettyReporter {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  printHeader(): void {
    console.log();
    console.log(`${colors.bold}${colors.cyan}KrepkoJS${colors.reset} v0.1.0`);
    console.log(`${colors.dim}Base URL: ${this.baseUrl}${colors.reset}`);
    console.log();
  }

  printFlowStart(flowName: string, isDraft: boolean): void {
    const draftLabel = isDraft
      ? ` ${colors.yellow}[DRAFT]${colors.reset}`
      : '';
    console.log(`${colors.bold}Flow: ${flowName}${draftLabel}${colors.reset}`);
  }

  printStepResult(step: StepResult): void {
    const icon = step.passed
      ? `${colors.green}\u2713${colors.reset}`
      : `${colors.red}\u2717${colors.reset}`;

    const duration = `${colors.dim}${formatDuration(step.duration)}${colors.reset}`;

    console.log(`  ${icon} ${step.name}  ${duration}`);

    if (!step.passed && step.error) {
      this.printError(step.error);
    }
  }

  private printError(error: Error): void {
    console.log();
    console.log(`    ${colors.red}${error.message}${colors.reset}`);

    const anyError = error as any;

    if (anyError.expected !== undefined && anyError.received !== undefined) {
      console.log(
        `    ${colors.dim}Expected:${colors.reset} ${colors.green}${anyError.expected}${colors.reset}`
      );
      console.log(
        `    ${colors.dim}Received:${colors.reset} ${colors.red}${anyError.received}${colors.reset}`
      );
    }

    if (anyError.body !== undefined) {
      console.log();
      console.log(`    ${colors.dim}Response body:${colors.reset}`);
      console.log(
        `    ${colors.gray}${JSON.stringify(anyError.body, null, 2).split('\n').join('\n    ')}${colors.reset}`
      );
    }

    console.log();
  }

  printFlowResult(result: FlowResult): void {
    this.printFlowStart(result.name, result.isDraft);

    for (const step of result.steps) {
      this.printStepResult(step);
    }

    console.log();
  }

  printSummary(summary: RunSummary): void {
    console.log(`${colors.bold}Summary:${colors.reset}`);

    const totalFlows = summary.passed + summary.failed + summary.draft;
    const totalSteps = summary.flows.reduce(
      (acc, flow) => acc + flow.steps.length,
      0
    );

    if (summary.passed > 0) {
      console.log(
        `${colors.green}\u2713 ${summary.passed} flow${summary.passed > 1 ? 's' : ''} passed${colors.reset}`
      );
    }

    if (summary.failed > 0) {
      console.log(
        `${colors.red}\u2717 ${summary.failed} flow${summary.failed > 1 ? 's' : ''} failed${colors.reset}`
      );
    }

    if (summary.draft > 0) {
      console.log(
        `${colors.yellow}\u25CB ${summary.draft} draft flow${summary.draft > 1 ? 's' : ''}${colors.reset}`
      );
    }

    console.log(
      `${colors.dim}Total: ${totalFlows} flow${totalFlows > 1 ? 's' : ''} (${totalSteps} step${totalSteps > 1 ? 's' : ''})${colors.reset}`
    );
    console.log(
      `${colors.dim}Time: ${formatDuration(summary.totalDuration)}${colors.reset}`
    );

    console.log();

    if (summary.exitCode === 0) {
      console.log(
        `${colors.green}${colors.bold}\u2713 Krepko \u0434\u0435\u0440\u0436\u0438\u0442 \u0432\u0430\u0448 API${colors.reset}`
      );
    } else {
      console.log(
        `${colors.red}${colors.bold}\u2717 Contract violations detected${colors.reset}`
      );
    }

    console.log();
  }

  report(summary: RunSummary): void {
    this.printHeader();

    for (const flow of summary.flows) {
      this.printFlowResult(flow);
    }

    this.printSummary(summary);
  }
}