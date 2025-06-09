# ボイラープレート改善TODO

## 完了した改善項目 ✅

### 1. Error Handling の簡素化
- **問題**: error-handlingパッケージが複雑で迂回処理を生んでいた
- **解決**: ドメイン固有のエラークラスに変更、シンプルなエラーハンドリング
- **効果**: コード理解度向上、保守性向上

### 2. 責任分離の実現
- **問題**: ドメインエラーにHTTPステータスコードが混在
- **解決**: ドメイン層とAPI層でエラー処理を分離
- **効果**: ドメイン層の純粋性確保、再利用性向上

### 3. any型の除去
- **問題**: 型安全性を壊すany型が多数使用
- **解決**: Zodを直接使用、branded typesで厳密な型検証
- **効果**: コンパイル時エラー検出、実行時型エラー防止

### 4. validation関数の削除
- **問題**: 不要な中間関数が複雑性を追加
- **解決**: Zodスキーマを直接使用
- **効果**: コード量削減、直接的で理解しやすい実装

### 5. 型の重複除去と単一真実のソース化 ✅
- **問題**: API型とEntity型で重複定義
- **解決**: Entity層を基準にPick/Partialで変形
- **実装**:
  ```typescript
  // Entity層を基準にPickで変形
  type CreateUserRequest = Pick<User, 'email' | 'name'>;
  type UpdateUserRequest = Partial<Pick<User, 'email' | 'name'>>;
  // Entity側のスキーマも再利用
  export const CreateUserRequestSchema = userInsertSchema;
  ```
- **効果**: 型の重複排除、保守性向上、Entity変更時の自動更新

### 6. 小規模ファイルの統合 ✅
- **問題**: 1-2個の関数だけの小さなファイルが分離されすぎ
- **解決**: routes.tsにHTTPマッピング関数を統合
- **効果**: ファイル数削減、関連コードの局所化、理解しやすさ向上

### 7. TDDに適合したシンプルなエラーハンドリング ✅
- **問題**: エラーマッピング関数を作るとテストも必要になり複雑化
- **解決**: 各APIエンドポイントで直接エラーハンドリング
- **実装**:
  ```typescript
  if (isErr(result)) {
    if (result.error instanceof ValidationError) {
      return c.json({ error: result.error.message }, 400);
    }
    if (result.error instanceof ConflictError) {
      return c.json({ error: result.error.message }, 409);
    }
    return c.json({ error: result.error.message }, 500);
  }
  ```
- **効果**: テスト数削減、ヘルパー関数不要、直接的で理解しやすい

### 8. Scaffolding Scripts v2アーキテクチャ対応 ✅
- **問題**: 古いEntity patternとthrow処理を生成するスクリプト
- **解決**: Repository pattern、Railway Result、Pick/Partialに対応
- **修正内容**:
  - `create-entity.sh`: schema.ts + repository.ts構造で生成
  - `create-feature.sh`: 直接エラーハンドリング、型変形、ドメインエラーを含む完全なv2実装
  - `create-feature.sh` (frontend): 新APIエンドポイント対応、型安全性確保
- **効果**: 一貫したアーキテクチャの自動生成、開発効率向上

## 今後の改善候補 📋

### 8. Zodスキーマの統一
- **問題**: API層とEntity層でZodスキーマが分離
- **提案**: Entity層のスキーマを基準にAPI層でomit/pickで変形
- **メリット**: バリデーションルールの一元管理

### 9. 関数型アプローチの統一
- **問題**: 一部でclass-likeなパターンが残存
- **提案**: 全ての処理を純粋関数で統一
- **メリット**: テスタビリティ向上、関数合成の容易さ

### 10. パフォーマンス最適化
- **問題**: ネストした関数呼び出しによるオーバーヘッド
- **提案**: 関数合成パターンで最適化
- **メリット**: 実行速度向上、メモリ使用量削減

### 11. 型推論の活用強化
- **問題**: 明示的型定義が多い
- **提案**: TypeScriptの型推論を最大活用
- **メリット**: コード量削減、型の自動更新

### 12. テストパターンの統一
- **問題**: テストの書き方にばらつき
- **提案**: 統一されたテストヘルパー関数群
- **メリット**: テスト保守性向上、品質向上

## 設計原則 🎯

### DRY (Don't Repeat Yourself)
- 型定義は一箇所にまとめる
- Entityを単一真実のソースとする
- Pick/Partial/Omitで必要な型を導出

### 責任分離 (Separation of Concerns)
- Domain層: ビジネスロジックのみ
- API層: HTTP仕様の変換のみ
- Repository層: データアクセスのみ

### 型安全性 (Type Safety)
- any型は使用禁止
- branded typesでドメイン境界を明確化
- コンパイル時エラー検出を最大化

### シンプルさ (Simplicity)
- 中間関数は最小限
- 直接的で理解しやすい実装
- 複雑性は必要性で正当化

## 次回チェック項目 ✏️

- [ ] Entity型の変形パターンが統一されているか
- [ ] validation関数が除去されZod直接使用になっているか  
- [ ] エラーハンドリングがシンプルになっているか
- [ ] any型が使用されていないか
- [ ] 責任分離が適切に行われているか