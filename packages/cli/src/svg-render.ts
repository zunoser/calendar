import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { filterDated, getGitHubCalendar, parseConfig, sortByStartDate } from "@zunoser/calendar-core";
import { monthOf, nextMonth, toSvg, type SvgEvent } from "@zunoser/calendar-svg";
import { getToday, type IsoDate } from "@zunoser/utils";
import { defineCommand } from "citty";

const ISO_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const resolveMonth = (value: string, today: IsoDate) => {
  const current = monthOf(today);
  if (value === "current") return current;
  if (value === "next") return nextMonth(current);
  if (ISO_MONTH.test(value)) return value;
  throw new Error("month は current、next、または YYYY-MM 形式で指定してください");
};

export const writeSvgFile = async (events: readonly SvgEvent[], month: string, today: IsoDate, output: string) => {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, toSvg(events, month, today), "utf8");
};

export const svgRender = defineCommand({
  meta: { name: "render", description: "指定した1か月のカレンダーSVGを書き出す" },
  args: {
    config: { type: "string", default: "config.jsonc", description: "設定ファイルのパス" },
    month: { type: "string", required: true, description: "対象月 (current、next、または YYYY-MM)" },
    output: { type: "string", required: true, alias: "o", description: "出力先のSVGパス" },
  },
  async run({ args }) {
    const today = getToday();
    const month = resolveMonth(args.month, today);
    const config = parseConfig(await readFile(args.config, "utf8"));
    const { getCalendar } = await getGitHubCalendar(config);
    const events = sortByStartDate(filterDated(await Array.fromAsync(getCalendar())));

    await writeSvgFile(events, month, today, args.output);
    console.log(`wrote ${args.output} (${month})`);
  },
});
