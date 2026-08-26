import { createHash } from "node:crypto";
import { readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";

const README_START = "<!-- zunocal:calendar:start -->";
const README_END = "<!-- zunocal:calendar:end -->";
const SVG_ALT_TEXT = ["今月のカレンダー", "来月のカレンダー"] as const;

const contentHash = (content: Buffer) => createHash("sha256").update(content).digest("hex").slice(0, 12);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const versionedAsset = async (sourcePath: string) => {
  const extension = extname(sourcePath);
  if (extension !== ".svg") throw new Error(`SVGファイルを指定してください: ${sourcePath}`);
  const stem = basename(sourcePath, extension);
  const content = await readFile(sourcePath);
  return {
    content,
    sourcePath,
    targetPath: join(dirname(sourcePath), `${stem}-${contentHash(content)}${extension}`),
    oldVersionPattern: new RegExp(`^${escapeRegex(stem)}-[0-9a-f]+\\.svg$`),
  };
};

export interface PublishSvgAssetsOptions {
  currentPath: string;
  nextPath: string;
  readmePath: string;
  dryRun?: boolean;
}

/** 指定した2枚のSVGに内容ハッシュを付け、古い画像とREADMEの参照を置き換える。 */
export const publishSvgAssets = async ({
  currentPath,
  nextPath,
  readmePath,
  dryRun = false,
}: PublishSvgAssetsOptions) => {
  if (resolve(currentPath) === resolve(nextPath)) {
    throw new Error("current と next には異なるSVGを指定してください");
  }

  const versions = await Promise.all([versionedAsset(currentPath), versionedAsset(nextPath)]);
  const outputPaths = versions.map(({ targetPath }) => targetPath);
  const readme = replaceReadmeCalendar(
    await readFile(readmePath, "utf8"),
    outputPaths.map((path) => relative(dirname(readmePath), path).split(sep).join("/")),
  );
  const oldPaths = (
    await Promise.all(
      versions.map(async ({ sourcePath, oldVersionPattern }) =>
        (await readdir(dirname(sourcePath)))
          .filter((filename) => oldVersionPattern.test(filename))
          .map((filename) => join(dirname(sourcePath), filename)),
      ),
    )
  ).flat();
  const protectedPaths = new Set(
    versions.flatMap(({ sourcePath, targetPath }) => [resolve(sourcePath), resolve(targetPath)]),
  );
  const removedPaths = [
    ...oldPaths.filter((path) => !protectedPaths.has(resolve(path))),
    ...versions.map(({ sourcePath }) => sourcePath),
  ];

  if (!dryRun) {
    await Promise.all(versions.map(({ content, targetPath }) => writeFile(targetPath, content)));
    await writeFile(readmePath, readme, "utf8");
    await Promise.all(removedPaths.map((path) => unlink(path)));
  }

  return { outputPaths, removedPaths };
};
