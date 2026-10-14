import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES, STORAGE_KEYS } from './constants.js';
import {
  getPosts,
  getPostsResult,
  getUsers,
  getUsersResult,
  repairCollection,
  savePosts,
  saveUsers,
} from './storage.js';

const validPost = Object.freeze({
  id: 'post-1',
  title: 'A valid post',
  content: 'Valid demo content.',
  createdAt: '2026-10-14T10:00:00.000Z',
  authorId: 'admin',
  authorName: 'Admin',
});

const validUser = Object.freeze({
  id: 'user-1',
  displayName: 'Demo User',
  username: 'demo_user',
  password: 'demo-password',
  role: 'user',
  createdAt: '2026-10-14T10:00:00.000Z',
});

describe('Storage utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('collection reads', () => {
    it('returns valid empty collections when storage keys are absent', () => {
      expect(getPostsResult()).toEqual({
        ok: true,
        value: {
          items: [],
          mutationAllowed: true,
        },
      });
      expect(getUsersResult()).toEqual({
        ok: true,
        value: {
          items: [],
          mutationAllowed: true,
        },
      });
    });

    it('returns persisted posts and users when their schemas are valid', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify([validPost]),
      );
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([validUser]),
      );

      expect(getPostsResult()).toEqual({
        ok: true,
        value: {
          items: [validPost],
          mutationAllowed: true,
        },
      });
      expect(getUsersResult()).toEqual({
        ok: true,
        value: {
          items: [validUser],
          mutationAllowed: true,
        },
      });
      expect(getPosts()).toEqual([validPost]);
      expect(getUsers()).toEqual([validUser]);
    });

    it('marks malformed JSON as damaged and blocks ordinary mutation', () => {
      window.localStorage.setItem(STORAGE_KEYS.posts, '{not-json');

      const result = getPostsResult();

      expect(result).toEqual({
        ok: true,
        value: {
          items: [],
          mutationAllowed: false,
          warning: {
            code: 'MALFORMED_JSON',
            message: MESSAGES.malformedJson,
            recoverable: true,
          },
        },
      });
      expect(getPosts()).toEqual([]);
      expect(window.localStorage.getItem(STORAGE_KEYS.posts)).toBe(
        '{not-json',
      );
    });

    it('marks schema-invalid collections as damaged without exposing records', () => {
      const invalidCollection = JSON.stringify({
        id: 'not-an-array',
      });
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        invalidCollection,
      );

      const result = getUsersResult();

      expect(result).toEqual({
        ok: true,
        value: {
          items: [],
          mutationAllowed: false,
          warning: {
            code: 'SCHEMA_INVALID',
            message: MESSAGES.schemaInvalid,
            recoverable: true,
          },
        },
      });
      expect(getUsers()).toEqual([]);
      expect(window.localStorage.getItem(STORAGE_KEYS.users)).toBe(
        invalidCollection,
      );
    });

    it('reports unavailable storage and compatibility reads return empty arrays', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException(
          'Storage access denied.',
          'SecurityError',
        );
      });

      expect(getPostsResult()).toEqual({
        ok: false,
        error: {
          code: 'STORAGE_UNAVAILABLE',
          message: MESSAGES.storageUnavailable,
          recoverable: true,
        },
      });
      expect(getUsersResult()).toEqual({
        ok: false,
        error: {
          code: 'STORAGE_UNAVAILABLE',
          message: MESSAGES.storageUnavailable,
          recoverable: true,
        },
      });
      expect(getPosts()).toEqual([]);
      expect(getUsers()).toEqual([]);
    });
  });

  describe('collection writes', () => {
    it('persists complete valid collections and returns their counts', () => {
      expect(savePosts([validPost])).toEqual({
        ok: true,
        value: { count: 1 },
      });
      expect(saveUsers([validUser])).toEqual({
        ok: true,
        value: { count: 1 },
      });

      expect(
        JSON.parse(window.localStorage.getItem(STORAGE_KEYS.posts)),
      ).toEqual([validPost]);
      expect(
        JSON.parse(window.localStorage.getItem(STORAGE_KEYS.users)),
      ).toEqual([validUser]);
    });

    it('rejects invalid collections before changing prior stored data', () => {
      const priorValue = JSON.stringify([validPost]);
      window.localStorage.setItem(STORAGE_KEYS.posts, priorValue);

      const result = savePosts([
        {
          ...validPost,
          title: '',
        },
      ]);

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'SCHEMA_INVALID',
          message: MESSAGES.schemaInvalid,
          recoverable: true,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.posts)).toBe(
        priorValue,
      );
    });

    it('reports serialization failures without changing prior stored data', () => {
      const priorValue = JSON.stringify([validPost]);
      window.localStorage.setItem(STORAGE_KEYS.posts, priorValue);
      vi.spyOn(JSON, 'stringify').mockImplementation(() => {
        throw new TypeError('Serialization failed.');
      });

      const result = savePosts([validPost]);

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'SERIALIZATION_FAILED',
          message: MESSAGES.serializationFailed,
          recoverable: true,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.posts)).toBe(
        priorValue,
      );
    });

    it('reports quota exhaustion without changing prior stored data', () => {
      const priorValue = JSON.stringify([validPost]);
      window.localStorage.setItem(STORAGE_KEYS.posts, priorValue);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException(
          'Storage quota exceeded.',
          'QuotaExceededError',
        );
      });

      const result = savePosts([]);

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: MESSAGES.quotaExceeded,
          recoverable: true,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.posts)).toBe(
        priorValue,
      );
    });

    it('reports non-quota write failures as unavailable storage', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException(
          'Storage access denied.',
          'SecurityError',
        );
      });

      expect(saveUsers([validUser])).toEqual({
        ok: false,
        error: {
          code: 'STORAGE_UNAVAILABLE',
          message: MESSAGES.storageUnavailable,
          recoverable: true,
        },
      });
    });
  });

  describe('collection repair', () => {
    it('replaces damaged collection data after explicit confirmation', () => {
      window.localStorage.setItem(STORAGE_KEYS.posts, '{damaged');

      const result = repairCollection(
        'posts',
        [validPost],
        true,
      );

      expect(result).toEqual({
        ok: true,
        value: {
          count: 1,
          repaired: true,
        },
      });
      expect(
        JSON.parse(window.localStorage.getItem(STORAGE_KEYS.posts)),
      ).toEqual([validPost]);
    });

    it('does not replace damaged data without explicit confirmation', () => {
      const damagedValue = '{damaged';
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        damagedValue,
      );
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const result = repairCollection(
        'users',
        [validUser],
        false,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: MESSAGES.repairConfirmationRequired,
          recoverable: true,
        },
      });
      expect(setItemSpy).not.toHaveBeenCalled();
      expect(window.localStorage.getItem(STORAGE_KEYS.users)).toBe(
        damagedValue,
      );
    });

    it('rejects unsupported repair kinds without changing stored data', () => {
      const priorValue = JSON.stringify([validPost]);
      window.localStorage.setItem(STORAGE_KEYS.posts, priorValue);

      const result = repairCollection(
        'unsupported',
        [],
        true,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: MESSAGES.validationFailed,
          recoverable: true,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.posts)).toBe(
        priorValue,
      );
    });

    it('preserves damaged source data when a confirmed repair write fails', () => {
      const damagedValue = '{damaged';
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        damagedValue,
      );
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException(
          'Storage quota exceeded.',
          'QuotaExceededError',
        );
      });

      const result = repairCollection('posts', [], true);

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: MESSAGES.quotaExceeded,
          recoverable: true,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.posts)).toBe(
        damagedValue,
      );
    });
  });
});