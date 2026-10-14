import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom';
import AdminDashboard from './AdminDashboard.jsx';
import UserManagement from './UserManagement.jsx';
import {
  MESSAGES,
  ROLES,
  STORAGE_KEYS,
} from '../utils/constants.js';

const adminSession = Object.freeze({
  userId: 'admin',
  username: 'admin',
  displayName: 'Admin',
  role: ROLES.ADMIN,
});

const persistedAdminSession = Object.freeze({
  userId: 'admin-2',
  username: 'local_admin',
  displayName: 'Local Admin',
  role: ROLES.ADMIN,
});

/**
 * Creates a valid browser-local post.
 *
 * @param {number} index Unique post index.
 * @param {object} [overrides] Post field overrides.
 * @returns {object}
 */
function createStoredPost(index, overrides = {}) {
  return {
    id: `post-${index}`,
    title: `Post ${index}`,
    content: `Browser-local content for post ${index}.`,
    createdAt: `2026-10-${String(index).padStart(2, '0')}T10:00:00.000Z`,
    authorId: 'user-1',
    authorName: 'Demo User',
    ...overrides,
  };
}

/**
 * Creates a valid persisted local account.
 *
 * @param {number} index Unique account index.
 * @param {string} [role] Account role.
 * @param {object} [overrides] Account field overrides.
 * @returns {object}
 */
function createStoredUser(
  index,
  role = ROLES.USER,
  overrides = {},
) {
  return {
    id: `user-${index}`,
    displayName: `Demo User ${index}`,
    username: `demo_user_${index}`,
    password: `demo-password-${index}`,
    role,
    createdAt: '2026-10-14T10:00:00.000Z',
    ...overrides,
  };
}

/**
 * Persists a complete post collection.
 *
 * @param {Array<object>} posts Posts to persist.
 * @returns {void}
 */
function storePosts(posts) {
  window.localStorage.setItem(
    STORAGE_KEYS.posts,
    JSON.stringify(posts),
  );
}

/**
 * Persists a complete user collection.
 *
 * @param {Array<object>} users Users to persist.
 * @returns {void}
 */
function storeUsers(users) {
  window.localStorage.setItem(
    STORAGE_KEYS.users,
    JSON.stringify(users),
  );
}

/**
 * Renders an administrator page within its required router.
 *
 * @param {'dashboard'|'users'} page Page to render.
 * @param {object} [session] Current administrator session.
 * @returns {import('@testing-library/react').RenderResult}
 */
