import {
  act,
  cleanup,
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import App from './App.jsx';
import {
  MESSAGES,
  ROLES,
  STORAGE_KEYS,
} from './utils/constants.js';

const userSession = Object.freeze({
  userId: 'user-1',
  username: 'demo_user',
  displayName: 'Demo User',
  role: ROLES.USER,
});

const adminSession = Object.freeze({
  userId: 'admin',
  username: 'admin',
  displayName: 'Admin',
  role: ROLES.ADMIN,
});

const storedUser = Object.freeze({
  id: userSession.userId,
  displayName: userSession.displayName,
  username: userSession.username,
  password: 'demo-password',
  role: ROLES.USER,
  createdAt: '2026-10-14T10:00:00.000Z',
});

const storedPost = Object.freeze({
  id: 'post-1',
  title: 'A routed local story',
  content: 'Browser-local content used by routing tests.',
  createdAt: '2026-10-14T10:00:00.000Z',
  authorId: userSession.userId,
  authorName: userSession.displayName,
});

/**
 * Replaces the current browser history entry before rendering BrowserRouter.
 *
 * @param {string} path Application path.
 * @returns {void}
 */
function setCurrentPath(path) {
  window.history.replaceState({}, '', path);
}

/**
 * Persists a valid session for an application integration test.
 *
 * @param {object} session Session to persist.
 * @returns {void}
 */
function storeSession(session) {
  window.localStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify(session),
  );
}

/**
 * Persists the shared valid post fixture.
 *
 * @returns {void}
 */
function storePost() {
  window.localStorage.setItem(
    STORAGE_KEYS.posts,
    JSON.stringify([storedPost]),
  );
}

/**
 * Renders the complete application at a browser path.
 *
 * @param {string} path Initial browser path.
 * @returns {import('@testing-library/react').RenderResult}
 */
function renderApplication(path) {
  setCurrentPath(path);
  return render(<App />);
}

