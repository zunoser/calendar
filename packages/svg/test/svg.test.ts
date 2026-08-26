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
  const today = isoDate("2026-08-25");

  it("指定した月の見出しとイベントの帯を描く", () => {
    const svg = toSvg([event()], "2026-08", today);
    expect(svg).toContain(">2026年8月</text>");
    expect(svg).toContain(">映画まどマギ 公開日</text>");
    expect(svg).toContain("@media (prefers-color-scheme: dark)");
    expect(svg).not.toContain("stroke: #000000");
  });

  it("指定した月にかからないイベントは描かない", () => {
    const svg = toSvg([event()], "2026-09", today);
    expect(svg).toContain(">2026年9月</text>");
    expect(svg).not.toContain("映画まどマギ 公開日");
    expect(svg).not.toContain('class="bar"');
  });

  it("イベントがない月もグリッドは描く", () => {
    expect(toSvg([], "2026-10", today)).toContain(">2026年10月</text>");
  });

  it("今日のセルを薄い水色の背景で強調する", () => {
    const svg = toSvg([], "2026-08", today);
    expect(svg).toContain('aria-label="カレンダー 2026年8月、今日 8月25日"');
    expect(svg).toContain(".today { fill: #ddf4ff; }");
    expect(svg).toContain(".today { fill: #0c2d6b; }");
    expect(svg).toContain('<rect x="264" y="348" width="128" height="72" class="cell today"/>');
    expect(svg).toContain('<text x="270" y="364">25</text>');
  });

  it("今日を含まない月は強調しない", () => {
    const svg = toSvg([], "2026-09", today);
    expect(svg).not.toContain('class="cell today"');
    expect(svg).not.toContain("、今日");
  });

  it("ラベルがなければ既定色、1件ならラベル色で縁を描く", () => {
    expect(toSvg([event()], "2026-08", today)).toContain('class="bar" stroke="#1f6feb"');
    expect(toSvg([event({ labelColors: ["e99695"] })], "2026-08", today)).toContain('class="bar" stroke="#e99695"');
  });

  it("複数のラベル色を縁の横グラデーションにする", () => {
    const svg = toSvg([event({ labelColors: ["d73a4a", "fbca04", "0e8a16"] })], "2026-08", today);
    expect(svg).toContain('<linearGradient id="bar-gradient-0" x1="0%" y1="0%" x2="100%" y2="0%">');
    expect(svg).toContain('<stop offset="0%" stop-color="#d73a4a"/>');
    expect(svg).toContain('<stop offset="50%" stop-color="#fbca04"/>');
    expect(svg).toContain('<stop offset="100%" stop-color="#0e8a16"/>');
    expect(svg).toContain('class="bar" stroke="url(#bar-gradient-0)"');
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
      today,
    );
    expect(svg.match(/<linearGradient id=/g)).toHaveLength(3);
    expect(svg).toContain('id="bar-gradient-0"');
    expect(svg).toContain('id="bar-gradient-1"');
    expect(svg).toContain('id="bar-gradient-2"');
  });

  it("不正なラベル色は使わない", () => {
    const svg = toSvg([event({ labelColors: ['"/><script>alert(1)</script>'] })], "2026-08", today);
    expect(svg).toContain('class="bar" stroke="#1f6feb"');
    expect(svg).not.toContain("<script>");
  });

  it("期間イベントは列数分の幅の帯になる", () => {
    // 2026-12-29 (火) 〜 12-31 (木) は同じ週なので 3 列分 (128 * 3 - 4)。縁の分さらに 2px 縮む
    const svg = toSvg([event({ startDate: isoDate("2026-12-29"), endDate: isoDate("2026-12-31") })], "2026-12", today);
    expect(svg).toContain('width="378" height="14" rx="3" class="bar"');
  });

  it("月をまたぐイベントは月内の日だけ描く", () => {
    const svg = toSvg([event({ startDate: isoDate("2026-08-31"), endDate: isoDate("2026-09-01") })], "2026-09", today);
    expect(svg).toContain(">映画まどマギ 公開日</text>");
  });

  it("タイトルの XML 特殊文字はエスケープする", () => {
    expect(toSvg([event({ title: "a&b <c>" })], "2026-08", today)).toContain(">a&amp;b &lt;c&gt;</text>");
  });
});
