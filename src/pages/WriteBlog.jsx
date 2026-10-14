import {
  useEffect,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom';
import AlertMessage from '../components/AlertMessage.jsx';
import FormField from '../components/FormField.jsx';
import Navbar from '../components/Navbar.jsx';
import { canManagePost } from '../utils/auth.js';
import {
  LIMITS,
  MESSAGES,
  ROLES,
} from '../utils/constants.js';
import {
  createPost,
  updatePost,
} from '../utils/domain.js';
import { getPostsResult } from '../utils/storage.js';

const EMPTY_FIELDS = Object.freeze({
  title: '',
  content: '',
});

const STORAGE_ERROR_CODES = new Set([
  'STORAGE_UNAVAILABLE',
  'QUOTA_EXCEEDED',
  'SERIALIZATION_FAILED',
  'CORRUPT_SOURCE_REPAIR_REQUIRED',
]);

/**
 * Displays the protected post creation and editing form.
 *
 * Edit routes resolve the requested post, prefill its editable fields, and
 * enforce owner or administrator access. Failed writes preserve all controlled
 * field values.
 *
 * @param {object} props Component properties.
 * @param {object} props.session Current browser session.
 * @param {function} props.onLogout Logout action.
 * @returns {JSX.Element}
 */
export function WriteBlog({ session, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const errorContainerRef = useRef(null);
  const editing = typeof id === 'string' && id.length > 0;
  const [postsResult] = useState(() => getPostsResult());
  const posts = postsResult.ok
    ? postsResult.value.items
    : [];
  const post = editing
    ? posts.find((candidate) => candidate.id === id) ?? null
    : null;
  const storageNotice = postsResult.ok
    ? postsResult.value.warning
    : postsResult.error;
  const collectionAvailable =
    postsResult.ok && postsResult.value.mutationAllowed;
  const capacityReached =
    !editing &&
    collectionAvailable &&
    posts.length >= LIMITS.posts;
  const [fields, setFields] = useState(() =>
    post
      ? {
          title: post.title,
          content: post.content,
        }
      : EMPTY_FIELDS,
  );
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (error) {
      errorContainerRef.current?.focus();
    }
  }, [error]);

  if (
    editing &&
    !storageNotice &&
    post &&
    !canManagePost(session, post)
  ) {
    return <Navigate to="/blogs" replace />;
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;

    setFields((currentFields) => ({
      ...currentFields,
      [name]: value,
    }));

    setError((currentError) => {
      if (!currentError) {
        return null;
      }

      const remainingFieldErrors = {
        ...(currentError.fieldErrors ?? {}),
      };

      delete remainingFieldErrors[name];

      if (Object.keys(remainingFieldErrors).length === 0) {
        return null;
      }

      return {
        ...currentError,
        fieldErrors: remainingFieldErrors,
      };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting || storageNotice) {
      return;
    }

    if (capacityReached) {
      setError({
        code: 'LIMIT_REACHED',
        message: MESSAGES.postLimitReached,
        recoverable: true,
      });
      return;
    }

    setIsSubmitting(true);

    const result = editing
      ? updatePost({
          postId: id,
          title: fields.title,
          content: fields.content,
          session,
        })
      : createPost({
          title: fields.title,
          content: fields.content,
          session,
        });

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setError(null);
    navigate(result.value.redirectTo, { replace: true });
  }

  const fieldErrors = error?.fieldErrors ?? {};
  const storageFailure =
    error && STORAGE_ERROR_CODES.has(error.code);
  const cancelDestination =
    editing && post ? `/blog/${post.id}` : '/blogs';
  const formAvailable =
    !storageNotice && (!editing || post !== null);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <Link
            to={cancelDestination}
            className="inline-flex min-h-10 items-center rounded-lg px-2 py-2 text-sm font-semibold text-indigo-700 outline-none transition hover:bg-indigo-50 hover:text-indigo-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <span className="mr-2" aria-hidden="true">
              ←
            </span>
            {editing ? 'Back to post' : 'Back to posts'}
          </Link>

          <div className="mt-6">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-700">
              {editing ? 'Edit your story' : 'Create a story'}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {editing ? 'Edit post' : 'Write a post'}
            </h1>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
              {editing
                ? 'Refine your title and content, then save your changes.'
                : 'Turn an idea into a post saved in this browser.'}
            </p>
          </div>

          {storageNotice ? (
            <AlertMessage
              variant="storage"
              title={
                editing
                  ? 'Post could not be loaded'
                  : 'Posts could not be loaded'
              }
              message={storageNotice.message}
              className="mt-8"
            />
          ) : null}

          {capacityReached ? (
            <AlertMessage
              variant="validation"
              title="Post limit reached"
              message={MESSAGES.postLimitReached}
              className="mt-8"
            />
          ) : null}

          {error ? (
            <div
              ref={errorContainerRef}
              className="mt-6 outline-none"
              tabIndex={-1}
            >
              <AlertMessage
                variant={
                  storageFailure ? 'storage' : 'validation'
                }
                title={
                  storageFailure
                    ? 'Post could not be saved'
                    : editing
                      ? 'Post could not be updated'
                      : 'Post could not be published'
                }
                message={error.message}
              />
            </div>
          ) : null}

          {formAvailable ? (
            <form
              className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              noValidate
              onSubmit={handleSubmit}
            >
              <div className="space-y-6 p-5 sm:p-8">
                <FormField
                  id="post-title"
                  name="title"
                  label="Title"
                  value={fields.title}
                  onChange={handleFieldChange}
                  required
                  minLength={LIMITS.title.min}
                  maxLength={LIMITS.title.max}
                  showCounter
                  autoFocus
                  helpText="Choose a clear title for your post."
                  error={fieldErrors.title}
                />

                <FormField
                  id="post-content"
                  name="content"
                  label="Content"
                  as="textarea"
                  value={fields.content}
                  onChange={handleFieldChange}
                  required
                  minLength={LIMITS.content.min}
                  maxLength={LIMITS.content.max}
                  showCounter
                  rows={14}
                  textareaMinHeightClassName="min-h-80"
                  helpText="Write your post in plain text. Line breaks will be preserved."
                  error={fieldErrors.content}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-end sm:px-8">
                <Link
                  to={cancelDestination}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-slate-400 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
                  disabled={isSubmitting || capacityReached}
                  aria-busy={isSubmitting || undefined}
                >
                  {isSubmitting
                    ? editing
                      ? 'Saving…'
                      : 'Publishing…'
                    : editing
                      ? 'Save changes'
                      : 'Publish post'}
                </button>
              </div>
            </form>
          ) : null}

          {!storageNotice && editing && !post ? (
            <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
              <span
                className="text-4xl"
                aria-hidden="true"
              >
                📄
              </span>
              <h2 className="mt-4 text-2xl font-bold text-slate-900">
                Post not found
              </h2>
              <p className="mt-3 text-slate-600">
                The post you wanted to edit does not exist or may
                have been deleted.
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

WriteBlog.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default WriteBlog;