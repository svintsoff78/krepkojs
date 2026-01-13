const EXPECT_ANY = Symbol('expect.any');
const EXPECT_STRING = Symbol('expect.string');
const EXPECT_NUMBER = Symbol('expect.number');
const EXPECT_BOOLEAN = Symbol('expect.boolean');
const EXPECT_ARRAY = Symbol('expect.array');
const EXPECT_OBJECT = Symbol('expect.object');

const EXPECT_ARRAY_OF = Symbol('expect.arrayOf');
const EXPECT_ARRAY_CONTAINING = Symbol('expect.arrayContaining');

export interface ArrayOfMatcher {
  __type: symbol;
  itemMatcher: unknown;
}

export interface ArrayContainingMatcher {
  __type: symbol;
  items: unknown[];
}

export type ExpectBodyInput = Record<string, unknown> | unknown[] | ArrayOfMatcher | ArrayContainingMatcher;

export interface ExpectBodyOptions {
  depth?: number;
}

export const expect = {
  any: EXPECT_ANY,
  string: EXPECT_STRING,
  number: EXPECT_NUMBER,
  boolean: EXPECT_BOOLEAN,
  array: EXPECT_ARRAY,
  object: EXPECT_OBJECT,
  arrayOf: (itemMatcher: unknown): ArrayOfMatcher => ({
    __type: EXPECT_ARRAY_OF,
    itemMatcher,
  }),
  arrayContaining: (items: unknown[]): ArrayContainingMatcher => ({
    __type: EXPECT_ARRAY_CONTAINING,
    items,
  }),
};

export class KrepkoResponse {
  readonly status: number;
  readonly headers: Headers;
  readonly body: unknown;
  private readonly rawResponse: Response;

  constructor(response: Response, body: unknown) {
    this.rawResponse = response;
    this.status = response.status;
    this.headers = response.headers;
    this.body = body;
  }

  expectStatus(expected: number): this {
    if (this.status !== expected) {
      const error = new Error(
        `Expected status ${expected}, received ${this.status}`
      );
      (error as any).expected = expected;
      (error as any).received = this.status;
      (error as any).body = this.body;
      throw error;
    }
    return this;
  }

  expectBody(partial: ExpectBodyInput, options?: ExpectBodyOptions): this {
    const maxDepth = options?.depth ?? Infinity;
    const mismatch = this.matchPartial(this.body, partial, '', 0, maxDepth);

    if (mismatch) {
      const error = new Error(mismatch.message);
      (error as any).path = mismatch.path;
      (error as any).expected = mismatch.expected;
      (error as any).received = mismatch.received;
      throw error;
    }

    return this;
  }

  private matchPartial(
    actual: unknown,
    expected: unknown,
    path: string,
    currentDepth: number,
    maxDepth: number
  ): { message: string; path: string; expected: unknown; received: unknown } | null {
    // Depth limit reached - skip deeper validation
    if (currentDepth > maxDepth) {
      return null;
    }

    // Handle symbol matchers
    if (typeof expected === 'symbol') {
      const result = this.matchSymbolMatcher(actual, expected);
      if (!result) {
        return {
          message: `Body mismatch at "${path || 'root'}": expected ${expected.description}, received ${this.formatValue(actual)}`,
          path: path || 'root',
          expected,
          received: actual,
        };
      }
      return null;
    }

    // Handle arrayOf matcher
    if (this.isArrayOfMatcher(expected)) {
      if (!Array.isArray(actual)) {
        return {
          message: `Body mismatch at "${path || 'root'}": expected array, received ${typeof actual}`,
          path: path || 'root',
          expected: 'array',
          received: actual,
        };
      }
      for (let i = 0; i < actual.length; i++) {
        const itemPath = path ? `${path}[${i}]` : `[${i}]`;
        const mismatch = this.matchPartial(actual[i], expected.itemMatcher, itemPath, currentDepth + 1, maxDepth);
        if (mismatch) return mismatch;
      }
      return null;
    }

    // Handle arrayContaining matcher
    if (this.isArrayContainingMatcher(expected)) {
      if (!Array.isArray(actual)) {
        return {
          message: `Body mismatch at "${path || 'root'}": expected array, received ${typeof actual}`,
          path: path || 'root',
          expected: 'array',
          received: actual,
        };
      }
      for (let i = 0; i < expected.items.length; i++) {
        const expectedItem = expected.items[i];
        const found = actual.some((actualItem) =>
          this.matchPartial(actualItem, expectedItem, '', currentDepth + 1, maxDepth) === null
        );
        if (!found) {
          return {
            message: `Body mismatch at "${path || 'root'}": array does not contain expected item at index ${i}`,
            path: path || 'root',
            expected: expectedItem,
            received: actual,
          };
        }
      }
      return null;
    }

    // Handle array expected - validate each element against pattern
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) {
        return {
          message: `Body mismatch at "${path || 'root'}": expected array, received ${typeof actual}`,
          path: path || 'root',
          expected: 'array',
          received: actual,
        };
      }

