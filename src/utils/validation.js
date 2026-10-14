import {
  LIMITS,
  MESSAGES,
  ROLES,
  USERNAME_PATTERN,
} from './constants.js';

const POST_FIELDS = Object.freeze([
  'id',
  'title',
  'content',
  'createdAt',
  'authorId',
  'authorName',
]);

const USER_FIELDS = Object.freeze([
  'id',
  'displayName',
  'username',
  'password',
  'role',
  'createdAt',
]);

const SESSION_FIELDS = Object.freeze([
  'userId',
  'username',
  'displayName',
  'role',
]);

const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Creates a successful structured result.
 *
 * @param {*} value Result value.
 * @param {object} [meta] Optional result metadata.
 * @returns {{ok: true, value: *, meta?: object}}
 */
export function successResult(value, meta) {
  if (meta === undefined) {
    return { ok: true, value };
  }

  return { ok: true, value, meta };
}

/**
 * Creates a privacy-safe structured failure result.
 *
 * @param {string} code Stable error code.
 * @param {string} message Safe user-facing message.
 * @param {object} [options] Optional error properties.
 * @param {Record<string, string>} [options.fieldErrors] Field errors.
 * @param {boolean} [options.recoverable=true] Whether retry or correction is possible.
 * @returns {{ok: false, error: {code: string, message: string, recoverable: boolean, fieldErrors?: Record<string, string>}}}
 */
export function errorResult(code, message, options = {}) {
  const error = {
    code,
    message,
    recoverable: options.recoverable ?? true,
  };

  if (
    options.fieldErrors &&
    Object.keys(options.fieldErrors).length > 0
  ) {
    error.fieldErrors = { ...options.fieldErrors };
  }

  return { ok: false, error };
}

/**
 * Alias for successResult for callers using concise result helpers.
 *
 * @param {*} value Result value.
 * @param {object} [meta] Optional result metadata.
 * @returns {{ok: true, value: *, meta?: object}}
 */
export function ok(value, meta) {
  return successResult(value, meta);
}

/**
 * Alias for errorResult for callers using concise result helpers.
 *
 * @param {string} code Stable error code.
 * @param {string} message Safe user-facing message.
 * @param {object} [options] Optional error properties.
 * @returns {{ok: false, error: object}}
 */
export function failure(code, message, options) {
  return errorResult(code, message, options);
}

/**
 * Normalizes a username for case-insensitive comparison.
 *
 * @param {*} username Candidate username.
 * @returns {string}
 */
export function normalizeUsername(username) {
  return typeof username === 'string'
    ? username.trim().toLocaleLowerCase('en-US')
    : '';
}

/**
 * Compares usernames using the application's normalization rules.
 *
 * @param {*} first First username.
 * @param {*} second Second username.
 * @returns {boolean}
 */
export function usernamesEqual(first, second) {
  return normalizeUsername(first) === normalizeUsername(second);
}

/**
 * Checks whether a value is a non-array object with the exact expected keys.
 *
 * @param {*} value Candidate value.
 * @param {string[]} expectedKeys Expected own enumerable keys.
 * @returns {boolean}
 */
export function hasExactKeys(value, expectedKeys) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return false;
  }

  const keys = Object.keys(value);

  return (
    keys.length === expectedKeys.length &&
    expectedKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(value, key),
    )
  );
}

/**
 * Checks a trimmed string length without mutating the source value.
 *
 * @param {*} value Candidate value.
 * @param {number} min Minimum trimmed length.
 * @param {number} max Maximum trimmed length.
 * @returns {boolean}
 */
export function isTrimmedStringWithin(value, min, max) {
  if (typeof value !== 'string' || value !== value.trim()) {
    return false;
  }

  return value.length >= min && value.length <= max;
}

/**
 * Checks whether a string is a valid ISO-8601 instant.
 *
 * @param {*} value Candidate date value.
 * @returns {boolean}
 */
