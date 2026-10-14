import {
  useEffect,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import AlertMessage from '../components/AlertMessage.jsx';
import FormField from '../components/FormField.jsx';
import Navbar from '../components/Navbar.jsx';
import UserRow from '../components/UserRow.jsx';
import {
  DEFAULT_ADMIN,
  LIMITS,
  MESSAGES,
  ROLES,
} from '../utils/constants.js';
import {
  createManagedUser,
  deleteManagedUser,
} from '../utils/domain.js';
import { getUsersResult } from '../utils/storage.js';

const INITIAL_FIELDS = Object.freeze({
  displayName: '',
  username: '',
  password: '',
  role: ROLES.USER,
});

const ROLE_OPTIONS = Object.freeze([
  Object.freeze({
    value: ROLES.USER,
    label: 'User',
  }),
  Object.freeze({
    value: ROLES.ADMIN,
    label: 'Admin',
  }),
]);

const STORAGE_ERROR_CODES = new Set([
  'STORAGE_UNAVAILABLE',
  'QUOTA_EXCEEDED',
  'SERIALIZATION_FAILED',
  'CORRUPT_SOURCE_REPAIR_REQUIRED',
]);

/**
 * Loads the persisted local account collection.
 *
 * @returns {object} Structured users result.
 */
function loadUsers() {
  return getUsersResult();
}

/**
 * Displays administrator-only browser-local account management.
 *
 * @param {object} props Component properties.
 * @param {object} props.session Current administrator session.
 * @param {function} props.onLogout Logout action.
 * @returns {JSX.Element}
 */
export function UserManagement({ session, onLogout }) {
  const feedbackRef = useRef(null);
  const [usersResult, setUsersResult] = useState(loadUsers);
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [createError, setCreateError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [deletingUserId, setDeletingUserId] =
    useState(null);

  const persistedUsers = usersResult.ok
    ? usersResult.value.items
    : [];
  const storageNotice = usersResult.ok
    ? usersResult.value.warning
    : usersResult.error;
  const mutationAllowed =
    usersResult.ok && usersResult.value.mutationAllowed;
  const capacityReached =
    mutationAllowed &&
    persistedUsers.length >= LIMITS.persistedUsers;
  const accounts = [DEFAULT_ADMIN, ...persistedUsers];
  const fieldErrors = createError?.fieldErrors ?? {};
  const createStorageFailure =
    createError &&
    STORAGE_ERROR_CODES.has(createError.code);
  const deleteStorageFailure =
    deleteError &&
    STORAGE_ERROR_CODES.has(deleteError.code);

  useEffect(() => {
    if (createError || deleteError) {
      feedbackRef.current?.focus();
    }
  }, [createError, deleteError]);

  function handleFieldChange(event) {
    const { name, value } = event.target;

    setFields((currentFields) => ({
      ...currentFields,
      [name]: value,
    }));
    setSuccessMessage('');

    setCreateError((currentError) => {
      if (!currentError) {
        return null;
      }

      const remainingFieldErrors = {
        ...(currentError.fieldErrors ?? {}),
      };

      delete remainingFieldErrors[name];

      if (Object.keys(remainingFieldErrors).length === 0) {
        return null;
      }

      return {
        ...currentError,
        fieldErrors: remainingFieldErrors,
      };
    });
  }

  function handleCreate(event) {
    event.preventDefault();

    if (!mutationAllowed || capacityReached) {
      if (capacityReached) {
        setCreateError({
          code: 'LIMIT_REACHED',
          message: MESSAGES.accountLimitReached,
          recoverable: true,
        });
      }

      return;
    }

    setCreateError(null);
    setDeleteError(null);
    setSuccessMessage('');

    const result = createManagedUser(fields, session);

    if (!result.ok) {
      setCreateError(result.error);
      return;
    }

    const refreshedUsers = loadUsers();

    setUsersResult(refreshedUsers);
    setFields(INITIAL_FIELDS);
    setSuccessMessage(
      `"${fields.displayName.trim()}" was created.`,
    );
  }

  function handleDelete(userId) {
    if (
      deletingUserId !== null ||
      !mutationAllowed
    ) {
      return;
    }

    const user = accounts.find(
      (candidate) => candidate.id === userId,
    );

    if (!user) {
      return;
    }

    const confirmed = globalThis.confirm(
      `Delete "${user.displayName}"? Their account will be removed from this browser. Existing posts will remain. This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingUserId(userId);
    setCreateError(null);
    setDeleteError(null);
    setSuccessMessage('');

    const result = deleteManagedUser(
      userId,
      session,
      true,
    );

    if (!result.ok) {
      setDeleteError(result.error);
      setDeletingUserId(null);
      return;
    }

    setUsersResult(loadUsers());
    setDeletingUserId(null);
    setSuccessMessage(
      `"${user.displayName}" was deleted. Existing posts were kept.`,
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-700">
              Administrator workspace
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Manage users
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
              Create and remove demo accounts stored only in
              this browser. The built-in Admin account is always
              protected.
            </p>
          </div>

          <AlertMessage
            variant="privacy"
            title="Browser-local demo accounts"
            message={MESSAGES.demoPrivacyWarning}
            className="mt-8"
          />

          {storageNotice ? (
            <AlertMessage
              variant="storage"
              title="Accounts could not be loaded"
              message={storageNotice.message}
              className="mt-6"
            />
          ) : null}

          {capacityReached ? (
            <AlertMessage
              variant="validation"
              title="Account limit reached"
              message={MESSAGES.accountLimitReached}
              className="mt-6"
            />
          ) : null}

          {createError || deleteError ? (
            <div
              ref={feedbackRef}
              className="mt-6 outline-none"
              tabIndex={-1}
            >
              {createError ? (
                <AlertMessage
                  variant={
                    createStorageFailure
                      ? 'storage'
                      : 'validation'
                  }
                  title={
                    createStorageFailure
                      ? 'Account could not be saved'
                      : 'Account could not be created'
                  }
                  message={createError.message}
                />
              ) : (
                <AlertMessage
                  variant={
                    deleteStorageFailure
                      ? 'storage'
                      : 'validation'
                  }
                  title="Account could not be deleted"
                  message={deleteError.message}
                />
              )}
            </div>
          ) : null}

          {successMessage ? (
            <AlertMessage
              variant="success"
              title="Account management updated"
              message={successMessage}
              className="mt-6"
            />
          ) : null}

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)] lg:items-start">
            <section
              aria-labelledby="local-accounts-heading"
              className="min-w-0"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2
                    id="local-accounts-heading"
                    className="text-2xl font-bold tracking-tight text-slate-900"
                  >
                    Local accounts
                  </h2>
                  <p className="mt-2 text-slate-600">
                    {accounts.length} of {LIMITS.accounts}{' '}
                    available demo accounts are in use.
                  </p>
                </div>

                <span className="inline-flex self-start rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-800 sm:self-auto">
                  {persistedUsers.length} saved locally
                </span>
              </div>

              <div className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <caption className="sr-only">
                      Browser-local demo accounts
                    </caption>
                    <thead className="bg-slate-100">
                      <tr>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6"
                        >
                          Account
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6"
                        >
                          Role
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6"
                        >
                          Account created
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6"
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((user) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          mode="desktop"
                          session={session}
                          onDelete={handleDelete}
                          isDeleting={
                            deletingUserId === user.id
                          }
                          deleteDisabled={
                            !mutationAllowed ||
                            deletingUserId !== null
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 space-y-4 sm:hidden">
                {accounts.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    mode="mobile"
                    session={session}
                    onDelete={handleDelete}
                    isDeleting={deletingUserId === user.id}
                    deleteDisabled={
                      !mutationAllowed ||
                      deletingUserId !== null
                    }
                  />
                ))}
              </div>
            </section>

            <section
              aria-labelledby="create-account-heading"
              className="rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 bg-gradient-to-br from-violet-50 to-indigo-50 px-5 py-6 sm:px-6">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-xl"
                  aria-hidden="true"
                >
                  👤
                </span>
                <h2
                  id="create-account-heading"
                  className="mt-4 text-xl font-bold text-slate-900"
                >
                  Create an account
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Add a regular user or another administrator to
                  this browser.
                </p>
              </div>

              {mutationAllowed ? (
                <form
                  className="space-y-5 p-5 sm:p-6"
                  noValidate
                  onSubmit={handleCreate}
                >
                  <FormField
                    id="managed-display-name"
                    name="displayName"
                    label="Display name"
                    value={fields.displayName}
                    onChange={handleFieldChange}
                    required
                    minLength={LIMITS.displayName.min}
                    maxLength={LIMITS.displayName.max}
                    autoComplete="off"
                    helpText="This name appears beside the account’s posts."
                    error={fieldErrors.displayName}
                  />

                  <FormField
                    id="managed-username"
                    name="username"
                    label="Username"
                    value={fields.username}
                    onChange={handleFieldChange}
                    required
                    minLength={LIMITS.username.min}
                    maxLength={LIMITS.username.max}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    helpText="Use 3–30 letters, numbers, or underscores. Admin is reserved."
                    error={fieldErrors.username}
                  />

                  <FormField
                    id="managed-password"
                    name="password"
                    label="Demo password"
                    type="password"
                    value={fields.password}
                    onChange={handleFieldChange}
                    required
                    minLength={LIMITS.password.min}
                    maxLength={LIMITS.password.max}
                    autoComplete="new-password"
                    helpText="Use a fake password only. It is stored as plaintext in this browser."
                    error={fieldErrors.password}
                  />

                  <FormField
                    id="managed-role"
                    name="role"
                    label="Account role"
                    as="select"
                    value={fields.role}
                    onChange={handleFieldChange}
                    required
                    options={ROLE_OPTIONS}
                    helpText="Admins can manage every post and local account."
                    error={fieldErrors.role}
                  />

                  <button
                    type="submit"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-base font-semibold text-white shadow-sm outline-none transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
                    disabled={capacityReached}
                  >
                    Create account
                  </button>
                </form>
              ) : (
                <div className="p-5 sm:p-6">
                  <p className="text-sm leading-6 text-slate-600">
                    Account creation is unavailable until the
                    browser-local user data can be read safely.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

UserManagement.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default UserManagement;