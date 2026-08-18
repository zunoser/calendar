# カレンダー

https://github.com/orgs/zunoser/projects/3

この Project の `Start Date` と `Target Date` から、リポジトリ直下の
`calendar.ics` を自動生成します。日付は GitHub の Date フィールド形式
`YYYY-MM-DD` のみを受理します。

実装は TypeScript です。Project の項目は100件ずつカーソルページングするため、
数百件以上でも全件を取得します。GitHub の応答と日付は Zod、日付計算は
Temporal、ICS の生成・エスケープ・行折り返しは `ical-generator` に委ねています。

- 両方とも有効: `Start Date` から `Target Date` まで（両端を含む）
- 片方だけ有効: その日1日の予定
- 両方とも未設定または不正: 予定に含めない
- 終了日が開始日より前: 不正な期間として予定に含めない

## Actions の設定

Organization Project は通常の `GITHUB_TOKEN` から読み取れないため、
Project の読み取り権限を持つ fine-grained personal access token を
リポジトリの Actions secret `PROJECT_TOKEN` に登録してください。

Issue の作成・編集・削除・状態変更時に同期します。また、Project の日付変更や
Issue 作成直後の自動追加を反映するため15分ごとにも同期し、Actions 画面からの
手動実行にも対応しています。

ローカルで生成する場合:

```sh
bun ci
PROJECT_TOKEN=... bun run generate
```

テスト:

```sh
bun run check
```

テストでは350件のページング、日付の正常・異常系に加えて、生成結果を
別実装の `ical.js` で読み戻して検証します。