export function isValidIsoInstant(value) {
  if (
    typeof value !== 'string' ||
    !ISO_INSTANT_PATTERN.test(value)
  ) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

/**
 * Checks whether a role is supported.
 *
 * @param {*} role Candidate role.
 * @returns {boolean}
 */
export function isValidRole(role) {
  return role === ROLES.ADMIN || role === ROLES.USER;
}

/**
 * Checks whether a persisted post has the exact supported schema.
 *
 * @param {*} post Candidate post.
 * @returns {boolean}
 */
export function isValidPost(post) {
  return (
    hasExactKeys(post, POST_FIELDS) &&
    typeof post.id === 'string' &&
    post.id.length > 0 &&
    isTrimmedStringWithin(
      post.title,
      LIMITS.title.min,
      LIMITS.title.max,
    ) &&
    typeof post.content === 'string' &&
    post.content.length >= LIMITS.content.min &&
    post.content.length <= LIMITS.content.max &&
    post.content.trim().length > 0 &&
    isValidIsoInstant(post.createdAt) &&
    typeof post.authorId === 'string' &&
    post.authorId.length > 0 &&
    isTrimmedStringWithin(
      post.authorName,
      LIMITS.displayName.min,
      LIMITS.displayName.max,
    )
  );
}

/**
 * Checks whether a persisted user has the exact supported schema.
 *
 * @param {*} user Candidate user.
 * @returns {boolean}
 */
export function isValidUser(user) {
  return (
    hasExactKeys(user, USER_FIELDS) &&
    typeof user.id === 'string' &&
    user.id.length > 0 &&
    user.id !== 'admin' &&
    isTrimmedStringWithin(
      user.displayName,
      LIMITS.displayName.min,
      LIMITS.displayName.max,
    ) &&
    typeof user.username === 'string' &&
    user.username === user.username.trim() &&
    user.username.length >= LIMITS.username.min &&
    user.username.length <= LIMITS.username.max &&
    USERNAME_PATTERN.test(user.username) &&
    normalizeUsername(user.username) !== 'admin' &&
    typeof user.password === 'string' &&
    user.password.length >= LIMITS.password.min &&
    user.password.length <= LIMITS.password.max &&
    isValidRole(user.role) &&
    isValidIsoInstant(user.createdAt)
  );
}

/**
 * Checks whether a session has the exact supported schema.
 *
 * @param {*} session Candidate session.
 * @returns {boolean}
 */
export function isValidSession(session) {
  return (
    hasExactKeys(session, SESSION_FIELDS) &&
    typeof session.userId === 'string' &&
    session.userId.length > 0 &&
    typeof session.username === 'string' &&
    session.username.length > 0 &&
    typeof session.displayName === 'string' &&
    session.displayName.length > 0 &&
    isValidRole(session.role)
  );
}

/**
 * Validates a complete post collection, including bounds and unique IDs.
 *
 * @param {*} posts Candidate collection.
 * @returns {boolean}
 */
export function isValidPostsCollection(posts) {
  if (!Array.isArray(posts) || posts.length > LIMITS.posts) {
    return false;
  }

  const ids = new Set();

  for (const post of posts) {
    if (!isValidPost(post) || ids.has(post.id)) {
      return false;
    }

    ids.add(post.id);
  }

  return true;
}

/**
 * Validates a complete persisted user collection.
 *
 * @param {*} users Candidate collection.
 * @returns {boolean}
 */
export function isValidUsersCollection(users) {
  if (
    !Array.isArray(users) ||
    users.length > LIMITS.persistedUsers
  ) {
    return false;
  }

  const ids = new Set();
  const usernames = new Set();

  for (const user of users) {
    if (!isValidUser(user)) {
      return false;
    }

    const normalizedUsername = normalizeUsername(user.username);

    if (ids.has(user.id) || usernames.has(normalizedUsername)) {
      return false;
    }

    ids.add(user.id);
    usernames.add(normalizedUsername);
  }

  return true;
}

/**
 * Validates login form input without including credentials in errors.
 *
 * @param {*} input Login fields.
 * @returns {{ok: true, value: {username: string, password: string}}|{ok: false, error: object}}
 */
export function validateLoginInput(input) {
  const fieldErrors = {};
  const username =
    input && typeof input.username === 'string'
      ? input.username.trim()
      : '';
  const password =
    input && typeof input.password === 'string'
      ? input.password
      : '';

  if (username.length === 0) {
    fieldErrors.username = 'Username is required.';
  }

  if (password.length === 0) {
    fieldErrors.password = 'Password is required.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorResult(
      'VALIDATION_FAILED',
      MESSAGES.validationFailed,
      { fieldErrors },
    );
  }

  return successResult({ username, password });
}

/**
 * Validates registration form input without echoing credentials.
 *
 * @param {*} input Registration fields.
 * @returns {{ok: true, value: {displayName: string, username: string, password: string, confirmPassword: string}}|{ok: false, error: object}}
 */
export function validateRegistrationInput(input) {
  const fieldErrors = {};
  const displayName =
    input && typeof input.displayName === 'string'
      ? input.displayName.trim()
      : '';
  const username =
    input && typeof input.username === 'string'
      ? input.username.trim()
      : '';
  const password =
    input && typeof input.password === 'string'
      ? input.password
      : '';
  const confirmPassword =
    input && typeof input.confirmPassword === 'string'
      ? input.confirmPassword
      : '';

  validateDisplayNameField(displayName, fieldErrors);
  validateUsernameField(username, fieldErrors);
  validatePasswordField(password, fieldErrors);

  if (confirmPassword.length === 0) {
    fieldErrors.confirmPassword = 'Confirm your password.';
  } else if (password !== confirmPassword) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorResult(
      'VALIDATION_FAILED',
      MESSAGES.validationFailed,
      { fieldErrors },
    );
  }

  return successResult({
    displayName,
    username,
    password,
    confirmPassword,
  });
}

