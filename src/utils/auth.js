import {
  DEFAULT_ADMIN,
  LIMITS,
  MESSAGES,
  ROLES,
  STORAGE_KEYS,
} from './constants.js';
import {
  getUsersResult,
  saveUsers,
} from './storage.js';
import {
  errorResult,
  generateUuidResult,
  isValidSession,
  normalizeUsername,
  successResult,
  usernamesEqual,
  validateLoginInput,
  validateRegistrationInput,
} from './validation.js';

/**
 * Creates a session-safe projection of an account.
 *
 * @param {{id: string, username: string, displayName: string, role: string}} account Account record.
 * @returns {{userId: string, username: string, displayName: string, role: string}}
 */
function createSession(account) {
  return {
    userId: account.id,
    username: account.username,
    displayName: account.displayName,
    role: account.role,
  };
}

/**
 * Creates a storage warning for successful reads that resolve to no session.
 *
 * @param {string} code Stable warning code.
 * @param {string} message Safe user-facing message.
 * @returns {{code: string, message: string, recoverable: boolean}}
 */
function createWarning(code, message) {
  return errorResult(code, message).error;
}

/**
 * Reports whether a storage exception represents exhausted browser quota.
 *
 * @param {*} error Caught storage exception.
 * @returns {boolean}
 */
function isQuotaExceededError(error) {
  if (error === null || typeof error !== 'object') {
    return false;
  }

  try {
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014
    );
  } catch {
    return false;
  }
}

/**
 * Returns a corruption failure for a user collection that cannot be mutated.
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
 * Authenticates the virtual administrator or a persisted local account.
 *
 * @param {*} input Login form fields.
 * @returns {{ok: true, value: {session: object, redirectTo: string}}|{ok: false, error: object}}
 */
export function login(input) {
  const validationResult = validateLoginInput(input);

  if (!validationResult.ok) {
    return validationResult;
  }

  const { username, password } = validationResult.value;
  let account = null;

  if (
    usernamesEqual(username, DEFAULT_ADMIN.username) &&
    password === DEFAULT_ADMIN.password
  ) {
    account = DEFAULT_ADMIN;
  } else {
    const usersResult = getUsersResult();

    if (!usersResult.ok) {
      return usersResult;
    }

    if (!usersResult.value.mutationAllowed) {
      return corruptUsersResult();
    }

    account =
      usersResult.value.items.find(
        (user) =>
          usernamesEqual(user.username, username) &&
          user.password === password,
      ) ?? null;
  }

  if (account === null) {
    return errorResult(
      'VALIDATION_FAILED',
      MESSAGES.invalidCredentials,
    );
  }

  const session = createSession(account);
  const sessionResult = setSession(session);

  if (!sessionResult.ok) {
    return sessionResult;
  }

  return successResult({
    session,
    redirectTo: homeForRole(session.role),
  });
}

/**
 * Registers a regular local account and starts its browser session.
 *
 * @param {*} input Registration form fields.
 * @returns {{ok: true, value: {session: object, redirectTo: '/blogs'}}|{ok: false, error: object}}
 */
