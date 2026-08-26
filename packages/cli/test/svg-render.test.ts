import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isoDate } from "@zunoser/utils";
import { afterEach, describe, expect, it } from "vitest";
import { resolveMonth, writeSvgFile } from "../src/svg-render";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("resolveMonth", () => {
  const today = isoDate("2026-12-20");

  it("currentとnextを今日基準の月へ解決する", () => {
    expect(resolveMonth("current", today)).toBe("2026-12");
    expect(resolveMonth("next", today)).toBe("2027-01");
  });

  it("YYYY-MM形式の月をそのまま使う", () => {
    expect(resolveMonth("2027-02", today)).toBe("2027-02");
  });

  it("不正な月を拒否する", () => {
    expect(() => resolveMonth("2027-13", today)).toThrow(
      "month は current、next、または YYYY-MM 形式で指定してください",
    );
  });
});

describe("writeSvgFile", () => {
  it("指定した月のSVGを指定パスに1枚だけ書き出す", async () => {
    const root = await mkdtemp(join(tmpdir(), "zunocal-svg-render-"));
    temporaryDirectories.push(root);
    const output = join(root, "nested", "calendar.svg");

    await writeSvgFile([], "2026-08", isoDate("2026-08-27"), output);

    expect(await readdir(join(root, "nested"))).toEqual(["calendar.svg"]);
    expect(await readFile(output, "utf8")).toContain('aria-label="カレンダー 2026年8月、今日 8月27日"');
  });
});
