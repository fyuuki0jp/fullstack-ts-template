#!/bin/bash

# Frontend Page Boilerplate Generator
# Usage: ./create-page.sh <page-name> [widget-name] [--dry-run]

PAGE_NAME=$1
WIDGET_NAME=${2:-$1}
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
    esac
done

# Handle if --dry-run is the second parameter
if [ "$2" = "--dry-run" ]; then
    WIDGET_NAME=$1
    DRY_RUN=true
fi

if [ -z "$PAGE_NAME" ] || [ "$PAGE_NAME" = "--dry-run" ]; then
    echo "Usage: $0 <page-name> [widget-name] [--dry-run]"
    echo "Example: $0 dashboard dashboard"
    echo "Example: $0 products product-management"
    echo "Example: $0 dashboard --dry-run"
    exit 1
fi

# Convert names to PascalCase
PAGE_PASCAL=$(echo "$PAGE_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')
WIDGET_PASCAL=$(echo "$WIDGET_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')

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

# Create page directory
PAGE_DIR="frontend/src/pages"

if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN MODE - No files will be created"
    echo ""
    echo "Would create directory: $PAGE_DIR"
    echo ""
else
    mkdir -p "$PAGE_DIR"
fi

# Create page component
create_file "$PAGE_DIR/${PAGE_NAME}.tsx" "\
import { FC } from 'react';
import { ${WIDGET_PASCAL}Widget } from '@/widgets/${WIDGET_NAME}';

const ${PAGE_PASCAL}Page: FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <${WIDGET_PASCAL}Widget />
    </div>
  );
};

export default ${PAGE_PASCAL}Page;
EOF

# Create page with layout component
create_file "$PAGE_DIR/${PAGE_NAME}-with-layout.tsx" "\
import { FC } from 'react';
import { Link } from 'react-router-dom';
import { ${WIDGET_PASCAL}Widget } from '@/widgets/${WIDGET_NAME}';

const ${PAGE_PASCAL}PageWithLayout: FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">${PAGE_PASCAL}</h1>
            </div>
            <nav className="flex space-x-4">
              <Link 
                to="/" 
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </Link>
              <Link 
                to="/${PAGE_NAME}" 
                className="bg-gray-900 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                ${PAGE_PASCAL}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <${WIDGET_PASCAL}Widget />
      </main>

      {/* Footer */}
      <footer className="bg-white mt-8">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Your Company. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ${PAGE_PASCAL}PageWithLayout;
EOF

# Create page with sidebar layout
create_file "$PAGE_DIR/${PAGE_NAME}-sidebar.tsx" "\
import { FC, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ${WIDGET_PASCAL}Widget } from '@/widgets/${WIDGET_NAME}';

const ${PAGE_PASCAL}PageSidebar: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/${PAGE_NAME}', label: '${PAGE_PASCAL}', icon: '📊' },
    // Add more menu items as needed
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={\`\${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300\`}>
        <div className="p-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full text-left"
          >
            <span className="text-2xl">{sidebarOpen ? '←' : '→'}</span>
          </button>
        </div>
        <nav className="mt-8">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={\`flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 \${
                location.pathname === item.path ? 'bg-gray-100 border-l-4 border-blue-500' : ''
              }\`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span className="ml-3">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <${WIDGET_PASCAL}Widget />
      </div>
    </div>
  );
};

export default ${PAGE_PASCAL}PageSidebar;
EOF

# Create page test file
create_file "$PAGE_DIR/${PAGE_NAME}.spec.tsx" "\
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ${PAGE_PASCAL}Page from './${PAGE_NAME}';

// Mock widget
vi.mock('@/widgets/${WIDGET_NAME}', () => ({
  ${WIDGET_PASCAL}Widget: vi.fn(() => <div data-testid="${WIDGET_NAME}-widget">Mocked ${WIDGET_PASCAL}Widget</div>),
}));

describe('${PAGE_PASCAL}Page', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  it('should render the page', () => {
    renderWithRouter(<${PAGE_PASCAL}Page />);
    
    expect(screen.getByTestId('${WIDGET_NAME}-widget')).toBeInTheDocument();
  });

  it('should have proper background styling', () => {
    const { container } = renderWithRouter(<${PAGE_PASCAL}Page />);
    
    const pageContainer = container.firstChild;
    expect(pageContainer).toHaveClass('min-h-screen', 'bg-gray-50');
  });
});
EOF

# Create layout page test file
create_file "$PAGE_DIR/${PAGE_NAME}-with-layout.spec.tsx" "\
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ${PAGE_PASCAL}PageWithLayout from './${PAGE_NAME}-with-layout';

// Mock widget
vi.mock('@/widgets/${WIDGET_NAME}', () => ({
  ${WIDGET_PASCAL}Widget: vi.fn(() => <div data-testid="${WIDGET_NAME}-widget">Mocked ${WIDGET_PASCAL}Widget</div>),
}));

describe('${PAGE_PASCAL}PageWithLayout', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  it('should render header with navigation', () => {
    renderWithRouter(<${PAGE_PASCAL}PageWithLayout />);
    
    expect(screen.getByText('${PAGE_PASCAL}')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '${PAGE_PASCAL}' })).toBeInTheDocument();
  });

  it('should render the widget', () => {
    renderWithRouter(<${PAGE_PASCAL}PageWithLayout />);
    
    expect(screen.getByTestId('${WIDGET_NAME}-widget')).toBeInTheDocument();
  });

  it('should render footer', () => {
    renderWithRouter(<${PAGE_PASCAL}PageWithLayout />);
    
    expect(screen.getByText(/© \\d{4} Your Company/)).toBeInTheDocument();
  });
});
EOF

if [ "$DRY_RUN" = true ]; then
    echo "✅ DRY RUN completed for frontend page '${PAGE_NAME}'"
    echo "📁 Would create files:"
    echo "   - $PAGE_DIR/${PAGE_NAME}.tsx (simple page)"
    echo "   - $PAGE_DIR/${PAGE_NAME}-with-layout.tsx (with header/footer)"
    echo "   - $PAGE_DIR/${PAGE_NAME}-sidebar.tsx (with sidebar navigation)"
    echo "   - $PAGE_DIR/${PAGE_NAME}.spec.tsx (tests)"
    echo "   - $PAGE_DIR/${PAGE_NAME}-with-layout.spec.tsx (tests)"
else
    echo "✅ Frontend page '${PAGE_NAME}' created successfully!"
    echo "📁 Created files:"
    echo "   - $PAGE_DIR/${PAGE_NAME}.tsx (simple page)"
    echo "   - $PAGE_DIR/${PAGE_NAME}-with-layout.tsx (with header/footer)"
    echo "   - $PAGE_DIR/${PAGE_NAME}-sidebar.tsx (with sidebar navigation)"
    echo "   - $PAGE_DIR/${PAGE_NAME}.spec.tsx (tests)"
    echo "   - $PAGE_DIR/${PAGE_NAME}-with-layout.spec.tsx (tests)"
fi
echo ""
echo "Next steps:"
echo "1. Make sure the widget exists: @/widgets/${WIDGET_NAME}"
echo "2. Add route to your router configuration:"
echo "   { path: '/${PAGE_NAME}', element: <${PAGE_PASCAL}Page /> }"
echo "3. Choose the layout that fits your needs:"
echo "   - Simple: ${PAGE_NAME}.tsx"
echo "   - With header/footer: ${PAGE_NAME}-with-layout.tsx"
echo "   - With sidebar: ${PAGE_NAME}-sidebar.tsx"
echo "4. Customize the page layout and styling as needed"