import { isoDate } from "@zunoser/utils";
import { describe, expect, it } from "vitest";
import { toSvg, type SvgEvent } from "../src/svg";

const event = (overrides: Partial<SvgEvent> = {}): SvgEvent => ({
  title: "映画まどマギ 公開日",
  startDate: isoDate("2026-08-28"),
  endDate: isoDate("2026-08-28"),
  labelColors: [],
  ...overrides,
});

describe("toSvg", () => {
  it("指定した月の見出しとイベントの帯を描く", () => {
    const svg = toSvg([event()], "2026-08");
    expect(svg).toContain(">2026年8月</text>");
    expect(svg).toContain(">映画まどマギ 公開日</text>");
    expect(svg).toContain("@media (prefers-color-scheme: dark)");
    expect(svg).not.toContain("stroke: #000000");
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

  it("ラベルがなければ既定色、1件ならラベル色で帯を描く", () => {
    expect(toSvg([event()], "2026-08")).toContain('class="bar" fill="#1f6feb"');
    expect(toSvg([event({ labelColors: ["e99695"] })], "2026-08")).toContain('class="bar" fill="#e99695"');
  });

  it.each([
    ["既定色", [], "white"],
    ["明るい単色", ["ffffff"], "black"],
    ["暗い単色", ["000000"], "white"],
    ["明るいグラデーション", ["ffffff", "fbca04"], "black"],
    ["暗いグラデーション", ["000000", "5319e7"], "white"],
  ])("%sに対して%sの文字を描く", (_, labelColors, textColor) => {
    const svg = toSvg([event({ labelColors })], "2026-08");

    expect(svg).toContain(`class="bar-text ${textColor}"`);
  });

  it("複数のラベル色を横グラデーションにする", () => {
    const svg = toSvg([event({ labelColors: ["d73a4a", "fbca04", "0e8a16"] })], "2026-08");
    expect(svg).toContain('<linearGradient id="bar-gradient-0" x1="0%" y1="0%" x2="100%" y2="0%">');
    expect(svg).toContain('<stop offset="0%" stop-color="#d73a4a"/>');
    expect(svg).toContain('<stop offset="50%" stop-color="#fbca04"/>');
    expect(svg).toContain('<stop offset="100%" stop-color="#0e8a16"/>');
    expect(svg).toContain('class="bar" fill="url(#bar-gradient-0)"');
  });

  it("週をまたぐイベントのグラデーションIDが重複しない", () => {
    const svg = toSvg(
      [
        event({
          startDate: isoDate("2026-08-22"),
          endDate: isoDate("2026-08-31"),
          labelColors: ["d73a4a", "0e8a16"],
        }),
      ],
      "2026-08",
    );
    expect(svg.match(/<linearGradient id=/g)).toHaveLength(3);
    expect(svg).toContain('id="bar-gradient-0"');
    expect(svg).toContain('id="bar-gradient-1"');
    expect(svg).toContain('id="bar-gradient-2"');
  });

  it("不正なラベル色は使わない", () => {
    const svg = toSvg([event({ labelColors: ['"/><script>alert(1)</script>'] })], "2026-08");
    expect(svg).toContain('class="bar" fill="#1f6feb"');
    expect(svg).not.toContain("<script>");
  });

  it("期間イベントは列数分の幅の帯になる", () => {
    // 2026-12-29 (火) 〜 12-31 (木) は同じ週なので 3 列分 (128 * 3 - 4)
    const svg = toSvg([event({ startDate: isoDate("2026-12-29"), endDate: isoDate("2026-12-31") })], "2026-12");
    expect(svg).toContain('width="380" height="16" rx="4" class="bar"');
  });

  it("月をまたぐイベントは月内の日だけ描く", () => {
    const svg = toSvg([event({ startDate: isoDate("2026-08-31"), endDate: isoDate("2026-09-01") })], "2026-09");
    expect(svg).toContain(">映画まどマギ 公開日</text>");
  });

  it("タイトルの XML 特殊文字はエスケープする", () => {
    expect(toSvg([event({ title: "a&b <c>" })], "2026-08")).toContain(">a&amp;b &lt;c&gt;</text>");
  });
});
