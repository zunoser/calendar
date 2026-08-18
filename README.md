# カレンダー

https://github.com/orgs/zunoser/projects/3

## Issue calendar

Issue 本文に次の項目を記載すると、GitHub Actions が `calendar.ics` に終日予定として出力します。

```text
startdate: 2026-08-19
enddate: 2026-08-21
```

`enddate` は予定に含まれます。片方だけ、または片方だけが解釈できる場合は、その解釈できた日だけの予定になります。両方がない、または両方とも解釈できない Issue は出力されません。GitHub Issue Form の `### startdate` / `### enddate` 形式にも対応しています。
