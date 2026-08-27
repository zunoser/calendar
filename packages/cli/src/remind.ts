// remind コマンド。開始日の指定日数前に、Issue の担当者全員へコメントで通知する。

import { readFile } from "node:fs/promises";
import { dateInTokyoAfterDays, getGitHubCalendar, parseConfig, reminderTargets } from "@zunoser/calendar-core";
import { defineCommand } from "citty";
import { z } from "zod";

const DaysBeforeSchema = z.coerce.number().int().min(1);

export const remind = defineCommand({
  meta: { name: "remind", description: "開始日の前に Issue の担当者全員をメンションする" },
  args: {
    config: { type: "string", default: "config.jsonc", description: "設定ファイルのパス" },
    before: { type: "positional", required: true, description: "開始日の何日前に通知するか" },
    dryRun: { type: "boolean", default: false, alias: "dry-run", description: "コメントせず対象の表示のみ" },
  },
  async run({ args }) {
    const daysBefore = DaysBeforeSchema.parse(args.before);
    const config = parseConfig(await readFile(args.config, "utf8"));
    const { getCalendar, addIssueComment } = await getGitHubCalendar(config);
    const startDate = dateInTokyoAfterDays(new Date(), daysBefore);
    const targets = reminderTargets(await Array.fromAsync(getCalendar()), startDate);

    if (targets.length === 0) {
      console.log("対象はありません");
      return;
    }
    for (const event of targets) {
      const mentions = event.assignees.map((login) => `@${login}`).join(" ");
      if (!args.dryRun) await addIssueComment(event.id, `${mentions}\n\n開始日の${daysBefore}日前です。`);
      console.log(`${args.dryRun ? "通知対象" : "notified"}: ${event.startDate}  ${event.title}`);
    }
  },
});
