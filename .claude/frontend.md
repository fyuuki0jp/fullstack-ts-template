# フロントエンド開発ガイド

現在、このプロジェクトはバックエンド専用のHonoサーバーです。フロントエンドは含まれていません。

クライアント統合については、[backend.md](./backend.md)のAPIドキュメントを参照してください。

APIは任意のクライアントアプリケーション（React、Vue、モバイルアプリなど）で利用できるよう設計されており、RESTの原則に従った一貫したJSONレスポンスを返します。

## API使用例

### JavaScriptクライアント

```javascript
// ユーザー一覧取得
const response = await fetch('http://localhost:3000/api/users');
const data = await response.json();
console.log(data.users);

// ユーザー作成
const newUser = {
  email: 'test@example.com',
  name: 'テストユーザー'
};

const createResponse = await fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newUser),
});

const createdUser = await createResponse.json();
console.log(createdUser.user);
```

### Reactクライアント例

```tsx
import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data.users);
        setLoading(false);
      })
      .catch(error => {
        console.error('ユーザー取得エラー:', error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>読み込み中...</div>;

  return (
    <div>
      <h1>ユーザー一覧</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name} ({user.email})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserList;
```

### APIレスポンス形式

```typescript
// 成功レスポンス
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "ユーザー名",
      "createdAt": "2023-01-01T12:00:00.000Z",
      "updatedAt": "2023-01-01T12:00:00.000Z"
    }
  ]
}

// エラーレスポンス
{
  "error": "エラーメッセージ"
}
```