function renderAdminPage(
  page,
  session = adminSession,
) {
  const onLogout = vi.fn();
  const initialEntry =
    page === 'dashboard' ? '/admin' : '/users';

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminDashboard
              session={session}
              onLogout={onLogout}
            />
          }
        />
        <Route
          path="/users"
          element={
            <UserManagement
              session={session}
              onLogout={onLogout}
            />
          }
        />
        <Route
          path="/blogs"
          element={<h1>Blog destination</h1>}
        />
        <Route
          path="/write"
          element={<h1>Write destination</h1>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * Returns the statistic value associated with a dashboard label.
 *
 * @param {string} label Statistic label.
 * @returns {HTMLElement}
 */
function getStatisticValue(label) {
  const labelElement = screen.getByText(label, {
    selector: 'dt',
  });
  const card = labelElement.closest('article');

  return within(card).getByText(/\S+/, {
    selector: 'dd',
  });
}

/**
 * Completes the managed-account creation form.
 *
 * @param {ReturnType<typeof userEvent.setup>} user User-event controller.
 * @param {object} [overrides] Optional field values.
 * @returns {Promise<void>}
 */
async function completeManagedAccountForm(
  user,
  overrides = {},
) {
  const values = {
    displayName: 'Demo Moderator',
    username: 'demo_moderator',
    password: 'fake-only',
    role: ROLES.ADMIN,
    ...overrides,
  };

  await user.type(
    screen.getByLabelText(/^Display name/),
    values.displayName,
  );
  await user.type(
    screen.getByLabelText(/^Username/),
    values.username,
  );
  await user.type(
    screen.getByLabelText(/^Demo password/),
    values.password,
  );
  await user.selectOptions(
    screen.getByLabelText(/^Account role/),
    values.role,
  );
}

describe('Administrator feature flows', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('AdminDashboard', () => {
    it('shows exact statistics, dashboard actions, and controls for only the five newest posts', () => {
      const posts = Array.from(
        { length: 6 },
        (_, index) => createStoredPost(index + 1),
      );
      const users = [
        createStoredUser(1),
        createStoredUser(2, ROLES.ADMIN),
      ];

      storePosts(posts);
      storeUsers(users);
      renderAdminPage('dashboard');

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Welcome, Admin',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', {
          name: 'Write a post',
        }),
      ).toHaveAttribute('href', '/write');
      expect(
        screen.getByRole('link', {
          name: 'Manage users',
        }),
      ).toHaveAttribute('href', '/users');

      expect(getStatisticValue('Total Posts')).toHaveTextContent(
        '6',
      );
      expect(getStatisticValue('Total Users')).toHaveTextContent(
        '3',
      );
      expect(getStatisticValue('Total Admins')).toHaveTextContent(
        '2',
      );
      expect(getStatisticValue('Total users')).toHaveTextContent(
        '1',
      );

      expect(
        screen.getByRole('heading', {
          name: 'Five newest posts',
        }),
      ).toBeInTheDocument();
      expect(screen.queryByText('Post 1')).not.toBeInTheDocument();

      for (let index = 2; index <= 6; index += 1) {
        expect(
          screen.getByRole('link', {
            name: `Post ${index}`,
          }),
        ).toHaveAttribute('href', `/blog/post-${index}`);
        expect(
          screen.getByRole('link', {
            name: `Read Post ${index}`,
          }),
        ).toHaveAttribute('href', `/blog/post-${index}`);
        expect(
          screen.getByRole('link', {
            name: `Edit Post ${index}`,
          }),
        ).toHaveAttribute('href', `/edit/post-${index}`);
        expect(
          screen.getByRole('button', {
            name: `Delete Post ${index}`,
          }),
        ).toBeEnabled();
      }
    });

    it('requires confirmation before deleting a recent post and updates dashboard data after approval', async () => {
      const user = userEvent.setup();
      const post = createStoredPost(1, {
        title: 'Post awaiting deletion',
      });
      const confirmSpy = vi
        .spyOn(globalThis, 'confirm')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      storePosts([post]);
      renderAdminPage('dashboard');

      const deleteButton = screen.getByRole('button', {
        name: 'Delete Post awaiting deletion',
      });

      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.posts),
        ),
      ).toEqual([post]);
      expect(deleteButton).toBeInTheDocument();

      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledTimes(2);
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.posts),
        ),
      ).toEqual([]);
      expect(
        screen.getByRole('heading', {
          name: 'No posts yet',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('"Post awaiting deletion" was deleted.'),
      ).toBeInTheDocument();
      expect(getStatisticValue('Total Posts')).toHaveTextContent(
        '0',
      );
    });

    it('shows the empty recent-post state and writing action when no posts exist', () => {
      renderAdminPage('dashboard');

      expect(
        screen.getByRole('heading', {
          name: 'No posts yet',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', {
          name: 'Write a post',
        }),
      ).toHaveAttribute('href', '/write');
      expect(getStatisticValue('Total Posts')).toHaveTextContent(
        '0',
      );
      expect(getStatisticValue('Total Users')).toHaveTextContent(
        '1',
      );
    });
  });

  describe('UserManagement', () => {
    it('renders every account in desktop and mobile presentations with role badges and protected Admin tooltips', () => {
      const localUser = createStoredUser(1);

      storeUsers([localUser]);
      renderAdminPage('users');

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Manage users',
        }),
      ).toBeInTheDocument();

      const table = screen.getByRole('table', {
        name: 'Browser-local demo accounts',
      });
      const desktopUserIdentity = within(table).getByText(
        localUser.displayName,
      );
      const desktopUserRow =
        desktopUserIdentity.closest('tr');

      expect(desktopUserRow).not.toBeNull();
      expect(
        within(desktopUserRow).getByText('user', {
          exact: true,
        }),
      ).toBeInTheDocument();

      const mobileCards = screen.getAllByRole('article');

      expect(mobileCards).toHaveLength(2);
      expect(
        mobileCards.some((card) =>
          within(card).queryByText(localUser.displayName),
        ),
      ).toBe(true);

      const defaultAdminDeleteButtons = screen.getAllByRole(
        'button',
        {
          name: 'Delete Admin',
        },
      );

      expect(defaultAdminDeleteButtons).toHaveLength(2);
      defaultAdminDeleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute(
          'title',
          MESSAGES.defaultAdminProtected,
        );
      });
    });

    it('shows managed-account validation errors without changing persisted users', async () => {
      const user = userEvent.setup();
      const existingUsers = [createStoredUser(1)];

      storeUsers(existingUsers);
      renderAdminPage('users');

      await user.click(
        screen.getByRole('button', {
          name: 'Create account',
        }),
      );

      expect(
        screen.getByText(MESSAGES.validationFailed),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Display name is required.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Username must be at least 3 characters.',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Password is required.'),
      ).toBeInTheDocument();
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual(existingUsers);
    });

    it('creates an administrator account and renders its role badge in desktop and mobile views', async () => {
      const user = userEvent.setup();

      vi.stubGlobal('crypto', {
        randomUUID: vi.fn(() => 'generated-admin-id'),
      });
      renderAdminPage('users');

      await completeManagedAccountForm(user);
      await user.click(
        screen.getByRole('button', {
          name: 'Create account',
        }),
      );

      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([
        {
          id: 'generated-admin-id',
          displayName: 'Demo Moderator',
          username: 'demo_moderator',
          password: 'fake-only',
          role: ROLES.ADMIN,
          createdAt: expect.any(String),
        },
      ]);
      expect(
        screen.getByText('"Demo Moderator" was created.'),
      ).toBeInTheDocument();

      const table = screen.getByRole('table');
      const desktopIdentity = within(table).getByText(
        'Demo Moderator',
      );
      const desktopRow = desktopIdentity.closest('tr');

      expect(
        within(desktopRow).getByText('admin', {
          exact: true,
        }),
      ).toBeInTheDocument();

      const moderatorCards = screen
        .getAllByRole('article')
        .filter((card) =>
          within(card).queryByText('Demo Moderator'),
        );

      expect(moderatorCards).toHaveLength(1);
      expect(
        within(moderatorCards[0]).getByText('admin', {
          exact: true,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^Display name/),
      ).toHaveValue('');
      expect(screen.getByLabelText(/^Username/)).toHaveValue('');
      expect(
        screen.getByLabelText(/^Demo password/),
      ).toHaveValue('');
    });

    it('rejects a normalized duplicate username without replacing existing accounts', async () => {
      const user = userEvent.setup();
      const existingUser = createStoredUser(1, ROLES.USER, {
        username: 'demo_user',
      });

      storeUsers([existingUser]);
      renderAdminPage('users');

      await completeManagedAccountForm(user, {
        username: 'DEMO_USER',
        role: ROLES.USER,
      });
      await user.click(
        screen.getByRole('button', {
          name: 'Create account',
        }),
      );

      expect(
        screen.getByText(MESSAGES.duplicateUsername),
      ).toBeInTheDocument();
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([existingUser]);
    });

    it('shows the account-capacity warning and disables account creation at ten total accounts', () => {
      const users = Array.from(
        { length: 9 },
        (_, index) => createStoredUser(index + 1),
      );

      storeUsers(users);
      renderAdminPage('users');

      expect(
        screen.getByText(MESSAGES.accountLimitReached),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          '10 of 10 available demo accounts are in use.',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: 'Create account',
        }),
      ).toBeDisabled();
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual(users);
    });

    it('prevents a persisted administrator from deleting their own account', () => {
      const persistedAdmin = createStoredUser(
        2,
        ROLES.ADMIN,
        {
          id: persistedAdminSession.userId,
          displayName: persistedAdminSession.displayName,
          username: persistedAdminSession.username,
        },
      );

      storeUsers([persistedAdmin]);
      renderAdminPage('users', persistedAdminSession);

      const selfDeleteButtons = screen.getAllByRole('button', {
        name: `Delete ${persistedAdmin.displayName}`,
      });

      expect(selfDeleteButtons).toHaveLength(2);
      selfDeleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute(
          'title',
          MESSAGES.selfDeleteForbidden,
        );
      });

      expect(
        screen.getAllByText('You', {
          exact: true,
        }),
      ).toHaveLength(2);
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([persistedAdmin]);
    });

    it('requires confirmation before deleting an account and preserves authored posts after approval', async () => {
      const user = userEvent.setup();
      const targetUser = createStoredUser(1);
      const targetPost = createStoredPost(1, {
        authorId: targetUser.id,
        authorName: targetUser.displayName,
      });
      const confirmSpy = vi
        .spyOn(globalThis, 'confirm')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      storeUsers([targetUser]);
      storePosts([targetPost]);
      renderAdminPage('users');

      const deleteButton = screen.getAllByRole('button', {
        name: `Delete ${targetUser.displayName}`,
      })[0];

      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([targetUser]);
      expect(deleteButton).toBeInTheDocument();

      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledTimes(2);
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([]);
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.posts),
        ),
      ).toEqual([targetPost]);
      expect(
        screen.queryByRole('button', {
          name: `Delete ${targetUser.displayName}`,
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(
          `"${targetUser.displayName}" was deleted. Existing posts were kept.`,
        ),
      ).toBeInTheDocument();
    });
  });
});