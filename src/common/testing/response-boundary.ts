/**
 * Response-boundary helpers for asserting that HTTP payloads do not leak
 * internal / sensitive keys. Pure functions — safe for unit and e2e tests.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

/** Keys that must never appear in public API responses. */
export const FORBIDDEN_RESPONSE_KEYS = [
  'password',
  'passwordHash',
  'firebasePrivateKey',
  'firebase_private_key',
  'privateKey',
  'refreshToken',
  'refresh_token',
  'accessToken',
  'access_token',
  'idToken',
  'id_token',
  'deletedAt',
  'firebase_uid',
] as const;

export type ForbiddenResponseKey = (typeof FORBIDDEN_RESPONSE_KEYS)[number];

export interface AssertNoForbiddenKeysOptions {
  /** Extra keys to forbid beyond FORBIDDEN_RESPONSE_KEYS. */
  extraKeys?: string[];
  /** Keys allowed even if present in the forbidden list (escape hatch). */
  allowKeys?: string[];
  /** Max depth when walking nested objects/arrays (default 10). */
  maxDepth?: number;
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively collects paths where any forbidden key appears.
 * Paths use dot notation; array indices are numeric segments (e.g. `items.0.email`).
 */
export function findForbiddenKeyPaths(
  payload: unknown,
  forbiddenKeys: readonly string[] = FORBIDDEN_RESPONSE_KEYS,
  options: Pick<AssertNoForbiddenKeysOptions, 'allowKeys' | 'maxDepth'> = {},
): string[] {
  const allow = new Set(options.allowKeys ?? []);
  const forbidden = new Set(forbiddenKeys.filter((key) => !allow.has(key)));
  const maxDepth = options.maxDepth ?? 10;
  const hits: string[] = [];

  const walk = (value: unknown, path: string, depth: number): void => {
    if (depth > maxDepth || value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const segment = path ? `${path}.${index}` : String(index);
        walk(item, segment, depth + 1);
      });
      return;
    }

    if (!isPlainObject(value)) {
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key;
      if (forbidden.has(key)) {
        hits.push(childPath);
      }
      walk(child, childPath, depth + 1);
    }
  };

  walk(payload, '', 0);
  return hits;
}

/**
 * Asserts that `payload` does not contain any forbidden keys (nested).
 * Throws an Error with all matching paths when violations are found.
 */
export function assertNoForbiddenKeys(
  payload: unknown,
  options: AssertNoForbiddenKeysOptions = {},
): void {
  const keys = [...FORBIDDEN_RESPONSE_KEYS, ...(options.extraKeys ?? [])];
  const hits = findForbiddenKeyPaths(payload, keys, options);
  if (hits.length > 0) {
    throw new Error(
      `Response boundary violation — forbidden keys at: ${hits.join(', ')}`,
    );
  }
}

/**
 * Asserts that every key in `allowedKeys` is the only top-level key set
 * when `exact` is true; otherwise only checks that no unexpected top-level
 * keys exist beyond the allow-list.
 */
export function assertAllowedTopLevelKeys(
  payload: unknown,
  allowedKeys: readonly string[],
  options: { exact?: boolean } = {},
): void {
  if (!isPlainObject(payload)) {
    throw new Error(
      `Expected a plain object payload, received: ${typeof payload}`,
    );
  }

  const allowed = new Set(allowedKeys);
  const actual = Object.keys(payload);
  const unexpected = actual.filter((key) => !allowed.has(key));

  if (unexpected.length > 0) {
    throw new Error(
      `Unexpected top-level response keys: ${unexpected.join(', ')}`,
    );
  }

  if (options.exact) {
    const missing = allowedKeys.filter((key) => !actual.includes(key));
    if (missing.length > 0) {
      throw new Error(
        `Missing required top-level response keys: ${missing.join(', ')}`,
      );
    }
  }
}

/**
 * Jest-friendly wrapper: returns a function suitable for expect(() => ...).not.toThrow().
 */
export function expectNoForbiddenKeys(
  payload: unknown,
  options?: AssertNoForbiddenKeysOptions,
): void {
  assertNoForbiddenKeys(payload, options);
}
