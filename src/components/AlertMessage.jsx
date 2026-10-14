import PropTypes from 'prop-types';

const VARIANTS = Object.freeze({
  validation: Object.freeze({
    icon: '⚠️',
    role: 'alert',
    live: 'assertive',
    containerClass:
      'border-red-200 bg-red-50 text-red-800',
    iconClass: 'text-red-600',
  }),
  storage: Object.freeze({
    icon: '⚠️',
    role: 'alert',
    live: 'assertive',
    containerClass:
      'border-rose-200 bg-rose-50 text-rose-800',
    iconClass: 'text-rose-600',
  }),
  privacy: Object.freeze({
    icon: '🔒',
    role: 'status',
    live: 'polite',
    containerClass:
      'border-amber-200 bg-amber-50 text-amber-900',
    iconClass: 'text-amber-700',
  }),
  success: Object.freeze({
    icon: '✓',
    role: 'status',
    live: 'polite',
    containerClass:
      'border-emerald-200 bg-emerald-50 text-emerald-800',
    iconClass: 'text-emerald-700',
  }),
});

/**
 * Displays accessible validation, storage, privacy, or success feedback.
 *
 * The type property is supported as an alias for variant.
 *
 * @param {object} props Component properties.
 * @param {'validation'|'storage'|'privacy'|'success'} [props.variant] Notice variant.
 * @param {'validation'|'storage'|'privacy'|'success'} [props.type] Notice variant alias.
 * @param {React.ReactNode} [props.message] Notice content.
 * @param {React.ReactNode} [props.children] Notice content alias.
 * @param {string} [props.title] Optional notice heading.
 * @param {string} [props.className] Additional Tailwind utility classes.
 * @param {string} [props.id] Element identifier.
 * @returns {JSX.Element}
 */
export function AlertMessage({
  variant,
  type,
  message,
  children,
  title,
  className = '',
  id,
}) {
  const selectedVariant = variant ?? type ?? 'validation';
  const configuration =
    VARIANTS[selectedVariant] ?? VARIANTS.validation;
  const content = message ?? children;
  const classes = [
    'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm',
    configuration.containerClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      id={id}
      className={classes}
      role={configuration.role}
      aria-live={configuration.live}
      aria-atomic="true"
    >
      <span
        className={[
          'mt-0.5 shrink-0 text-base leading-none',
          configuration.iconClass,
        ].join(' ')}
        aria-hidden="true"
      >
        {configuration.icon}
      </span>
      <div className="min-w-0">
        {title ? (
          <p className="font-semibold">{title}</p>
        ) : null}
        <div className={title ? 'mt-1' : ''}>{content}</div>
      </div>
    </div>
  );
}

AlertMessage.propTypes = {
  variant: PropTypes.oneOf([
    'validation',
    'storage',
    'privacy',
    'success',
  ]),
  type: PropTypes.oneOf([
    'validation',
    'storage',
    'privacy',
    'success',
  ]),
  message: PropTypes.node,
  children: PropTypes.node,
  title: PropTypes.string,
  className: PropTypes.string,
  id: PropTypes.string,
};

export default AlertMessage;