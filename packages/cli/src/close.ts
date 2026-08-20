// close コマンド。終了日が過去になった open な Issue を close する。

import { readFile } from "node:fs/promises";
import { getGitHubCalendar, parseConfig, pastOpenEvents } from "@zunoser/calendar-core";
import { todayInTokyo } from "@zunoser/utils";
import { defineCommand } from "citty";

export const close = defineCommand({
  meta: { name: "close", description: "終了日が過去の Issue を close する" },
  args: {
    config: { type: "string", default: "config.jsonc", description: "設定ファイルのパス" },
    dryRun: { type: "boolean", default: false, alias: "dry-run", description: "close せず対象の表示のみ" },
  },
  async run({ args }) {
    const config = parseConfig(await readFile(args.config, "utf8"));
    const { getCalendar, closeIssue } = await getGitHubCalendar(config);

    const targets = pastOpenEvents(await Array.fromAsync(getCalendar()), todayInTokyo());
    if (targets.length === 0) {
      console.log("対象はありません");
      return;
    }
    for (const event of targets) {
      if (!args.dryRun) {
        await closeIssue(event.issueId);
      }
      console.log(`${args.dryRun ? "close 対象" : "closed"}: ${event.endDate}  ${event.title}`);
    }
  },
});
