// check コマンド。日付の整合性から期待される Status を計算し、実際との差分だけを更新する。

import { checkEvent, getGitHubCalendar, parseConfig, type Config } from "@zunoser/calendar-core";
import { defineCommand } from "citty";
import { readFile } from "node:fs/promises";

/**
 * 期待される Status: 問題があれば error、問題が解消していれば error → open。
 * それ以外は現状維持。
 */
const expectedStatus = (
  problem: ReturnType<typeof checkEvent>,
  actual: string | undefined,
  statusField: Config["statusField"],
) => {
  if (problem) return statusField.error;
  if (actual === statusField.error) return statusField.open;
  return actual;
};

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

    const changes = events.flatMap((event) => {
      const problem = checkEvent(event);
      const expected = expectedStatus(problem, event.status, config.statusField);
      if (expected === undefined || expected === event.status) return [];
      return [{ event, problem, actual: event.status, expected }];
    });
    if (changes.length === 0) {
      console.log("Status の変更はありません");
      return;
    }
    for (const { event, problem, actual, expected } of changes) {
      if (!args.dryRun) {
        await updateStatus(event.id, expected);
      }
      console.log(`${event.title}: ${actual ?? "(未設定)"} → ${expected}${problem ? ` (${problem})` : ""}`);
    }
  },
});