export function register(input) {
  const validationResult = validateRegistrationInput(input);

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
  const {
    displayName,
    username,
    password,
  } = validationResult.value;
  const normalizedUsername = normalizeUsername(username);

  if (
    normalizedUsername ===
      normalizeUsername(DEFAULT_ADMIN.username) ||
    users.some((user) =>
      usernamesEqual(user.username, username),
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
    displayName,
    username,
    password,
    role: ROLES.USER,
    createdAt: new Date().toISOString(),
  };
  const saveResult = saveUsers([...users, user]);

  if (!saveResult.ok) {
    return saveResult;
  }

  const session = createSession(user);
  const sessionResult = setSession(session);

  if (!sessionResult.ok) {
    saveUsers(users);
    return sessionResult;
  }

  return successResult({
    session,
    redirectTo: '/blogs',
  });
}

/**
 * Reads and validates the persisted browser session.
 *
 * Missing, malformed, or schema-invalid session data resolves to a guest.
 * Malformed and schema-invalid values are left untouched and reported through
 * result metadata.
 *
 * @returns {{ok: true, value: object|null, meta?: object}|{ok: false, error: object}}
 */
export function getSessionResult() {
  let rawValue;

  try {
    rawValue = globalThis.localStorage.getItem(
      STORAGE_KEYS.session,
    );
  } catch {
    return errorResult(
      'STORAGE_UNAVAILABLE',
      MESSAGES.storageUnavailable,
    );
  }

  if (rawValue === null) {
    return successResult(null);
  }

  let session;

  try {
    session = JSON.parse(rawValue);
  } catch {
    return successResult(null, {
      warning: createWarning(
        'MALFORMED_JSON',
        MESSAGES.malformedJson,
      ),
    });
  }

  if (!isValidSession(session)) {
    return successResult(null, {
      warning: createWarning(
        'SCHEMA_INVALID',
        MESSAGES.schemaInvalid,
      ),
    });
  }

  return successResult(session);
}

/**
 * Reads the persisted session using the compatibility contract.
 *
 * Read failures and invalid session data intentionally collapse to null. Use
 * getSessionResult when diagnostics are required.
 *
 * @returns {object|null}
 */
export function getSession() {
  const result = getSessionResult();
  return result.ok ? result.value : null;
}

/**
 * Validates and persists a browser session.
 *
 * @param {*} session Candidate session.
 * @returns {{ok: true, value: null}|{ok: false, error: object}}
 */
export function setSession(session) {
  if (!isValidSession(session)) {
    return errorResult(
      'SCHEMA_INVALID',
      MESSAGES.schemaInvalid,
    );
  }

  let serializedSession;

  try {
    serializedSession = JSON.stringify(session);
  } catch {
    return errorResult(
      'SERIALIZATION_FAILED',
      MESSAGES.serializationFailed,
    );
  }

  if (typeof serializedSession !== 'string') {
    return errorResult(
      'SERIALIZATION_FAILED',
      MESSAGES.serializationFailed,
    );
  }

  try {
    globalThis.localStorage.setItem(
      STORAGE_KEYS.session,
      serializedSession,
    );
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return errorResult(
        'QUOTA_EXCEEDED',
        MESSAGES.quotaExceeded,
      );
    }

    return errorResult(
      'STORAGE_UNAVAILABLE',
      MESSAGES.storageUnavailable,
    );
  }

  return successResult(null);
}

/**
 * Removes only the persisted browser session.
 *
 * @returns {{ok: true, value: null}|{ok: false, error: object}}
 */
export function clearSession() {
  try {
    globalThis.localStorage.removeItem(STORAGE_KEYS.session);
  } catch {
    return errorResult(
      'STORAGE_UNAVAILABLE',
      MESSAGES.logoutPersistenceFailure,
    );
  }

  return successResult(null);
}

/**
 * Returns the default signed-in destination for an account role.
 *
 * @param {*} role Account role.
 * @returns {'/admin'|'/blogs'}
 */
export function homeForRole(role) {
  return role === ROLES.ADMIN ? '/admin' : '/blogs';
}

/**
 * Reports whether a session may edit or delete a post.
 *
 * Administrators may manage every post. Regular users may manage only posts
 * whose author ID matches their canonical session user ID.
 *
 * @param {*} session Candidate session.
 * @param {*} post Candidate post.
 * @returns {boolean}
 */
export function canManagePost(session, post) {
  if (
    !isValidSession(session) ||
    post === null ||
    typeof post !== 'object' ||
    Array.isArray(post) ||
    typeof post.authorId !== 'string'
  ) {
    return false;
  }

  return (
    session.role === ROLES.ADMIN ||
    session.userId === post.authorId
  );
}