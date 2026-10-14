import {
  DEFAULT_ADMIN,
  LIMITS,
  MESSAGES,
  ROLES,
} from './constants.js';
import { canManagePost } from './auth.js';
import {
  getPostsResult,
  getUsersResult,
  savePosts,
  saveUsers,
} from './storage.js';
import {
  errorResult,
  generateUuidResult,
  isValidSession,
  normalizeUsername,
  successResult,
  validateManagedUserInput,
  validatePostInput,
} from './validation.js';

/**
 * Returns an authentication failure when a session is invalid.
 *
 * @param {*} session Candidate session.
 * @returns {{ok: false, error: object}|null}
 */
function requireSession(session) {
  if (!isValidSession(session)) {
    return errorResult(
      'UNAUTHENTICATED',
      MESSAGES.unauthenticated,
    );
  }

  return null;
}

/**
 * Returns an authorization failure unless the session is an administrator.
 *
 * @param {*} session Candidate session.
 * @returns {{ok: false, error: object}|null}
 */
function requireAdmin(session) {
  const sessionFailure = requireSession(session);

  if (sessionFailure !== null) {
    return sessionFailure;
  }

  if (session.role !== ROLES.ADMIN) {
    return errorResult(
      'FORBIDDEN',
      MESSAGES.forbidden,
      { recoverable: false },
    );
  }

  return null;
}

/**
 * Returns a failure for a damaged post collection.
 *
 * @returns {{ok: false, error: object}}
 */
function corruptPostsResult() {
  return errorResult(
    'CORRUPT_SOURCE_REPAIR_REQUIRED',
    MESSAGES.corruptPostsRepairRequired,
  );
}

/**
 * Returns a failure for a damaged user collection.
 *
 * @returns {{ok: false, error: object}}
 */
function corruptUsersResult() {
  return errorResult(
    'CORRUPT_SOURCE_REPAIR_REQUIRED',
    MESSAGES.corruptUsersRepairRequired,
  );
}

/**
 * Creates a browser-local post for an authenticated account.
 *
 * @param {*} input Post fields and current session.
 * @returns {{ok: true, value: {postId: string, redirectTo: string}}|{ok: false, error: object}}
 */
export function createPost(input) {
  const session = input?.session;
  const sessionFailure = requireSession(session);

  if (sessionFailure !== null) {
    return sessionFailure;
  }

  const validationResult = validatePostInput(input);

  if (!validationResult.ok) {
    return validationResult;
  }

  const postsResult = getPostsResult();

  if (!postsResult.ok) {
    return postsResult;
  }

  if (!postsResult.value.mutationAllowed) {
    return corruptPostsResult();
  }

  const posts = postsResult.value.items;

  if (posts.length >= LIMITS.posts) {
    return errorResult(
      'LIMIT_REACHED',
      MESSAGES.postLimitReached,
    );
  }

  const idResult = generateUuidResult();

  if (!idResult.ok) {
    return idResult;
  }

  const post = {
    id: idResult.value,
    title: validationResult.value.title,
    content: validationResult.value.content,
    createdAt: new Date().toISOString(),
    authorId: session.userId,
    authorName: session.displayName,
  };
  const saveResult = savePosts([...posts, post]);

  if (!saveResult.ok) {
    return saveResult;
  }

  return successResult({
    postId: post.id,
    redirectTo: `/blog/${post.id}`,
  });
}

/**
 * Updates the editable fields of an existing browser-local post.
 *
 * @param {*} input Post ID, fields, and current session.
 * @returns {{ok: true, value: {postId: string, redirectTo: string}}|{ok: false, error: object}}
 */
