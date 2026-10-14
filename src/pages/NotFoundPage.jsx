import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar.jsx';
import { homeForRole } from '../utils/auth.js';
import { ROLES } from '../utils/constants.js';

/**
 * Displays an accessible fallback for unknown application routes.
 *
 * Guests can return to the public landing page. Signed-in accounts can return
 * to their role-appropriate workspace home.
 *
 * @param {object} props Component properties.
 * @param {object|null} [props.session] Current browser session.
 * @returns {JSX.Element}
 */
export function NotFoundPage({ session = null }) {
  const destination = session
    ? homeForRole(session.role)
    : '/';
  const destinationLabel = session
    ? 'Return to dashboard'
    : 'Return to home';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <PublicNavbar session={session} />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <section
          className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-lg sm:px-10 sm:py-16"
          aria-labelledby="not-found-heading"
        >
          <span
            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-3xl"
            aria-hidden="true"
          >
            🧭
          </span>

          <p className="mt-6 text-sm font-bold uppercase tracking-widest text-indigo-700">
            Error 404
          </p>
          <h1
            id="not-found-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Page not found
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-slate-600">
            The page you requested does not exist or may have
            moved.
          </p>

          <Link
            to={destination}
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            {destinationLabel}
          </Link>
        </section>
      </main>
    </div>
  );
}

NotFoundPage.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
  }),
};

export default NotFoundPage;