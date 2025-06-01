import { useRef } from 'react';
import { useTextField } from 'react-aria';
import type { AriaTextFieldProps } from 'react-aria';

interface InputProps extends AriaTextFieldProps {
  className?: string;
  error?: string;
}

export const Input = ({
  label,
  error,
  className = '',
  isDisabled,
  isRequired,
  ...props
}: InputProps) => {
  const ref = useRef<HTMLInputElement>(null);
  const { labelProps, inputProps, errorMessageProps } = useTextField(
    {
      ...props,
      isDisabled,
      isRequired,
      validationState: error ? 'invalid' : 'valid',
      errorMessage: error,
    },
    ref
  );

  return (
    <div className="w-full">
      {label && (
        <label
          {...labelProps}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {isRequired && (
            <span className="text-red-500 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      <input
        {...inputProps}
        ref={ref}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          ${className}
        `}
      />
      {error && (
        <p
          {...errorMessageProps}
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

Input.displayName = 'Input';
