import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import AlertMessage from '../components/AlertMessage.jsx';
import Avatar from '../components/Avatar.jsx';
import Navbar from '../components/Navbar.jsx';
import { canManagePost } from '../utils/auth.js';
import {
  ROLES,
} from '../utils/constants.js';
import {
  deletePost,
  formatDateSafe,
} from '../utils/domain.js';
import { getPostsResult } from '../utils/storage.js';

/**
 * Displays an authenticated full-post reader with permitted management
 * controls.
 *
 * @param {object} props Component properties.
 * @param {object} props.session Current browser session.
 * @param {function} props.onLogout Logout action.
 * @returns {JSX.Element}
 */
export function ReadBlog({ session, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [postsResult] = useState(() => getPostsResult());
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const post = postsResult.ok
    ? postsResult.value.items.find(
        (candidate) => candidate.id === id,
      ) ?? null
    : null;
  const storageNotice = postsResult.ok
    ? postsResult.value.warning
    : postsResult.error;
  const canManage = post
    ? canManagePost(session, post)
    : false;

  function handleDelete() {
    if (!post || !canManage || isDeleting) {
      return;
    }

    const confirmed = globalThis.confirm(
      `Delete "${post.title}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    const result = deletePost({
      postId: post.id,
      session,
      confirmed: true,
    });

    if (!result.ok) {
      setDeleteError(result.error);
      setIsDeleting(false);
      return;
    }

    navigate(result.value.redirectTo, { replace: true });
  }

  const formattedDate = post
    ? formatDateSafe(post.createdAt)
    : '';
  const hasValidDate =
    post !== null &&
    typeof post.createdAt === 'string' &&
    !Number.isNaN(new Date(post.createdAt).getTime());
  const authorRole =
    post?.authorId === 'admin'
      ? ROLES.ADMIN
      : ROLES.USER;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <Link
            to="/blogs"
            className="inline-flex min-h-10 items-center rounded-lg px-2 py-2 text-sm font-semibold text-indigo-700 outline-none transition hover:bg-indigo-50 hover:text-indigo-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <span className="mr-2" aria-hidden="true">
              ←
            </span>
            Back to posts
          </Link>

          {storageNotice ? (
            <AlertMessage
              variant="storage"
              title="Post could not be loaded"
              message={storageNotice.message}
              className="mt-6"
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

          {!storageNotice && post ? (
            <article className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-5 py-8 sm:px-8 sm:py-10">
                <p className="text-sm font-bold uppercase tracking-widest text-indigo-700">
                  Blog post
                </p>
                <h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {post.title}
                </h1>

                <div className="mt-6 flex items-center gap-3">
                  <Avatar
                    role={authorRole}
                    decorative
                    className="h-11 w-11 text-xl"
                  />
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900">
                      {post.authorName}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
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
              </header>

              <div className="px-5 py-8 sm:px-8 sm:py-10">
                <div className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700 sm:text-lg">
                  {post.content}
                </div>
              </div>

              <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <Link
                  to="/blogs"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-slate-400 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  Back to posts
                </Link>

                {canManage ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      to={`/edit/${post.id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm outline-none transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                      Edit post
                    </Link>
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm outline-none transition hover:border-red-300 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none"
                      disabled={isDeleting}
                      aria-busy={isDeleting || undefined}
                      onClick={handleDelete}
                    >
                      {isDeleting ? 'Deleting…' : 'Delete post'}
                    </button>
                  </div>
                ) : null}
              </footer>
            </article>
          ) : null}

          {!storageNotice && !post ? (
            <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
              <span
                className="text-4xl"
                aria-hidden="true"
              >
                📄
              </span>
              <h1 className="mt-4 text-2xl font-bold text-slate-900">
                Post not found
              </h1>
              <p className="mt-3 text-slate-600">
                The requested post does not exist or may have
                been deleted.
              </p>
              <Link
                to="/blogs"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                View all posts
              </Link>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}

ReadBlog.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default ReadBlog;