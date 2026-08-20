// svg コマンド。今月と来月のカレンダー画像 (SVG) を書き出す。
// ファイル名は月によらず calendar-0.svg (今月) / calendar-1.svg (来月) で固定し、
// README からは静的に参照する。

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { filterDated, getGitHubCalendar, parseConfig, sortByStartDate } from "@zunoser/calendar-core";
import { monthOf, nextMonth, toSvg } from "@zunoser/calendar-svg";
import { todayInTokyo } from "@zunoser/utils";
import { defineCommand } from "citty";

export const svg = defineCommand({
  meta: { name: "svg", description: "今月と来月のカレンダー画像を書き出す" },
  args: {
    config: { type: "string", default: "config.jsonc", description: "設定ファイルのパス" },
    dir: { type: "string", default: "assets", description: "書き出し先のディレクトリ" },
  },
  async run({ args }) {
    const config = parseConfig(await readFile(args.config, "utf8"));
    const { getCalendar } = await getGitHubCalendar(config);
    const events = sortByStartDate(filterDated(await Array.fromAsync(getCalendar())));

    const latest = monthOf(todayInTokyo());
    await mkdir(args.dir, { recursive: true });
    for (const [index, month] of [latest, nextMonth(latest)].entries()) {
      const path = join(args.dir, `calendar-${index}.svg`);
      await writeFile(path, toSvg(events, month), "utf8");
      console.log(`wrote ${path} (${month})`);
    }
  },
});
