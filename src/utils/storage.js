import { MESSAGES, STORAGE_KEYS } from './constants.js';
import {
  errorResult,
  isValidPostsCollection,
  isValidUsersCollection,
  successResult,
} from './validation.js';

/**
 * Creates a structured storage warning.
 *
 * @param {string} code Stable warning code.
 * @param {string} message Safe user-facing message.
 * @returns {{code: string, message: string, recoverable: boolean}}
 */
function createWarning(code, message) {
  return errorResult(code, message).error;
}

/**
 * Reads and validates a collection from browser storage.
 *
 * Missing keys represent valid empty collections. Damaged collections return
 * an empty display projection while preventing ordinary mutation.
 *
 * @param {string} key Browser storage key.
 * @param {(value: *) => boolean} validator Collection validator.
 * @returns {{ok: true, value: {items: Array, mutationAllowed: boolean, warning?: object}}|{ok: false, error: object}}
 */
function readCollection(key, validator) {
  let rawValue;

  try {
    rawValue = globalThis.localStorage.getItem(key);
  } catch {
    return errorResult(
      'STORAGE_UNAVAILABLE',
      MESSAGES.storageUnavailable,
    );
  }

  if (rawValue === null) {
    return successResult({
      items: [],
      mutationAllowed: true,
    });
  }

  let parsedValue;

  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    return successResult({
      items: [],
      mutationAllowed: false,
      warning: createWarning(
        'MALFORMED_JSON',
        MESSAGES.malformedJson,
      ),
    });
  }

  let isValid = false;

  try {
    isValid = validator(parsedValue);
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return successResult({
      items: [],
      mutationAllowed: false,
      warning: createWarning(
        'SCHEMA_INVALID',
        MESSAGES.schemaInvalid,
      ),
    });
  }

  return successResult({
    items: parsedValue,
    mutationAllowed: true,
  });
}

/**
 * Reports whether a storage exception represents an exhausted quota.
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
 * Validates, serializes, and persists a complete collection.
 *
 * Serialization finishes before browser storage is touched, and persistence
 * uses exactly one setItem call.
 *
 * @param {string} key Browser storage key.
 * @param {*} collection Candidate collection.
 * @param {(value: *) => boolean} validator Collection validator.
 * @returns {{ok: true, value: {count: number}}|{ok: false, error: object}}
 */
function writeCollection(key, collection, validator) {
  let isValid = false;

  try {
    isValid = validator(collection);
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return errorResult(
      'SCHEMA_INVALID',
      MESSAGES.schemaInvalid,
    );
  }

  let serializedValue;

  try {
    serializedValue = JSON.stringify(collection);
  } catch {
    return errorResult(
      'SERIALIZATION_FAILED',
      MESSAGES.serializationFailed,
    );
  }

  if (typeof serializedValue !== 'string') {
    return errorResult(
      'SERIALIZATION_FAILED',
      MESSAGES.serializationFailed,
    );
  }

  try {
    globalThis.localStorage.setItem(key, serializedValue);
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

  return successResult({ count: collection.length });
}

/**
 * Reads the persisted post collection with corruption diagnostics.
 *
 * @returns {{ok: true, value: {items: Array, mutationAllowed: boolean, warning?: object}}|{ok: false, error: object}}
 */
export function getPostsResult() {
  return readCollection(
    STORAGE_KEYS.posts,
    isValidPostsCollection,
  );
}

/**
 * Reads persisted posts using the compatibility contract.
 *
 * Read failures and damaged collections intentionally collapse to an empty
 * array. Call getPostsResult when diagnostics are required.
 *
 * @returns {Array}
 */
export function getPosts() {
  const result = getPostsResult();

  if (!result.ok || !result.value.mutationAllowed) {
    return [];
  }

  return result.value.items;
}

/**
 * Validates and persists the complete post collection.
 *
 * @param {*} posts Candidate post collection.
 * @returns {{ok: true, value: {count: number}}|{ok: false, error: object}}
 */
export function savePosts(posts) {
  return writeCollection(
    STORAGE_KEYS.posts,
    posts,
    isValidPostsCollection,
  );
}

/**
 * Reads the persisted user collection with corruption diagnostics.
 *
 * @returns {{ok: true, value: {items: Array, mutationAllowed: boolean, warning?: object}}|{ok: false, error: object}}
 */
export function getUsersResult() {
  return readCollection(
    STORAGE_KEYS.users,
    isValidUsersCollection,
  );
}

/**
 * Reads persisted users using the compatibility contract.
 *
 * Read failures and damaged collections intentionally collapse to an empty
 * array. Call getUsersResult when diagnostics are required.
 *
 * @returns {Array}
 */
export function getUsers() {
  const result = getUsersResult();

  if (!result.ok || !result.value.mutationAllowed) {
    return [];
  }

  return result.value.items;
}

/**
 * Validates and persists the complete user collection.
 *
 * @param {*} users Candidate user collection.
 * @returns {{ok: true, value: {count: number}}|{ok: false, error: object}}
 */
export function saveUsers(users) {
  return writeCollection(
    STORAGE_KEYS.users,
    users,
    isValidUsersCollection,
  );
}

/**
 * Deliberately replaces a post or user collection after explicit confirmation.
 *
 * This operation does not read or automatically alter a damaged source value.
 * The original stored value remains untouched if validation, serialization, or
 * persistence fails.
 *
 * @param {'posts'|'users'|*} kind Collection kind.
 * @param {*} replacement Complete replacement collection.
 * @param {boolean} confirmed Whether replacement was explicitly confirmed.
 * @returns {{ok: true, value: {count: number, repaired: true}}|{ok: false, error: object}}
 */
export function repairCollection(kind, replacement, confirmed) {
  if (confirmed !== true) {
    return errorResult(
      'VALIDATION_FAILED',
      MESSAGES.repairConfirmationRequired,
    );
  }

  let result;

  if (kind === 'posts') {
    result = savePosts(replacement);
  } else if (kind === 'users') {
    result = saveUsers(replacement);
  } else {
    return errorResult(
      'VALIDATION_FAILED',
      MESSAGES.validationFailed,
    );
  }

  if (!result.ok) {
    return result;
  }

  return successResult({
    count: result.value.count,
    repaired: true,
  });
}