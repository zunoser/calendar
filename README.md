# カレンダー

[zunoser Project #3](https://github.com/orgs/zunoser/projects/3) の Issue を予定として扱い、iCalendar (`ics/calendar.ics`) を GitHub Actions で自動更新するモノレポ。

## カレンダー購読

[Google カレンダーに追加](https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fraw.githubusercontent.com%2Fzunoser%2Fcalendar%2Fmain%2Fics%2Fcalendar.ics)

<details>
<summary>Apple カレンダー / Outlook:</summary>

```
webcal://raw.githubusercontent.com/zunoser/calendar/main/ics/calendar.ics
```

</details>

<details>
<summary>その他:</summary>

```url
https://raw.githubusercontent.com/zunoser/calendar/main/ics/calendar.ics
```

</details>

## コマンド

```sh
pnpm zunocal view                # カレンダーをテーブル表示
pnpm zunocal check [--dry-run]   # 日付の整合性を検査し Status を Error/Next に更新
pnpm zunocal close [--dry-run]   # 終了日が過去の open な Issue を close
pnpm zunocal ics [--out <path>]  # iCalendar を書き出す (既定: ics/calendar.ics)
```

### Secrets

- **`PROJECT_TOKEN`** — ふぁが発行した**無期限・`Full control of projects` + `public_repo` スコープ**の classic PAT

## 開発

```sh
pnpm install
pnpm test              # ユニットテスト (純粋ロジックのみ)
pnpm test:integration  # 実 API への Read 専用テスト (要 TOKEN)
pnpm typecheck
pnpm lint
pnpm fmt
```

### パッケージ構成

| パッケージ        | 役割                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `packages/cli`    | コマンド定義と表示 ([citty](https://github.com/unjs/citty))                                   |
| `packages/core`   | 設定 (`parseConfig`) とサービス (`getGitHubCalendar`)、純粋なイベント操作                     |
| `packages/github` | GitHub GraphQL の repository 層 ([gql.tada](https://gql-tada.0no.co/) + graphql-request)      |
| `packages/ics`    | iCalendar 生成 ([ical-generator](https://github.com/sebbo2002/ical-generator) の薄いアダプタ) |
| `packages/utils`  | 汎用ユーティリティ                                                                            |

GitHub の GraphQL スキーマを更新したら型定義を再生成する:

```sh
pnpm --filter @zunoser/calendar-github exec gql-tada generate-output
```
