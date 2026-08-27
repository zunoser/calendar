// svg コマンド。指定した1か月のカレンダーSVGを1枚書き出す。

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { filterDated, getGitHubCalendar, parseConfig, sortByStartDate } from "@zunoser/calendar-core";
import { monthOf, toSvg } from "@zunoser/calendar-svg";
import { getToday, isoDate } from "@zunoser/utils";
import { defineCommand } from "citty";

export const svg = defineCommand({
  meta: { name: "svg", description: "指定した1か月のカレンダーSVGを書き出す" },
  args: {
    config: { type: "string", default: "config.jsonc", description: "設定ファイルのパス" },
    month: { type: "string", required: true, description: "対象月 (YYYY-MM)" },
    output: { type: "string", required: true, alias: "o", description: "出力先のSVGパス" },
  },
  async run({ args }) {
    const month = monthOf(isoDate(`${args.month}-01`));
    const config = parseConfig(await readFile(args.config, "utf8"));
    const { getCalendar } = await getGitHubCalendar(config);
    const events = sortByStartDate(filterDated(await Array.fromAsync(getCalendar())));

    await mkdir(dirname(args.output), { recursive: true });
    await writeFile(args.output, toSvg(events, month, getToday()), "utf8");
    console.log(`wrote ${args.output} (${month})`);
  },
});
