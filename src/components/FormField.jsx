import PropTypes from 'prop-types';

/**
 * Reusable accessible wrapper for controlled form fields.
 *
 * Textareas can be selected with as="textarea" or type="textarea", and
 * selects with as="select" or type="select".
 *
 * @param {object} props Component properties.
 * @param {string} props.id Field identifier.
 * @param {string} props.label Visible field label.
 * @param {string|number|Array<string>} props.value Controlled field value.
 * @param {function} props.onChange Controlled value change handler.
 * @param {'input'|'textarea'|'select'} [props.as] Field element.
 * @param {string} [props.type] Input type or field element alias.
 * @param {string} [props.name] Field name.
 * @param {boolean} [props.required] Whether the field is required.
 * @param {number} [props.minLength] Minimum character count.
 * @param {number} [props.maxLength] Maximum character count.
 * @param {boolean} [props.showCounter] Whether to display a character counter.
 * @param {React.ReactNode} [props.helpText] Supporting field text.
 * @param {React.ReactNode} [props.error] Associated validation error.
 * @param {Array} [props.options] Select options.
 * @param {React.ReactNode} [props.children] Select option elements.
 * @param {number} [props.rows] Textarea row count.
 * @param {string} [props.className] Wrapper utility classes.
 * @param {string} [props.inputClassName] Field utility classes.
 * @param {string} [props.textareaMinHeightClassName] Textarea minimum-height utility.
 * @returns {JSX.Element}
 */
export function FormField({
  id,
  label,
  value,
  onChange,
  as,
  type = 'text',
  name,
  required = false,
  minLength,
  maxLength,
  showCounter,
  helpText,
  error,
  options = [],
  children,
  rows = 6,
  className = '',
  inputClassName = '',
  textareaMinHeightClassName = 'min-h-40',
  ...fieldProps
}) {
  const element =
    as ??
    (type === 'textarea' || type === 'select'
      ? type
      : 'input');
  const inputType =
    element === 'input' ? type : undefined;
  const helpId = helpText ? `${id}-help` : undefined;
  const counterVisible =
    element !== 'select' &&
    (showCounter === true ||
      (showCounter !== false &&
        Number.isInteger(maxLength)));
  const counterId = counterVisible
    ? `${id}-counter`
    : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const externalDescription =
    fieldProps['aria-describedby'];
  const describedBy = [
    externalDescription,
    helpId,
    counterId,
    errorId,
  ]
    .filter(Boolean)
    .join(' ');
  const currentLength =
    typeof value === 'string'
      ? value.length
      : String(value ?? '').length;
  const baseFieldClasses = [
    'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition',
    error
      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200'
      : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200',
    'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
    element === 'textarea'
      ? textareaMinHeightClassName
      : '',
    inputClassName,
  ]
    .filter(Boolean)
    .join(' ');
  const commonProps = {
    id,
    name: name ?? id,
    value,
    onChange,
    required,
    minLength,
    maxLength,
    className: baseFieldClasses,
    'aria-required': required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    ...fieldProps,
  };

  delete commonProps['aria-describedby'];

  if (describedBy) {
    commonProps['aria-describedby'] = describedBy;
  }

  let field;

  if (element === 'textarea') {
    field = <textarea {...commonProps} rows={rows} />;
  } else if (element === 'select') {
    delete commonProps.minLength;
    delete commonProps.maxLength;

    field = (
      <select {...commonProps}>
        {children ??
          options.map((option) => {
            const normalizedOption =
              typeof option === 'string' ||
              typeof option === 'number'
                ? {
                    value: option,
                    label: String(option),
                    disabled: false,
                  }
                : option;

            return (
              <option
                key={String(normalizedOption.value)}
                value={normalizedOption.value}
                disabled={normalizedOption.disabled ?? false}
              >
                {normalizedOption.label}
              </option>
            );
          })}
      </select>
    );
  } else {
    field = <input {...commonProps} type={inputType} />;
  }

  return (
    <div
      className={['w-full', className]
        .filter(Boolean)
        .join(' ')}
    >
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-800"
      >
        {label}
        {required ? (
          <>
            <span
              className="ml-1 text-red-600"
              aria-hidden="true"
            >
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </label>

      {helpText ? (
        <p
          id={helpId}
          className="mt-1 text-sm text-slate-600"
        >
          {helpText}
        </p>
      ) : null}

      <div className="mt-2">{field}</div>

      {counterVisible ? (
        <p
          id={counterId}
          className="mt-1 text-right text-xs text-slate-500"
          aria-live="polite"
        >
          {Number.isInteger(maxLength)
            ? `${currentLength} / ${maxLength} characters`
            : `${currentLength} characters`}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          className="mt-1 text-sm font-medium text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

FormField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.string),
  ]).isRequired,
  onChange: PropTypes.func.isRequired,
  as: PropTypes.oneOf(['input', 'textarea', 'select']),
  type: PropTypes.string,
  name: PropTypes.string,
  required: PropTypes.bool,
  minLength: PropTypes.number,
  maxLength: PropTypes.number,
  showCounter: PropTypes.bool,
  helpText: PropTypes.node,
  error: PropTypes.node,
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.shape({
        value: PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.number,
        ]).isRequired,
        label: PropTypes.node.isRequired,
        disabled: PropTypes.bool,
      }),
    ]),
  ),
  children: PropTypes.node,
  rows: PropTypes.number,
  className: PropTypes.string,
  inputClassName: PropTypes.string,
  textareaMinHeightClassName: PropTypes.string,
};

export default FormField;