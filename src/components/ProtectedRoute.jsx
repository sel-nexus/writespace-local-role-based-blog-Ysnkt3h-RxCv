import PropTypes from 'prop-types';
import {
  Navigate,
  Outlet,
} from 'react-router-dom';
import { canManagePost } from '../utils/auth.js';
import { ROLES } from '../utils/constants.js';

/**
 * Guards routes by authentication, role, and optional post ownership.
 *
 * Guests are redirected to login. Accounts without the required role and
 * accounts that cannot manage the supplied post are redirected to the blog
 * listing. A null post is passed through so the destination page can render
 * its not-found state.
 *
 * @param {object} props Component properties.
 * @param {object|null} props.session Current browser session.
 * @param {'admin'|'user'} [props.requiredRole] Required account role.
 * @param {object|null} [props.post] Post requiring management permission.
 * @param {React.ReactNode} [props.children] Guarded route content.
 * @returns {JSX.Element|React.ReactNode}
 */
export function ProtectedRoute({
  session,
  requiredRole,
  post,
  children,
}) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (
    requiredRole !== undefined &&
    session.role !== requiredRole
  ) {
    return <Navigate to="/blogs" replace />;
  }

  if (
    post !== undefined &&
    post !== null &&
    !canManagePost(session, post)
  ) {
    return <Navigate to="/blogs" replace />;
  }

  return children !== undefined ? children : <Outlet />;
}

ProtectedRoute.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
  }),
  requiredRole: PropTypes.oneOf([
    ROLES.ADMIN,
    ROLES.USER,
  ]),
  post: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    content: PropTypes.string,
    createdAt: PropTypes.string,
    authorId: PropTypes.string.isRequired,
    authorName: PropTypes.string,
  }),
  children: PropTypes.node,
};

export default ProtectedRoute;