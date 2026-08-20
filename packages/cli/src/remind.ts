// remind コマンド。開始日の1日前または1時間前に、Issue の担当者全員へコメントで通知する。

import { readFile } from "node:fs/promises";
import {
  dateInTokyoAfterHours,
  getGitHubCalendar,
  parseConfig,
  reminderComment,
  reminderTargets,
  type ReminderKind,
} from "@zunoser/calendar-core";
import { defineCommand } from "citty";

const hoursByKind: Record<ReminderKind, number> = { "1d": 24, "1h": 1 };

export const remind = defineCommand({
  meta: { name: "remind", description: "開始日の前に Issue の担当者全員をメンションする" },
  args: {
    config: { type: "string", default: "config.jsonc", description: "設定ファイルのパス" },
    before: { type: "positional", required: true, description: "通知タイミング (1d または 1h)" },
    dryRun: { type: "boolean", default: false, alias: "dry-run", description: "コメントせず対象の表示のみ" },
  },
  async run({ args }) {
    if (args.before !== "1d" && args.before !== "1h") {
      throw new Error("before は 1d または 1h を指定してください");
    }
    const kind = args.before;
    const config = parseConfig(await readFile(args.config, "utf8"));
    const { getCalendar, addIssueComment } = await getGitHubCalendar(config);
    const startDate = dateInTokyoAfterHours(new Date(), hoursByKind[kind]);
    const targets = reminderTargets(await Array.fromAsync(getCalendar()), startDate, kind);

    if (targets.length === 0) {
      console.log("対象はありません");
      return;
    }
    for (const event of targets) {
      if (!args.dryRun) await addIssueComment(event.issueId, reminderComment(event, kind));
      console.log(`${args.dryRun ? "通知対象" : "notified"}: ${event.startDate}  ${event.title}`);
    }
  },
});