/**
 * Validates managed-user form input without echoing credentials.
 *
 * @param {*} input Managed-user fields.
 * @returns {{ok: true, value: {displayName: string, username: string, password: string, role: string}}|{ok: false, error: object}}
 */
export function validateManagedUserInput(input) {
  const fieldErrors = {};
  const displayName =
    input && typeof input.displayName === 'string'
      ? input.displayName.trim()
      : '';
  const username =
    input && typeof input.username === 'string'
      ? input.username.trim()
      : '';
  const password =
    input && typeof input.password === 'string'
      ? input.password
      : '';
  const role = input ? input.role : undefined;

  validateDisplayNameField(displayName, fieldErrors);
  validateUsernameField(username, fieldErrors);
  validatePasswordField(password, fieldErrors);

  if (!isValidRole(role)) {
    fieldErrors.role = 'Choose a valid account role.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorResult(
      'VALIDATION_FAILED',
      MESSAGES.validationFailed,
      { fieldErrors },
    );
  }

  return successResult({
    displayName,
    username,
    password,
    role,
  });
}

/**
 * Validates post form input and returns its storage-safe values.
 *
 * @param {*} input Post fields.
 * @returns {{ok: true, value: {title: string, content: string}}|{ok: false, error: object}}
 */
export function validatePostInput(input) {
  const fieldErrors = {};
  const title =
    input && typeof input.title === 'string'
      ? input.title.trim()
      : '';
  const content =
    input && typeof input.content === 'string'
      ? input.content
      : '';

  if (title.length < LIMITS.title.min) {
    fieldErrors.title = 'Title is required.';
  } else if (title.length > LIMITS.title.max) {
    fieldErrors.title = `Title must be ${LIMITS.title.max} characters or fewer.`;
  }

  if (content.trim().length < LIMITS.content.min) {
    fieldErrors.content = 'Content is required.';
  } else if (content.length > LIMITS.content.max) {
    fieldErrors.content = `Content must be ${LIMITS.content.max} characters or fewer.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorResult(
      'VALIDATION_FAILED',
      MESSAGES.validationFailed,
      { fieldErrors },
    );
  }

  return successResult({ title, content });
}

/**
 * Reports whether secure browser UUID generation is available.
 *
 * @returns {boolean}
 */
export function hasUuidCapability() {
  try {
    return (
      typeof globalThis.crypto === 'object' &&
      globalThis.crypto !== null &&
      typeof globalThis.crypto.randomUUID === 'function'
    );
  } catch {
    return false;
  }
}

/**
 * Generates an ID through the browser UUID capability.
 *
 * @returns {{ok: true, value: string}|{ok: false, error: object}}
 */
export function generateUuidResult() {
  if (!hasUuidCapability()) {
    return errorResult(
      'STORAGE_UNAVAILABLE',
      MESSAGES.storageUnavailable,
    );
  }

  try {
    const id = globalThis.crypto.randomUUID();

    if (typeof id !== 'string' || id.length === 0) {
      return errorResult(
        'STORAGE_UNAVAILABLE',
        MESSAGES.storageUnavailable,
      );
    }

    return successResult(id);
  } catch {
    return errorResult(
      'STORAGE_UNAVAILABLE',
      MESSAGES.storageUnavailable,
    );
  }
}

/**
 * Adds display-name validation errors to the supplied field map.
 *
 * @param {string} displayName Trimmed display name.
 * @param {Record<string, string>} fieldErrors Mutable field error map.
 * @returns {void}
 */
function validateDisplayNameField(displayName, fieldErrors) {
  if (displayName.length < LIMITS.displayName.min) {
    fieldErrors.displayName = 'Display name is required.';
  } else if (displayName.length > LIMITS.displayName.max) {
    fieldErrors.displayName =
      `Display name must be ${LIMITS.displayName.max} characters or fewer.`;
  }
}

/**
 * Adds username validation errors to the supplied field map.
 *
 * @param {string} username Trimmed username.
 * @param {Record<string, string>} fieldErrors Mutable field error map.
 * @returns {void}
 */
function validateUsernameField(username, fieldErrors) {
  if (username.length < LIMITS.username.min) {
    fieldErrors.username =
      `Username must be at least ${LIMITS.username.min} characters.`;
  } else if (username.length > LIMITS.username.max) {
    fieldErrors.username =
      `Username must be ${LIMITS.username.max} characters or fewer.`;
  } else if (!USERNAME_PATTERN.test(username)) {
    fieldErrors.username =
      'Username may contain only letters, numbers, and underscores.';
  }
}

/**
 * Adds password validation errors to the supplied field map.
 *
 * @param {string} password Password value.
 * @param {Record<string, string>} fieldErrors Mutable field error map.
 * @returns {void}
 */
function validatePasswordField(password, fieldErrors) {
  if (password.length < LIMITS.password.min) {
    fieldErrors.password = 'Password is required.';
  } else if (password.length > LIMITS.password.max) {
    fieldErrors.password =
      `Password must be ${LIMITS.password.max} characters or fewer.`;
  }
}