describe('Application routing and reliability', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setCurrentPath('/');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    setCurrentPath('/');
  });

  describe('guest route guards', () => {
    it.each([
      '/blogs',
      '/blog/post-1',
      '/write',
      '/edit/post-1',
      '/admin',
      '/users',
    ])(
      'redirects a guest from %s to the login page',
      (path) => {
        storePost();
        renderApplication(path);

        expect(
          screen.getByRole('heading', {
            level: 1,
            name: 'Welcome back',
          }),
        ).toBeInTheDocument();
        expect(window.location.pathname).toBe('/login');
      },
    );

    it('keeps the public landing page available to guests', () => {
      renderApplication('/');

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Give your stories space to grow.',
        }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe('/');
    });

    it.each(['/login', '/register'])(
      'keeps the public authentication route %s available to guests',
      (path) => {
        renderApplication(path);

        expect(
          screen.getByRole('heading', {
            level: 1,
            name:
              path === '/login'
                ? 'Welcome back'
                : 'Create a demo account',
          }),
        ).toBeInTheDocument();
        expect(window.location.pathname).toBe(path);
      },
    );
  });

  describe('authenticated redirects', () => {
    it.each(['/login', '/register'])(
      'redirects a signed-in user from %s to the blog listing',
      (path) => {
        storeSession(userSession);
        renderApplication(path);

        expect(
          screen.getByRole('heading', {
            level: 1,
            name: 'Blog posts',
          }),
        ).toBeInTheDocument();
        expect(window.location.pathname).toBe('/blogs');
      },
    );

    it.each(['/login', '/register'])(
      'redirects a signed-in administrator from %s to the dashboard',
      (path) => {
        storeSession(adminSession);
        renderApplication(path);

        expect(
          screen.getByRole('heading', {
            level: 1,
            name: 'Welcome, Admin',
          }),
        ).toBeInTheDocument();
        expect(window.location.pathname).toBe('/admin');
      },
    );

    it.each(['/admin', '/users'])(
      'redirects a regular user from administrator route %s to blogs',
      (path) => {
        storeSession(userSession);
        renderApplication(path);

        expect(
          screen.getByRole('heading', {
            level: 1,
            name: 'Blog posts',
          }),
        ).toBeInTheDocument();
        expect(window.location.pathname).toBe('/blogs');
      },
    );

    it('keeps the public landing page available to a signed-in user', () => {
      storeSession(userSession);
      renderApplication('/');

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Give your stories space to grow.',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', {
          name: 'Go to dashboard',
        }),
      ).toHaveAttribute('href', '/blogs');
      expect(window.location.pathname).toBe('/');
    });
  });

  describe('authenticated route behavior', () => {
    it.each([
      {
        path: '/blogs',
        heading: 'Blog posts',
      },
      {
        path: '/blog/post-1',
        heading: storedPost.title,
      },
      {
        path: '/write',
        heading: 'Write a post',
      },
      {
        path: '/edit/post-1',
        heading: 'Edit post',
      },
    ])(
      'allows a regular user to open $path',
      ({ path, heading }) => {
        storeSession(userSession);
        storePost();
        renderApplication(path);

        expect(
          screen.getByRole('heading', {
            level: 1,
            name: heading,
          }),
        ).toBeInTheDocument();
        expect(window.location.pathname).toBe(path);
      },
    );

    it.each([
      {
        path: '/blogs',
        heading: 'Blog posts',
      },
      {
        path: '/blog/post-1',
        heading: storedPost.title,
      },
      {
        path: '/write',
        heading: 'Write a post',
      },
      {
        path: '/edit/post-1',
        heading: 'Edit post',
      },
      {
        path: '/admin',
        heading: 'Welcome, Admin',
      },
      {
        path: '/users',
        heading: 'Manage users',
      },
    ])(
      'allows an administrator to open $path',
      ({ path, heading }) => {
        storeSession(adminSession);
        storePost();
        renderApplication(path);

        expect(
          screen.getByRole('heading', {
            level: 1,
            name: heading,
          }),
        ).toBeInTheDocument();
        expect(window.location.pathname).toBe(path);
      },
    );

    it('renders the reader not-found state for an authenticated unknown post', () => {
      storeSession(userSession);
      renderApplication('/blog/missing-post');

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Post not found',
        }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe(
        '/blog/missing-post',
      );
    });

    it('renders the editor not-found state for an authenticated unknown post', () => {
      storeSession(userSession);
      renderApplication('/edit/missing-post');

      expect(
        screen.getByRole('heading', {
          level: 2,
          name: 'Post not found',
        }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe(
        '/edit/missing-post',
      );
    });
  });

  describe('ownership authorization', () => {
    it('redirects a non-owner away from a direct edit route', () => {
      const nonOwnerSession = {
        userId: 'user-2',
        username: 'other_user',
        displayName: 'Other User',
        role: ROLES.USER,
      };

      storeSession(nonOwnerSession);
      storePost();
      renderApplication(`/edit/${storedPost.id}`);

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Blog posts',
        }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe('/blogs');
      expect(
        screen.queryByRole('heading', {
          level: 1,
          name: 'Edit post',
        }),
      ).not.toBeInTheDocument();
    });

    it('allows the post owner to open the direct edit route', () => {
      storeSession(userSession);
      storePost();
      renderApplication(`/edit/${storedPost.id}`);

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Edit post',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^Title/),
      ).toHaveValue(storedPost.title);
    });

    it('allows an administrator to edit another account’s post', () => {
      storeSession(adminSession);
      storePost();
      renderApplication(`/edit/${storedPost.id}`);

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Edit post',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^Title/),
      ).toHaveValue(storedPost.title);
    });
  });

  describe('logout and session synchronization', () => {
    it('logs out to the landing page while preserving local users and posts', async () => {
      const user = userEvent.setup();

      storeSession(userSession);
      storePost();
      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([storedUser]),
      );
      renderApplication('/blogs');

      await user.click(
        screen.getByRole('button', {
          name: `Account menu for ${userSession.displayName}`,
        }),
      );
      await user.click(
        screen.getByRole('button', {
          name: 'Log out',
        }),
      );

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Give your stories space to grow.',
        }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe('/');
      expect(
        window.localStorage.getItem(STORAGE_KEYS.session),
      ).toBeNull();
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([storedUser]);
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.posts),
        ),
      ).toEqual([storedPost]);
    });

    it('clears in-memory authentication and warns when persisted logout fails', async () => {
      const user = userEvent.setup();

      storeSession(userSession);
      renderApplication('/blogs');

      vi.spyOn(
        Storage.prototype,
        'removeItem',
      ).mockImplementation(() => {
        throw new DOMException(
          'Storage access denied.',
          'SecurityError',
        );
      });

      await user.click(
        screen.getByRole('button', {
          name: `Account menu for ${userSession.displayName}`,
        }),
      );
      await user.click(
        screen.getByRole('button', {
          name: 'Log out',
        }),
      );

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Give your stories space to grow.',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(MESSAGES.logoutPersistenceFailure),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe('/');
    });

    it('redirects a protected view when another tab removes the session', () => {
      const serializedSession = JSON.stringify(userSession);

      storeSession(userSession);
      renderApplication('/blogs');

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Blog posts',
        }),
      ).toBeInTheDocument();

      window.localStorage.removeItem(STORAGE_KEYS.session);

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEYS.session,
            oldValue: serializedSession,
            newValue: null,
            storageArea: window.localStorage,
          }),
        );
      });

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Welcome back',
        }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe('/login');
    });
  });

  describe('wildcard handling', () => {
    it('shows the guest not-found page with a home action', () => {
      renderApplication('/unknown/guest/path');

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Page not found',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', {
          name: 'Return to home',
        }),
      ).toHaveAttribute('href', '/');
      expect(window.location.pathname).toBe(
        '/unknown/guest/path',
      );
    });

    it.each([
      {
        session: userSession,
        destination: '/blogs',
      },
      {
        session: adminSession,
        destination: '/admin',
      },
    ])(
      'shows a role-aware dashboard action for authenticated wildcard routes',
      ({ session, destination }) => {
        storeSession(session);
        renderApplication('/unknown/authenticated/path');

        expect(
          screen.getByRole('heading', {
            level: 1,
            name: 'Page not found',
          }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('link', {
            name: 'Return to dashboard',
          }),
        ).toHaveAttribute('href', destination);
      },
    );
  });

  describe('startup and storage reliability', () => {
    it('treats a malformed saved session as a guest and shows recovery messaging', () => {
      window.localStorage.setItem(
        STORAGE_KEYS.session,
        '{damaged-session',
      );

      renderApplication('/blogs');

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Welcome back',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(MESSAGES.malformedJson),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe('/login');
      expect(
        window.localStorage.getItem(STORAGE_KEYS.session),
      ).toBe('{damaged-session');
    });

    it('treats a schema-invalid stale session as a guest without deleting it', () => {
      const staleSession = {
        userId: '',
        username: 'removed_user',
        displayName: 'Removed User',
        role: ROLES.USER,
      };
      const serializedSession = JSON.stringify(staleSession);

      window.localStorage.setItem(
        STORAGE_KEYS.session,
        serializedSession,
      );
      renderApplication('/write');

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Welcome back',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(MESSAGES.schemaInvalid),
      ).toBeInTheDocument();
      expect(
        window.localStorage.getItem(STORAGE_KEYS.session),
      ).toBe(serializedSession);
    });

    it('shows damaged post storage messaging and does not render an empty-state mutation action', () => {
      storeSession(userSession);
      window.localStorage.setItem(
        STORAGE_KEYS.posts,
        '{damaged-posts',
      );

      renderApplication('/blogs');

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Blog posts',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(MESSAGES.malformedJson),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', {
          name: 'No posts yet',
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', {
          name: 'Write a post',
        }),
      ).not.toBeInTheDocument();
      expect(
        window.localStorage.getItem(STORAGE_KEYS.posts),
      ).toBe('{damaged-posts');
    });

    it('renders a guest experience with visible guidance when browser storage is unavailable', () => {
      vi.spyOn(
        Storage.prototype,
        'getItem',
      ).mockImplementation(() => {
        throw new DOMException(
          'Storage access denied.',
          'SecurityError',
        );
      });

      renderApplication('/');

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Give your stories space to grow.',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByText(MESSAGES.storageUnavailable).length,
      ).toBeGreaterThan(0);
    });
  });

  describe('network isolation', () => {
    it('authenticates and routes without making a runtime fetch request', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.fn();

      vi.stubGlobal('fetch', fetchSpy);
      renderApplication('/login');

      await user.type(
        screen.getByLabelText(/^Username/),
        'admin',
      );
      await user.type(
        screen.getByLabelText(/^Password/),
        'admin',
      );
      await user.click(
        screen.getByRole('button', {
          name: 'Log in',
        }),
      );

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Welcome, Admin',
        }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe('/admin');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});