<p align="center">
  <img src="./logo.png" width="160" alt="MegaMock Logo">
</p>

# KrepkoJS

Contract-driven HTTP testing library for executable flows.

KrepkoJS is not a unit testing framework. It's not classic E2E. It's a **contract system** that protects the logic between client and server using executable flows.

## Why KrepkoJS?

- **Contract-first**: Tests describe real HTTP user flows as contracts
- **CI-friendly**: If a contract breaks, CI fails. No silent regressions.
- **Simple DSL**: Readable by both humans and AI agents
- **Draft mode**: Mark work-in-progress flows without breaking CI
- **Zero magic**: Minimal, explicit, predictable

## Installation

```bash
npm install @svintsoff78/krepkojs
```

## Quick Start

Create a file `auth.krepko.ts`:

```typescript
import { krepko, expect } from '@svintsoff78/krepkojs';

krepko('https://api.example.com')
    .flow('User Authentication')
    .tags(['smoke', 'auth'])
    .do('Register user', async (ctx) => {
        const res = await ctx.post('/users', {
          email: 'test@example.com',
          password: 'secret123',
        });
        
        res.expectStatus(201);
        res.expectBody({ email: 'test@example.com' });
        
        ctx.set('userId', res.body.id);
    })
    .do('Login', async (ctx) => {
        const res = await ctx.post('/auth/login', {
          email: 'test@example.com',
          password: 'secret123',
        });
        
        res.expectStatus(200);
        res.expectBody({ token: expect.string });
        
        ctx.bearer(res.body.token);
    })
    .do('Get profile', async (ctx) => {
        const res = await ctx.get('/users/me');
        
        res.expectStatus(200);
        res.expectBody({ id: ctx.getVar('userId') });
    });
```

Run:

```bash
npx krepko --pattern "**/*.krepko.ts"
```

Output:

```
KrepkoJS v0.1.0
Base URL: https://api.example.com

Flow: User Authentication
  ✓ Register user     132ms
  ✓ Login             81ms
  ✓ Get profile       45ms

Summary:
✓ 1 flow passed
Total: 1 flow (3 steps)
Time: 0.26s

✓ Krepko держит ваш API
```

## API

### `krepko(baseUrl)`

Creates a new Krepko instance with the specified base URL.

```typescript
krepko('https://api.example.com')
```

### `.flow(name)`

Defines a new flow (test scenario).

```typescript
krepko(url).flow('User Registration')
```

### `.do(stepName, callback)`

Adds a step to the flow. Steps execute sequentially.

```typescript
.do('Create user', async (ctx) => {
  // your code here
})
```

### `.tags(tags[])`

Adds tags for filtering flows.

```typescript
.flow('Auth').tags(['smoke', 'auth'])
```

### `.isDraft(reason?)`

Marks flow as draft. Draft failures don't fail CI in `dev` or `ci` mode.

```typescript
.flow('Experimental').isDraft('Work in progress')
```

## Context (ctx)

### HTTP Methods

```typescript
ctx.get(path, headers?)
ctx.post(path, body?, headers?)
ctx.put(path, body?, headers?)
ctx.patch(path, body?, headers?)
ctx.delete(path, headers?)
```

### State Management

```typescript
ctx.set('key', value)      // Store value
ctx.getVar<T>('key')       // Retrieve value
ctx.vars                   // Get all stored values
```

### Authentication

```typescript
ctx.bearer(token)              // Set Bearer token for subsequent requests
ctx.clearAuth()            // Clear authentication
```

## Response Assertions

### `expectStatus(code)`

```typescript
res.expectStatus(200)
res.expectStatus(201)
```

### `expectBody(partial, options?)`

Partial matching - only checks specified fields:

```typescript
res.expectBody({ id: 1, status: 'active' })
```

#### Nested Objects

Validate deeply nested structures with partial matching at every level:

```typescript
res.expectBody({
  user: {
    profile: {
      name: expect.string,
      settings: {
        theme: 'dark',
        notifications: expect.boolean
      }
    }
  }
})
```

