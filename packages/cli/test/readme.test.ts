import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { updateReadmeCalendar } from "../src/readme";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const fixture = async (readme: string) => {
  const root = await mkdtemp(join(tmpdir(), "zunocal-readme-"));
  temporaryDirectories.push(root);
  const assets = join(root, "assets");
  await mkdir(assets);
  await Promise.all([
    writeFile(join(assets, "calendar-1a2b3c.svg"), "this month"),
    writeFile(join(assets, "calendar-4d5e6f.svg"), "next month"),
    writeFile(join(assets, "calendar-old0.svg"), "old"),
    writeFile(join(assets, "calendar-old1.svg"), "old"),
    writeFile(join(assets, "keep.svg"), "keep"),
    writeFile(join(root, "README.md"), readme),
  ]);
  return { root, assets, readmePath: join(root, "README.md") };
};

describe("updateReadmeCalendar", () => {
  it("READMEの参照を差し替え、参照されなくなった旧SVGを削除する", async () => {
    const { assets, readmePath } = await fixture(
      "# Calendar\n\n" +
        "<!-- zunocal:calendar:start -->\n![old](assets/calendar-old0.svg)\n\n![old](assets/calendar-old1.svg)\n<!-- zunocal:calendar:end -->\n\n" +
        "![untouched](assets/calendar-reference.svg)\n\n" +
        "Footer\n",
    );

    const { removedPaths } = await updateReadmeCalendar({
      currentPath: join(assets, "calendar-1a2b3c.svg"),
      nextPath: join(assets, "calendar-4d5e6f.svg"),
      readmePath,
    });

    expect(removedPaths.toSorted()).toEqual([join(assets, "calendar-old0.svg"), join(assets, "calendar-old1.svg")]);
    expect((await readdir(assets)).toSorted()).toEqual(["calendar-1a2b3c.svg", "calendar-4d5e6f.svg", "keep.svg"]);
    expect(await readFile(readmePath, "utf8")).toBe(
      "# Calendar\n\n<!-- zunocal:calendar:start -->\n" +
        "![今月のカレンダー](assets/calendar-1a2b3c.svg)\n" +
        "\n" +
        "![来月のカレンダー](assets/calendar-4d5e6f.svg)\n" +
        "<!-- zunocal:calendar:end -->\n\n" +
        "![untouched](assets/calendar-reference.svg)\n\n" +
        "Footer\n",
    );
  });

  it("READMEにタグがなければファイルを変更しない", async () => {
    const readme = "<!-- zunocal:calendar:start -->\n![old](assets/calendar-old0.svg)\n";
    const { assets, readmePath } = await fixture(readme);

    await expect(
      updateReadmeCalendar({
        currentPath: join(assets, "calendar-1a2b3c.svg"),
        nextPath: join(assets, "calendar-4d5e6f.svg"),
        readmePath,
      }),
    ).rejects.toThrow("READMEにzunocal:calendarタグがありません");

    expect((await readdir(assets)).toSorted()).toEqual([
      "calendar-1a2b3c.svg",
      "calendar-4d5e6f.svg",
      "calendar-old0.svg",
      "calendar-old1.svg",
      "keep.svg",
    ]);
    expect(await readFile(readmePath, "utf8")).toBe(readme);
  });

  it("dry-runでは削除予定だけを返してファイルを変更しない", async () => {
    const readme =
      "<!-- zunocal:calendar:start -->\n![old](assets/calendar-old0.svg)\n\n![old](assets/calendar-old1.svg)\n<!-- zunocal:calendar:end -->\n";
    const { assets, readmePath } = await fixture(readme);

    const { removedPaths } = await updateReadmeCalendar({
      currentPath: join(assets, "calendar-1a2b3c.svg"),
      nextPath: join(assets, "calendar-4d5e6f.svg"),
      readmePath,
      dryRun: true,
    });

    expect(removedPaths.toSorted()).toEqual([join(assets, "calendar-old0.svg"), join(assets, "calendar-old1.svg")]);
    expect((await readdir(assets)).toSorted()).toEqual([
      "calendar-1a2b3c.svg",
      "calendar-4d5e6f.svg",
      "calendar-old0.svg",
      "calendar-old1.svg",
      "keep.svg",
    ]);
    expect(await readFile(readmePath, "utf8")).toBe(readme);
  });

  it("引き続き参照されるSVGは削除しない", async () => {
    const { assets, readmePath } = await fixture(
      "<!-- zunocal:calendar:start -->\n![old](assets/calendar-old0.svg)\n\n![old](assets/calendar-1a2b3c.svg)\n<!-- zunocal:calendar:end -->\n",
    );

    const { removedPaths } = await updateReadmeCalendar({
      currentPath: join(assets, "calendar-1a2b3c.svg"),
      nextPath: join(assets, "calendar-4d5e6f.svg"),
      readmePath,
    });

    expect(removedPaths).toEqual([join(assets, "calendar-old0.svg")]);
    expect((await readdir(assets)).toSorted()).toEqual([
      "calendar-1a2b3c.svg",
      "calendar-4d5e6f.svg",
      "calendar-old1.svg",
      "keep.svg",
    ]);
  });

  it("参照されていた旧SVGが既に存在しなくても失敗しない", async () => {
    const { assets, readmePath } = await fixture(
      "<!-- zunocal:calendar:start -->\n![old](assets/calendar-missing.svg)\n<!-- zunocal:calendar:end -->\n",
    );

    const { removedPaths } = await updateReadmeCalendar({
      currentPath: join(assets, "calendar-1a2b3c.svg"),
      nextPath: join(assets, "calendar-4d5e6f.svg"),
      readmePath,
    });

    expect(removedPaths).toEqual([join(assets, "calendar-missing.svg")]);
  });

  it("currentとnextに同じSVGは指定できない", async () => {
    const { assets, readmePath } = await fixture("<!-- zunocal:calendar:start -->\n<!-- zunocal:calendar:end -->\n");
    const path = join(assets, "calendar-1a2b3c.svg");

    await expect(updateReadmeCalendar({ currentPath: path, nextPath: path, readmePath })).rejects.toThrow(
      "current と next には異なるSVGを指定してください",
    );
  });

  it("SVG以外のファイルは指定できない", async () => {
    const { assets, readmePath } = await fixture("<!-- zunocal:calendar:start -->\n<!-- zunocal:calendar:end -->\n");

    await expect(
      updateReadmeCalendar({
        currentPath: join(assets, "calendar-1a2b3c.svg"),
        nextPath: readmePath,
        readmePath,
      }),
    ).rejects.toThrow(`SVGファイルを指定してください: ${readmePath}`);
  });

  it("存在しないSVGは指定できない", async () => {
    const { assets, readmePath } = await fixture("<!-- zunocal:calendar:start -->\n<!-- zunocal:calendar:end -->\n");

    await expect(
      updateReadmeCalendar({
        currentPath: join(assets, "calendar-1a2b3c.svg"),
        nextPath: join(assets, "calendar-nothing.svg"),
        readmePath,
      }),
    ).rejects.toThrow();
  });
});
