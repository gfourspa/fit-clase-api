/**
 * E2E re-export of response-boundary helpers.
 * Prefer importing from here in *.e2e-spec.ts files.
 */
export {
  FORBIDDEN_RESPONSE_KEYS,
  assertAllowedTopLevelKeys,
  assertNoForbiddenKeys,
  expectNoForbiddenKeys,
  findForbiddenKeyPaths,
  type AssertNoForbiddenKeysOptions,
  type ForbiddenResponseKey,
  type JsonObject,
  type JsonValue,
} from '../../src/common/testing/response-boundary';
