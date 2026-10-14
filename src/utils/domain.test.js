import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createManagedUser,
  createPost,
  deleteManagedUser,
  deletePost,
  formatDateSafe,
  getAdminStatistics,
  updatePost,
} from './domain.js';
import {
  LIMITS,
  MESSAGES,
  ROLES,
  STORAGE_KEYS,
} from './constants.js';

const adminSession = Object.freeze({
  userId: 'admin',
  username: 'admin',
  displayName: 'Admin',
  role: ROLES.ADMIN,
});

const userSession = Object.freeze({
  userId: 'user-1',
  username: 'demo_user',
  displayName: 'Demo User',
  role: ROLES.USER,
});

const otherUserSession = Object.freeze({
  userId: 'user-2',
  username: 'other_user',
  displayName: 'Other User',
  role: ROLES.USER,
});

const validPost = Object.freeze({
  id: 'post-1',
  title: 'A valid post',
  content: 'Valid demo content.',
  createdAt: '2026-10-14T10:00:00.000Z',
  authorId: userSession.userId,
  authorName: userSession.displayName,
});

const validUser = Object.freeze({
  id: userSession.userId,
  displayName: userSession.displayName,
  username: userSession.username,
  password: 'demo-password',
  role: ROLES.USER,
  createdAt: '2026-10-14T10:00:00.000Z',
});

/**
 * Creates a valid post with a unique identifier.
 *
 * @param {number} index Unique post index.
 * @param {string} [authorId] Author identifier.
 * @param {string} [authorName] Author display name.
 * @returns {object}
 */
function createStoredPost(
  index,
  authorId = userSession.userId,
  authorName = userSession.displayName,
) {
  return {
    id: `post-${index}`,
    title: `Post ${index}`,
    content: `Valid content for post ${index}.`,
    createdAt: '2026-10-14T10:00:00.000Z',
    authorId,
    authorName,
  };
}

/**
 * Creates a valid persisted user with a unique identity.
 *
 * @param {number} index Unique user index.
 * @param {string} [role] Account role.
 * @returns {object}
 */
function createStoredUser(index, role = ROLES.USER) {
  return {
    id: `user-${index}`,
    displayName: `Demo User ${index}`,
    username: `demo_user_${index}`,
    password: `demo-password-${index}`,
    role,
    createdAt: '2026-10-14T10:00:00.000Z',
  };
}

/**
 * Installs deterministic browser UUID generation.
 *
 * @param {string} [id] Generated identifier.
 * @returns {void}
 */
function stubRandomUuid(id = 'generated-id') {
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn(() => id),
  });
}

