// readme コマンド。READMEのカレンダー画像参照を差し替え、参照されなくなった旧SVGを削除する。

import { access, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { defineCommand } from "citty";

const README_START = "<!-- zunocal:calendar:start -->";
const README_END = "<!-- zunocal:calendar:end -->";
const IMAGE_REFERENCE = /!\[[^\]]*\]\(([^)]+)\)/g;
const SVG_ALT_TEXT = ["今月のカレンダー", "来月のカレンダー"] as const;

export interface UpdateReadmeCalendarOptions {
  currentPath: string;
  nextPath: string;
  readmePath: string;
  dryRun?: boolean;
}

/** READMEのzunocal:calendarタグ内の画像参照を差し替え、参照されなくなった旧SVGを削除する。 */
export const updateReadmeCalendar = async ({
  currentPath,
  nextPath,
  readmePath,
  dryRun = false,
}: UpdateReadmeCalendarOptions) => {
  if (resolve(currentPath) === resolve(nextPath)) {
    throw new Error("current と next には異なるSVGを指定してください");
  }
  for (const path of [currentPath, nextPath]) {
    if (extname(path) !== ".svg") throw new Error(`SVGファイルを指定してください: ${path}`);
    await access(path);
  }

  const source = await readFile(readmePath, "utf8");
  const start = source.indexOf(README_START);
  const end = source.indexOf(README_END, start + README_START.length);
  if (start === -1 || end === -1) {
    throw new Error("READMEにzunocal:calendarタグがありません");
  }

  const readmeDir = dirname(readmePath);
  const toReference = (path: string) => relative(readmeDir, path).split(sep).join("/");
  const images = [currentPath, nextPath].map((path, index) => `![${SVG_ALT_TEXT[index]}](${toReference(path)})`);
  const contentStart = start + README_START.length;
  const updated = source.slice(0, contentStart) + `\n${images.join("\n\n")}\n` + source.slice(end);

  const newPaths = new Set([resolve(currentPath), resolve(nextPath)]);
  const removedPaths = Array.from(source.slice(contentStart, end).matchAll(IMAGE_REFERENCE), ([, path]) => path)
    .filter((path) => path !== undefined)
    .map((path) => join(readmeDir, path))
    .filter((path) => !newPaths.has(resolve(path)));

  if (!dryRun) {
    await writeFile(readmePath, updated, "utf8");
    await Promise.all(removedPaths.map((path) => rm(path, { force: true })));
  }
  return { removedPaths };
};

export const readme = defineCommand({
  meta: { name: "readme", description: "READMEのカレンダー画像参照を差し替え、旧SVGを削除する" },
  args: {
    current: { type: "string", required: true, description: "今月のSVGパス" },
    next: { type: "string", required: true, description: "来月のSVGパス" },
    readme: { type: "string", default: "README.md", description: "更新するREADMEのパス" },
    dryRun: { type: "boolean", default: false, alias: "dry-run", description: "ファイルを変更せず結果を表示" },
  },
  async run({ args }) {
    const { removedPaths } = await updateReadmeCalendar({
      currentPath: args.current,
      nextPath: args.next,
      readmePath: args.readme,
      dryRun: args.dryRun,
    });
    console.log(`${args.dryRun ? "would update" : "updated"} ${args.readme}`);
    for (const path of removedPaths) console.log(`${args.dryRun ? "would remove" : "removed"} ${path}`);
  },
});
