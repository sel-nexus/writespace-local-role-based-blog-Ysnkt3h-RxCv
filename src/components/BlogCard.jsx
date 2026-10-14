import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import { canManagePost } from '../utils/auth.js';
import {
  CARD_ACCENTS,
  ROLES,
} from '../utils/constants.js';
import { formatDateSafe } from '../utils/domain.js';

const EXCERPT_LENGTH = 180;

/**
 * Creates a plain-text post excerpt suitable for card display.
 *
 * React escapes the returned text when rendering, so stored markup is never
 * interpreted as HTML.
 *
 * @param {*} content Candidate post content.
 * @param {number} [maximumLength] Maximum excerpt length.
 * @returns {string}
 */
export function createPostExcerpt(
  content,
  maximumLength = EXCERPT_LENGTH,
) {
  if (typeof content !== 'string') {
    return '';
  }

  const normalizedContent = content
    .replace(/\s+/g, ' ')
    .trim();

  if (
    !Number.isInteger(maximumLength) ||
    maximumLength < 1 ||
    normalizedContent.length <= maximumLength
  ) {
    return normalizedContent;
  }

  return `${normalizedContent
    .slice(0, maximumLength)
    .trimEnd()}…`;
}

/**
 * Displays a responsive post summary with detail and permitted edit actions.
 *
 * @param {object} props Component properties.
 * @param {object} props.post Post to summarize.
 * @param {number} [props.index] Collection position used for the accent color.
 * @param {object|null} [props.session] Current browser session.
 * @param {object|null} [props.currentUser] Current session alias.
 * @param {boolean} [props.canEdit] Explicit edit-permission override.
 * @param {'admin'|'user'} [props.authorRole] Author avatar role override.
 * @param {number} [props.excerptLength] Maximum excerpt length.
 * @param {string} [props.className] Additional Tailwind utility classes.
 * @returns {JSX.Element}
 */
export function BlogCard({
  post,
  index = 0,
  session = null,
  currentUser = null,
  canEdit,
  authorRole,
  excerptLength = EXCERPT_LENGTH,
  className = '',
}) {
  const activeSession = session ?? currentUser;
  const editAllowed =
    typeof canEdit === 'boolean'
      ? canEdit
      : canManagePost(activeSession, post);
  const normalizedIndex = Number.isInteger(index) ? index : 0;
  const accentIndex =
    ((normalizedIndex % CARD_ACCENTS.length) +
      CARD_ACCENTS.length) %
    CARD_ACCENTS.length;
  const accentClass = CARD_ACCENTS[accentIndex];
  const resolvedAuthorRole =
    authorRole ??
    (post.authorId === 'admin'
      ? ROLES.ADMIN
      : ROLES.USER);
  const formattedDate = formatDateSafe(post.createdAt);
  const hasValidDate =
    typeof post.createdAt === 'string' &&
    !Number.isNaN(new Date(post.createdAt).getTime());
  const excerpt = createPostExcerpt(
    post.content,
    excerptLength,
  );
  const classes = [
    'relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-t-4 border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2',
    accentClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={classes}>
      <Link
        to={`/blog/${post.id}`}
        className="absolute inset-0 z-0 rounded-lg outline-none"
        aria-label={`Read ${post.title}`}
      >
        <span className="sr-only">
          Read {post.title}
        </span>
      </Link>

      <div className="pointer-events-none relative z-10 flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Avatar
            role={resolvedAuthorRole}
            decorative
            className="h-10 w-10 text-lg"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
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

        <div className="mt-5 flex-1">
          <h2 className="break-words text-xl font-bold leading-snug text-slate-900">
            {post.title}
          </h2>
          <p className="mt-3 break-words text-sm leading-6 text-slate-600">
            {excerpt}
          </p>
        </div>

        <div className="mt-6 flex min-h-10 items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <span className="text-sm font-semibold text-indigo-700">
            Read post
            <span className="ml-1" aria-hidden="true">
              →
            </span>
          </span>

          {editAllowed ? (
            <Link
              to={`/edit/${post.id}`}
              className="pointer-events-auto relative z-20 inline-flex min-h-10 items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm outline-none transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              aria-label={`Edit ${post.title}`}
            >
              Edit
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const sessionShape = PropTypes.shape({
  userId: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  displayName: PropTypes.string.isRequired,
  role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
});

BlogCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    authorId: PropTypes.string.isRequired,
    authorName: PropTypes.string.isRequired,
  }).isRequired,
  index: PropTypes.number,
  session: sessionShape,
  currentUser: sessionShape,
  canEdit: PropTypes.bool,
  authorRole: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]),
  excerptLength: PropTypes.number,
  className: PropTypes.string,
};

export default BlogCard;