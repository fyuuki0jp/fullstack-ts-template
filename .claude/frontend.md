# 🎨 Frontend Development Guide

Complete guide for React + Vite frontend development.

## File-Based Routing

### Route Structure

Routes are automatically generated from the `frontend/app/` directory:

```
frontend/app/
├── index.tsx              → /
├── about.tsx              → /about
├── users/
│   ├── index.tsx         → /users
│   └── [id].tsx          → /users/:id
└── products/
    ├── index.tsx         → /products
    ├── [id]/
    │   ├── index.tsx     → /products/:id
    │   └── edit.tsx      → /products/:id/edit
    └── new.tsx           → /products/new
```

### Route Components

```tsx
// frontend/app/users/index.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            <Link to={`/users/${user.id}`}>{user.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Dynamic Routes

```tsx
// frontend/app/users/[id].tsx
import { useParams } from 'react-router-dom';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then(res => res.json())
      .then(data => setUser(data.user));
  }, [id]);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

## Component Patterns

### Component Structure

```tsx
// frontend/components/UserCard.tsx
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (id: string) => void;
}

export function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold">{user.name}</h3>
      <p className="text-gray-600">{user.email}</p>
      
      <div className="mt-4 flex gap-2">
        {onEdit && (
          <button
            onClick={() => onEdit(user)}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(user.id)}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
```

### Form Components

```tsx
// frontend/components/UserForm.tsx
interface UserFormProps {
  initialData?: Partial<User>;
  onSubmit: (data: CreateUserInput) => Promise<void>;
  onCancel: () => void;
}

export function UserForm({ initialData, onSubmit, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    name: initialData?.name || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300"
          required
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300"
          required
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 rounded"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

## API Integration

### Fetch Wrapper

```typescript
// frontend/lib/api.ts
const API_BASE = '/api';

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Usage
const { users } = await apiFetch<{ users: User[] }>('/users');
const { user } = await apiFetch<{ user: User }>('/users', {
  method: 'POST',
  body: JSON.stringify({ email, name }),
});
```

### Custom Hooks

```typescript
// frontend/hooks/useApi.ts
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const result = await apiFetch<T>(path);
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [path]);

  return { data, loading, error, refetch: () => fetchData() };
}

// Usage
function UserList() {
  const { data, loading, error } = useApi<{ users: User[] }>('/users');
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return <div>{/* render users */}</div>;
}
```

## State Management

### Local State Patterns

```tsx
// Simple state for UI
const [isOpen, setIsOpen] = useState(false);

// Form state
const [formData, setFormData] = useState<FormData>({
  email: '',
  name: '',
});

// Complex state with reducer
interface State {
  users: User[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; users: User[] }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'DELETE_USER'; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, users: action.users };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'DELETE_USER':
      return {
        ...state,
        users: state.users.filter(u => u.id !== action.id),
      };
    default:
      return state;
  }
}

// Usage
const [state, dispatch] = useReducer(reducer, {
  users: [],
  loading: false,
  error: null,
});
```

### Context for Shared State

```tsx
// frontend/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  async function login(email: string, password: string) {
    // Implementation
  }

  function logout() {
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## Styling with Tailwind CSS

### Component Styling

```tsx
// Using Tailwind classes
<div className="max-w-4xl mx-auto p-6">
  <h1 className="text-3xl font-bold text-gray-900 mb-6">
    Dashboard
  </h1>
  
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="bg-white rounded-lg shadow p-6">
      {/* Card content */}
    </div>
  </div>
</div>
```

### Conditional Styling

```tsx
// Using clsx for conditional classes
import clsx from 'clsx';

<button
  className={clsx(
    'px-4 py-2 rounded font-medium',
    {
      'bg-blue-500 text-white hover:bg-blue-600': variant === 'primary',
      'bg-gray-200 text-gray-800 hover:bg-gray-300': variant === 'secondary',
      'opacity-50 cursor-not-allowed': disabled,
    }
  )}
  disabled={disabled}
>
  {children}
</button>
```

### Responsive Design

```tsx
<div className="px-4 sm:px-6 lg:px-8">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* Responsive grid */}
  </div>
  
  <p className="text-sm sm:text-base lg:text-lg">
    Responsive text
  </p>
</div>
```

## Error Handling

### Error Boundaries

```tsx
// frontend/components/ErrorBoundary.tsx
interface Props {
  children: React.ReactNode;
  fallback?: (error: Error) => React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error caught by boundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!);
      }
      
      return (
        <div className="p-4 bg-red-50 text-red-700 rounded">
          <h2 className="font-bold">Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### API Error Handling

```tsx
async function handleApiError(response: Response) {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data.error || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return response;
}

// Usage with toast notifications
import { toast } from 'react-hot-toast';

async function createUser(data: CreateUserInput) {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    await handleApiError(response);
    const result = await response.json();
    
    toast.success('User created successfully');
    return result.user;
  } catch (error) {
    toast.error(error.message);
    throw error;
  }
}
```

## Performance Optimization

### Code Splitting

```tsx
// Lazy load routes
import { lazy, Suspense } from 'react';

const AdminPanel = lazy(() => import('./app/admin'));

// In route configuration
<Suspense fallback={<div>Loading...</div>}>
  <AdminPanel />
</Suspense>
```

### Memoization

```tsx
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback((id: string) => {
  deleteUser(id);
}, [deleteUser]);

// Memoize components
const MemoizedUserCard = memo(UserCard);
```

### List Optimization

```tsx
// Use keys properly
{users.map(user => (
  <UserCard key={user.id} user={user} />
))}

// Virtualize long lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={users.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <UserCard user={users[index]} />
    </div>
  )}
</FixedSizeList>
```

## Testing Frontend Components

```tsx
// frontend/components/UserCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from './UserCard';

describe('UserCard', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('displays user information', () => {
    render(<UserCard user={mockUser} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(<UserCard user={mockUser} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(mockUser);
  });
});
```

## Development Tips

1. **Use TypeScript Strictly**
   - Define all prop types
   - Avoid `any` type
   - Use type inference where possible

2. **Component Organization**
   - One component per file
   - Co-locate related components
   - Extract reusable components early

3. **State Management**
   - Start with local state
   - Lift state only when needed
   - Consider context before external libraries

4. **Performance**
   - Profile before optimizing
   - Use React DevTools
   - Optimize re-renders with memo

5. **Accessibility**
   - Use semantic HTML
   - Add ARIA labels
   - Test with keyboard navigation