export function updatePost(input) {
  const session = input?.session;
  const sessionFailure = requireSession(session);

  if (sessionFailure !== null) {
    return sessionFailure;
  }

  const validationResult = validatePostInput(input);

  if (!validationResult.ok) {
    return validationResult;
  }

  const postsResult = getPostsResult();

  if (!postsResult.ok) {
    return postsResult;
  }

  if (!postsResult.value.mutationAllowed) {
    return corruptPostsResult();
  }

  const posts = postsResult.value.items;
  const postId =
    input && typeof input.postId === 'string'
      ? input.postId
      : '';
  const postIndex = posts.findIndex(
    (post) => post.id === postId,
  );

  if (postIndex < 0) {
    return errorResult(
      'NOT_FOUND',
      MESSAGES.notFound,
    );
  }

  const existingPost = posts[postIndex];

  if (!canManagePost(session, existingPost)) {
    return errorResult(
      'FORBIDDEN',
      MESSAGES.postEditForbidden,
      { recoverable: false },
    );
  }

  const updatedPost = {
    ...existingPost,
    title: validationResult.value.title,
    content: validationResult.value.content,
  };
  const updatedPosts = posts.map((post, index) =>
    index === postIndex ? updatedPost : post,
  );
  const saveResult = savePosts(updatedPosts);

  if (!saveResult.ok) {
    return saveResult;
  }

  return successResult({
    postId: updatedPost.id,
    redirectTo: `/blog/${updatedPost.id}`,
  });
}

/**
 * Deletes an existing browser-local post after confirmation.
 *
 * @param {*} input Post ID, current session, and confirmation state.
 * @returns {{ok: true, value: {redirectTo: '/blogs'}}|{ok: false, error: object}}
 */
export function deletePost(input) {
  const session = input?.session;
  const sessionFailure = requireSession(session);

  if (sessionFailure !== null) {
    return sessionFailure;
  }

  if (input?.confirmed !== true) {
    return errorResult(
      'VALIDATION_FAILED',
      MESSAGES.validationFailed,
    );
  }

  const postsResult = getPostsResult();

  if (!postsResult.ok) {
    return postsResult;
  }

  if (!postsResult.value.mutationAllowed) {
    return corruptPostsResult();
  }

  const posts = postsResult.value.items;
  const postId =
    input && typeof input.postId === 'string'
      ? input.postId
      : '';
  const post = posts.find(
    (candidate) => candidate.id === postId,
  );

  if (post === undefined) {
    return errorResult(
      'NOT_FOUND',
      MESSAGES.notFound,
    );
  }

  if (!canManagePost(session, post)) {
    return errorResult(
      'FORBIDDEN',
      MESSAGES.postDeleteForbidden,
      { recoverable: false },
    );
  }

  const saveResult = savePosts(
    posts.filter((candidate) => candidate.id !== postId),
  );

  if (!saveResult.ok) {
    return saveResult;
  }

  return successResult({
    redirectTo: '/blogs',
  });
}

/**
 * Creates a managed local account as an administrator.
 *
 * @param {*} input Managed-account fields.
 * @param {*} session Current administrator session.
 * @returns {{ok: true, value: {userId: string}}|{ok: false, error: object}}
 */
export function createManagedUser(input, session) {
  const authorizationFailure = requireAdmin(session);

  if (authorizationFailure !== null) {
    return authorizationFailure;
  }

  const validationResult = validateManagedUserInput(input);

  if (!validationResult.ok) {
    return validationResult;
  }

  const usersResult = getUsersResult();

  if (!usersResult.ok) {
    return usersResult;
  }

  if (!usersResult.value.mutationAllowed) {
    return corruptUsersResult();
  }

  const users = usersResult.value.items;
  const normalizedUsername = normalizeUsername(
    validationResult.value.username,
  );

  if (
    normalizedUsername ===
      normalizeUsername(DEFAULT_ADMIN.username) ||
    users.some(
      (user) =>
        normalizeUsername(user.username) === normalizedUsername,
    )
  ) {
    return errorResult(
      'DUPLICATE_USERNAME',
      MESSAGES.duplicateUsername,
    );
  }

  if (users.length >= LIMITS.persistedUsers) {
    return errorResult(
      'LIMIT_REACHED',
      MESSAGES.accountLimitReached,
    );
  }

  const idResult = generateUuidResult();

  if (!idResult.ok) {
    return idResult;
  }

  const user = {
    id: idResult.value,
    displayName: validationResult.value.displayName,
    username: validationResult.value.username,
    password: validationResult.value.password,
    role: validationResult.value.role,
    createdAt: new Date().toISOString(),
  };
  const saveResult = saveUsers([...users, user]);

  if (!saveResult.ok) {
    return saveResult;
  }

  return successResult({
    userId: user.id,
  });
}

