// remind コマンド。開始日の3日前または1日前に、Issue の担当者全員へコメントで通知する。

import { readFile } from "node:fs/promises";
import { dateInTokyoAfterDays, getGitHubCalendar, parseConfig, reminderTargets } from "@zunoser/calendar-core";
import { defineCommand } from "citty";
import { reminderComment, type ReminderKind } from "./reminder";

const daysByKind: Record<ReminderKind, number> = { "3d": 3, "1d": 1 };

export const remind = defineCommand({
  meta: { name: "remind", description: "開始日の前に Issue の担当者全員をメンションする" },
  args: {
    config: { type: "string", default: "config.jsonc", description: "設定ファイルのパス" },
    before: { type: "positional", required: true, description: "通知タイミング (3d または 1d)" },
    dryRun: { type: "boolean", default: false, alias: "dry-run", description: "コメントせず対象の表示のみ" },
  },
  async run({ args }) {
    if (args.before !== "3d" && args.before !== "1d") {
      throw new Error("before は 3d または 1d を指定してください");
    }
    const kind = args.before;
    const config = parseConfig(await readFile(args.config, "utf8"));
    const { getCalendar, addIssueComment } = await getGitHubCalendar(config);
    const startDate = dateInTokyoAfterDays(new Date(), daysByKind[kind]);
    const targets = reminderTargets(await Array.fromAsync(getCalendar()), startDate);

    if (targets.length === 0) {
      console.log("対象はありません");
      return;
    }
    for (const event of targets) {
      if (!args.dryRun) await addIssueComment(event.id, reminderComment(event.assignees, kind));
      console.log(`${args.dryRun ? "通知対象" : "notified"}: ${event.startDate}  ${event.title}`);
    }
  },
});
