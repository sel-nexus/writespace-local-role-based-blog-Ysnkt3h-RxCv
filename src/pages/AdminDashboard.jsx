import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import AlertMessage from '../components/AlertMessage.jsx';
import Avatar from '../components/Avatar.jsx';
import Navbar from '../components/Navbar.jsx';
import StatCard from '../components/StatCard.jsx';
import {
  ROLES,
} from '../utils/constants.js';
import {
  deletePost,
  formatDateSafe,
  getAdminStatistics,
} from '../utils/domain.js';
import { getPostsResult } from '../utils/storage.js';

const RECENT_POST_LIMIT = 5;

const STATISTICS = Object.freeze([
  Object.freeze({
    key: 'totalPosts',
    label: 'Total Posts',
    icon: '📝',
    variant: 'violet',
    description: 'All blog posts saved in this browser.',
  }),
  Object.freeze({
    key: 'totalUsers',
    label: 'Total Users',
    icon: '👥',
    variant: 'indigo',
    description:
      'All local accounts, including the default Admin.',
  }),
  Object.freeze({
    key: 'totalAdmins',
    label: 'Total Admins',
    icon: '👑',
    variant: 'amber',
    description:
      'Administrator accounts, including the default Admin.',
  }),
  Object.freeze({
    key: 'totalRegularUsers',
    label: 'Total users',
    icon: '📖',
    variant: 'emerald',
    description: 'Regular, non-administrator local accounts.',
  }),
]);

/**
 * Returns the five newest posts without mutating the source collection.
 *
 * Invalid dates sort behind valid dates while preserving their relative
 * order.
 *
 * @param {Array<object>} posts Stored posts.
 * @param {number} [limit] Maximum number of posts to return.
 * @returns {Array<object>}
 */
export function getRecentPosts(
  posts,
  limit = RECENT_POST_LIMIT,
) {
  if (!Array.isArray(posts) || limit < 1) {
    return [];
  }

  return posts
    .map((post, index) => ({ post, index }))
    .sort((firstEntry, secondEntry) => {
      const firstTime = new Date(
        firstEntry.post.createdAt,
      ).getTime();
      const secondTime = new Date(
        secondEntry.post.createdAt,
      ).getTime();
      const safeFirstTime = Number.isNaN(firstTime)
        ? Number.NEGATIVE_INFINITY
        : firstTime;
      const safeSecondTime = Number.isNaN(secondTime)
        ? Number.NEGATIVE_INFINITY
        : secondTime;

      return (
        safeSecondTime - safeFirstTime ||
        firstEntry.index - secondEntry.index
      );
    })
    .slice(0, limit)
    .map((entry) => entry.post);
}

/**
 * Loads the locally derived dashboard statistics and recent posts.
 *
 * @returns {{statisticsResult: object, postsResult: object}}
 */
function loadDashboardData() {
  return {
    statisticsResult: getAdminStatistics(),
    postsResult: getPostsResult(),
  };
}

/**
 * Displays the administrator overview and recent-post management controls.
 *
 * @param {object} props Component properties.
 * @param {object} props.session Current administrator session.
 * @param {function} props.onLogout Logout action.
 * @returns {JSX.Element}
 */
