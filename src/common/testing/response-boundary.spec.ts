import {
  FORBIDDEN_RESPONSE_KEYS,
  assertAllowedTopLevelKeys,
  assertNoForbiddenKeys,
  findForbiddenKeyPaths,
} from './response-boundary';

describe('response-boundary helpers', () => {
  describe('findForbiddenKeyPaths', () => {
    it('returns empty array for safe payloads', () => {
      const payload = {
        id: '1',
        email: 'a@b.com',
        role: 'STUDENT',
        gymId: null,
      };
      expect(findForbiddenKeyPaths(payload)).toEqual([]);
    });

    it('detects nested forbidden keys', () => {
      const payload = {
        id: '1',
        nested: {
          firebase_uid: 'secret-uid',
          child: [{ deletedAt: '2020-01-01' }],
        },
      };
      const hits = findForbiddenKeyPaths(payload);
      expect(hits).toContain('nested.firebase_uid');
      expect(hits).toContain('nested.child.0.deletedAt');
    });

    it('respects allowKeys', () => {
      const payload = { firebase_uid: 'x' };
      expect(
        findForbiddenKeyPaths(payload, FORBIDDEN_RESPONSE_KEYS, {
          allowKeys: ['firebase_uid'],
        }),
      ).toEqual([]);
    });
  });

  describe('assertNoForbiddenKeys', () => {
    it('does not throw for safe payload', () => {
      expect(() => assertNoForbiddenKeys({ id: '1', name: 'A' })).not.toThrow();
    });

    it('throws with path detail when forbidden key present', () => {
      expect(() => assertNoForbiddenKeys({ password: 'x' })).toThrow(
        /password/,
      );
    });

    it('supports extraKeys', () => {
      expect(() =>
        assertNoForbiddenKeys(
          { owner: { email: 'a@b.com' } },
          { extraKeys: ['owner'] },
        ),
      ).toThrow(/owner/);
    });
  });

  describe('assertAllowedTopLevelKeys', () => {
    it('allows only listed keys', () => {
      expect(() =>
        assertAllowedTopLevelKeys({ id: '1', name: 'A' }, [
          'id',
          'name',
          'email',
        ]),
      ).not.toThrow();
    });

    it('rejects unexpected top-level keys', () => {
      expect(() =>
        assertAllowedTopLevelKeys({ id: '1', firebase_uid: 'x' }, ['id']),
      ).toThrow(/firebase_uid/);
    });

    it('exact mode requires all keys', () => {
      expect(() =>
        assertAllowedTopLevelKeys({ id: '1' }, ['id', 'name'], {
          exact: true,
        }),
      ).toThrow(/name/);
    });
  });
});
