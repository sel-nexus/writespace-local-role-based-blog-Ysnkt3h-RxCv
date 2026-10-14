import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import AlertMessage from '../components/AlertMessage.jsx';
import BlogCard from '../components/BlogCard.jsx';
import Navbar from '../components/Navbar.jsx';
import { ROLES } from '../utils/constants.js';
import { getPostsResult } from '../utils/storage.js';

/**
 * Returns posts in newest-first order without mutating the source collection.
 *
 * Invalid dates sort behind valid dates while preserving their relative order.
 *
 * @param {Array<object>} posts Stored posts.
 * @returns {Array<object>}
 */
export function sortPostsNewestFirst(posts) {
  if (!Array.isArray(posts)) {
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
    .map((entry) => entry.post);
}

/**
 * Displays the authenticated browser-local blog listing.
 *
 * @param {object} props Component properties.
 * @param {object} props.session Current browser session.
 * @param {function} props.onLogout Logout action.
 * @returns {JSX.Element}
 */
export function Home({ session, onLogout }) {
  const [postsResult] = useState(() => getPostsResult());
  const posts = postsResult.ok
    ? sortPostsNewestFirst(postsResult.value.items)
    : [];
  const storageNotice = postsResult.ok
    ? postsResult.value.warning
    : postsResult.error;
  const collectionAvailable =
    postsResult.ok && postsResult.value.mutationAllowed;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-indigo-700">
                Your writing workspace
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Blog posts
              </h1>
              <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
                Browse the newest stories saved in this browser.
              </p>
            </div>

            {collectionAvailable ? (
              <Link
                to="/write"
                className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:self-auto"
              >
                Write a post
              </Link>
            ) : null}
          </div>

          {storageNotice ? (
            <AlertMessage
              variant="storage"
              title="Posts could not be loaded"
              message={storageNotice.message}
              className="mt-8"
            />
          ) : null}

          {posts.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, index) => (
                <BlogCard
                  key={post.id}
                  post={post}
                  index={index}
                  session={session}
                />
              ))}
            </div>
          ) : collectionAvailable ? (
            <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
              <span
                className="text-4xl"
                aria-hidden="true"
              >
                📝
              </span>
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                No posts yet
              </h2>
              <p className="mt-2 text-slate-600">
                Be the first to write one!
              </p>
              <Link
                to="/write"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Write a post
              </Link>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

Home.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default Home;