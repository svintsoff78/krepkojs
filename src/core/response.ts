const EXPECT_ANY = Symbol('expect.any');
const EXPECT_STRING = Symbol('expect.string');
const EXPECT_NUMBER = Symbol('expect.number');
const EXPECT_BOOLEAN = Symbol('expect.boolean');
const EXPECT_ARRAY = Symbol('expect.array');
const EXPECT_OBJECT = Symbol('expect.object');

export const expect = {
  any: EXPECT_ANY,
  string: EXPECT_STRING,
  number: EXPECT_NUMBER,
  boolean: EXPECT_BOOLEAN,
  array: EXPECT_ARRAY,
  object: EXPECT_OBJECT,
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

  expectBody(partial: Record<string, unknown>): this {
    if (typeof this.body !== 'object' || this.body === null) {
      throw new Error(
        `Expected body to be an object, received ${typeof this.body}`
      );
    }

    const body = this.body as Record<string, unknown>;

    for (const [key, expectedValue] of Object.entries(partial)) {
      const actualValue = body[key];

      if (!this.matchValue(actualValue, expectedValue)) {
        const expectedStr = typeof expectedValue === 'symbol'
          ? expectedValue.description
          : JSON.stringify(expectedValue);
        const error = new Error(
          `Body mismatch at "${key}": expected ${expectedStr}, received ${JSON.stringify(actualValue)}`
        );
        (error as any).key = key;
        (error as any).expected = expectedValue;
        (error as any).received = actualValue;
        throw error;
      }
    }

    return this;
  }

  private matchValue(actual: unknown, expected: unknown): boolean {
    // Handle matchers
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

    return this.deepEqual(actual, expected);
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object' || a === null || b === null) return false;

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!bKeys.includes(key)) return false;
      if (!this.deepEqual(aObj[key], bObj[key])) return false;
    }

    return true;
  }
}