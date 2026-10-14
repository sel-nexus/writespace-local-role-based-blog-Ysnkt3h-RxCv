import {
  useEffect,
  useState,
} from 'react';
import {
  BrowserRouter,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import AlertMessage from './components/AlertMessage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Home from './pages/Home.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ReadBlog from './pages/ReadBlog.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import UserManagement from './pages/UserManagement.jsx';
import WriteBlog from './pages/WriteBlog.jsx';
import {
  clearSession,
  getSessionResult,
} from './utils/auth.js';
import {
  ROLES,
  STORAGE_KEYS,
} from './utils/constants.js';

/**
 * Loads the initial browser-local session and any associated warning.
 *
 * @returns {{session: object|null, warning: object|null, warningTitle: string}}
 */
function loadInitialAuthentication() {
  const result = getSessionResult();

  if (!result.ok) {
    return {
      session: null,
      warning: result.error,
      warningTitle: 'Saved session could not be loaded',
    };
  }

  return {
    session: result.value,
    warning: result.meta?.warning ?? null,
    warningTitle: result.meta?.warning
      ? 'Saved session could not be loaded'
      : '',
  };
}

/**
 * Owns application session state and composes all route guards and pages.
 *
 * @returns {JSX.Element}
 */
function ApplicationRoutes() {
  const navigate = useNavigate();
  const [authentication, setAuthentication] = useState(
    loadInitialAuthentication,
  );

  const { session, warning, warningTitle } =
    authentication;

  useEffect(() => {
    function handleStorageChange(event) {
      if (
        event.key !== null &&
        event.key !== STORAGE_KEYS.session
      ) {
        return;
      }

      const result = getSessionResult();

      if (!result.ok) {
        setAuthentication({
          session: null,
          warning: result.error,
          warningTitle:
            'Saved session could not be loaded',
        });
        return;
      }

      setAuthentication({
        session: result.value,
        warning: result.meta?.warning ?? null,
        warningTitle: result.meta?.warning
          ? 'Saved session could not be loaded'
          : '',
      });
    }

    globalThis.addEventListener(
      'storage',
      handleStorageChange,
    );

    return () => {
      globalThis.removeEventListener(
        'storage',
        handleStorageChange,
      );
    };
  }, []);

  function handleSessionChanged(nextSession) {
    setAuthentication({
      session: nextSession,
      warning: null,
      warningTitle: '',
    });
  }

  function handleLogout() {
    const result = clearSession();

    setAuthentication({
      session: null,
      warning: result.ok ? null : result.error,
      warningTitle: result.ok
        ? ''
        : 'Logout could not be saved',
    });

    navigate('/', { replace: true });
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<LandingPage session={session} />}
        />
        <Route
          path="/login"
          element={
            <LoginPage
              session={session}
              onSessionChanged={handleSessionChanged}
            />
          }
        />
        <Route
          path="/register"
          element={
            <RegisterPage
              session={session}
              onSessionChanged={handleSessionChanged}
            />
          }
        />

        <Route element={<ProtectedRoute session={session} />}>
          <Route
            path="/blogs"
            element={
              <Home
                session={session}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/blog/:id"
            element={
              <ReadBlog
                session={session}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/write"
            element={
              <WriteBlog
                session={session}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/edit/:id"
            element={
              <WriteBlog
                session={session}
                onLogout={handleLogout}
              />
            }
          />
        </Route>

        <Route
          element={
            <ProtectedRoute
              session={session}
              requiredRole={ROLES.ADMIN}
            />
          }
        >
          <Route
            path="/admin"
            element={
              <AdminDashboard
                session={session}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/users"
            element={
              <UserManagement
                session={session}
                onLogout={handleLogout}
              />
            }
          />
        </Route>

        <Route
          path="*"
          element={<NotFoundPage session={session} />}
        />
      </Routes>

      {warning ? (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl sm:inset-x-6">
          <AlertMessage
            variant="storage"
            title={warningTitle}
            message={warning.message}
            className="shadow-lg"
          />
        </div>
      ) : null}
    </>
  );
}

/**
 * Root WriteSpace application and routing owner.
 *
 * @returns {JSX.Element}
 */
export function App() {
  return (
    <BrowserRouter>
      <ApplicationRoutes />
    </BrowserRouter>
  );
}

export default App;