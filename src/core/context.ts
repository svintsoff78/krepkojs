import { KrepkoResponse } from './response.js';
import type { RequestOptions } from './types.js';

export class Context {
  private readonly baseUrl: string;
  private readonly storage: Map<string, unknown> = new Map();
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  getVar<T = unknown>(key: string): T {
    return this.storage.get(key) as T;
  }

  setVar(key: string, value: unknown): void {
    this.storage.set(key, value);
  }

  get vars(): Record<string, unknown> {
    return Object.fromEntries(this.storage);
  }

  set(key: string, value: unknown): void {
    this.storage.set(key, value);
  }

  bearer(token: string): this {
    this.authToken = token;
    return this;
  }

  clearAuth(): this {
    this.authToken = null;
    return this;
  }

  async request(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<KrepkoResponse> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (options.body !== undefined && method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    let body: unknown;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    return new KrepkoResponse(response, body);
  }

  async post(path: string, body?: unknown, headers?: Record<string, string>): Promise<KrepkoResponse> {
    return this.request('POST', path, { body, headers });
  }

  async get(path: string, headers?: Record<string, string>): Promise<KrepkoResponse> {
    return this.request('GET', path, { headers });
  }

  async put(path: string, body?: unknown, headers?: Record<string, string>): Promise<KrepkoResponse> {
    return this.request('PUT', path, { body, headers });
  }

  async patch(path: string, body?: unknown, headers?: Record<string, string>): Promise<KrepkoResponse> {
    return this.request('PATCH', path, { body, headers });
  }

  async delete(path: string, headers?: Record<string, string>): Promise<KrepkoResponse> {
    return this.request('DELETE', path, { headers });
  }
}