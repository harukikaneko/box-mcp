## セットアップ手順

1. リポジトリをクローンする
2. 依存関係をインストールする：
   ```bash
   pnpm install
   ```

## 認証設定

1. [Box Developer Console](https://kanmu.app.box.com/developers/console) で JWT 認証方式の Box アプリケーションを作成
2. JWT 設定の JSON をダウンロード
3. JWT 設定を base64 でエンコード：
   ```bash
   cat your_box_config.json | base64
   ```

## 使い方

```bash
pnpm build
```

利用するツールに応じて、以下のような設定ファイルを準備してください：

```json
{
  "mcpServers": {
    "box-mcp-server": {
      "command": "/path/to/node", // 絶対パスが推奨
      "args": ["/path/to/box-mcp/dist/index.js"], // 現在はローカルビルド前提
      "env": {
        "BOX_JWT_BASE64": "YOUR_BASE64_ENCODED_JWT_CONFIG",
        "BOX_USER_ID": "YOUR_BOX_USER_ID"
      }
    }
  }
}
```
