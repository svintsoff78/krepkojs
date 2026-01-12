import { Flow } from './flow.js';

const globalFlows: Flow[] = [];

export class Krepko {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  flow(name: string): Flow {
    const flow = new Flow(name, this.baseUrl);
    globalFlows.push(flow);
    return flow;
  }
}

export function krepko(baseUrl: string): Krepko {
  return new Krepko(baseUrl);
}

export function getRegisteredFlows(): Flow[] {
  return [...globalFlows];
}

export function clearFlows(): void {
  globalFlows.length = 0;
}