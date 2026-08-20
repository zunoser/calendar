// check コマンド。全 Issue を error か open のどちらかに寄せ、既に一致しているものだけ除外して更新する。

import { checkEvent, getGitHubCalendar, parseConfig } from "@zunoser/calendar-core";
import { defineCommand } from "citty";
import { readFile } from "node:fs/promises";

export const check = defineCommand({
  meta: { name: "check", description: "日付の整合性を検査し、Issue の Status フィールドを更新する" },
  args: {
    config: { type: "string", default: "config.jsonc", description: "設定ファイルのパス" },
    dryRun: { type: "boolean", default: false, alias: "dry-run", description: "Status を変更せず差分の表示のみ" },
  },
  async run({ args }) {
    const config = parseConfig(await readFile(args.config, "utf8"));
    const { getCalendar, updateStatus } = await getGitHubCalendar(config);
    const events = await Array.fromAsync(getCalendar());

    const expectedError = new Set(events.filter((event) => checkEvent(event) !== undefined));
    const expectedOpen = new Set(events.filter((event) => checkEvent(event) === undefined));
    const actualError = new Set(events.filter((event) => event.status === config.statusField.error));
    const actualOpen = new Set(events.filter((event) => event.status === config.statusField.open));

    const changes = [
      ...Array.from(expectedError.difference(actualError), (event) => ({
        event,
        expected: config.statusField.error,
      })),
      ...Array.from(expectedOpen.difference(actualOpen), (event) => ({
        event,
        expected: config.statusField.open,
      })),
    ];
    if (changes.length === 0) {
      console.log("Status の変更はありません");
      return;
    }
    for (const { event, expected } of changes) {
      if (!args.dryRun) {
        await updateStatus(event.id, expected);
      }
      console.log(`${event.title}: ${event.status ?? "(未設定)"} → ${expected}`);
    }
  },
});
