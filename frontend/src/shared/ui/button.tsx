import { useRef } from 'react';
import { useButton } from 'react-aria';
import type { AriaButtonProps } from 'react-aria';

interface ButtonProps extends AriaButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  className = '',
  isDisabled,
  ...props
}: ButtonProps) => {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps, isPressed } = useButton({ isDisabled, ...props }, ref);

  const baseStyles =
    'font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 pressed:bg-blue-800',
    secondary:
      'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500 pressed:bg-gray-400',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 pressed:bg-red-800',
  };

  const sizeStyles = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  const disabledStyles = isDisabled ? 'opacity-50 cursor-not-allowed' : '';
  const pressedStyles = isPressed ? 'scale-95' : '';

  return (
    <button
      {...buttonProps}
      ref={ref}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${pressedStyles} ${className}`}
    >
      {children}
    </button>
  );
};
