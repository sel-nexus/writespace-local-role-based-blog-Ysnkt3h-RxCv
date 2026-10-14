import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import AlertMessage from '../components/AlertMessage.jsx';
import BlogCard from '../components/BlogCard.jsx';
import PublicNavbar from '../components/PublicNavbar.jsx';
import { homeForRole } from '../utils/auth.js';
import {
  MESSAGES,
  ROLES,
} from '../utils/constants.js';
import { getPostsResult } from '../utils/storage.js';

const FEATURES = Object.freeze([
  Object.freeze({
    icon: '✍️',
    title: 'Write with focus',
    description:
      'Create and edit posts in a simple workspace designed to keep your ideas front and center.',
    iconClass: 'bg-violet-100 text-violet-700',
  }),
  Object.freeze({
    icon: '📚',
    title: 'Build your collection',
    description:
      'Keep up to 100 demo posts in this browser and return to your writing whenever inspiration strikes.',
    iconClass: 'bg-indigo-100 text-indigo-700',
  }),
  Object.freeze({
    icon: '🔒',
    title: 'Stay browser-local',
    description:
      'Your demo accounts and posts remain in this browser without a server, database, or synchronization.',
    iconClass: 'bg-amber-100 text-amber-700',
  }),
]);

const sessionShape = PropTypes.shape({
  userId: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  displayName: PropTypes.string.isRequired,
  role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
});

/**
 * Returns the three newest posts without mutating the stored collection.
 *
 * @param {Array<object>} posts Stored posts.
 * @returns {Array<object>}
 */
export function getLatestPosts(posts) {
  if (!Array.isArray(posts)) {
    return [];
  }

  return [...posts]
    .sort((firstPost, secondPost) => {
      const firstTime = new Date(firstPost.createdAt).getTime();
      const secondTime = new Date(secondPost.createdAt).getTime();
      const safeFirstTime = Number.isNaN(firstTime)
        ? 0
        : firstTime;
      const safeSecondTime = Number.isNaN(secondTime)
        ? 0
        : secondTime;

      return safeSecondTime - safeFirstTime;
    })
    .slice(0, 3);
}

/**
 * Displays the public WriteSpace landing experience.
 *
 * @param {object} props Component properties.
 * @param {object|null} [props.session] Current browser session.
 * @returns {JSX.Element}
 */
export function LandingPage({ session = null }) {
  const postsResult = getPostsResult();
  const posts =
    postsResult.ok ? postsResult.value.items : [];
  const latestPosts = getLatestPosts(posts);
  const storageNotice = postsResult.ok
    ? postsResult.value.warning
    : postsResult.error;
  const dashboardDestination = session
    ? homeForRole(session.role)
    : null;
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <PublicNavbar session={session} />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-700 to-indigo-900 text-white">
          <div
            className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:px-8 lg:py-32">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-widest text-indigo-200">
                Your browser-local writing workspace
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Give your stories space to grow.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-indigo-100 sm:text-xl">
                WriteSpace is a simple demo workspace for
                writing, publishing, and managing blog posts
                directly in your browser.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {session ? (
                  <>
                    <Link
                      to={dashboardDestination}
                      className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-indigo-700 shadow-sm outline-none transition hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
                    >
                      Go to dashboard
                    </Link>
                    <Link
                      to="/write"
                      className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/40 bg-white/10 px-6 py-3 text-base font-semibold text-white shadow-sm outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
                    >
                      Write a post
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-indigo-700 shadow-sm outline-none transition hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
                    >
                      Create a demo account
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/40 bg-white/10 px-6 py-3 text-base font-semibold text-white shadow-sm outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
                    >
                      Log in
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="mx-auto w-full max-w-lg lg:ml-auto">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur sm:p-7">
                <div className="rounded-xl bg-white p-5 text-slate-900 shadow-lg sm:p-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-xl"
                      aria-hidden="true"
                    >
                      ✍️
                    </span>
                    <div>
                      <p className="font-bold">A space for ideas</p>
                      <p className="text-sm text-slate-500">
                        Write, refine, and publish locally
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-5">
                    <div className="h-4 w-3/4 rounded-full bg-slate-200" />
                    <div className="h-3 w-full rounded-full bg-slate-100" />
                    <div className="h-3 w-11/12 rounded-full bg-slate-100" />
                    <div className="h-3 w-4/5 rounded-full bg-slate-100" />
                  </div>
                  <div className="mt-6 flex justify-end">
                    <span className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                      Publish
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-24 bg-white py-16 sm:py-20"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-indigo-700">
                Simple by design
              </p>
              <h2
                id="features-heading"
                className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
              >
                Everything you need to start writing
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Explore a lightweight blogging workflow without
                setting up a server or database.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span
                    className={[
                      'inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl',
                      feature.iconClass,
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {feature.icon}
                  </span>
                  <h3 className="mt-5 text-xl font-bold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-3 leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="latest-posts"
          className="scroll-mt-24 py-16 sm:py-20"
          aria-labelledby="latest-posts-heading"
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-indigo-700">
                  From the workspace
                </p>
                <h2
                  id="latest-posts-heading"
                  className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
                >
                  Latest posts
                </h2>
                <p className="mt-3 max-w-2xl text-lg text-slate-600">
                  Read the newest stories saved in this browser.
                </p>
              </div>

              {session ? (
                <Link
                  to="/blogs"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm outline-none transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:self-auto"
                >
                  View all posts
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

            {latestPosts.length > 0 ? (
              <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {latestPosts.map((post, index) => (
                  <BlogCard
                    key={post.id}
                    post={post}
                    index={index}
                    session={session}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
                <span
                  className="text-4xl"
                  aria-hidden="true"
                >
                  📝
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  No posts yet
                </h3>
                <p className="mt-2 text-slate-600">
                  Be the first to write one!
                </p>
                <Link
                  to={session ? '/write' : '/register'}
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  {session
                    ? 'Write the first post'
                    : 'Create a demo account'}
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-lg text-lg font-bold text-white outline-none transition hover:text-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                aria-label="WriteSpace home"
              >
                <span aria-hidden="true">✍️</span>
                WriteSpace
              </Link>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                {MESSAGES.demoPrivacyWarning}
              </p>
            </div>

            <nav
              className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold"
              aria-label="Footer navigation"
            >
              <a
                href="#features"
                className="rounded text-slate-300 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Features
              </a>
              <a
                href="#latest-posts"
                className="rounded text-slate-300 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Latest posts
              </a>
              {session ? (
                <>
                  <Link
                    to={dashboardDestination}
                    className="rounded text-slate-300 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/write"
                    className="rounded text-slate-300 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    Write
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="rounded text-slate-300 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="rounded text-slate-300 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="mt-8 border-t border-slate-700 pt-6 text-sm text-slate-400">
            <p>
              © {currentYear} WriteSpace. Browser-local demo
              workspace.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

LandingPage.propTypes = {
  session: sessionShape,
};

export default LandingPage;