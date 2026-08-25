// svg コマンド。今月と来月のカレンダー画像 (SVG) を書き出す。
// 通常は calendar-0.svg (今月) / calendar-1.svg (来月) へ書き出す。
// --readme 指定時はキャッシュ対策の内容ハッシュをファイル名に付け、README の参照も更新する。

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { filterDated, getGitHubCalendar, parseConfig, sortByStartDate } from "@zunoser/calendar-core";
import { monthOf, nextMonth, toSvg } from "@zunoser/calendar-svg";
import { todayInTokyo } from "@zunoser/utils";
import { defineCommand } from "citty";
import { publishSvgAssets } from "./svg-assets";

export const svg = defineCommand({
  meta: { name: "svg", description: "今月と来月のカレンダー画像を書き出す" },
  args: {
    config: { type: "string", default: "config.jsonc", description: "設定ファイルのパス" },
    dir: { type: "string", default: "assets", description: "書き出し先のディレクトリ" },
    readme: { type: "string", description: "SVGをバージョン化して参照を更新するREADMEのパス" },
  },
  async run({ args }) {
    const config = parseConfig(await readFile(args.config, "utf8"));
    const { getCalendar } = await getGitHubCalendar(config);
    const events = sortByStartDate(filterDated(await Array.fromAsync(getCalendar())));

    const today = todayInTokyo();
    const latest = monthOf(today);
    const months = [latest, nextMonth(latest)];
    await mkdir(args.dir, { recursive: true });
    const paths: string[] = [];
    for (const [index, month] of months.entries()) {
      const path = join(args.dir, `calendar-${index}.svg`);
      await writeFile(path, toSvg(events, month, today), "utf8");
      paths.push(path);
    }

    const outputPaths = args.readme === undefined ? paths : await publishSvgAssets(args.dir, args.readme);
    for (const [index, path] of outputPaths.entries()) {
      console.log(`wrote ${path} (${months[index]})`);
    }
    if (args.readme !== undefined) {
      console.log(`updated ${args.readme}`);
    }
  },
});
