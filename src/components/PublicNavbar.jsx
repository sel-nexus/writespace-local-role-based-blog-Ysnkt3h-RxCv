import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import { homeForRole } from '../utils/auth.js';
import { ROLES } from '../utils/constants.js';

/**
 * Displays public navigation with guest actions or signed-in identity.
 *
 * @param {object} props Component properties.
 * @param {object|null} [props.session] Current browser session.
 * @param {string} [props.className] Additional Tailwind utility classes.
 * @returns {JSX.Element}
 */
export function PublicNavbar({
  session = null,
  className = '',
}) {
  const dashboardDestination = session
    ? homeForRole(session.role)
    : null;
  const classes = [
    'sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={classes}>
      <nav
        className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8"
        aria-label="Public navigation"
      >
        <Link
          to="/"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg text-lg font-bold text-slate-900 outline-none transition hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          aria-label="WriteSpace home"
        >
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-lg text-white shadow-sm"
            aria-hidden="true"
          >
            ✍️
          </span>
          <span className="hidden sm:inline">WriteSpace</span>
        </Link>

        {session ? (
          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar
                role={session.role}
                decorative
                className="h-9 w-9 text-lg"
              />
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {session.displayName}
                </p>
                <p className="truncate text-xs capitalize text-slate-500">
                  {session.role}
                </p>
              </div>
            </div>

            <Link
              to={dashboardDestination}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:px-4"
            >
              Dashboard
            </Link>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition hover:bg-slate-100 hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:px-4"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:px-4"
            >
              Register
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}

PublicNavbar.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
  }),
  className: PropTypes.string,
};

export default PublicNavbar;