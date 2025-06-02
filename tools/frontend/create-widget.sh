#!/bin/bash

# Frontend Widget Boilerplate Generator
# Usage: ./create-widget.sh <widget-name> [features...] [--dry-run]

WIDGET_NAME=$1
shift
FEATURES=()
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        *)
            FEATURES+=("$arg")
            ;;
    esac
done

if [ -z "$WIDGET_NAME" ] || [ "$WIDGET_NAME" = "--dry-run" ]; then
    echo "Usage: $0 <widget-name> [features...] [--dry-run]"
    echo "Example: $0 user-management user"
    echo "Example: $0 dashboard user product order"
    echo "Example: $0 user-management user --dry-run"
    exit 1
fi

# Convert widget name to PascalCase
PASCAL_CASE_NAME=$(echo "$WIDGET_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')

# Helper function to create files
create_file() {
    local file_path=$1
    local file_content=$2
    
    if [ "$DRY_RUN" = true ]; then
        echo "Would create file: $file_path"
        return
    fi
    
    cat > "$file_path" << EOF
$file_content
EOF
}

# Create widget directory
WIDGET_DIR="frontend/src/widgets/$WIDGET_NAME"

if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN MODE - No files will be created"
    echo ""
    echo "Would create directory: $WIDGET_DIR"
    echo ""
else
    mkdir -p "$WIDGET_DIR"
fi

# Generate imports based on features
FEATURE_IMPORTS=""
FEATURE_COMPONENTS=""
for feature in "${FEATURES[@]}"; do
    FEATURE_PASCAL=$(echo "$feature" | sed -r 's/(^|-)([a-z])/\U\2/g')
    FEATURE_IMPORTS="${FEATURE_IMPORTS}import { ${FEATURE_PASCAL}Form, ${FEATURE_PASCAL}List } from '@/features/${feature}';\n"
    FEATURE_COMPONENTS="${FEATURE_COMPONENTS}
      <div className=\"space-y-4\">
        <h2 className=\"text-2xl font-bold\">${FEATURE_PASCAL} Management</h2>
        <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-8\">
          <div className=\"lg:col-span-1\">
            <${FEATURE_PASCAL}Form />
          </div>
          <div className=\"lg:col-span-2\">
            <${FEATURE_PASCAL}List />
          </div>
        </div>
      </div>"
done

# Create widget component
create_file "$WIDGET_DIR/${WIDGET_NAME}-widget.tsx" "\
import { FC } from 'react';
import { Card } from '@/shared/ui';
$(echo -e "$FEATURE_IMPORTS")
interface ${PASCAL_CASE_NAME}WidgetProps {
  className?: string;
}

export const ${PASCAL_CASE_NAME}Widget: FC<${PASCAL_CASE_NAME}WidgetProps> = ({ className }) => {
  return (
    <div className={\`container mx-auto px-4 py-8 \${className || ''}\`}>
      <h1 className="text-3xl font-bold mb-8">${PASCAL_CASE_NAME}</h1>
      
      <div className="space-y-8">$(echo -e "$FEATURE_COMPONENTS")
      </div>
    </div>
  );
};
EOF

# Create alternative layout widget
create_file "$WIDGET_DIR/${WIDGET_NAME}-tabs-widget.tsx" "\
import { FC, useState } from 'react';
import { Card, Button } from '@/shared/ui';
$(echo -e "$FEATURE_IMPORTS")
interface ${PASCAL_CASE_NAME}TabsWidgetProps {
  className?: string;
}

export const ${PASCAL_CASE_NAME}TabsWidget: FC<${PASCAL_CASE_NAME}TabsWidgetProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
EOF

# Add tabs for each feature
TAB_INDEX=0
for feature in "${FEATURES[@]}"; do
    FEATURE_PASCAL=$(echo "$feature" | sed -r 's/(^|-)([a-z])/\U\2/g')
    cat >> "$WIDGET_DIR/${WIDGET_NAME}-tabs-widget.tsx" << EOF
    {
      label: '${FEATURE_PASCAL}s',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <${FEATURE_PASCAL}Form />
          </div>
          <div className="lg:col-span-2">
            <${FEATURE_PASCAL}List />
          </div>
        </div>
      ),
    },
EOF
done

cat >> "$WIDGET_DIR/${WIDGET_NAME}-tabs-widget.tsx" << EOF
  ];

  return (
    <div className={\`container mx-auto px-4 py-8 \${className || ''}\`}>
      <h1 className="text-3xl font-bold mb-8">${PASCAL_CASE_NAME}</h1>
      
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={\`py-2 px-1 border-b-2 font-medium text-sm \${
                activeTab === index
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }\`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div>{tabs[activeTab]?.content}</div>
    </div>
  );
};
EOF

# Create widget test file
create_file "$WIDGET_DIR/${WIDGET_NAME}-widget.spec.tsx" "\
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ${PASCAL_CASE_NAME}Widget } from './${WIDGET_NAME}-widget';
import { testWrapper } from '@/test-utils';

// Mock features
EOF

for feature in "${FEATURES[@]}"; do
    FEATURE_PASCAL=$(echo "$feature" | sed -r 's/(^|-)([a-z])/\U\2/g')
    cat >> "$WIDGET_DIR/${WIDGET_NAME}-widget.spec.tsx" << EOF
vi.mock('@/features/${feature}', () => ({
  ${FEATURE_PASCAL}Form: vi.fn(() => <div data-testid="${feature}-form">Mocked ${FEATURE_PASCAL}Form</div>),
  ${FEATURE_PASCAL}List: vi.fn(() => <div data-testid="${feature}-list">Mocked ${FEATURE_PASCAL}List</div>),
}));

EOF
done

cat >> "$WIDGET_DIR/${WIDGET_NAME}-widget.spec.tsx" << EOF
describe('${PASCAL_CASE_NAME}Widget', () => {
  it('should render widget title', () => {
    render(<${PASCAL_CASE_NAME}Widget />, { wrapper: testWrapper });
    
    expect(screen.getByText('${PASCAL_CASE_NAME}')).toBeInTheDocument();
  });
EOF

for feature in "${FEATURES[@]}"; do
    FEATURE_PASCAL=$(echo "$feature" | sed -r 's/(^|-)([a-z])/\U\2/g')
    cat >> "$WIDGET_DIR/${WIDGET_NAME}-widget.spec.tsx" << EOF

  it('should render ${FEATURE_PASCAL} components', () => {
    render(<${PASCAL_CASE_NAME}Widget />, { wrapper: testWrapper });
    
    expect(screen.getByText('${FEATURE_PASCAL} Management')).toBeInTheDocument();
    expect(screen.getByTestId('${feature}-form')).toBeInTheDocument();
    expect(screen.getByTestId('${feature}-list')).toBeInTheDocument();
  });
EOF
done

cat >> "$WIDGET_DIR/${WIDGET_NAME}-widget.spec.tsx" << EOF

  it('should accept custom className', () => {
    const { container } = render(
      <${PASCAL_CASE_NAME}Widget className="custom-class" />,
      { wrapper: testWrapper }
    );
    
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
EOF

# Create tabs widget test file
create_file "$WIDGET_DIR/${WIDGET_NAME}-tabs-widget.spec.tsx" "\
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ${PASCAL_CASE_NAME}TabsWidget } from './${WIDGET_NAME}-tabs-widget';
import { testWrapper } from '@/test-utils';

// Mock features
EOF

for feature in "${FEATURES[@]}"; do
    FEATURE_PASCAL=$(echo "$feature" | sed -r 's/(^|-)([a-z])/\U\2/g')
    cat >> "$WIDGET_DIR/${WIDGET_NAME}-tabs-widget.spec.tsx" << EOF
vi.mock('@/features/${feature}', () => ({
  ${FEATURE_PASCAL}Form: vi.fn(() => <div data-testid="${feature}-form">Mocked ${FEATURE_PASCAL}Form</div>),
  ${FEATURE_PASCAL}List: vi.fn(() => <div data-testid="${feature}-list">Mocked ${FEATURE_PASCAL}List</div>),
}));

EOF
done

cat >> "$WIDGET_DIR/${WIDGET_NAME}-tabs-widget.spec.tsx" << EOF
describe('${PASCAL_CASE_NAME}TabsWidget', () => {
  it('should render widget title', () => {
    render(<${PASCAL_CASE_NAME}TabsWidget />, { wrapper: testWrapper });
    
    expect(screen.getByText('${PASCAL_CASE_NAME}')).toBeInTheDocument();
  });

  it('should render all tabs', () => {
    render(<${PASCAL_CASE_NAME}TabsWidget />, { wrapper: testWrapper });
    
EOF

for feature in "${FEATURES[@]}"; do
    FEATURE_PASCAL=$(echo "$feature" | sed -r 's/(^|-)([a-z])/\U\2/g')
    cat >> "$WIDGET_DIR/${WIDGET_NAME}-tabs-widget.spec.tsx" << EOF
    expect(screen.getByRole('button', { name: '${FEATURE_PASCAL}s' })).toBeInTheDocument();
EOF
done

cat >> "$WIDGET_DIR/${WIDGET_NAME}-tabs-widget.spec.tsx" << EOF
  });

  it('should switch tabs on click', () => {
    render(<${PASCAL_CASE_NAME}TabsWidget />, { wrapper: testWrapper });
    
EOF

if [ ${#FEATURES[@]} -gt 1 ]; then
    SECOND_FEATURE="${FEATURES[1]}"
    SECOND_FEATURE_PASCAL=$(echo "$SECOND_FEATURE" | sed -r 's/(^|-)([a-z])/\U\2/g')
    cat >> "$WIDGET_DIR/${WIDGET_NAME}-tabs-widget.spec.tsx" << EOF
    // Initially first tab is active
    expect(screen.getByTestId('${FEATURES[0]}-form')).toBeInTheDocument();
    
    // Click second tab
    fireEvent.click(screen.getByRole('button', { name: '${SECOND_FEATURE_PASCAL}s' }));
    
    // Second tab content should be visible
    expect(screen.getByTestId('${SECOND_FEATURE}-form')).toBeInTheDocument();
    expect(screen.getByTestId('${SECOND_FEATURE}-list')).toBeInTheDocument();
EOF
fi

if [ "$DRY_RUN" = false ]; then
    cat >> "$WIDGET_DIR/${WIDGET_NAME}-tabs-widget.spec.tsx" << EOF
  });
});
EOF
fi

# Create widget index file
create_file "$WIDGET_DIR/index.ts" "\
export * from './${WIDGET_NAME}-widget';
export * from './${WIDGET_NAME}-tabs-widget';
EOF

if [ "$DRY_RUN" = true ]; then
    echo "✅ DRY RUN completed for frontend widget '${WIDGET_NAME}'"
    echo "📁 Would create in: $WIDGET_DIR"
    echo ""
    echo "Would create components:"
    echo "  - ${PASCAL_CASE_NAME}Widget (default layout)"
    echo "  - ${PASCAL_CASE_NAME}TabsWidget (tabbed layout)"
    echo "  - Test suites for both components"
else
    echo "✅ Frontend widget '${WIDGET_NAME}' created successfully!"
    echo "📁 Created in: $WIDGET_DIR"
    echo ""
    echo "Created components:"
    echo "  - ${PASCAL_CASE_NAME}Widget (default layout)"
    echo "  - ${PASCAL_CASE_NAME}TabsWidget (tabbed layout)"
fi
echo ""
echo "Next steps:"
echo "1. Make sure the required features exist:"
for feature in "${FEATURES[@]}"; do
    echo "   - @/features/${feature}"
done
echo "2. Use the widget in a page:"
echo "   import { ${PASCAL_CASE_NAME}Widget } from '@/widgets/${WIDGET_NAME}';"
echo "3. Choose between standard or tabbed layout"
echo "4. Customize the layout and styling as needed"