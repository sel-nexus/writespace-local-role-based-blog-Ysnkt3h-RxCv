import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom';
import LoginPage from './LoginPage.jsx';
import RegisterPage from './RegisterPage.jsx';
import {
  MESSAGES,
  ROLES,
  STORAGE_KEYS,
} from '../utils/constants.js';

const validLocalUser = Object.freeze({
  id: 'user-1',
  displayName: 'Demo User',
  username: 'demo_user',
  password: 'demo-password',
  role: ROLES.USER,
  createdAt: '2026-10-14T10:00:00.000Z',
});

/**
 * Creates a valid persisted local user.
 *
 * @param {number} index Unique user index.
 * @returns {object}
 */
function createStoredUser(index) {
  return {
    id: `user-${index}`,
    displayName: `Demo User ${index}`,
    username: `demo_user_${index}`,
    password: `demo-password-${index}`,
    role: ROLES.USER,
    createdAt: '2026-10-14T10:00:00.000Z',
  };
}

/**
 * Renders an authentication page with observable destination routes.
 *
 * @param {'/login'|'/register'} initialEntry Initial route.
 * @param {function} onSessionChanged Successful authentication callback.
 * @returns {import('@testing-library/react').RenderResult}
 */
function renderAuthenticationPage(
  initialEntry,
  onSessionChanged,
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/login"
          element={
            <LoginPage
              onSessionChanged={onSessionChanged}
            />
          }
        />
        <Route
          path="/register"
          element={
            <RegisterPage
              onSessionChanged={onSessionChanged}
            />
          }
        />
        <Route
          path="/admin"
          element={<h1>Admin destination</h1>}
        />
        <Route
          path="/blogs"
          element={<h1>Blog destination</h1>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * Completes the registration form with valid demo values.
 *
 * @param {ReturnType<typeof userEvent.setup>} user User-event controller.
 * @param {object} [overrides] Optional field values.
 * @returns {Promise<void>}
 */
async function completeRegistrationForm(
  user,
  overrides = {},
) {
  const values = {
    displayName: 'Demo Jane',
    username: 'demo_jane',
    password: 'fake-only',
    confirmPassword: 'fake-only',
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
    screen.getByLabelText(/^Password/),
    values.password,
  );
  await user.type(
    screen.getByLabelText(/^Confirm password/),
    values.confirmPassword,
  );
}

describe('Authentication pages', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('LoginPage', () => {
    it('shows accessible labels, a masked password field, and the demo privacy notice', () => {
      renderAuthenticationPage('/login', vi.fn());

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Welcome back',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^Username/),
      ).toHaveAttribute('autocomplete', 'username');
      expect(
        screen.getByLabelText(/^Password/),
      ).toHaveAttribute('type', 'password');
      expect(
        screen.getByText(MESSAGES.demoPrivacyWarning),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Register' }),
      ).toHaveAttribute('href', '/register');
    });

    it('shows exact required-field validation without invoking the session callback', async () => {
      const user = userEvent.setup();
      const onSessionChanged = vi.fn();

      renderAuthenticationPage(
        '/login',
        onSessionChanged,
      );

      await user.click(
        screen.getByRole('button', { name: 'Log in' }),
      );

      expect(
        screen.getByText(MESSAGES.validationFailed),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Username is required.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Password is required.'),
      ).toBeInTheDocument();
      expect(onSessionChanged).not.toHaveBeenCalled();
      expect(
        window.localStorage.getItem(STORAGE_KEYS.session),
      ).toBeNull();
    });

    it('shows the exact invalid-credentials failure and preserves the entered values', async () => {
      const user = userEvent.setup();
      const onSessionChanged = vi.fn();

      renderAuthenticationPage(
        '/login',
        onSessionChanged,
      );

      const usernameInput =
        screen.getByLabelText(/^Username/);
      const passwordInput =
        screen.getByLabelText(/^Password/);

      await user.type(usernameInput, 'unknown_user');
      await user.type(passwordInput, 'wrong-password');
      await user.click(
        screen.getByRole('button', { name: 'Log in' }),
      );

      expect(
        screen.getByText(MESSAGES.invalidCredentials),
      ).toBeInTheDocument();
      expect(usernameInput).toHaveValue('unknown_user');
      expect(passwordInput).toHaveValue('wrong-password');
      expect(onSessionChanged).not.toHaveBeenCalled();
      expect(
        window.localStorage.getItem(STORAGE_KEYS.session),
      ).toBeNull();
    });

    it('authenticates the default Admin, calls back once, and navigates to the Admin destination without a network request', async () => {
      const user = userEvent.setup();
      const onSessionChanged = vi.fn();
      const fetchSpy = vi.fn();

      vi.stubGlobal('fetch', fetchSpy);
      renderAuthenticationPage(
        '/login',
        onSessionChanged,
      );

      await user.type(
        screen.getByLabelText(/^Username/),
        'admin',
      );
      await user.type(
        screen.getByLabelText(/^Password/),
        'admin',
      );
      await user.click(
        screen.getByRole('button', { name: 'Log in' }),
      );

      const expectedSession = {
        userId: 'admin',
        username: 'admin',
        displayName: 'Admin',
        role: ROLES.ADMIN,
      };

      expect(
        screen.getByRole('heading', {
          name: 'Admin destination',
        }),
      ).toBeInTheDocument();
      expect(onSessionChanged).toHaveBeenCalledTimes(1);
      expect(onSessionChanged).toHaveBeenCalledWith(
        expectedSession,
      );
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.session),
        ),
      ).toEqual(expectedSession);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('authenticates a local user and navigates to the blog destination', async () => {
      const user = userEvent.setup();
      const onSessionChanged = vi.fn();

      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([validLocalUser]),
      );
      renderAuthenticationPage(
        '/login',
        onSessionChanged,
      );

      await user.type(
        screen.getByLabelText(/^Username/),
        ' DEMO_USER ',
      );
      await user.type(
        screen.getByLabelText(/^Password/),
        validLocalUser.password,
      );
      await user.click(
        screen.getByRole('button', { name: 'Log in' }),
      );

      const expectedSession = {
        userId: validLocalUser.id,
        username: validLocalUser.username,
        displayName: validLocalUser.displayName,
        role: ROLES.USER,
      };

      expect(
        screen.getByRole('heading', {
          name: 'Blog destination',
        }),
      ).toBeInTheDocument();
      expect(onSessionChanged).toHaveBeenCalledOnce();
      expect(onSessionChanged).toHaveBeenCalledWith(
        expectedSession,
      );
    });
  });

  describe('RegisterPage', () => {
    it('shows accessible labels, masked password fields, and browser-local notices', () => {
      renderAuthenticationPage('/register', vi.fn());

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Create a demo account',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/^Display name/),
      ).toBeRequired();
      expect(
        screen.getByLabelText(/^Username/),
      ).toBeRequired();
      expect(
        screen.getByLabelText(/^Password/),
      ).toHaveAttribute('type', 'password');
      expect(
        screen.getByLabelText(/^Confirm password/),
      ).toHaveAttribute('type', 'password');
      expect(
        screen.getByText(MESSAGES.demoPrivacyWarning),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'This browser supports up to 10 demo accounts, including the default Admin account.',
        ),
      ).toBeInTheDocument();
    });

    it('shows exact registration validation failures without creating an account', async () => {
      const user = userEvent.setup();
      const onSessionChanged = vi.fn();

      renderAuthenticationPage(
        '/register',
        onSessionChanged,
      );

      await user.click(
        screen.getByRole('button', {
          name: 'Create demo account',
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
        screen.getByText('Confirm your password.'),
      ).toBeInTheDocument();
      expect(onSessionChanged).not.toHaveBeenCalled();
      expect(
        window.localStorage.getItem(STORAGE_KEYS.users),
      ).toBeNull();
    });

    it('shows the exact duplicate-username failure and does not replace existing users', async () => {
      const user = userEvent.setup();
      const onSessionChanged = vi.fn();

      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify([validLocalUser]),
      );
      renderAuthenticationPage(
        '/register',
        onSessionChanged,
      );

      await completeRegistrationForm(user, {
        username: 'DEMO_USER',
      });
      await user.click(
        screen.getByRole('button', {
          name: 'Create demo account',
        }),
      );

      expect(
        screen.getByText(MESSAGES.duplicateUsername),
      ).toBeInTheDocument();
      expect(onSessionChanged).not.toHaveBeenCalled();
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([validLocalUser]);
      expect(
        window.localStorage.getItem(STORAGE_KEYS.session),
      ).toBeNull();
    });

    it('shows the exact capacity failure when nine local users already exist', async () => {
      const user = userEvent.setup();
      const onSessionChanged = vi.fn();
      const existingUsers = Array.from(
        { length: 9 },
        (_, index) => createStoredUser(index + 1),
      );

      window.localStorage.setItem(
        STORAGE_KEYS.users,
        JSON.stringify(existingUsers),
      );
      renderAuthenticationPage(
        '/register',
        onSessionChanged,
      );

      await completeRegistrationForm(user, {
        username: 'user_ten',
      });
      await user.click(
        screen.getByRole('button', {
          name: 'Create demo account',
        }),
      );

      expect(
        screen.getByText(MESSAGES.accountLimitReached),
      ).toBeInTheDocument();
      expect(onSessionChanged).not.toHaveBeenCalled();
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual(existingUsers);
      expect(
        window.localStorage.getItem(STORAGE_KEYS.session),
      ).toBeNull();
    });

    it('creates a regular account, calls back once, and navigates to blogs without a network request', async () => {
      const user = userEvent.setup();
      const onSessionChanged = vi.fn();
      const fetchSpy = vi.fn();

      vi.stubGlobal('fetch', fetchSpy);
      vi.stubGlobal('crypto', {
        randomUUID: vi.fn(() => 'generated-user-id'),
      });
      renderAuthenticationPage(
        '/register',
        onSessionChanged,
      );

      await completeRegistrationForm(user, {
        displayName: ' Demo Jane ',
        username: ' Demo_Jane ',
      });
      await user.click(
        screen.getByRole('button', {
          name: 'Create demo account',
        }),
      );

      const expectedSession = {
        userId: 'generated-user-id',
        username: 'Demo_Jane',
        displayName: 'Demo Jane',
        role: ROLES.USER,
      };

      expect(
        screen.getByRole('heading', {
          name: 'Blog destination',
        }),
      ).toBeInTheDocument();
      expect(onSessionChanged).toHaveBeenCalledTimes(1);
      expect(onSessionChanged).toHaveBeenCalledWith(
        expectedSession,
      );
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.session),
        ),
      ).toEqual(expectedSession);
      expect(
        JSON.parse(
          window.localStorage.getItem(STORAGE_KEYS.users),
        ),
      ).toEqual([
        {
          id: 'generated-user-id',
          displayName: 'Demo Jane',
          username: 'Demo_Jane',
          password: 'fake-only',
          role: ROLES.USER,
          createdAt: expect.any(String),
        },
      ]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});