describe('Workspace domain utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
    stubRandomUuid();
  });

  describe('post creation', () => {
    it('creates a post for an authenticated user and returns its detail route', () => {
      const result = createPost({
        title: '  A new post  ',
        content: 'New browser-local content.',
        session: userSession,
      });

      expect(result).toEqual({
        ok: true,
        value: {
          postId: 'generated-id',
          redirectTo: '/blog/generated-id',
        },
      });

      const posts = JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.posts),
      );

      expect(posts).toEqual([
        {
          id: 'generated-id',
          title: 'A new post',
          content: 'New browser-local content.',
          createdAt: expect.any(String),
          authorId: userSession.userId,
          authorName: userSession.displayName,
        },
      ]);
      expect(
        Number.isNaN(new Date(posts[0].createdAt).getTime()),
      ).toBe(false);
    });

    it('rejects unauthenticated creation before accessing storage', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

      const result = createPost({
        title: 'A new post',
        content: 'New browser-local content.',
        session: null,
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: MESSAGES.unauthenticated,
          recoverable: true,
        },
      });
      expect(getItemSpy).not.toHaveBeenCalled();
      expect(
        window.localStorage.getItem(STORAGE_KEYS.posts),
      ).toBeNull();
    });

    it('returns field errors and preserves storage when post input is invalid', () => {
      const priorPosts = [validPost];
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify(priorPosts),
      );

      const result = createPost({
        title: ' ',
        content: ' ',
        session: userSession,
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: MESSAGES.validationFailed,
          recoverable: true,
          fieldErrors: {
            title: 'Title is required.',
            content: 'Content is required.',
          },
        },
      });
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.posts),
        ),
      ).toEqual(priorPosts);
    });

    it('enforces title and content character limits', () => {
      const result = createPost({
        title: 'T'.repeat(LIMITS.title.max + 1),
        content: 'C'.repeat(LIMITS.content.max + 1),
        session: userSession,
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: MESSAGES.validationFailed,
          recoverable: true,
          fieldErrors: {
            title: `Title must be ${LIMITS.title.max} characters or fewer.`,
            content: `Content must be ${LIMITS.content.max} characters or fewer.`,
          },
        },
      });
      expect(
        window.localStorage.getItem(STORAGE_KEYS.posts),
      ).toBeNull();
    });

    it('allows creation of the one-hundredth post', () => {
      const posts = Array.from(
        { length: LIMITS.posts - 1 },
        (_, index) => createStoredPost(index + 1),
      );
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify(posts),
      );

      const result = createPost({
        title: 'Post 100',
        content: 'The final post within the configured limit.',
        session: adminSession,
      });

      expect(result.ok).toBe(true);
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.posts),
        ),
      ).toHaveLength(LIMITS.posts);
    });

    it('blocks creation beyond one hundred posts without changing storage', () => {
      const posts = Array.from(
        { length: LIMITS.posts },
        (_, index) => createStoredPost(index + 1),
      );
      const priorValue = JSON.stringify(posts);
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        priorValue,
      );

      const result = createPost({
        title: 'One post too many',
        content: 'This content must not be stored.',
        session: adminSession,
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'LIMIT_REACHED',
          message: MESSAGES.postLimitReached,
          recoverable: true,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.posts)).toBe(
        priorValue,
      );
    });

    it('blocks creation when the stored post collection is damaged', () => {
      const damagedValue = '{damaged-posts';
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        damagedValue,
      );

      const result = createPost({
        title: 'A new post',
        content: 'This content must not replace damaged data.',
        session: userSession,
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'CORRUPT_SOURCE_REPAIR_REQUIRED',
          message: MESSAGES.corruptPostsRepairRequired,
          recoverable: true,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.posts)).toBe(
        damagedValue,
      );
    });

    it('preserves the existing collection when persistence runs out of quota', () => {
      const priorValue = JSON.stringify([validPost]);
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        priorValue,
      );
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
        () => {
          throw new DOMException(
            'Storage quota exceeded.',
            'QuotaExceededError',
          );
        },
      );

      const result = createPost({
        title: 'Unsaved post',
        content: 'Content that cannot be persisted.',
        session: userSession,
      });

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
  });

  describe('post updates', () => {
    it('updates editable fields while preserving post identity and metadata', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify([validPost]),
      );

      const result = updatePost({
        postId: validPost.id,
        title: '  Updated title  ',
        content: 'Updated content.',
        session: userSession,
      });

      expect(result).toEqual({
        ok: true,
        value: {
          postId: validPost.id,
          redirectTo: `/blog/${validPost.id}`,
        },
      });
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.posts),
        ),
      ).toEqual([
        {
          ...validPost,
          title: 'Updated title',
          content: 'Updated content.',
        },
      ]);
    });

    it('allows an administrator to update another user’s post', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify([validPost]),
      );

      const result = updatePost({
        postId: validPost.id,
        title: 'Admin update',
        content: 'Updated by the administrator.',
        session: adminSession,
      });

      expect(result.ok).toBe(true);
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.posts),
        )[0],
      ).toMatchObject({
        id: validPost.id,
        title: 'Admin update',
        authorId: validPost.authorId,
      });
    });

    it('allows an update when the collection is already at capacity', () => {
      const posts = Array.from(
        { length: LIMITS.posts },
        (_, index) => createStoredPost(index + 1),
      );
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify(posts),
      );

      const result = updatePost({
        postId: posts[0].id,
        title: 'Updated at capacity',
        content: 'Updates do not add another record.',
        session: userSession,
      });

      expect(result.ok).toBe(true);
      const storedPosts = JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.posts),
      );
      expect(storedPosts).toHaveLength(LIMITS.posts);
      expect(storedPosts[0].title).toBe('Updated at capacity');
    });

    it('rejects an update from a non-owner and preserves the post', () => {
      const priorValue = JSON.stringify([validPost]);
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        priorValue,
      );

      const result = updatePost({
        postId: validPost.id,
        title: 'Forbidden update',
        content: 'This must not be persisted.',
        session: otherUserSession,
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: MESSAGES.postEditForbidden,
          recoverable: false,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.posts)).toBe(
        priorValue,
      );
    });

    it('returns not found when the requested post does not exist', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify([validPost]),
      );

      const result = updatePost({
        postId: 'missing-post',
        title: 'Updated title',
        content: 'Updated content.',
        session: userSession,
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: MESSAGES.notFound,
          recoverable: true,
        },
      });
    });

    it('preserves the prior post when an update write fails', () => {
      const priorValue = JSON.stringify([validPost]);
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        priorValue,
      );
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
        () => {
          throw new DOMException(
            'Storage quota exceeded.',
            'QuotaExceededError',
          );
        },
      );

      const result = updatePost({
        postId: validPost.id,
        title: 'Unsaved update',
        content: 'This update cannot be persisted.',
        session: userSession,
      });

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
  });

  describe('post deletion', () => {
    it('deletes an owned post after explicit confirmation', () => {
      const remainingPost = createStoredPost(
        2,
        otherUserSession.userId,
        otherUserSession.displayName,
      );
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify([validPost, remainingPost]),
      );

      const result = deletePost({
        postId: validPost.id,
        session: userSession,
        confirmed: true,
      });

      expect(result).toEqual({
        ok: true,
        value: {
          redirectTo: '/blogs',
        },
      });
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.posts),
        ),
      ).toEqual([remainingPost]);
    });

    it('allows an administrator to delete any post', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify([validPost]),
      );

      const result = deletePost({
        postId: validPost.id,
        session: adminSession,
        confirmed: true,
      });

      expect(result.ok).toBe(true);
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.posts),
        ),
      ).toEqual([]);
    });

    it('requires explicit confirmation before reading or changing posts', () => {
      const priorValue = JSON.stringify([validPost]);
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        priorValue,
      );
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

      const result = deletePost({
        postId: validPost.id,
        session: userSession,
        confirmed: false,
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: MESSAGES.validationFailed,
          recoverable: true,
        },
      });
      expect(getItemSpy).not.toHaveBeenCalled();
      expect(window.localStorage.getItem(STORAGE_KEYS.posts)).toBe(
        priorValue,
      );
    });

    it('rejects deletion by a non-owner and preserves the collection', () => {
      const priorValue = JSON.stringify([validPost]);
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        priorValue,
      );

      const result = deletePost({
        postId: validPost.id,
        session: otherUserSession,
        confirmed: true,
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: MESSAGES.postDeleteForbidden,
          recoverable: false,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.posts)).toBe(
        priorValue,
      );
    });

    it('returns not found when deleting an unknown post', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify([validPost]),
      );

      const result = deletePost({
        postId: 'missing-post',
        session: adminSession,
        confirmed: true,
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: MESSAGES.notFound,
          recoverable: true,
        },
      });
    });

    it('preserves posts when the deletion write fails', () => {
      const priorValue = JSON.stringify([validPost]);
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        priorValue,
      );
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
        () => {
          throw new DOMException(
            'Storage access denied.',
            'SecurityError',
          );
        },
      );

      const result = deletePost({
        postId: validPost.id,
        session: userSession,
        confirmed: true,
      });

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'STORAGE_UNAVAILABLE',
          message: MESSAGES.storageUnavailable,
          recoverable: true,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.posts)).toBe(
        priorValue,
      );
    });
  });

  describe('managed user creation', () => {
    it('allows an administrator to create a managed account', () => {
      const result = createManagedUser(
        {
          displayName: '  Demo Moderator  ',
          username: ' Demo_Mod ',
          password: 'fake-only',
          role: ROLES.ADMIN,
        },
        adminSession,
      );

      expect(result).toEqual({
        ok: true,
        value: {
          userId: 'generated-id',
        },
      });
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([
        {
          id: 'generated-id',
          displayName: 'Demo Moderator',
          username: 'Demo_Mod',
          password: 'fake-only',
          role: ROLES.ADMIN,
          createdAt: expect.any(String),
        },
      ]);
    });

    it('rejects managed user creation by a regular user', () => {
      const result = createManagedUser(
        {
          displayName: 'Demo Moderator',
          username: 'demo_mod',
          password: 'fake-only',
          role: ROLES.ADMIN,
        },
        userSession,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: MESSAGES.forbidden,
          recoverable: false,
        },
      });
      expect(
        window.localStorage.getItem(STORAGE_KEYS.users),
      ).toBeNull();
    });

    it('rejects unauthenticated managed user creation', () => {
      const result = createManagedUser(
        {
          displayName: 'Demo User',
          username: 'demo_new',
          password: 'fake-only',
          role: ROLES.USER,
        },
        null,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: MESSAGES.unauthenticated,
          recoverable: true,
        },
      });
    });

    it('returns field errors for invalid managed account values', () => {
      const result = createManagedUser(
        {
          displayName: ' ',
          username: 'bad username',
          password: '',
          role: 'unsupported',
        },
        adminSession,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: MESSAGES.validationFailed,
          recoverable: true,
          fieldErrors: {
            displayName: 'Display name is required.',
            username:
              'Username may contain only letters, numbers, and underscores.',
            password: 'Password is required.',
            role: 'Choose a valid account role.',
          },
        },
      });
    });

    it('rejects the reserved Admin username case-insensitively', () => {
      const result = createManagedUser(
        {
          displayName: 'Another Admin',
          username: ' AdMiN ',
          password: 'fake-only',
          role: ROLES.ADMIN,
        },
        adminSession,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'DUPLICATE_USERNAME',
          message: MESSAGES.duplicateUsername,
          recoverable: true,
        },
      });
    });

    it('rejects a normalized duplicate persisted username', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([validUser]),
      );

      const result = createManagedUser(
        {
          displayName: 'Duplicate User',
          username: ' DEMO_USER ',
          password: 'different-password',
          role: ROLES.USER,
        },
        adminSession,
      );

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

    it('enforces the persisted-account capacity including the virtual Admin', () => {
      const users = Array.from(
        { length: LIMITS.persistedUsers },
        (_, index) => createStoredUser(index + 1),
      );
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify(users),
      );

      const result = createManagedUser(
        {
          displayName: 'One Too Many',
          username: 'user_ten',
          password: 'fake-only',
          role: ROLES.USER,
        },
        adminSession,
      );

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

    it('does not replace a damaged user collection', () => {
      const damagedValue = '{damaged-users';
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        damagedValue,
      );

      const result = createManagedUser(
        {
          displayName: 'Demo User',
          username: 'demo_new',
          password: 'fake-only',
          role: ROLES.USER,
        },
        adminSession,
      );

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

    it('preserves existing users when managed account persistence fails', () => {
      const priorValue = JSON.stringify([validUser]);
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        priorValue,
      );
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
        () => {
          throw new DOMException(
            'Storage quota exceeded.',
            'QuotaExceededError',
          );
        },
      );

      const result = createManagedUser(
        {
          displayName: 'Demo User Two',
          username: 'demo_user_2',
          password: 'fake-only',
          role: ROLES.USER,
        },
        adminSession,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: MESSAGES.quotaExceeded,
          recoverable: true,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.users)).toBe(
        priorValue,
      );
    });
  });

  describe('managed user deletion', () => {
    it('allows an administrator to delete a persisted account without deleting posts', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([validUser]),
      );
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify([validPost]),
      );

      const result = deleteManagedUser(
        validUser.id,
        adminSession,
        true,
      );

      expect(result).toEqual({
        ok: true,
        value: null,
      });
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([]);
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.posts),
        ),
      ).toEqual([validPost]);
    });

    it('requires explicit confirmation before deleting an account', () => {
      const priorValue = JSON.stringify([validUser]);
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        priorValue,
      );

      const result = deleteManagedUser(
        validUser.id,
        adminSession,
        false,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: MESSAGES.validationFailed,
          recoverable: true,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.users)).toBe(
        priorValue,
      );
    });

    it('protects the virtual default administrator from deletion', () => {
      const result = deleteManagedUser(
        'admin',
        adminSession,
        true,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'DEFAULT_ADMIN_PROTECTED',
          message: MESSAGES.defaultAdminProtected,
          recoverable: false,
        },
      });
    });

    it('prevents a persisted administrator from deleting their own account', () => {
      const persistedAdmin = createStoredUser(2, ROLES.ADMIN);
      const persistedAdminSession = {
        userId: persistedAdmin.id,
        username: persistedAdmin.username,
        displayName: persistedAdmin.displayName,
        role: ROLES.ADMIN,
      };
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([persistedAdmin]),
      );

      const result = deleteManagedUser(
        persistedAdmin.id,
        persistedAdminSession,
        true,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'SELF_DELETE_FORBIDDEN',
          message: MESSAGES.selfDeleteForbidden,
          recoverable: false,
        },
      });
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([persistedAdmin]);
    });

    it('rejects account deletion by a regular user', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([validUser]),
      );

      const result = deleteManagedUser(
        validUser.id,
        otherUserSession,
        true,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: MESSAGES.forbidden,
          recoverable: false,
        },
      });
    });

    it('returns not found for an unknown persisted account', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([validUser]),
      );

      const result = deleteManagedUser(
        'missing-user',
        adminSession,
        true,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: MESSAGES.notFound,
          recoverable: true,
        },
      });
    });

    it('preserves the account collection when deletion persistence fails', () => {
      const priorValue = JSON.stringify([validUser]);
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        priorValue,
      );
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
        () => {
          throw new DOMException(
            'Storage quota exceeded.',
            'QuotaExceededError',
          );
        },
      );

      const result = deleteManagedUser(
        validUser.id,
        adminSession,
        true,
      );

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: MESSAGES.quotaExceeded,
          recoverable: true,
        },
      });
      expect(window.localStorage.getItem(STORAGE_KEYS.users)).toBe(
        priorValue,
      );
    });
  });

  describe('administrator statistics', () => {
    it('counts posts, persisted users, and the virtual Admin exactly once', () => {
      const persistedAdmin = createStoredUser(2, ROLES.ADMIN);
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify([
          validPost,
          createStoredPost(
            2,
            persistedAdmin.id,
            persistedAdmin.displayName,
          ),
        ]),
      );
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([validUser, persistedAdmin]),
      );

      expect(getAdminStatistics()).toEqual({
        ok: true,
        value: {
          totalPosts: 2,
          totalUsers: 3,
          totalAdmins: 2,
          totalRegularUsers: 1,
        },
      });
    });

    it('returns virtual-Admin-only statistics for empty storage', () => {
      expect(getAdminStatistics()).toEqual({
        ok: true,
        value: {
          totalPosts: 0,
          totalUsers: 1,
          totalAdmins: 1,
          totalRegularUsers: 0,
        },
      });
    });

    it('rejects statistics derived from a damaged post collection', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        '{damaged-posts',
      );

      expect(getAdminStatistics()).toEqual({
        ok: false,
        error: {
          code: 'CORRUPT_SOURCE_REPAIR_REQUIRED',
          message: MESSAGES.corruptPostsRepairRequired,
          recoverable: true,
        },
      });
    });

    it('rejects statistics derived from a damaged user collection', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        JSON.stringify([validPost]),
      );
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify({ user: validUser }),
      );

      expect(getAdminStatistics()).toEqual({
        ok: false,
        error: {
          code: 'CORRUPT_SOURCE_REPAIR_REQUIRED',
          message: MESSAGES.corruptUsersRepairRequired,
          recoverable: true,
        },
      });
    });

    it('reports unavailable storage while loading statistics', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
        () => {
          throw new DOMException(
            'Storage access denied.',
            'SecurityError',
          );
        },
      );

      expect(getAdminStatistics()).toEqual({
        ok: false,
        error: {
          code: 'STORAGE_UNAVAILABLE',
          message: MESSAGES.storageUnavailable,
          recoverable: true,
        },
      });
    });
  });

  describe('safe date formatting', () => {
    it('formats a valid ISO instant for display', () => {
      expect(
        formatDateSafe('2026-10-14T10:00:00.000Z'),
      ).toBe('October 14, 2026');
    });

    it('returns the fallback for invalid and non-string dates', () => {
      expect(formatDateSafe('not-a-date')).toBe(
        MESSAGES.unknownDate,
      );
      expect(formatDateSafe(null)).toBe(MESSAGES.unknownDate);
      expect(formatDateSafe(undefined)).toBe(
        MESSAGES.unknownDate,
      );
    });

    it('returns the fallback when locale date formatting throws', () => {
      vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(
        () => {
          throw new RangeError('Locale formatting failed.');
        },
      );

      expect(
        formatDateSafe('2026-10-14T10:00:00.000Z'),
      ).toBe(MESSAGES.unknownDate);
    });
  });
});