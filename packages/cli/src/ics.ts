// ics コマンド。カレンダーを iCalendar (.ics) ファイルに書き出す。

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { filterDated, getGitHubCalendar, parseConfig, sortByStartDate } from "@zunoser/calendar-core";
import { toIcs } from "@zunoser/calendar-ics";
import { defineCommand } from "citty";

export const ics = defineCommand({
  meta: { name: "ics", description: "カレンダーを iCalendar (.ics) に書き出す" },
  args: {
    config: { type: "string", default: "config.jsonc", description: "設定ファイルのパス" },
    out: { type: "string", default: "ics/calendar.ics", description: "出力先のパス" },
    name: { type: "string", default: "ずのさー", description: "カレンダー名 (NAME / X-WR-CALNAME)" },
  },
  async run({ args }) {
    const config = parseConfig(await readFile(args.config, "utf8"));
    const { getCalendar } = await getGitHubCalendar(config);
    const events = sortByStartDate(filterDated(await Array.fromAsync(getCalendar())));

    await mkdir(dirname(args.out), { recursive: true });
    await writeFile(args.out, toIcs(events, args.name), "utf8");
    console.log(`wrote ${args.out} (${events.length} events)`);
  },
});
