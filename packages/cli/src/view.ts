// view コマンド。カレンダーをテーブルで表示する。

import { readFile } from "node:fs/promises";
import { filterDated, getGitHubCalendar, parseConfig, sortByStartDate } from "@zunoser/calendar-core";
import { defineCommand } from "citty";

export const view = defineCommand({
  meta: { name: "view", description: "カレンダーをテーブルで表示する" },
  args: {
    config: { type: "string", default: "config.jsonc", description: "設定ファイルのパス" },
  },
  async run({ args }) {
    const config = parseConfig(await readFile(args.config, "utf8"));
    const { getCalendar } = await getGitHubCalendar(config);
    const events = await Array.fromAsync(getCalendar());

    const dated = sortByStartDate(filterDated(events));
    const undated = events.filter((event) => event.startDate === undefined || event.endDate === undefined);
    console.table([...dated, ...undated].map(({ startDate, endDate, title }) => ({ startDate, endDate, title })));
  },
});