#### Arrays with Objects

Validate array elements against a pattern:

```typescript
// Check first element structure
res.expectBody({
  users: [{ id: expect.number, name: expect.string }]
})

// Check all elements match pattern
res.expectBody({
  users: expect.arrayOf({ id: expect.number, name: expect.string })
})
```

#### Nested Arrays

Validate arrays within arrays:

```typescript
res.expectBody({
  matrix: [[1, 2], [3, 4]],
  nested: expect.arrayOf(expect.array)
})
```

#### Depth Limit

Control validation depth with the `depth` option:

```typescript
// Only validate first 2 levels
res.expectBody({
  user: {
    profile: { name: expect.string }  // validated
    // deeper levels skipped
  }
}, { depth: 2 })
```

### Matchers

Use matchers for flexible assertions:

```typescript
import { expect } from '@svintsoff78/krepkojs';

res.expectBody({
  token: expect.any,        // Field exists (any value)
  id: expect.number,        // Is a number
  name: expect.string,      // Is a string
  active: expect.boolean,   // Is a boolean
  tags: expect.array,       // Is an array
  meta: expect.object,      // Is an object
  role: 'admin',            // Exact value
})
```

#### Array Matchers

```typescript
// All items must match pattern
res.expectBody({
  users: expect.arrayOf({ id: expect.number })
})

// Array contains specific items (order doesn't matter)
res.expectBody({
  tags: expect.arrayContaining([
    { name: 'featured' },
    { name: 'new' }
  ])
})

// Nested: array of arrays of numbers
res.expectBody({
  matrix: expect.arrayOf(expect.arrayOf(expect.number))
})
```

### Error Messages

Errors include full path to the mismatched field:

```
Body mismatch at "user.profile.settings.theme": expected "dark", received "light"
Body mismatch at "items[2].price": expected expect.number, received "free"
```

## CLI

```bash
npx krepko [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--pattern` | `-p` | Glob pattern for flow files | `**/*.krepko.ts` |
| `--mode` | `-m` | Run mode: `dev`, `ci`, `strict` | `ci` |
| `--tags` | `-t` | Filter by tags (comma-separated) | - |
| `--help` | `-h` | Show help | - |

### Modes

- **`dev`**: Draft failures shown as warnings, exit 0
- **`ci`**: Draft failures shown as warnings, exit 0. Non-draft failures exit 1
- **`strict`**: Any draft or failure exits 1

### Examples

```bash
# Run all flows
npx krepko

# Run specific pattern
npx krepko --pattern "flows/**/*.krepko.ts"

# Filter by tags
npx krepko --tags smoke
npx krepko --tags smoke,auth

# Strict mode (drafts fail CI)
npx krepko --mode strict
```

### Environment Variables

```bash
KREPKO_MODE=ci        # Default mode
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All non-draft flows passed |
| 1 | At least one non-draft flow failed (or draft in strict mode) |

## Best Practices

### Organize by Domain

```
flows/
  auth.krepko.ts
  users.krepko.ts
  payments.krepko.ts
```

### Use Tags

```typescript
.flow('Critical payment flow')
.tags(['smoke', 'payments', 'critical'])
```

### Draft Experimental Flows

```typescript
.flow('New checkout v2')
.isDraft('Waiting for backend deploy')
```

### Share State Between Steps

```typescript
.do('Create order', async (ctx) => {
  const res = await ctx.post('/orders', { item: 'book' });
  ctx.set('orderId', res.body.id);
})
.do('Get order', async (ctx) => {
  const res = await ctx.get(`/orders/${ctx.getVar('orderId')}`);
  res.expectStatus(200);
})
```

## TypeScript

KrepkoJS is written in TypeScript and provides full type definitions.

```typescript
import { krepko, expect, Context, KrepkoResponse } from '@svintsoff78/krepkojs';
```

## Requirements

- Node.js >= 18.0.0

## License

MIT