      // If expected array has elements, validate each actual element against expected patterns
      for (let i = 0; i < expected.length; i++) {
        if (i >= actual.length) {
          return {
            message: `Body mismatch at "${path || 'root'}": expected array with at least ${expected.length} elements, received ${actual.length}`,
            path: path || 'root',
            expected: expected.length,
            received: actual.length,
          };
        }
        const itemPath = path ? `${path}[${i}]` : `[${i}]`;
        const mismatch = this.matchPartial(actual[i], expected[i], itemPath, currentDepth + 1, maxDepth);
        if (mismatch) return mismatch;
      }
      return null;
    }

    // Handle object expected - partial matching
    if (typeof expected === 'object' && expected !== null) {
      if (typeof actual !== 'object' || actual === null) {
        return {
          message: `Body mismatch at "${path || 'root'}": expected object, received ${actual === null ? 'null' : typeof actual}`,
          path: path || 'root',
          expected: 'object',
          received: actual,
        };
      }

      if (Array.isArray(actual)) {
        return {
          message: `Body mismatch at "${path || 'root'}": expected object, received array`,
          path: path || 'root',
          expected: 'object',
          received: actual,
        };
      }

      const actualObj = actual as Record<string, unknown>;
      const expectedObj = expected as Record<string, unknown>;

      for (const [key, expectedValue] of Object.entries(expectedObj)) {
        const actualValue = actualObj[key];
        const keyPath = path ? `${path}.${key}` : key;

        if (!(key in actualObj)) {
          return {
            message: `Body mismatch at "${keyPath}": key not found in actual object`,
            path: keyPath,
            expected: expectedValue,
            received: undefined,
          };
        }

        const mismatch = this.matchPartial(actualValue, expectedValue, keyPath, currentDepth + 1, maxDepth);
        if (mismatch) return mismatch;
      }
      return null;
    }

    // Handle primitive values
    if (actual !== expected) {
      return {
        message: `Body mismatch at "${path || 'root'}": expected ${this.formatValue(expected)}, received ${this.formatValue(actual)}`,
        path: path || 'root',
        expected,
        received: actual,
      };
    }

    return null;
  }

  private matchSymbolMatcher(actual: unknown, expected: symbol): boolean {
    if (expected === EXPECT_ANY) {
      return actual !== undefined;
    }
    if (expected === EXPECT_STRING) {
      return typeof actual === 'string';
    }
    if (expected === EXPECT_NUMBER) {
      return typeof actual === 'number';
    }
    if (expected === EXPECT_BOOLEAN) {
      return typeof actual === 'boolean';
    }
    if (expected === EXPECT_ARRAY) {
      return Array.isArray(actual);
    }
    if (expected === EXPECT_OBJECT) {
      return typeof actual === 'object' && actual !== null && !Array.isArray(actual);
    }
    return false;
  }

  private isArrayOfMatcher(value: unknown): value is ArrayOfMatcher {
    return (
      typeof value === 'object' &&
      value !== null &&
      '__type' in value &&
      (value as any).__type === EXPECT_ARRAY_OF
    );
  }

  private isArrayContainingMatcher(value: unknown): value is ArrayContainingMatcher {
    return (
      typeof value === 'object' &&
      value !== null &&
      '__type' in value &&
      (value as any).__type === EXPECT_ARRAY_CONTAINING
    );
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'symbol') {
      return value.description ?? 'symbol';
    }
    if (value === undefined) {
      return 'undefined';
    }
    return JSON.stringify(value);
  }
}