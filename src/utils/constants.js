export const STORAGE_KEYS = Object.freeze({
  posts: 'writespace_posts',
  users: 'writespace_users',
  session: 'writespace_session',
});

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  USER: 'user',
});

export const DEFAULT_ADMIN = Object.freeze({
  id: 'admin',
  displayName: 'Admin',
  username: 'admin',
  password: 'admin',
  role: ROLES.ADMIN,
});

export const LIMITS = Object.freeze({
  accounts: 10,
  persistedUsers: 9,
  posts: 100,
  displayName: Object.freeze({
    min: 1,
    max: 80,
  }),
  username: Object.freeze({
    min: 3,
    max: 30,
  }),
  password: Object.freeze({
    min: 1,
    max: 128,
  }),
  title: Object.freeze({
    min: 1,
    max: 150,
  }),
  content: Object.freeze({
    min: 1,
    max: 10000,
  }),
});

export const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;

export const MESSAGES = Object.freeze({
  storageUnavailable:
    'Browser storage is unavailable. Check browser privacy settings.',
  quotaExceeded:
    'Browser storage is full. Delete older local content and try again.',
  serializationFailed:
    'Local data could not be prepared for storage. Review your content and try again.',
  malformedJson:
    'Stored local data is damaged and cannot be read safely.',
  schemaInvalid:
    'Stored local data has an unsupported or damaged format.',
  validationFailed: 'Correct the highlighted fields.',
  invalidCredentials: 'Invalid username or password.',
  duplicateUsername: 'That username is already in use.',
  accountLimitReached:
    'This browser already has the maximum of 10 demo accounts.',
  postLimitReached:
    'This browser already has the maximum of 100 posts. Delete an older post before creating another.',
  unauthenticated: 'Sign in to continue.',
  forbidden: 'You do not have permission to perform this action.',
  postEditForbidden: 'You can edit only your own posts.',
  postDeleteForbidden: 'You can delete only your own posts.',
  notFound: 'The requested record was not found.',
  selfDeleteForbidden: 'You cannot delete your currently signed-in account.',
  defaultAdminProtected: 'The default Admin account cannot be deleted.',
  corruptPostsRepairRequired:
    'Stored posts are damaged. Review and confirm replacement before saving new data.',
  corruptUsersRepairRequired:
    'Stored users are damaged. Review and confirm replacement before saving new data.',
  repairConfirmationRequired:
    'Confirm that you want to replace the damaged local data.',
  logoutPersistenceFailure:
    'Could not clear the saved browser session. Close this tab or clear site data before sharing this browser.',
  demoPrivacyWarning:
    'WriteSpace is a browser-local demo. Authentication and authorization are simulated, passwords are stored as plaintext in this browser, and real credentials or sensitive content must not be entered.',
  unknownDate: 'Unknown date',
});

export const CARD_ACCENTS = Object.freeze([
  'border-violet-500',
  'border-indigo-500',
  'border-amber-500',
  'border-emerald-500',
]);

export const REFERENCE_DATE = '2026-10-14';
export const REFERENCE_DATE_ISO = '2026-10-14T00:00:00.000Z';