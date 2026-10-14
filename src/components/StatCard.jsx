import PropTypes from 'prop-types';

const VARIANTS = Object.freeze({
  violet: Object.freeze({
    containerClass: 'border-violet-200',
    iconClass: 'bg-violet-100 text-violet-700',
    valueClass: 'text-violet-700',
  }),
  indigo: Object.freeze({
    containerClass: 'border-indigo-200',
    iconClass: 'bg-indigo-100 text-indigo-700',
    valueClass: 'text-indigo-700',
  }),
  amber: Object.freeze({
    containerClass: 'border-amber-200',
    iconClass: 'bg-amber-100 text-amber-700',
    valueClass: 'text-amber-700',
  }),
  emerald: Object.freeze({
    containerClass: 'border-emerald-200',
    iconClass: 'bg-emerald-100 text-emerald-700',
    valueClass: 'text-emerald-700',
  }),
});

/**
 * Displays an accessible administrator dashboard statistic.
 *
 * @param {object} props Component properties.
 * @param {string} props.label Statistic label.
 * @param {string|number} props.value Statistic value.
 * @param {React.ReactNode} props.icon Decorative statistic icon.
 * @param {'violet'|'indigo'|'amber'|'emerald'} [props.variant] Color variant.
 * @param {string} [props.description] Accessible supporting description.
 * @param {string} [props.className] Additional Tailwind utility classes.
 * @returns {JSX.Element}
 */
export function StatCard({
  label,
  value,
  icon,
  variant = 'indigo',
  description,
  className = '',
}) {
  const configuration =
    VARIANTS[variant] ?? VARIANTS.indigo;
  const classes = [
    'rounded-xl border bg-white p-5 shadow-sm',
    configuration.containerClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={classes}>
      <div className="flex items-start justify-between gap-4">
        <dl className="min-w-0">
          <dt className="text-sm font-semibold text-slate-600">
            {label}
          </dt>
          <dd
            className={[
              'mt-2 break-words text-3xl font-bold tracking-tight',
              configuration.valueClass,
            ].join(' ')}
          >
            {value}
          </dd>
        </dl>

        <span
          className={[
            'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl',
            configuration.iconClass,
          ].join(' ')}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>

      {description ? (
        <p className="mt-3 text-sm leading-5 text-slate-500">
          {description}
        </p>
      ) : null}
    </article>
  );
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]).isRequired,
  icon: PropTypes.node.isRequired,
  variant: PropTypes.oneOf([
    'violet',
    'indigo',
    'amber',
    'emerald',
  ]),
  description: PropTypes.string,
  className: PropTypes.string,
};

export default StatCard;