import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Link,
  NavLink,
  useLocation,
} from 'react-router-dom';
import Avatar from './Avatar.jsx';
import { homeForRole } from '../utils/auth.js';
import { ROLES } from '../utils/constants.js';

const USER_LINKS = Object.freeze([
  Object.freeze({
    label: 'Blogs',
    to: '/blogs',
    end: true,
  }),
  Object.freeze({
    label: 'Write',
    to: '/write',
    end: true,
  }),
]);

const ADMIN_LINKS = Object.freeze([
  Object.freeze({
    label: 'Dashboard',
    to: '/admin',
    end: true,
  }),
  ...USER_LINKS,
  Object.freeze({
    label: 'Users',
    to: '/users',
    end: true,
  }),
]);

/**
 * Returns role-aware authenticated navigation links.
 *
 * @param {string} role Account role.
 * @returns {Array<{label: string, to: string, end: boolean}>}
 */
export function getNavigationLinks(role) {
  return role === ROLES.ADMIN
    ? ADMIN_LINKS
    : USER_LINKS;
}

/**
 * Returns Tailwind classes for an application navigation link.
 *
 * @param {object} state React Router navigation state.
 * @param {boolean} state.isActive Whether the link is active.
 * @returns {string}
 */
function navigationLinkClass({ isActive }) {
  return [
    'inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
    isActive
      ? 'bg-indigo-100 text-indigo-800'
      : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-700',
  ].join(' ');
}

/**
 * Displays persistent authenticated, role-aware application navigation.
 *
 * @param {object} props Component properties.
 * @param {object} props.session Current browser session.
 * @param {function} props.onLogout Logout action.
 * @param {string} [props.className] Additional Tailwind utility classes.
 * @returns {JSX.Element}
 */
export function Navbar({
  session,
  onLogout,
  className = '',
}) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);
  const [accountMenuOpen, setAccountMenuOpen] =
    useState(false);
  const navigationContainerRef = useRef(null);
  const accountContainerRef = useRef(null);
  const mobileButtonRef = useRef(null);
  const accountButtonRef = useRef(null);
  const links = getNavigationLinks(session.role);
  const homeDestination = homeForRole(session.role);
  const classes = [
    'sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen && !accountMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (
        mobileMenuOpen &&
        navigationContainerRef.current &&
        !navigationContainerRef.current.contains(event.target)
      ) {
        setMobileMenuOpen(false);
      }

      if (
        accountMenuOpen &&
        accountContainerRef.current &&
        !accountContainerRef.current.contains(event.target)
      ) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key !== 'Escape') {
        return;
      }

      if (accountMenuOpen) {
        setAccountMenuOpen(false);
        accountButtonRef.current?.focus();
        return;
      }

      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
        mobileButtonRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointerDown,
      );
      document.removeEventListener(
        'touchstart',
        handlePointerDown,
      );
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen, mobileMenuOpen]);

  function toggleMobileMenu() {
    setMobileMenuOpen((isOpen) => !isOpen);
    setAccountMenuOpen(false);
  }

  function toggleAccountMenu() {
    setAccountMenuOpen((isOpen) => !isOpen);
    setMobileMenuOpen(false);
  }

  function handleNavigationBlur(event) {
    if (
      navigationContainerRef.current &&
      !navigationContainerRef.current.contains(
        event.relatedTarget,
      )
    ) {
      setMobileMenuOpen(false);
    }
  }

  function handleAccountBlur(event) {
    if (
      accountContainerRef.current &&
      !accountContainerRef.current.contains(
        event.relatedTarget,
      )
    ) {
      setAccountMenuOpen(false);
    }
  }

  function handleLogout() {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    onLogout();
  }

  return (
    <header className={classes}>
      <nav
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        aria-label="Application navigation"
      >
        <div className="flex min-h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              to={homeDestination}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg text-lg font-bold text-slate-900 outline-none transition hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              aria-label="WriteSpace dashboard"
            >
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-lg text-white shadow-sm"
                aria-hidden="true"
              >
                ✍️
              </span>
              <span className="hidden sm:inline">
                WriteSpace
              </span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={navigationLinkClass}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div
              ref={navigationContainerRef}
              className="relative md:hidden"
              onBlur={handleNavigationBlur}
            >
              <button
                ref={mobileButtonRef}
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 outline-none transition hover:bg-slate-100 hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                aria-label={
                  mobileMenuOpen
                    ? 'Close navigation menu'
                    : 'Open navigation menu'
                }
                aria-expanded={mobileMenuOpen}
                aria-controls="authenticated-mobile-navigation"
                onClick={toggleMobileMenu}
              >
                <span
                  className="text-xl leading-none"
                  aria-hidden="true"
                >
                  {mobileMenuOpen ? '✕' : '☰'}
                </span>
              </button>

              {mobileMenuOpen ? (
                <div
                  id="authenticated-mobile-navigation"
                  className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                >
                  <div className="flex flex-col gap-1">
                    {links.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.end}
                        className={({ isActive }) =>
                          [
                            'flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset',
                            isActive
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-700',
                          ].join(' ')
                        }
                        onClick={() =>
                          setMobileMenuOpen(false)
                        }
                      >
                        {link.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div
              ref={accountContainerRef}
              className="relative"
              onBlur={handleAccountBlur}
            >
              <button
                ref={accountButtonRef}
                type="button"
                className="flex min-h-11 max-w-56 items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-2 text-left outline-none transition hover:border-indigo-200 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:pr-3"
                aria-label={`Account menu for ${session.displayName}`}
                aria-expanded={accountMenuOpen}
                aria-controls="authenticated-account-menu"
                aria-haspopup="menu"
                onClick={toggleAccountMenu}
              >
                <Avatar
                  role={session.role}
                  decorative
                  className="h-9 w-9 text-lg"
                />
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {session.displayName}
                  </span>
                  <span className="block truncate text-xs capitalize text-slate-500">
                    {session.role}
                  </span>
                </span>
                <span
                  className="hidden text-xs text-slate-500 sm:inline"
                  aria-hidden="true"
                >
                  {accountMenuOpen ? '▲' : '▼'}
                </span>
              </button>

              {accountMenuOpen ? (
                <div
                  id="authenticated-account-menu"
                  className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                  role="menu"
                  aria-label="Account menu"
                >
                  <div className="border-b border-slate-200 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {session.displayName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      @{session.username}
                    </p>
                    <p className="mt-1 text-xs font-medium capitalize text-indigo-700">
                      {session.role} account
                    </p>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      className="flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 outline-none transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-inset"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

Navbar.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
  className: PropTypes.string,
};

export default Navbar;