#!/usr/bin/env node

import { glob } from 'glob';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { getRegisteredFlows, clearFlows } from '../core/krepko.js';
import { Runner } from '../core/runner.js';
import { PrettyReporter } from '../reporters/pretty.js';
import type { KrepkoMode } from '../core/types.js';

interface CliOptions {
  baseUrl: string;
  pattern: string;
  mode: KrepkoMode;
  tags: string[];
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    baseUrl: process.env.KREPKO_BASE_URL || 'http://localhost:3000',
    pattern: '**/*.krepko.ts',
    mode: (process.env.KREPKO_MODE as KrepkoMode) || 'ci',
    tags: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--base-url':
      case '-b':
        if (next) {
          options.baseUrl = next;
          i++;
        }
        break;

      case '--pattern':
      case '-p':
        if (next) {
          options.pattern = next;
          i++;
        }
        break;

      case '--mode':
      case '-m':
        if (next && ['dev', 'ci', 'strict'].includes(next)) {
          options.mode = next as KrepkoMode;
          i++;
        }
        break;

      case '--tags':
      case '-t':
        if (next) {
          options.tags = next.split(',').map((t) => t.trim());
          i++;
        }
        break;

      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
KrepkoJS - Contract-driven HTTP testing

Usage:
  npx krepko [options]

Options:
  -b, --base-url <url>    Base URL for API requests (default: http://localhost:3000)
  -p, --pattern <glob>    Glob pattern for flow files (default: **/*.krepko.ts)
  -m, --mode <mode>       Run mode: dev, ci, strict (default: ci)
  -t, --tags <tags>       Filter flows by tags (comma-separated)
  -h, --help              Show this help message

Environment variables:
  KREPKO_BASE_URL         Default base URL
  KREPKO_MODE             Default mode

Examples:
  npx krepko --base-url http://localhost:8080
  npx krepko --pattern "flows/**/*.ts" --tags smoke,auth
  npx krepko --mode strict
`);
}

async function loadFlowFiles(pattern: string): Promise<string[]> {
  const files = await glob(pattern, {
    ignore: ['node_modules/**', 'dist/**'],
    absolute: true,
  });
  return files;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  clearFlows();

  const files = await loadFlowFiles(options.pattern);

  if (files.length === 0) {
    console.log(`No flow files found matching pattern: ${options.pattern}`);
    console.log('Create a file like auth.krepko.ts with your flows.');
    process.exit(0);
  }

  for (const file of files) {
    const fileUrl = pathToFileURL(resolve(file)).href;
    await import(fileUrl);
  }

  const flows = getRegisteredFlows();

  if (flows.length === 0) {
    console.log('No flows registered. Make sure your flow files call krepko().');
    process.exit(0);
  }

  const runner = new Runner({
    mode: options.mode,
    tags: options.tags.length > 0 ? options.tags : undefined,
  });

  runner.addFlows(flows);

  const summary = await runner.run();

  const baseUrls = [...new Set(flows.map((f) => f.getBaseUrl()))];
  const displayBaseUrl = baseUrls.length === 1 ? baseUrls[0] : baseUrls.join(', ');

  const reporter = new PrettyReporter(displayBaseUrl);
  reporter.report(summary);

  process.exit(summary.exitCode);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});