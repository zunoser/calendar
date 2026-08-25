import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { publishSvgAssets } from "../src/svg-assets";

const temporaryDirectories: string[] = [];
const shortHash = (content: string) => createHash("sha256").update(content).digest("hex").slice(0, 12);

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const fixture = async (readme: string) => {
  const root = await mkdtemp(join(tmpdir(), "zunocal-svg-"));
  temporaryDirectories.push(root);
  const assets = join(root, "assets");
  await mkdir(assets);
  await Promise.all([
    writeFile(join(assets, "calendar-0.svg"), "this month"),
    writeFile(join(assets, "calendar-1.svg"), "next month"),
    writeFile(join(assets, "calendar-0-deadbeef.svg"), "old"),
    writeFile(join(assets, "calendar-1-cafebabe.svg"), "old"),
    writeFile(join(assets, "keep.svg"), "keep"),
    writeFile(join(root, "README.md"), readme),
  ]);
  return { root, assets, readmePath: join(root, "README.md") };
};

describe("publishSvgAssets", () => {
  it("SVGを内容ハッシュ付きの名前にしてREADMEの参照を更新する", async () => {
    const { assets, readmePath } = await fixture(
      "# Calendar\n\n" +
        "<!-- zunocal:calendar:start -->\n![old](assets/calendar-0-deadbeef.svg)\n\n![old](assets/calendar-1-cafebabe.svg)\n<!-- zunocal:calendar:end -->\n\n" +
        "![untouched](assets/calendar-0-reference.svg)\n\n" +
        "Footer\n",
    );
    const paths = await publishSvgAssets(assets, readmePath);

    expect(paths).toEqual([
      join(assets, `calendar-0-${shortHash("this month")}.svg`),
      join(assets, `calendar-1-${shortHash("next month")}.svg`),
    ]);
    expect(await Promise.all(paths.map((path) => readFile(path, "utf8")))).toEqual(["this month", "next month"]);
    expect((await readdir(assets)).toSorted()).toEqual([
      `calendar-0-${shortHash("this month")}.svg`,
      `calendar-1-${shortHash("next month")}.svg`,
      "keep.svg",
    ]);
    expect(await readFile(readmePath, "utf8")).toBe(
      `# Calendar\n\n<!-- zunocal:calendar:start -->\n` +
        `![今月のカレンダー](assets/calendar-0-${shortHash("this month")}.svg)\n` +
        `\n` +
        `![来月のカレンダー](assets/calendar-1-${shortHash("next month")}.svg)\n` +
        `<!-- zunocal:calendar:end -->\n\n` +
        `![untouched](assets/calendar-0-reference.svg)\n\n` +
        `Footer\n`,
    );
  });

  it("READMEにタグがなければファイルを変更しない", async () => {
    const readme = "<!-- zunocal:calendar:start -->\n![今月](assets/calendar-0-deadbeef.svg)\n";
    const { assets, readmePath } = await fixture(readme);

    await expect(publishSvgAssets(assets, readmePath)).rejects.toThrow("READMEにzunocal:calendarタグがありません");

    expect((await readdir(assets)).toSorted()).toEqual([
      "calendar-0-deadbeef.svg",
      "calendar-0.svg",
      "calendar-1-cafebabe.svg",
      "calendar-1.svg",
      "keep.svg",
    ]);
    expect(await readFile(readmePath, "utf8")).toBe(readme);
  });
});
