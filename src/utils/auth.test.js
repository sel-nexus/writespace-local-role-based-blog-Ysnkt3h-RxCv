import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canManagePost,
  clearSession,
  getSession,
  getSessionResult,
  homeForRole,
  login,
  register,
  setSession,
} from './auth.js';
import {
  MESSAGES,
  ROLES,
  STORAGE_KEYS,
} from './constants.js';

const validUser = Object.freeze({
  id: 'user-1',
  displayName: 'Demo User',
  username: 'demo_user',
  password: 'demo-password',
  role: ROLES.USER,
  createdAt: '2026-10-14T10:00:00.000Z',
});

const validUserSession = Object.freeze({
  userId: validUser.id,
  username: validUser.username,
  displayName: validUser.displayName,
  role: validUser.role,
});

const validAdminSession = Object.freeze({
  userId: 'admin',
  username: 'admin',
  displayName: 'Admin',
  role: ROLES.ADMIN,
});

const validPost = Object.freeze({
  id: 'post-1',
  title: 'A valid post',
  content: 'Valid demo content.',
  createdAt: '2026-10-14T10:00:00.000Z',
  authorId: validUser.id,
  authorName: validUser.displayName,
});

/**
 * Creates a valid persisted local user.
 *
 * @param {number} index Unique user index.
 * @returns {object}
 */
function createUser(index) {
  return {
    id: `user-${index}`,
    displayName: `Demo User ${index}`,
    username: `demo_user_${index}`,
    password: `demo-password-${index}`,
    role: ROLES.USER,
    createdAt: '2026-10-14T10:00:00.000Z',
  };
}

/**
 * Installs deterministic browser UUID generation.
 *
 * @param {string} id Generated identifier.
 * @returns {void}
 */
function stubRandomUuid(id = 'generated-user-id') {
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn(() => id),
  });
}