/**
 * Deletes a managed local account as an administrator.
 *
 * The virtual default administrator cannot be deleted, and the current
 * administrator cannot delete their own persisted account.
 *
 * @param {*} targetUserId Account identifier to delete.
 * @param {*} session Current administrator session.
 * @param {*} confirmed Whether deletion was explicitly confirmed.
 * @returns {{ok: true, value: null}|{ok: false, error: object}}
 */
export function deleteManagedUser(
  targetUserId,
  session,
  confirmed,
) {
  const authorizationFailure = requireAdmin(session);

  if (authorizationFailure !== null) {
    return authorizationFailure;
  }

  if (confirmed !== true) {
    return errorResult(
      'VALIDATION_FAILED',
      MESSAGES.validationFailed,
    );
  }

  if (targetUserId === DEFAULT_ADMIN.id) {
    return errorResult(
      'DEFAULT_ADMIN_PROTECTED',
      MESSAGES.defaultAdminProtected,
      { recoverable: false },
    );
  }

  if (targetUserId === session.userId) {
    return errorResult(
      'SELF_DELETE_FORBIDDEN',
      MESSAGES.selfDeleteForbidden,
      { recoverable: false },
    );
  }

  const usersResult = getUsersResult();

  if (!usersResult.ok) {
    return usersResult;
  }

  if (!usersResult.value.mutationAllowed) {
    return corruptUsersResult();
  }

  const users = usersResult.value.items;
  const targetExists = users.some(
    (user) => user.id === targetUserId,
  );

  if (!targetExists) {
    return errorResult(
      'NOT_FOUND',
      MESSAGES.notFound,
    );
  }

  const saveResult = saveUsers(
    users.filter((user) => user.id !== targetUserId),
  );

  if (!saveResult.ok) {
    return saveResult;
  }

  return successResult(null);
}

/**
 * Calculates dashboard statistics from browser-local collections.
 *
 * The virtual default administrator is included exactly once in account and
 * administrator totals.
 *
 * @returns {{ok: true, value: {totalPosts: number, totalUsers: number, totalAdmins: number, totalRegularUsers: number}}|{ok: false, error: object}}
 */
export function getAdminStatistics() {
  const postsResult = getPostsResult();

  if (!postsResult.ok) {
    return postsResult;
  }

  if (!postsResult.value.mutationAllowed) {
    return corruptPostsResult();
  }

  const usersResult = getUsersResult();

  if (!usersResult.ok) {
    return usersResult;
  }

  if (!usersResult.value.mutationAllowed) {
    return corruptUsersResult();
  }

  const users = usersResult.value.items;
  const persistedAdmins = users.filter(
    (user) => user.role === ROLES.ADMIN,
  ).length;
  const totalRegularUsers = users.filter(
    (user) => user.role === ROLES.USER,
  ).length;

  return successResult({
    totalPosts: postsResult.value.items.length,
    totalUsers: users.length + 1,
    totalAdmins: persistedAdmins + 1,
    totalRegularUsers,
  });
}

/**
 * Formats a date for display without throwing on invalid input.
 *
 * @param {*} value Candidate date value.
 * @returns {string}
 */
export function formatDateSafe(value) {
  if (typeof value !== 'string') {
    return MESSAGES.unknownDate;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return MESSAGES.unknownDate;
  }

  try {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return MESSAGES.unknownDate;
  }
}