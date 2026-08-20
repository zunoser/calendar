import { isoDate } from "@zunoser/utils";
import { describe, expect, it } from "vitest";
import { toSvg, type SvgEvent } from "../src/svg";

const event = (overrides: Partial<SvgEvent> = {}): SvgEvent => ({
  title: "映画まどマギ 公開日",
  startDate: isoDate("2026-08-28"),
  endDate: isoDate("2026-08-28"),
  ...overrides,
});

describe("toSvg", () => {
  it("指定した月の見出しとイベントの帯を描く", () => {
    const svg = toSvg([event()], "2026-08");
    expect(svg).toContain(">2026年8月</text>");
    expect(svg).toContain(">映画まどマギ 公開日</text>");
    expect(svg).toContain("@media (prefers-color-scheme: dark)");
  });

  it("指定した月にかからないイベントは描かない", () => {
    const svg = toSvg([event()], "2026-09");
    expect(svg).toContain(">2026年9月</text>");
    expect(svg).not.toContain("映画まどマギ 公開日");
    expect(svg).not.toContain('class="bar"');
  });

  it("イベントがない月もグリッドは描く", () => {
    expect(toSvg([], "2026-10")).toContain(">2026年10月</text>");
  });

  it("期間イベントは列数分の幅の帯になる", () => {
    // 2026-09-05 (土) 〜 09-06 (日) は同じ週なので 2 列分 (128 * 2 - 4)
    const svg = toSvg([event({ startDate: isoDate("2026-09-05"), endDate: isoDate("2026-09-06") })], "2026-09");
    expect(svg).toContain('width="252" height="16" rx="4" class="bar"');
  });

  it("月をまたぐイベントは月内の日だけ描く", () => {
    const svg = toSvg([event({ startDate: isoDate("2026-08-31"), endDate: isoDate("2026-09-01") })], "2026-09");
    expect(svg).toContain(">映画まどマギ 公開日</text>");
  });

  it("タイトルの XML 特殊文字はエスケープする", () => {
    expect(toSvg([event({ title: "a&b <c>" })], "2026-08")).toContain(">a&amp;b &lt;c&gt;</text>");
  });
});