export function AdminDashboard({ session, onLogout }) {
  const [dashboardData, setDashboardData] = useState(
    loadDashboardData,
  );
  const [deleteError, setDeleteError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [deletingPostId, setDeletingPostId] =
    useState(null);

  const { statisticsResult, postsResult } = dashboardData;
  const statistics = statisticsResult.ok
    ? statisticsResult.value
    : null;
  const posts = postsResult.ok
    ? postsResult.value.items
    : [];
  const recentPosts = getRecentPosts(posts);
  const dashboardNotice = !statisticsResult.ok
    ? statisticsResult.error
    : !postsResult.ok
      ? postsResult.error
      : postsResult.value.warning;
  const postsMutationAllowed =
    postsResult.ok && postsResult.value.mutationAllowed;

  function handleDelete(post) {
    if (
      deletingPostId !== null ||
      !postsMutationAllowed
    ) {
      return;
    }

    const confirmed = globalThis.confirm(
      `Delete "${post.title}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingPostId(post.id);
    setDeleteError(null);
    setSuccessMessage('');

    const result = deletePost({
      postId: post.id,
      session,
      confirmed: true,
    });

    if (!result.ok) {
      setDeleteError(result.error);
      setDeletingPostId(null);
      return;
    }

    setDashboardData(loadDashboardData());
    setDeletingPostId(null);
    setSuccessMessage(`"${post.title}" was deleted.`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-700 via-indigo-700 to-indigo-900 px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10">
            <div
              className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-amber-300/10 blur-2xl"
              aria-hidden="true"
            />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-indigo-200">
                  Administrator workspace
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Welcome, {session.displayName}
                </h1>
                <p className="mt-3 max-w-2xl text-lg leading-8 text-indigo-100">
                  Review browser-local activity and manage posts
                  and demo accounts from one place.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/write"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm outline-none transition hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
                >
                  Write a post
                </Link>
                <Link
                  to="/users"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
                >
                  Manage users
                </Link>
              </div>
            </div>
          </section>

          {dashboardNotice ? (
            <AlertMessage
              variant="storage"
              title="Dashboard data could not be loaded"
              message={dashboardNotice.message}
              className="mt-8"
            />
          ) : null}

          {deleteError ? (
            <AlertMessage
              variant={
                deleteError.code === 'VALIDATION_FAILED' ||
                deleteError.code === 'FORBIDDEN'
                  ? 'validation'
                  : 'storage'
              }
              title="Post could not be deleted"
              message={deleteError.message}
              className="mt-6"
            />
          ) : null}

          {successMessage ? (
            <AlertMessage
              variant="success"
              title="Post deleted"
              message={successMessage}
              className="mt-6"
            />
          ) : null}

          <section
            className="mt-10"
            aria-labelledby="dashboard-statistics-heading"
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-indigo-700">
                Local overview
              </p>
              <h2
                id="dashboard-statistics-heading"
                className="mt-2 text-2xl font-bold tracking-tight text-slate-900"
              >
                Workspace statistics
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STATISTICS.map((statistic) => (
                <StatCard
                  key={statistic.key}
                  label={statistic.label}
                  value={
                    statistics
                      ? statistics[statistic.key]
                      : '—'
                  }
                  icon={statistic.icon}
                  variant={statistic.variant}
                  description={statistic.description}
                />
              ))}
            </div>
          </section>

          <section
            className="mt-12"
            aria-labelledby="recent-posts-heading"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-indigo-700">
                  Post management
                </p>
                <h2
                  id="recent-posts-heading"
                  className="mt-2 text-2xl font-bold tracking-tight text-slate-900"
                >
                  Five newest posts
                </h2>
                <p className="mt-2 text-slate-600">
                  Review, edit, or delete the latest posts saved
                  in this browser.
                </p>
              </div>

              <Link
                to="/blogs"
                className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm outline-none transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:self-auto"
              >
                View all posts
              </Link>
            </div>

            {recentPosts.length > 0 ? (
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-200">
                  {recentPosts.map((post) => {
                    const formattedDate = formatDateSafe(
                      post.createdAt,
                    );
                    const hasValidDate =
                      typeof post.createdAt === 'string' &&
                      !Number.isNaN(
                        new Date(post.createdAt).getTime(),
                      );
                    const authorRole =
                      post.authorId === 'admin'
                        ? ROLES.ADMIN
                        : ROLES.USER;
                    const isDeleting =
                      deletingPostId === post.id;

                    return (
                      <li
                        key={post.id}
                        className="p-5 sm:p-6"
                        aria-busy={isDeleting || undefined}
                      >
                        <article className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <Link
                              to={`/blog/${post.id}`}
                              className="rounded text-lg font-bold text-slate-900 outline-none transition hover:text-indigo-700 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                            >
                              {post.title}
                            </Link>

                            <div className="mt-3 flex items-center gap-3">
                              <Avatar
                                role={authorRole}
                                decorative
                                className="h-9 w-9 text-base"
                              />
                              <div className="min-w-0">
                                <p className="break-words text-sm font-semibold text-slate-700">
                                  {post.authorName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {hasValidDate ? (
                                    <time dateTime={post.createdAt}>
                                      {formattedDate}
                                    </time>
                                  ) : (
                                    formattedDate
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
                            <Link
                              to={`/blog/${post.id}`}
                              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-slate-400 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                              aria-label={`Read ${post.title}`}
                            >
                              Read
                            </Link>
                            <Link
                              to={`/edit/${post.id}`}
                              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm outline-none transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                              aria-label={`Edit ${post.title}`}
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm outline-none transition hover:border-red-300 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none"
                              disabled={
                                deletingPostId !== null ||
                                !postsMutationAllowed
                              }
                              aria-label={
                                isDeleting
                                  ? `Deleting ${post.title}`
                                  : `Delete ${post.title}`
                              }
                              aria-busy={
                                isDeleting || undefined
                              }
                              onClick={() => handleDelete(post)}
                            >
                              {isDeleting
                                ? 'Deleting…'
                                : 'Delete'}
                            </button>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : !dashboardNotice ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
                <span
                  className="text-4xl"
                  aria-hidden="true"
                >
                  📝
                </span>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  No posts yet
                </h3>
                <p className="mt-2 text-slate-600">
                  Create the first post in this browser-local
                  workspace.
                </p>
                <Link
                  to="/write"
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  Write a post
                </Link>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

AdminDashboard.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default AdminDashboard;