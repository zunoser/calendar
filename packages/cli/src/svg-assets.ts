import { createHash } from "node:crypto";
import { readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";

const SVG_INDEXES = [0, 1] as const;
const SVG_ALT_TEXT = ["今月のカレンダー", "来月のカレンダー"] as const;
const README_START = "<!-- zunocal:calendar:start -->";
const README_END = "<!-- zunocal:calendar:end -->";

const contentHash = (content: Buffer) => createHash("sha256").update(content).digest("hex").slice(0, 12);

const replaceReadmeCalendar = (readme: string, paths: readonly string[]) => {
  const start = readme.indexOf(README_START);
  const end = readme.indexOf(README_END, start + README_START.length);
  if (start === -1 || end === -1) {
    throw new Error("READMEにzunocal:calendarタグがありません");
  }

  const contentStart = start + README_START.length;
  const images = paths.map((path, index) => `![${SVG_ALT_TEXT[index]}](${path})`).join("\n\n");
  return readme.slice(0, contentStart) + `\n${images}\n` + readme.slice(end);
};

/** SVGに内容ハッシュを付け、古い画像とREADMEの参照を置き換える。 */
export const publishSvgAssets = async (directory: string, readmePath: string) => {
  const versions = await Promise.all(
    SVG_INDEXES.map(async (index) => {
      const sourcePath = join(directory, `calendar-${index}.svg`);
      const content = await readFile(sourcePath);
      const filename = `calendar-${index}-${contentHash(content)}.svg`;
      return { index, sourcePath, targetPath: join(directory, filename) };
    }),
  );

  const readme = replaceReadmeCalendar(
    await readFile(readmePath, "utf8"),
    versions.map(({ targetPath }) => relative(dirname(readmePath), targetPath).split(sep).join("/")),
  );

  const filenames = await readdir(directory);
  const oldVersions = filenames.filter((filename) =>
    SVG_INDEXES.some((index) => new RegExp(`^calendar-${index}-[0-9a-f]+\\.svg$`).test(filename)),
  );
  await Promise.all(oldVersions.map((filename) => unlink(join(directory, filename))));

  for (const { sourcePath, targetPath } of versions) {
    await rename(sourcePath, targetPath);
  }
  await writeFile(readmePath, readme, "utf8");

  return versions.map(({ targetPath }) => targetPath);
};
