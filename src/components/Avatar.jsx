import PropTypes from 'prop-types';
import { ROLES } from '../utils/constants.js';

const ADMIN_AVATAR = Object.freeze({
  icon: '👑',
  label: 'Admin avatar',
  backgroundClass: 'bg-violet-100',
  textClass: 'text-violet-700',
});

const USER_AVATAR = Object.freeze({
  icon: '📖',
  label: 'User avatar',
  backgroundClass: 'bg-indigo-100',
  textClass: 'text-indigo-700',
});

/**
 * Returns the visual and accessible avatar configuration for a role.
 *
 * Unsupported roles use the regular-user avatar.
 *
 * @param {*} role Candidate account role.
 * @returns {{icon: string, label: string, backgroundClass: string, textClass: string}}
 */
export function getAvatar(role) {
  return role === ROLES.ADMIN
    ? ADMIN_AVATAR
    : USER_AVATAR;
}

/**
 * Displays a role-specific avatar.
 *
 * Set decorative to true when nearby text already identifies the account
 * role. Otherwise, ariaLabel or label customizes the accessible name.
 *
 * @param {object} props Component properties.
 * @param {string} props.role Account role.
 * @param {string} [props.ariaLabel] Accessible avatar label.
 * @param {string} [props.label] Accessible label alias.
 * @param {boolean} [props.decorative] Whether assistive technology should ignore the avatar.
 * @param {string} [props.className] Additional Tailwind utility classes.
 * @returns {JSX.Element}
 */
function Avatar({
  role,
  ariaLabel,
  label,
  decorative = false,
  className = '',
}) {
  const avatar = getAvatar(role);
  const accessibleLabel =
    ariaLabel ?? label ?? avatar.label;
  const isDecorative =
    decorative || accessibleLabel.trim().length === 0;
  const classes = [
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl shadow-sm ring-1 ring-inset ring-black/5',
    avatar.backgroundClass,
    avatar.textClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classes}
      role={isDecorative ? undefined : 'img'}
      aria-label={isDecorative ? undefined : accessibleLabel}
      aria-hidden={isDecorative ? true : undefined}
    >
      {avatar.icon}
    </span>
  );
}

Avatar.propTypes = {
  role: PropTypes.oneOf([ROLES.ADMIN, ROLES.USER]).isRequired,
  ariaLabel: PropTypes.string,
  label: PropTypes.string,
  decorative: PropTypes.bool,
  className: PropTypes.string,
};

export default Avatar;