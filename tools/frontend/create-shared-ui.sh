#!/bin/bash

# Frontend Shared UI Component Boilerplate Generator
# Usage: ./create-shared-ui.sh <component-name> [component-type]

COMPONENT_NAME=$1
COMPONENT_TYPE=${2:-"generic"}  # generic, form, layout, feedback

if [ -z "$COMPONENT_NAME" ]; then
    echo "Usage: $0 <component-name> [component-type]"
    echo "Component types: generic, form, layout, feedback"
    echo "Example: $0 modal layout"
    echo "Example: $0 text-field form"
    echo "Example: $0 alert feedback"
    exit 1
fi

# Convert component name to PascalCase
PASCAL_CASE_NAME=$(echo "$COMPONENT_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')

# Create shared UI directory
UI_DIR="frontend/src/shared/ui"
mkdir -p "$UI_DIR"

# Generate component based on type
case "$COMPONENT_TYPE" in
    "form")
        # Form component template
        cat > "$UI_DIR/${COMPONENT_NAME}.tsx" << EOF
import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

export interface ${PASCAL_CASE_NAME}Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const ${PASCAL_CASE_NAME} = forwardRef<HTMLInputElement, ${PASCAL_CASE_NAME}Props>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || \`${COMPONENT_NAME}-\${Math.random().toString(36).substr(2, 9)}\`;
    
    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            error
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? \`\${inputId}-error\` : helperText ? \`\${inputId}-helper\` : undefined}
          {...props}
        />
        {error && (
          <p id={\`\${inputId}-error\`} className="text-sm text-red-600">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={\`\${inputId}-helper\`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

${PASCAL_CASE_NAME}.displayName = '${PASCAL_CASE_NAME}';
EOF
        ;;
        
    "layout")
        # Layout component template
        cat > "$UI_DIR/${COMPONENT_NAME}.tsx" << EOF
import { FC, ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

export interface ${PASCAL_CASE_NAME}Props {
  children: ReactNode;
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
}

export const ${PASCAL_CASE_NAME}: FC<${PASCAL_CASE_NAME}Props> = ({
  children,
  className,
  isOpen = true,
  onClose,
  title,
  size = 'medium',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    full: 'max-w-full',
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Content */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div 
          className={cn(
            'bg-white rounded-lg shadow-xl w-full',
            sizeClasses[size],
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? '${COMPONENT_NAME}-title' : undefined}
        >
          {title && (
            <div className="border-b px-6 py-4">
              <h2 id="${COMPONENT_NAME}-title" className="text-lg font-semibold">
                {title}
              </h2>
            </div>
          )}
          
          <div className="p-6">
            {children}
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
EOF
        ;;
        
    "feedback")
        # Feedback component template
        cat > "$UI_DIR/${COMPONENT_NAME}.tsx" << EOF
import { FC, ReactNode, useEffect, useState } from 'react';
import { cn } from '@/shared/lib/utils';

export interface ${PASCAL_CASE_NAME}Props {
  children: ReactNode;
  className?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  dismissible?: boolean;
  autoClose?: number;
  onClose?: () => void;
}

export const ${PASCAL_CASE_NAME}: FC<${PASCAL_CASE_NAME}Props> = ({
  children,
  className,
  variant = 'info',
  dismissible = false,
  autoClose,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose && autoClose > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoClose);
      
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  if (!isVisible) return null;

  const variantClasses = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    error: 'bg-red-50 text-red-800 border-red-200',
  };

  const iconPaths = {
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <div
      className={cn(
        'flex items-start p-4 border rounded-lg',
        variantClasses[variant],
        className
      )}
      role="alert"
    >
      <svg
        className="flex-shrink-0 w-5 h-5 mr-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={iconPaths[variant]}
        />
      </svg>
      
      <div className="flex-1">{children}</div>
      
      {dismissible && (
        <button
          onClick={handleClose}
          className="flex-shrink-0 ml-3 -mr-1 -mt-1 p-1 rounded hover:bg-black hover:bg-opacity-10"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
EOF
        ;;
        
    *)
        # Generic component template
        cat > "$UI_DIR/${COMPONENT_NAME}.tsx" << EOF
import { FC, HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/lib/utils';

export interface ${PASCAL_CASE_NAME}Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
}

export const ${PASCAL_CASE_NAME} = forwardRef<HTMLDivElement, ${PASCAL_CASE_NAME}Props>(
  ({ className, variant = 'primary', size = 'medium', children, ...props }, ref) => {
    const variantClasses = {
      primary: 'bg-blue-600 text-white border-blue-600',
      secondary: 'bg-gray-200 text-gray-800 border-gray-200',
      outline: 'bg-transparent text-gray-800 border-gray-300',
    };

    const sizeClasses = {
      small: 'px-3 py-1 text-sm',
      medium: 'px-4 py-2 text-base',
      large: 'px-6 py-3 text-lg',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md border font-medium transition-colors',
          'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

${PASCAL_CASE_NAME}.displayName = '${PASCAL_CASE_NAME}';
EOF
        ;;
esac

# Create component test file
cat > "$UI_DIR/${COMPONENT_NAME}.spec.tsx" << EOF
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ${PASCAL_CASE_NAME} } from './${COMPONENT_NAME}';

describe('${PASCAL_CASE_NAME}', () => {
EOF

case "$COMPONENT_TYPE" in
    "form")
        cat >> "$UI_DIR/${COMPONENT_NAME}.spec.tsx" << EOF
  it('should render input with label', () => {
    render(<${PASCAL_CASE_NAME} label="Test Label" />);
    
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<${PASCAL_CASE_NAME} error="Test error" />);
    
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should display helper text', () => {
    render(<${PASCAL_CASE_NAME} helperText="Helper text" />);
    
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });

  it('should apply error styles when error is present', () => {
    render(<${PASCAL_CASE_NAME} error="Error" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('should forward ref to input element', () => {
    const ref = vi.fn();
    render(<${PASCAL_CASE_NAME} ref={ref} />);
    
    expect(ref).toHaveBeenCalled();
  });
EOF
        ;;
        
    "layout")
        cat >> "$UI_DIR/${COMPONENT_NAME}.spec.tsx" << EOF
  it('should render when isOpen is true', () => {
    render(<${PASCAL_CASE_NAME} isOpen={true}>Content</${PASCAL_CASE_NAME}>);
    
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<${PASCAL_CASE_NAME} isOpen={false}>Content</${PASCAL_CASE_NAME}>);
    
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should render title when provided', () => {
    render(<${PASCAL_CASE_NAME} title="Test Title">Content</${PASCAL_CASE_NAME}>);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<${PASCAL_CASE_NAME} onClose={onClose}>Content</${PASCAL_CASE_NAME}>);
    
    const backdrop = document.querySelector('.bg-black.bg-opacity-50');
    fireEvent.click(backdrop!);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should apply size classes', () => {
    const { rerender } = render(<${PASCAL_CASE_NAME} size="small">Content</${PASCAL_CASE_NAME}>);
    expect(document.querySelector('.max-w-sm')).toBeInTheDocument();
    
    rerender(<${PASCAL_CASE_NAME} size="large">Content</${PASCAL_CASE_NAME}>);
    expect(document.querySelector('.max-w-2xl')).toBeInTheDocument();
  });
EOF
        ;;
        
    "feedback")
        cat >> "$UI_DIR/${COMPONENT_NAME}.spec.tsx" << EOF
  it('should render with default variant', () => {
    render(<${PASCAL_CASE_NAME}>Test message</${PASCAL_CASE_NAME}>);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-blue-50');
  });

  it('should render with different variants', () => {
    const { rerender } = render(<${PASCAL_CASE_NAME} variant="success">Success</${PASCAL_CASE_NAME}>);
    expect(screen.getByRole('alert')).toHaveClass('bg-green-50');
    
    rerender(<${PASCAL_CASE_NAME} variant="error">Error</${PASCAL_CASE_NAME}>);
    expect(screen.getByRole('alert')).toHaveClass('bg-red-50');
  });

  it('should show dismiss button when dismissible', () => {
    render(<${PASCAL_CASE_NAME} dismissible>Message</${PASCAL_CASE_NAME}>);
    
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
  });

  it('should call onClose when dismissed', () => {
    const onClose = vi.fn();
    render(<${PASCAL_CASE_NAME} dismissible onClose={onClose}>Message</${PASCAL_CASE_NAME}>);
    
    fireEvent.click(screen.getByLabelText('Dismiss'));
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should auto close after specified time', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    
    render(<${PASCAL_CASE_NAME} autoClose={1000} onClose={onClose}>Message</${PASCAL_CASE_NAME}>);
    
    expect(screen.getByText('Message')).toBeInTheDocument();
    
    vi.advanceTimersByTime(1000);
    
    expect(onClose).toHaveBeenCalled();
    
    vi.useRealTimers();
  });
EOF
        ;;
        
    *)
        cat >> "$UI_DIR/${COMPONENT_NAME}.spec.tsx" << EOF
  it('should render children', () => {
    render(<${PASCAL_CASE_NAME}>Test Content</${PASCAL_CASE_NAME}>);
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should apply variant classes', () => {
    const { rerender } = render(<${PASCAL_CASE_NAME} variant="primary">Content</${PASCAL_CASE_NAME}>);
    expect(screen.getByText('Content')).toHaveClass('bg-blue-600');
    
    rerender(<${PASCAL_CASE_NAME} variant="secondary">Content</${PASCAL_CASE_NAME}>);
    expect(screen.getByText('Content')).toHaveClass('bg-gray-200');
  });

  it('should apply size classes', () => {
    const { rerender } = render(<${PASCAL_CASE_NAME} size="small">Content</${PASCAL_CASE_NAME}>);
    expect(screen.getByText('Content')).toHaveClass('px-3', 'py-1');
    
    rerender(<${PASCAL_CASE_NAME} size="large">Content</${PASCAL_CASE_NAME}>);
    expect(screen.getByText('Content')).toHaveClass('px-6', 'py-3');
  });

  it('should accept custom className', () => {
    render(<${PASCAL_CASE_NAME} className="custom-class">Content</${PASCAL_CASE_NAME}>);
    
    expect(screen.getByText('Content')).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = vi.fn();
    render(<${PASCAL_CASE_NAME} ref={ref}>Content</${PASCAL_CASE_NAME}>);
    
    expect(ref).toHaveBeenCalled();
  });
EOF
        ;;
esac

cat >> "$UI_DIR/${COMPONENT_NAME}.spec.tsx" << EOF
});
EOF

# Create Storybook story file (optional)
cat > "$UI_DIR/${COMPONENT_NAME}.stories.tsx" << EOF
import type { Meta, StoryObj } from '@storybook/react';
import { ${PASCAL_CASE_NAME} } from './${COMPONENT_NAME}';

const meta: Meta<typeof ${PASCAL_CASE_NAME}> = {
  title: 'Shared/UI/${PASCAL_CASE_NAME}',
  component: ${PASCAL_CASE_NAME},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
EOF

case "$COMPONENT_TYPE" in
    "form")
        cat >> "$UI_DIR/${COMPONENT_NAME}.stories.tsx" << EOF
    label: 'Field Label',
    placeholder: 'Enter text...',
EOF
        ;;
    "layout")
        cat >> "$UI_DIR/${COMPONENT_NAME}.stories.tsx" << EOF
    children: 'Modal content goes here',
    title: 'Modal Title',
    isOpen: true,
EOF
        ;;
    "feedback")
        cat >> "$UI_DIR/${COMPONENT_NAME}.stories.tsx" << EOF
    children: 'This is an informational message',
    variant: 'info',
EOF
        ;;
    *)
        cat >> "$UI_DIR/${COMPONENT_NAME}.stories.tsx" << EOF
    children: 'Component content',
    variant: 'primary',
    size: 'medium',
EOF
        ;;
esac

cat >> "$UI_DIR/${COMPONENT_NAME}.stories.tsx" << EOF
  },
};
EOF

# Add more story variants based on component type
case "$COMPONENT_TYPE" in
    "form")
        cat >> "$UI_DIR/${COMPONENT_NAME}.stories.tsx" << EOF

export const WithError: Story = {
  args: {
    ...Default.args,
    error: 'This field is required',
  },
};

export const WithHelperText: Story = {
  args: {
    ...Default.args,
    helperText: 'This is helper text',
  },
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
  },
};
EOF
        ;;
    "layout")
        cat >> "$UI_DIR/${COMPONENT_NAME}.stories.tsx" << EOF

export const Small: Story = {
  args: {
    ...Default.args,
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    ...Default.args,
    size: 'large',
  },
};

export const WithoutTitle: Story = {
  args: {
    ...Default.args,
    title: undefined,
  },
};
EOF
        ;;
    "feedback")
        cat >> "$UI_DIR/${COMPONENT_NAME}.stories.tsx" << EOF

export const Success: Story = {
  args: {
    ...Default.args,
    children: 'Operation completed successfully!',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    ...Default.args,
    children: 'Please review before proceeding',
    variant: 'warning',
  },
};

export const Error: Story = {
  args: {
    ...Default.args,
    children: 'An error occurred',
    variant: 'error',
  },
};

export const Dismissible: Story = {
  args: {
    ...Default.args,
    dismissible: true,
  },
};

export const AutoClose: Story = {
  args: {
    ...Default.args,
    autoClose: 3000,
  },
};
EOF
        ;;
    *)
        cat >> "$UI_DIR/${COMPONENT_NAME}.stories.tsx" << EOF

export const Secondary: Story = {
  args: {
    ...Default.args,
    variant: 'secondary',
  },
};

export const Outline: Story = {
  args: {
    ...Default.args,
    variant: 'outline',
  },
};

export const Small: Story = {
  args: {
    ...Default.args,
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    ...Default.args,
    size: 'large',
  },
};
EOF
        ;;
esac

# Update shared/ui index file
if [ -f "$UI_DIR/index.ts" ]; then
    echo "export * from './${COMPONENT_NAME}';" >> "$UI_DIR/index.ts"
else
    cat > "$UI_DIR/index.ts" << EOF
export * from './${COMPONENT_NAME}';
EOF
fi

# Create utils file if it doesn't exist
UTILS_FILE="frontend/src/shared/lib/utils.ts"
if [ ! -f "$UTILS_FILE" ]; then
    mkdir -p "$(dirname "$UTILS_FILE")"
    cat > "$UTILS_FILE" << EOF
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOF

    # Update lib index file
    LIB_INDEX="frontend/src/shared/lib/index.ts"
    if [ -f "$LIB_INDEX" ]; then
        echo "export * from './utils';" >> "$LIB_INDEX"
    else
        cat > "$LIB_INDEX" << EOF
export * from './api-client';
export * from './utils';
EOF
    fi
fi

echo "✅ Shared UI component '${COMPONENT_NAME}' created successfully!"
echo "📁 Created files:"
echo "   - $UI_DIR/${COMPONENT_NAME}.tsx"
echo "   - $UI_DIR/${COMPONENT_NAME}.spec.tsx"
echo "   - $UI_DIR/${COMPONENT_NAME}.stories.tsx"
echo ""
echo "Component type: ${COMPONENT_TYPE}"
echo ""
echo "Next steps:"
echo "1. Install required dependencies if not already installed:"
echo "   yarn workspace @spa-hono/frontend add clsx tailwind-merge"
echo "2. Import and use the component:"
echo "   import { ${PASCAL_CASE_NAME} } from '@/shared/ui';"
echo "3. Customize the component styling and behavior as needed"
echo "4. Run tests: yarn workspace @spa-hono/frontend test"
echo "5. View in Storybook (if configured): yarn storybook"