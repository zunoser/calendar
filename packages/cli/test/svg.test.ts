import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isoDate } from "@zunoser/utils";
import { afterEach, describe, expect, it } from "vitest";
import { writeSvgFile } from "../src/svg";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("writeSvgFile", () => {
  it("指定した月のSVGを指定パスに1枚だけ書き出す", async () => {
    const root = await mkdtemp(join(tmpdir(), "zunocal-svg-"));
    temporaryDirectories.push(root);
    const output = join(root, "nested", "calendar.svg");

    await writeSvgFile([], "2026-08", isoDate("2026-08-27"), output);

    expect(await readdir(join(root, "nested"))).toEqual(["calendar.svg"]);
    expect(await readFile(output, "utf8")).toContain('aria-label="カレンダー 2026年8月、今日 8月27日"');
  });
});
