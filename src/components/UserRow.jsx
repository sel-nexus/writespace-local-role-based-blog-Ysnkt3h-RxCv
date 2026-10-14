import PropTypes from 'prop-types';
import Avatar from './Avatar.jsx';
import {
  DEFAULT_ADMIN,
  MESSAGES,
  ROLES,
} from '../utils/constants.js';
import { formatDateSafe } from '../utils/domain.js';

/**
 * Displays a safe date value with machine-readable markup when valid.
 *
 * @param {object} props Component properties.
 * @param {string} [props.value] Candidate ISO date value.
 * @returns {JSX.Element|string}
 */
function AccountDate({ value }) {
  const formattedDate = formatDateSafe(value);
  const hasValidDate =
    typeof value === 'string' &&
    !Number.isNaN(new Date(value).getTime());

  return hasValidDate ? (
    <time dateTime={value}>{formattedDate}</time>
  ) : (
    formattedDate
  );
}

AccountDate.propTypes = {
  value: PropTypes.string,
};

/**
 * Renders a local account as a desktop table row or mobile card.
 *
 * The mode property accepts desktop/table and mobile/card aliases. Deletion
 * controls are disabled for the virtual default administrator, the current
 * account, and while a deletion is in progress.
 *
 * @param {object} props Component properties.
 * @param {object} props.user Local or virtual account record.
 * @param {function} props.onDelete Called with the selected account ID.
 * @param {'desktop'|'table'|'mobile'|'card'} [props.mode] Record presentation.
 * @param {'desktop'|'table'|'mobile'|'card'} [props.variant] Presentation alias.
 * @param {boolean} [props.isDeleting] Whether deletion is in progress.
 * @param {boolean} [props.isCurrentUser] Whether this is the signed-in account.
 * @param {string} [props.currentUserId] Signed-in account ID.
 * @param {object|null} [props.session] Current browser session.
 * @param {boolean} [props.deleteDisabled] Explicitly disables deletion.
 * @param {string} [props.className] Additional Tailwind utility classes.
 * @returns {JSX.Element}
 */
export function UserRow({
  user,
  onDelete,
  mode,
  variant,
  isDeleting = false,
  isCurrentUser = false,
  currentUserId,
  session = null,
  deleteDisabled = false,
  className = '',
}) {
  const selectedMode = mode ?? variant ?? 'desktop';
  const mobileMode =
    selectedMode === 'mobile' || selectedMode === 'card';
  const defaultAdministrator =
    user.id === DEFAULT_ADMIN.id;
  const currentAccount =
    isCurrentUser ||
    user.id === currentUserId ||
    user.id === session?.userId;
  const deletionBlocked =
    defaultAdministrator ||
    currentAccount ||
    deleteDisabled ||
    isDeleting;
  const descriptionId = `user-${user.id}-delete-description`;
  const roleClasses =
    user.role === ROLES.ADMIN
      ? 'bg-violet-100 text-violet-800 ring-violet-600/20'
      : 'bg-indigo-100 text-indigo-800 ring-indigo-600/20';
  const disabledReason = defaultAdministrator
    ? MESSAGES.defaultAdminProtected
    : currentAccount
      ? MESSAGES.selfDeleteForbidden
      : deleteDisabled
        ? 'This account cannot be deleted.'
        : undefined;
  const buttonTitle =
    disabledReason ??
    (isDeleting
      ? `Deleting ${user.displayName}`
      : `Delete ${user.displayName}`);

  function handleDelete() {
    if (!deletionBlocked) {
      onDelete(user.id);
    }
  }

  const deleteButton = (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <button
        type="button"
        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm outline-none transition hover:border-red-300 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none"
        disabled={deletionBlocked}
        aria-label={
          isDeleting
            ? `Deleting ${user.displayName}`
            : `Delete ${user.displayName}`
        }
        aria-describedby={
          disabledReason ? descriptionId : undefined
        }
        aria-busy={isDeleting || undefined}
        title={buttonTitle}
        onClick={handleDelete}
      >
        {isDeleting ? 'Deleting…' : 'Delete'}
      </button>

      {disabledReason ? (
        <span
          id={descriptionId}
          className="sr-only"
        >
          {disabledReason}
        </span>
      ) : null}
    </div>
  );

  const identity = (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar
        role={user.role}
        decorative
        className="h-10 w-10 text-lg"
      />
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-slate-900">
          {user.displayName}
          {currentAccount ? (
            <span className="ml-2 text-xs font-medium text-indigo-700">
              You
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 break-all text-sm text-slate-500">
          @{user.username}
        </p>
      </div>
    </div>
  );

  const roleBadge = (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset',
        roleClasses,
      ].join(' ')}
    >
      {user.role}
    </span>
  );

  if (mobileMode) {
    return (
      <article
        className={[
          'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-busy={isDeleting || undefined}
      >
        <div className="flex items-start justify-between gap-3">
          {identity}
          {roleBadge}
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-sm">
          <div>
            <dt className="font-semibold text-slate-600">
              Account created
            </dt>
            <dd className="mt-1 text-slate-700">
              <AccountDate value={user.createdAt} />
            </dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-slate-100 pt-4">
          {deleteButton}
        </div>
      </article>
    );
  }

  return (
    <tr
      className={[
        'border-b border-slate-200 bg-white last:border-b-0 hover:bg-slate-50',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-busy={isDeleting || undefined}
    >
      <td className="px-4 py-4 sm:px-6">
        {identity}
      </td>
      <td className="px-4 py-4 sm:px-6">
        {roleBadge}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600 sm:px-6">
        <AccountDate value={user.createdAt} />
      </td>
      <td className="px-4 py-4 text-right sm:px-6">
        {deleteButton}
      </td>
    </tr>
  );
}

const sessionShape = PropTypes.shape({
  userId: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  displayName: PropTypes.string.isRequired,
  role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
});

UserRow.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
    createdAt: PropTypes.string,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  mode: PropTypes.oneOf([
    'desktop',
    'table',
    'mobile',
    'card',
  ]),
  variant: PropTypes.oneOf([
    'desktop',
    'table',
    'mobile',
    'card',
  ]),
  isDeleting: PropTypes.bool,
  isCurrentUser: PropTypes.bool,
  currentUserId: PropTypes.string,
  session: sessionShape,
  deleteDisabled: PropTypes.bool,
  className: PropTypes.string,
};

export default UserRow;