describe('Authentication utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('login', () => {
    it('authenticates the default Admin before reading damaged local users', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        '{damaged-users',
      );

      const result = login({
        username: ' ADMIN ',
        password: 'admin',
      });

      expect(result).toEqual({
        ok: true,
        value: {
          session: validAdminSession,
          redirectTo: '/admin',
        },
      });
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.session),
        ),
      ).toEqual(validAdminSession);
      expect(window.localStorage.getItem(STORAGE_KEYS.users)).toBe(
        '{damaged-users',
      );
    });

    it('authenticates a persisted local account case-insensitively', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([validUser]),
      );

      const result = login({
        username: ' DEMO_USER ',
        password: validUser.password,
      });

      expect(result).toEqual({
        ok: true,
        value: {
          session: validUserSession,
          redirectTo: '/blogs',
        },
      });
      expect(getSession()).toEqual(validUserSession);
    });

    it('rejects invalid credentials without creating a session', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([validUser]),
      );

      const result = login({
        username: validUser.username,
        password: 'wrong-password',
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: MESSAGES.invalidCredentials,
          recoverable: true,
        },
      });
      expect(
        window.localStorage.getItem(STORAGE_KEYS.session),
      ).toBeNull();
    });

    it('returns field errors when required login fields are missing', () => {
      const result = login({
        username: ' ',
        password: '',
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: MESSAGES.validationFailed,
          recoverable: true,
          fieldErrors: {
            username: 'Username is required.',
            password: 'Password is required.',
          },
        },
      });
    });

    it('blocks local login when the persisted user collection is damaged', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify({ user: validUser }),
      );

      const result = login({
        username: validUser.username,
        password: validUser.password,
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'CORRUPT_SOURCE_REPAIR_REQUIRED',
          message: MESSAGES.corruptUsersRepairRequired,
          recoverable: true,
        },
      });
    });

    it('reports session persistence failures without exposing credentials', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
        (key) => {
          if (key === STORAGE_KEYS.session) {
            throw new DOMException(
              'Storage quota exceeded.',
              'QuotaExceededError',
            );
          }
        },
      );

      const result = login({
        username: 'admin',
        password: 'admin',
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: MESSAGES.quotaExceeded,
          recoverable: true,
        },
      });
      expect(JSON.stringify(result)).not.toContain('"password"');
    });
  });

  describe('registration', () => {
    it('creates a regular local account and starts its session', () => {
      stubRandomUuid();

      const result = register({
        displayName: ' Demo Jane ',
        username: ' Demo_Jane ',
        password: 'fake-only',
        confirmPassword: 'fake-only',
      });

      expect(result).toEqual({
        ok: true,
        value: {
          session: {
            userId: 'generated-user-id',
            username: 'Demo_Jane',
            displayName: 'Demo Jane',
            role: ROLES.USER,
          },
          redirectTo: '/blogs',
        },
      });

      const users = JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.users),
      );

      expect(users).toEqual([
        {
          id: 'generated-user-id',
          displayName: 'Demo Jane',
          username: 'Demo_Jane',
          password: 'fake-only',
          role: ROLES.USER,
          createdAt: expect.any(String),
        },
      ]);
      expect(getSession()).toEqual(result.value.session);
    });

    it('rejects the reserved Admin username case-insensitively', () => {
      stubRandomUuid();

      const result = register({
        displayName: 'Another Admin',
        username: ' AdMiN ',
        password: 'fake-only',
        confirmPassword: 'fake-only',
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'DUPLICATE_USERNAME',
          message: MESSAGES.duplicateUsername,
          recoverable: true,
        },
      });
      expect(
        window.localStorage.getItem(STORAGE_KEYS.users),
      ).toBeNull();
      expect(
        window.localStorage.getItem(STORAGE_KEYS.session),
      ).toBeNull();
    });

    it('rejects a normalized duplicate local username', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([validUser]),
      );
      stubRandomUuid();

      const result = register({
        displayName: 'Duplicate User',
        username: ' DEMO_USER ',
        password: 'different-password',
        confirmPassword: 'different-password',
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'DUPLICATE_USERNAME',
          message: MESSAGES.duplicateUsername,
          recoverable: true,
        },
      });
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([validUser]);
    });

    it('enforces the maximum of nine persisted users plus the virtual Admin', () => {
      const users = Array.from(
        { length: 9 },
        (_, index) => createUser(index + 1),
      );
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify(users),
      );
      stubRandomUuid();

      const result = register({
        displayName: 'One Too Many',
        username: 'user_ten',
        password: 'fake-only',
        confirmPassword: 'fake-only',
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'LIMIT_REACHED',
          message: MESSAGES.accountLimitReached,
          recoverable: true,
        },
      });
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual(users);
    });

    it('blocks registration instead of replacing a damaged user collection', () => {
      const damagedValue = '{damaged-users';
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        damagedValue,
      );
      stubRandomUuid();

      const result = register({
        displayName: 'Demo Jane',
        username: 'demo_jane',
        password: 'fake-only',
        confirmPassword: 'fake-only',
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'CORRUPT_SOURCE_REPAIR_REQUIRED',
          message: MESSAGES.corruptUsersRepairRequired,
          recoverable: true,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.users)).toBe(
        damagedValue,
      );
    });

    it('rolls back the created user when session persistence fails', () => {
      stubRandomUuid();
      const originalSetItem = Storage.prototype.setItem;
      const setItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(function setItem(key, value) {
          if (key === STORAGE_KEYS.session) {
            throw new DOMException(
              'Storage quota exceeded.',
              'QuotaExceededError',
            );
          }

          return originalSetItem.call(this, key, value);
        });

      const result = register({
        displayName: 'Demo Jane',
        username: 'demo_jane',
        password: 'fake-only',
        confirmPassword: 'fake-only',
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: MESSAGES.quotaExceeded,
          recoverable: true,
        },
      });
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([]);
      expect(
        window.localStorage.getItem(STORAGE_KEYS.session),
      ).toBeNull();
      expect(setItemSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('session persistence and validation', () => {
    it('persists and reads an exact valid session schema', () => {
      expect(setSession(validUserSession)).toEqual({
        ok: true,
        value: null,
      });
      expect(getSessionResult()).toEqual({
        ok: true,
        value: validUserSession,
      });
      expect(getSession()).toEqual(validUserSession);
    });

    it('rejects invalid session data before changing a saved session', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.session,
        JSON.stringify(validUserSession),
      );

      const result = setSession({
        ...validUserSession,
        password: 'must-not-be-in-a-session',
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'SCHEMA_INVALID',
          message: MESSAGES.schemaInvalid,
          recoverable: true,
        },
      });
      expect(getSession()).toEqual(validUserSession);
    });

    it('treats malformed stored session JSON as a guest and preserves it', () => {
      const malformedValue = '{not-json';
      window.localStorage.setItem(
        STORAGE_KEYS.session,
        malformedValue,
      );

      expect(getSessionResult()).toEqual({
        ok: true,
        value: null,
        meta: {
          warning: {
            code: 'MALFORMED_JSON',
            message: MESSAGES.malformedJson,
            recoverable: true,
          },
        },
      });
      expect(getSession()).toBeNull();
      expect(
        window.localStorage.getItem(STORAGE_KEYS.session),
      ).toBe(malformedValue);
    });

    it('rejects a schema-invalid stale session and preserves it for diagnostics', () => {
      const staleSession = {
        userId: '',
        username: 'removed_user',
        displayName: 'Removed User',
        role: ROLES.USER,
      };
      const storedValue = JSON.stringify(staleSession);
      window.localStorage.setItem(
        STORAGE_KEYS.session,
        storedValue,
      );

      expect(getSessionResult()).toEqual({
        ok: true,
        value: null,
        meta: {
          warning: {
            code: 'SCHEMA_INVALID',
            message: MESSAGES.schemaInvalid,
            recoverable: true,
          },
        },
      });
      expect(getSession()).toBeNull();
      expect(
        window.localStorage.getItem(STORAGE_KEYS.session),
      ).toBe(storedValue);
    });

    it('reports unavailable session storage while compatibility reads return null', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
        () => {
          throw new DOMException(
            'Storage access denied.',
            'SecurityError',
          );
        },
      );

      expect(getSessionResult()).toEqual({
        ok: false,
        error: {
          code: 'STORAGE_UNAVAILABLE',
          message: MESSAGES.storageUnavailable,
          recoverable: true,
        },
      });
      expect(getSession()).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears only the session while preserving local users and posts', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.session,
        JSON.stringify(validUserSession),
      );
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([validUser]),
      );
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify([validPost]),
      );

      expect(clearSession()).toEqual({
        ok: true,
        value: null,
      });
      expect(
        window.localStorage.getItem(STORAGE_KEYS.session),
      ).toBeNull();
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([validUser]);
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.posts),
        ),
      ).toEqual([validPost]);
    });

    it('reports a logout persistence failure', () => {
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(
        () => {
          throw new DOMException(
            'Storage access denied.',
            'SecurityError',
          );
        },
      );

      expect(clearSession()).toEqual({
        ok: false,
        error: {
          code: 'STORAGE_UNAVAILABLE',
          message: MESSAGES.logoutPersistenceFailure,
          recoverable: true,
        },
      });
    });
  });

  describe('role homes and post permissions', () => {
    it('returns the Admin dashboard only for the Admin role', () => {
      expect(homeForRole(ROLES.ADMIN)).toBe('/admin');
      expect(homeForRole(ROLES.USER)).toBe('/blogs');
      expect(homeForRole('unsupported')).toBe('/blogs');
    });

    it('allows administrators to manage any valid post', () => {
      expect(canManagePost(validAdminSession, validPost)).toBe(
        true,
      );
    });

    it('allows regular users to manage only their own posts', () => {
      expect(canManagePost(validUserSession, validPost)).toBe(
        true,
      );
      expect(
        canManagePost(
          {
            ...validUserSession,
            userId: 'different-user',
          },
          validPost,
        ),
      ).toBe(false);
    });

    it('rejects missing, malformed, and schema-invalid permission inputs', () => {
      expect(canManagePost(null, validPost)).toBe(false);
      expect(
        canManagePost(
          {
            ...validUserSession,
            role: 'unsupported',
          },
          validPost,
        ),
      ).toBe(false);
      expect(
        canManagePost(validUserSession, {
          ...validPost,
          authorId: null,
        }),
      ).toBe(false);
      expect(canManagePost(validUserSession, null)).toBe(false);
    });
  });
});