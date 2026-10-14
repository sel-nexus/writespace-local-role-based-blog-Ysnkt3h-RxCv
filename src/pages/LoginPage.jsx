import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Link,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import AlertMessage from '../components/AlertMessage.jsx';
import FormField from '../components/FormField.jsx';
import PublicNavbar from '../components/PublicNavbar.jsx';
import {
  homeForRole,
  login,
} from '../utils/auth.js';
import {
  MESSAGES,
  ROLES,
} from '../utils/constants.js';

const INITIAL_FIELDS = Object.freeze({
  username: '',
  password: '',
});

const STORAGE_ERROR_CODES = new Set([
  'STORAGE_UNAVAILABLE',
  'QUOTA_EXCEEDED',
  'SERIALIZATION_FAILED',
  'CORRUPT_SOURCE_REPAIR_REQUIRED',
]);

/**
 * Displays the simulated browser-local login form.
 *
 * @param {object} props Component properties.
 * @param {object|null} [props.session] Current browser session.
 * @param {function} props.onSessionChanged Called after successful authentication.
 * @returns {JSX.Element}
 */
export function LoginPage({
  session = null,
  onSessionChanged,
}) {
  const navigate = useNavigate();
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [error, setError] = useState(null);

  if (session) {
    return (
      <Navigate
        to={homeForRole(session.role)}
        replace
      />
    );
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;

    setFields((currentFields) => ({
      ...currentFields,
      [name]: value,
    }));

    setError((currentError) => {
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

  function handleSubmit(event) {
    event.preventDefault();

    const result = login(fields);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    onSessionChanged(result.value.session);
    navigate(result.value.redirectTo, { replace: true });
  }

  const fieldErrors = error?.fieldErrors ?? {};
  const storageFailure =
    error && STORAGE_ERROR_CODES.has(error.code);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <PublicNavbar />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <div className="text-center">
              <span
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl"
                aria-hidden="true"
              >
                🔐
              </span>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
                Welcome back
              </h1>
              <p className="mt-3 text-slate-600">
                Log in to continue to your local writing
                workspace.
              </p>
            </div>

            <AlertMessage
              variant="privacy"
              title="Demo accounts only"
              message={MESSAGES.demoPrivacyWarning}
              className="mt-6"
            />

            {error ? (
              <AlertMessage
                variant={storageFailure ? 'storage' : 'validation'}
                title={
                  storageFailure
                    ? 'Login could not be saved'
                    : 'Unable to log in'
                }
                message={error.message}
                className="mt-5"
              />
            ) : null}

            <form
              className="mt-6 space-y-5"
              noValidate
              onSubmit={handleSubmit}
            >
              <FormField
                id="login-username"
                name="username"
                label="Username"
                value={fields.username}
                onChange={handleFieldChange}
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                error={fieldErrors.username}
              />

              <FormField
                id="login-password"
                name="password"
                label="Password"
                type="password"
                value={fields.password}
                onChange={handleFieldChange}
                required
                autoComplete="current-password"
                error={fieldErrors.password}
              />

              <button
                type="submit"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-base font-semibold text-white shadow-sm outline-none transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Log in
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Need a demo account?{' '}
              <Link
                to="/register"
                className="rounded font-semibold text-indigo-700 outline-none transition hover:text-indigo-800 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Register
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-sm leading-6 text-slate-500">
            Your account and posts remain only in this browser.
          </p>
        </div>
      </main>
    </div>
  );
}

LoginPage.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
  }),
  onSessionChanged: PropTypes.func.isRequired,
};

export default LoginPage;